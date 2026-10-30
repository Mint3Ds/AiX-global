import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/data/db";
import {
  businesses,
  branches,
  employees,
  reviews,
  analysisRuns,
  observations,
  themes,
  memberships,
  tasks,
  handoffs,
  taskReportAttempts,
  replies,
  replyDraftVersions,
  events,
} from "@/data/schema";
import {
  intakeSchema,
  observationSchema,
  verifyEvidence,
  type ObservationInput,
} from "./analysis";
import {
  requireOwner,
  requireTransition,
  canDraftReply,
  decisionReason,
  WorkflowError,
} from "./workflow";
import { fixtureForExactText, type FixtureAnalysis } from "@/data/fixtures";
import { defaultBusinessId } from "@/config/business";
import { priorityFor, priorityRules } from "@/config/priority";
import { detectReviewLanguage } from "./language";
import { screenWithFallback } from "./screening";
import { candidateThemes, distinctReviewCount } from "./themes";
import { screenWithJev } from "@/integrations/jev/screen";
import {
  screenWithOpenAI,
  extractWithOpenAI,
  matchWithOpenAI,
  draftWithOpenAI,
  modelName,
} from "@/integrations/openai/client";
import { localHandoff } from "@/integrations/orbyte/handoff";
import { ProviderError } from "@/integrations/provider-errors";
import {
  assertReplyApproval,
  canBatchApproveReply,
  isPossibleRecurrence,
  partialReplyWarning,
} from "./replies";

export const aiMode = () => {
  if (process.env.AI_MODE !== "live" && process.env.AI_MODE !== "fixture")
    throw new Error(
      "AI_MODE must explicitly be live or fixture. See .env.example.",
    );
  return process.env.AI_MODE;
};
const now = () => new Date();
async function event(
  type: string,
  entityType: string,
  entityId: string,
  description: string,
  actor = "system",
  role = "system",
  metadata?: Record<string, unknown>,
  businessId?: string,
) {
  if (!businessId) {
    if (entityType === "review")
      businessId = (await oneReview(entityId)).businessId;
    else if (entityType === "theme")
      businessId = (await oneTheme(entityId)).businessId;
    else if (entityType === "task")
      businessId = (await oneTheme((await oneTask(entityId)).themeId))
        .businessId;
    else if (entityType === "reply")
      businessId = (await oneReview((await oneReply(entityId)).reviewId))
        .businessId;
    else if (entityType === "observation") {
      const [point] = await db
        .select({ reviewId: observations.reviewId })
        .from(observations)
        .where(eq(observations.id, entityId));
      if (point) businessId = (await oneReview(point.reviewId)).businessId;
    }
  }
  await db.insert(events).values({
    id: randomUUID(),
    type,
    entityType,
    entityId,
    description,
    actor,
    role,
    metadata,
    businessId,
  });
}
async function oneReview(id: string) {
  const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
  if (!row) throw new Error("Review not found");
  return row;
}
async function oneTheme(id: string) {
  const [row] = await db.select().from(themes).where(eq(themes.id, id));
  if (!row) throw new Error("Theme not found");
  return row;
}
async function oneTask(id: string) {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!row) throw new Error("Task not found");
  return row;
}
async function oneReply(id: string) {
  const [row] = await db.select().from(replies).where(eq(replies.id, id));
  if (!row) throw new Error("Reply not found");
  return row;
}
function typeForKind(kind: string) {
  return kind === "operational_complaint"
    ? "operational_issue"
    : kind === "suggestion"
      ? "suggestion"
      : "positive_pattern";
}
function safeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /timeout|aborted/i.test(message)
    ? "request timed out"
    : /key.*not configured/i.test(message)
      ? "key not configured"
      : /uncertain/i.test(message)
        ? "uncertain response"
        : "request failed or invalid response";
}

export async function recalculatePriority(themeId: string) {
  const theme = await oneTheme(themeId);
  const result = await db.execute(
    sql`SELECT count(DISTINCT o.review_id)::integer AS count,
      count(DISTINCT o.review_id) FILTER (WHERE r.reviewed_at >= now() - (${priorityRules.recentDays} * interval '1 day'))::integer AS recent
      FROM theme_memberships m JOIN observations o ON o.id=m.observation_id
      JOIN reviews r ON r.id=o.review_id WHERE m.theme_id=${themeId}`,
  );
  const count = Number(result.rows[0]?.count ?? 0);
  const recent = Number(result.rows[0]?.recent ?? 0);
  const [resolved] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.themeId, themeId), eq(tasks.status, "resolved")))
    .limit(1);
  const p = priorityFor(
    theme.type,
    count,
    theme.severity,
    recent,
    Boolean(resolved && theme.status === "recurrence"),
  );
  await db
    .update(themes)
    .set({ priority: p.priority, priorityReason: p.reason, updatedAt: now() })
    .where(eq(themes.id, themeId));
  return count;
}
async function refreshRecurrenceStatus(themeId: string) {
  const theme = await oneTheme(themeId);
  const [previous] = await db
    .select({ resolvedAt: tasks.resolvedAt })
    .from(tasks)
    .where(and(eq(tasks.themeId, themeId), eq(tasks.status, "resolved")))
    .orderBy(desc(tasks.resolvedAt))
    .limit(1);
  if (!previous?.resolvedAt || theme.status === "dismissed") {
    await recalculatePriority(themeId);
    return;
  }
  const [newer] = await db
    .select({ id: observations.id })
    .from(memberships)
    .innerJoin(observations, eq(observations.id, memberships.observationId))
    .innerJoin(reviews, eq(reviews.id, observations.reviewId))
    .where(
      and(
        eq(memberships.themeId, themeId),
        sql`${reviews.createdAt} > ${previous.resolvedAt}`,
      ),
    )
    .limit(1);
  const next = newer
    ? "recurrence"
    : theme.status === "recurrence"
      ? "suggested"
      : theme.status;
  if (next !== theme.status)
    await db
      .update(themes)
      .set({ status: next, updatedAt: now() })
      .where(eq(themes.id, themeId));
  await recalculatePriority(themeId);
}
export async function getState(businessId: string = defaultBusinessId) {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId));
  if (!business) throw new Error("Business not found");
  const reviewIds = (
    await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.businessId, businessId))
  ).map((row) => row.id);
  const themeIds = (
    await db
      .select({ id: themes.id })
      .from(themes)
      .where(eq(themes.businessId, businessId))
  ).map((row) => row.id);
  const taskIds = themeIds.length
    ? (
        await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(inArray(tasks.themeId, themeIds))
      ).map((row) => row.id)
    : [];
  const reviewWhere = reviewIds.length
    ? inArray(observations.reviewId, reviewIds)
    : sql`false`;
  const themeWhere = themeIds.length
    ? inArray(memberships.themeId, themeIds)
    : sql`false`;
  const taskWhere = taskIds.length
    ? inArray(handoffs.approvedTaskId, taskIds)
    : sql`false`;
  const [
    allBusinesses,
    allBranches,
    allReviews,
    allRuns,
    allObservations,
    allThemes,
    allMemberships,
    allTasks,
    allHandoffs,
    allReplies,
    allEvents,
    allEmployees,
  ] = await Promise.all([
    db.select().from(businesses),
    db.select().from(branches).where(eq(branches.businessId, businessId)),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.businessId, businessId))
      .orderBy(desc(reviews.reviewedAt)),
    db
      .select()
      .from(analysisRuns)
      .where(
        reviewIds.length
          ? inArray(analysisRuns.reviewId, reviewIds)
          : sql`false`,
      )
      .orderBy(desc(analysisRuns.createdAt)),
    db.select().from(observations).where(reviewWhere),
    db
      .select()
      .from(themes)
      .where(eq(themes.businessId, businessId))
      .orderBy(desc(themes.createdAt)),
    db.select().from(memberships).where(themeWhere),
    db
      .select()
      .from(tasks)
      .where(themeIds.length ? inArray(tasks.themeId, themeIds) : sql`false`),
    db.select().from(handoffs).where(taskWhere),
    db
      .select()
      .from(replies)
      .where(
        reviewIds.length ? inArray(replies.reviewId, reviewIds) : sql`false`,
      ),
    db
      .select()
      .from(events)
      .where(eq(events.businessId, businessId))
      .orderBy(desc(events.createdAt)),
    db.select().from(employees).where(eq(employees.businessId, businessId)),
  ]);
  const themeSupport = Object.fromEntries(
    allThemes.map((theme) => [
      theme.id,
      distinctReviewCount(allObservations, allMemberships, theme.id),
    ]),
  );
  return {
    mode: aiMode(),
    synthetic: true,
    businesses: allBusinesses,
    selectedBusinessId: businessId,
    branches: allBranches,
    employees: allEmployees,
    reviews: allReviews,
    runs: allRuns,
    observations: allObservations,
    themes: allThemes,
    memberships: allMemberships,
    tasks: allTasks,
    handoffs: allHandoffs,
    replies: allReplies,
    events: allEvents,
    themeSupport,
  };
}
export async function intake(input: unknown) {
  const data = intakeSchema.parse(input);
  const [validBranch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.id, data.branchId),
        eq(branches.businessId, data.businessId),
      ),
    );
  if (!validBranch)
    throw new Error("Property does not belong to this business.");
  const existing = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, data.businessId),
        eq(reviews.source, data.source),
        eq(reviews.sourceReviewId, data.sourceReviewId),
      ),
    )
    .limit(1);
  if (existing.length) {
    const old = existing[0];
    if (
      old.originalText !== data.text ||
      old.branchId !== data.branchId ||
      old.rating !== data.rating ||
      old.reviewedAt.getTime() !== new Date(data.reviewedAt).getTime()
    )
      throw new Error(
        `Feed conflict for ${old.id}: source evidence changed. Existing review preserved for manual review.`,
      );
    return { reviewId: old.id, duplicate: true };
  }
  const id = randomUUID();
  const inserted = await db
    .insert(reviews)
    .values({
      id,
      businessId: data.businessId,
      branchId: data.branchId,
      source: data.source,
      sourceReviewId: data.sourceReviewId,
      rating: data.rating,
      reviewedAt: new Date(data.reviewedAt),
      originalText: data.text,
      isSynthetic: true,
      processingStatus: "pending",
      processingStage: "saved",
      language: detectReviewLanguage(data.text),
    })
    .onConflictDoNothing()
    .returning({ id: reviews.id });
  if (!inserted.length) {
    const [old] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.businessId, data.businessId),
          eq(reviews.source, data.source),
          eq(reviews.sourceReviewId, data.sourceReviewId),
        ),
      );
    if (
      !old ||
      old.originalText !== data.text ||
      old.branchId !== data.branchId ||
      old.rating !== data.rating ||
      old.reviewedAt.getTime() !== new Date(data.reviewedAt).getTime()
    )
      throw new Error(
        "Feed conflict: source evidence changed. Existing review preserved for manual review.",
      );
    return { reviewId: old.id, duplicate: true };
  }
  await event(
    "review_intake",
    "review",
    id,
    "Synthetic review saved with original wording.",
    "demo user",
    "staff",
    { branchId: data.branchId, source: data.source },
    data.businessId,
  );
  return { reviewId: id };
}

/** Every route mutation validates the selected workspace before domain work begins. */
export async function assertActionScope(
  businessId: string,
  body: Record<string, unknown>,
) {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId));
  if (!business) throw new Error("Unknown business workspace.");
  if (body.type === "intake") {
    const data = body.data as Record<string, unknown>;
    if (data?.businessId !== businessId)
      throw new Error("Review business does not match selected workspace.");
  }
  if (body.reviewId) {
    if ((await oneReview(String(body.reviewId))).businessId !== businessId)
      throw new Error("Review belongs to another business.");
  }
  if (body.themeId) {
    if ((await oneTheme(String(body.themeId))).businessId !== businessId)
      throw new Error("Issue belongs to another business.");
  }
  if (body.taskId) {
    const taskTheme = await oneTheme(
      (await oneTask(String(body.taskId))).themeId,
    );
    if (taskTheme.businessId !== businessId)
      throw new Error("Task belongs to another business.");
  }
  if (body.replyId) {
    if (
      (await oneReview((await oneReply(String(body.replyId))).reviewId))
        .businessId !== businessId
    )
      throw new Error("Reply belongs to another business.");
  }
  if (Array.isArray(body.replyIds)) {
    for (const id of body.replyIds) {
      if (
        (await oneReview((await oneReply(String(id))).reviewId)).businessId !==
        businessId
      )
        throw new Error("Reply belongs to another business.");
    }
  }
  if (body.observationId) {
    const [point] = await db
      .select({ reviewId: observations.reviewId })
      .from(observations)
      .where(eq(observations.id, String(body.observationId)));
    if (!point || (await oneReview(point.reviewId)).businessId !== businessId)
      throw new Error("Observation belongs to another business.");
  }
}

export async function analyzeReview(reviewId: string) {
  const review = await oneReview(reviewId);
  if (["complete", "generic"].includes(review.processingStatus))
    return {
      reviewId,
      status: review.processingStatus,
      alreadyProcessed: true,
    };
  requireTransition(
    review.processingStatus,
    ["pending", "failed", "needs_review"],
    "processing",
  );
  await db
    .update(reviews)
    .set({
      processingStatus: "processing",
      processingStage: "screening",
      updatedAt: now(),
    })
    .where(eq(reviews.id, reviewId));
  await event(
    "analysis_started",
    "review",
    reviewId,
    `Analysis started in ${aiMode()} mode.`,
  );
  let provider = aiMode() === "live" ? "jev" : "fixture",
    model: string | null = null,
    errorNote: string | null = null;
  let extractionProvider: string | null = null,
    matchingProvider: string | null = null;
  try {
    let fixture: FixtureAnalysis | null = null;
    let useful: boolean;
    let inputs: ObservationInput[] = [];
    if (aiMode() === "fixture") {
      fixture = fixtureForExactText(review.originalText, review.businessId);
      if (!fixture) {
        await db.insert(analysisRuns).values({
          id: randomUUID(),
          reviewId,
          decision: "uncertain",
          screeningProvider: "fixture",
          promptVersion: "fixture-v1",
          mode: "fixture",
          safeError: "No fixture exists for this exact review text.",
        });
        await db
          .update(reviews)
          .set({
            processingStatus: "needs_review",
            processingStage: "needs_review",
            updatedAt: now(),
          })
          .where(eq(reviews.id, reviewId));
        await event(
          "analysis_needs_review",
          "review",
          reviewId,
          "No exact analysis fixture exists; owner review is required.",
        );
        return { reviewId, status: "needs_review" };
      }
      useful = fixture.useful;
      inputs = fixture.observations;
      extractionProvider = useful ? "fixture" : null;
      matchingProvider = useful ? "fixture" : null;
    } else {
      const screening = await screenWithFallback(
        review.originalText,
        screenWithJev,
        screenWithOpenAI,
        modelName(),
      );
      provider = screening.provider;
      model = screening.model;
      if (screening.jevError)
        errorNote = `Jev ${safeProviderError(screening.jevError)}; OpenAI fallback attempted.`;
      if (!screening.ok) throw screening.openaiError;
      useful = screening.result.containsSpecificFeedback;
      if (useful) {
        await db
          .update(reviews)
          .set({ processingStage: "extraction", updatedAt: now() })
          .where(eq(reviews.id, reviewId));
        extractionProvider = "openai";
        const extracted = await extractWithOpenAI(review.originalText);
        inputs = extracted.observations;
      }
    }
    if (useful)
      await db
        .update(reviews)
        .set({ processingStage: "theme_matching", updatedAt: now() })
        .where(eq(reviews.id, reviewId));
    inputs = verifyEvidence(review.originalText, inputs);
    if (useful && inputs.length === 0)
      throw new Error(
        "Specific feedback was found but extraction returned no observations.",
      );
    const branchThemes =
      aiMode() === "live" && inputs.length
        ? await db
            .select({
              id: themes.id,
              title: themes.title,
              type: themes.type,
              branchId: themes.branchId,
            })
            .from(themes)
            .where(
              and(
                eq(themes.businessId, review.businessId),
                eq(themes.branchId, review.branchId),
              ),
            )
        : [];
    const matches: (string | null)[] = [];
    let modelMatched = false;
    for (let index = 0; index < inputs.length; index += 3) {
      const group = await Promise.all(
        inputs.slice(index, index + 3).map(async (input) => {
          if (aiMode() === "fixture")
            return {
              themeId:
                (input as ObservationInput & { expectedThemeId?: string })
                  .expectedThemeId ?? null,
              usedModel: false,
            };
          const candidates = candidateThemes(
            branchThemes,
            review.branchId,
            input.kind,
            `${input.aspect} ${input.normalizedDescription}`,
          );
          const normalizedAspect = input.aspect
            .replaceAll("_", " ")
            .trim()
            .toLowerCase();
          const exactCandidate = normalizedAspect.includes(" ")
            ? candidates.find(
                (candidate) =>
                  candidate.title.trim().toLowerCase() === normalizedAspect,
              )
            : undefined;
          if (exactCandidate)
            return { themeId: exactCandidate.id, usedModel: false };
          if (!candidates.length) return { themeId: null, usedModel: false };
          const match = await matchWithOpenAI(input, candidates);
          if (
            match.themeId &&
            !candidates.some((candidate) => candidate.id === match.themeId)
          )
            throw new Error(
              "Theme match returned an invalid or cross-branch ID.",
            );
          return { themeId: match.themeId || null, usedModel: true };
        }),
      );
      matches.push(...group.map((item) => item.themeId));
      modelMatched ||= group.some((item) => item.usedModel);
    }
    if (aiMode() === "live" && modelMatched) matchingProvider = "openai";
    const runId = randomUUID();
    const changedThemes = new Set<string>();
    await db.transaction(async (tx) => {
      await tx.insert(analysisRuns).values({
        id: runId,
        reviewId,
        decision: useful ? "contains_specific_feedback" : "generic",
        screeningProvider: provider,
        screeningModel: model,
        extractionProvider,
        extractionModel: extractionProvider === "openai" ? modelName() : null,
        matchingProvider,
        matchingModel: matchingProvider === "openai" ? modelName() : null,
        promptVersion: "v1",
        mode: aiMode(),
        safeError: errorNote,
      });
      for (const [index, input] of inputs.entries()) {
        const id = randomUUID(),
          start = review.originalText.indexOf(input.evidenceQuote);
        await tx.insert(observations).values({
          id,
          reviewId,
          branchId: review.branchId,
          analysisRunId: runId,
          category: input.category,
          aspect: input.aspect,
          kind: input.kind,
          sentiment: input.sentiment,
          summary: input.summary,
          normalizedDescription: input.normalizedDescription,
          evidenceQuote: input.evidenceQuote,
          startOffset: start,
          endOffset: start + input.evidenceQuote.length,
          provider: extractionProvider || provider,
          mode: aiMode(),
          model: extractionProvider === "openai" ? modelName() : null,
        });
        let themeId = matches[index];
        if (themeId) {
          const [candidate] = await tx
            .select()
            .from(themes)
            .where(eq(themes.id, themeId));
          if (
            !candidate ||
            candidate.branchId !== review.branchId ||
            candidate.businessId !== review.businessId ||
            candidate.type !== typeForKind(input.kind)
          )
            themeId = null;
        }
        if (!themeId && aiMode() === "live") {
          themeId = randomUUID();
          await tx.insert(themes).values({
            id: themeId,
            businessId: review.businessId,
            branchId: review.branchId,
            title: input.aspect.replaceAll("_", " "),
            type: typeForKind(input.kind),
            severity: input.kind === "operational_complaint" ? 2 : 1,
            priorityReason: "New observation; owner review needed.",
          });
        }
        if (themeId) {
          await tx.insert(memberships).values({
            themeId,
            observationId: id,
            source: aiMode() === "fixture" ? "fixture" : "ai_suggestion",
            confirmation: "suggested",
          });
          changedThemes.add(themeId);
        }
      }
      await tx
        .update(reviews)
        .set({
          processingStatus: useful ? "complete" : "generic",
          processingStage: useful ? "complete" : "generic",
          updatedAt: now(),
        })
        .where(eq(reviews.id, reviewId));
    });
    for (const themeId of changedThemes) await recalculatePriority(themeId);
    for (const themeId of changedThemes) {
      const [previous] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.themeId, themeId), eq(tasks.status, "resolved")))
        .orderBy(desc(tasks.resolvedAt))
        .limit(1);
      if (
        isPossibleRecurrence(review.createdAt, previous?.resolvedAt ?? null)
      ) {
        await refreshRecurrenceStatus(themeId);
        await event(
          "possible_recurrence",
          "theme",
          themeId,
          "New related review arrived after a verified resolution; owner should inspect the evidence.",
          "system",
          "system",
          { reviewId, priorTaskId: previous.id },
        );
      }
    }
    await event(
      "analysis_completed",
      "review",
      reviewId,
      `Review ${useful ? "specific feedback" : "generic"}; screening by ${provider}, extraction by ${extractionProvider || "not needed"}, matching by ${matchingProvider || "not needed"}.`,
      "system",
      "system",
      {
        mode: aiMode(),
        provider,
        model,
        errorNote,
        observations: inputs.length,
        changedThemes: [...changedThemes],
      },
    );
    return {
      reviewId,
      status: useful ? "complete" : "generic",
      provider,
      changedThemes: [...changedThemes],
    };
  } catch (error) {
    const safe =
      error instanceof ProviderError
        ? error.message
        : error instanceof Error &&
            /Evidence quote|No observations|Theme match/.test(error.message)
          ? error.message
          : "Analysis provider failed or returned an invalid result.";
    await db.insert(analysisRuns).values({
      id: randomUUID(),
      reviewId,
      decision: "failed",
      screeningProvider: provider,
      screeningModel: model,
      extractionProvider,
      matchingProvider,
      promptVersion: "v1",
      mode: aiMode(),
      safeError: safe,
    });
    await db
      .update(reviews)
      .set({
        processingStatus: "failed",
        processingStage: "failed",
        updatedAt: now(),
      })
      .where(eq(reviews.id, reviewId));
    await event("analysis_failed", "review", reviewId, safe);
    return { reviewId, status: "failed", error: safe };
  }
}
export async function manualClassify(
  reviewId: string,
  role: string,
  input: { useful: boolean; observation?: unknown },
) {
  requireOwner(role);
  const review = await oneReview(reviewId);
  requireTransition(
    review.processingStatus,
    ["needs_review", "failed", "pending"],
    "manual review",
  );
  let observation = input.useful
    ? observationSchema.parse(input.observation)
    : null;
  if (observation)
    observation = verifyEvidence(review.originalText, [observation])[0];
  const runId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(analysisRuns).values({
      id: runId,
      reviewId,
      decision: input.useful ? "contains_specific_feedback" : "generic",
      screeningProvider: "manual_owner",
      extractionProvider: observation ? "manual_owner" : null,
      promptVersion: "manual-v1",
      mode: "manual",
    });
    if (observation) {
      const start = review.originalText.indexOf(observation.evidenceQuote);
      await tx.insert(observations).values({
        id: randomUUID(),
        reviewId,
        branchId: review.branchId,
        analysisRunId: runId,
        category: observation.category,
        aspect: observation.aspect,
        kind: observation.kind,
        sentiment: observation.sentiment,
        evidenceQuote: observation.evidenceQuote,
        summary: observation.summary,
        normalizedDescription: observation.normalizedDescription,
        startOffset: start,
        endOffset: start + observation.evidenceQuote.length,
        provider: "manual_owner",
        mode: "manual",
      });
    }
    await tx
      .update(reviews)
      .set({
        processingStatus: input.useful ? "complete" : "generic",
        updatedAt: now(),
      })
      .where(eq(reviews.id, reviewId));
  });
  await event(
    "manual_classification",
    "review",
    reviewId,
    `Owner classified review as ${input.useful ? "specific" : "generic"}.`,
    "demo owner",
    "owner",
  );
}
export async function correctMembership(
  observationId: string,
  destinationThemeId: string | null,
  role: string,
) {
  requireOwner(role);
  const [observation] = await db
    .select()
    .from(observations)
    .where(eq(observations.id, observationId));
  if (!observation) throw new Error("Observation not found");
  const [old] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.observationId, observationId));
  if (destinationThemeId) {
    const target = await oneTheme(destinationThemeId);
    if (
      target.branchId !== observation.branchId ||
      target.type !== typeForKind(observation.kind)
    )
      throw new Error(
        "Theme must match the observation branch and feedback kind.",
      );
  }
  if (old?.themeId === destinationThemeId) return;
  await db.transaction(async (tx) => {
    if (old)
      await tx
        .delete(memberships)
        .where(eq(memberships.observationId, observationId));
    if (destinationThemeId)
      await tx.insert(memberships).values({
        themeId: destinationThemeId,
        observationId,
        source: "owner_correction",
        confirmation: "owner_confirmed",
      });
  });
  if (old) await refreshRecurrenceStatus(old.themeId);
  if (destinationThemeId) await refreshRecurrenceStatus(destinationThemeId);
  await event(
    "membership_corrected",
    "observation",
    observationId,
    destinationThemeId
      ? "Owner moved evidence to another theme."
      : "Owner removed evidence from a theme.",
    "demo owner",
    "owner",
    { from: old?.themeId || null, to: destinationThemeId },
  );
}
export async function setThemeStatus(
  themeId: string,
  status: "owner_confirmed" | "dismissed" | "suggested",
  role: string,
) {
  requireOwner(role);
  const theme = await oneTheme(themeId);
  requireTransition(
    theme.status,
    status === "suggested" ? ["dismissed"] : ["suggested"],
    status,
  );
  await db
    .update(themes)
    .set({ status, updatedAt: now() })
    .where(eq(themes.id, themeId));
  await event(
    status === "dismissed"
      ? "theme_dismissed"
      : status === "suggested"
        ? "theme_reopened"
        : "theme_confirmed",
    "theme",
    themeId,
    status === "dismissed"
      ? "Owner dismissed the suggested theme."
      : status === "suggested"
        ? "Owner reopened the dismissed theme for review."
        : "Owner confirmed the suggested theme.",
    "demo owner",
    "owner",
  );
}
export async function setSeverity(
  themeId: string,
  severity: number,
  role: string,
) {
  requireOwner(role);
  if (![1, 2, 3].includes(severity))
    throw new Error("Severity must be 1, 2, or 3.");
  await db
    .update(themes)
    .set({ severity, updatedAt: now() })
    .where(eq(themes.id, themeId));
  await recalculatePriority(themeId);
  await event(
    "priority_adjusted",
    "theme",
    themeId,
    `Owner set severity to ${severity}.`,
    "demo owner",
    "owner",
  );
}
export async function proposeTask(themeId: string, role: string) {
  requireOwner(role);
  const theme = await oneTheme(themeId);
  if (theme.type !== "operational_issue" || theme.status === "dismissed")
    throw new Error("Only an active operational issue can have a repair task.");
  if ((await recalculatePriority(themeId)) < 1)
    throw new Error(
      "An operational task needs at least one supporting source review.",
    );
  const { id, created } = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${themeId}))`);
    const existingRows = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.themeId, themeId))
      .orderBy(desc(tasks.proposedAt));
    const existing =
      existingRows.find((item) =>
        ["reported", "in_progress", "approved_open"].includes(item.status),
      ) ||
      existingRows.find((item) =>
        ["proposed", "deferred"].includes(item.status),
      ) ||
      existingRows[0];
    if (existing && !["resolved", "rejected"].includes(existing.status))
      return { id: existing.id, created: false };
    if (existing?.status === "resolved" && theme.status !== "recurrence")
      throw new Error(
        "A new related review is needed before opening a recurrence task.",
      );
    const id = randomUUID();
    await tx.insert(tasks).values({
      id,
      themeId,
      branchId: theme.branchId,
      title: `Inspect ${theme.title.toLowerCase()}`,
      description: `Inspect the evidence for ${theme.title.toLowerCase()} and record what was actually done.`,
      assigneeRole: "floor manager",
      status: "proposed",
      recurrenceOfTaskId: existing?.status === "resolved" ? existing.id : null,
    });
    return { id, created: true };
  });
  if (!created) return await oneTask(id);
  await event(
    "task_proposed",
    "task",
    id,
    "Owner created a proposed operational task.",
    "demo owner",
    "owner",
  );
  return await oneTask(id);
}
export async function editTask(
  taskId: string,
  role: string,
  input: {
    title: string;
    description: string;
    assigneeRole: string;
    assigneeId?: string;
    dueAt?: string;
  },
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  requireTransition(task.status, ["proposed", "deferred"], "edit");
  const title = input.title.trim(),
    description = input.description.trim(),
    assigneeRole = input.assigneeRole.trim();
  if (!title || !description || !assigneeRole)
    throw new Error("Task title, description, and assignee are required.");
  const employee = input.assigneeId
    ? (
        await db
          .select()
          .from(employees)
          .where(eq(employees.id, input.assigneeId))
      )[0]
    : null;
  if (input.assigneeId && (!employee || employee.branchId !== task.branchId))
    throw new Error("Select an employee from this property.");
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime()))
    throw new Error("Invalid due date.");
  await db
    .update(tasks)
    .set({
      title,
      description,
      assigneeRole,
      assigneeId: employee?.id ?? null,
      dueAt,
    })
    .where(eq(tasks.id, taskId));
  await event(
    "task_edited",
    "task",
    taskId,
    "Owner edited the task proposal.",
    "demo owner",
    "owner",
  );
  return await oneTask(taskId);
}
export async function decideTask(
  taskId: string,
  role: string,
  decision: "approve" | "reject" | "defer",
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  if (decision === "approve" && task.status === "approved_open") return task;
  requireTransition(task.status, ["proposed", "deferred"], decision);
  if (decision !== "approve") {
    const status = decision === "reject" ? "rejected" : "deferred";
    await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
    await event(
      `task_${status}`,
      "task",
      taskId,
      `Owner ${status} the task proposal.`,
      "demo owner",
      "owner",
    );
    return await oneTask(taskId);
  }
  const theme = await oneTheme(task.themeId);
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, theme.businessId));
  if (!task.assigneeId) throw new Error("Select an employee before approval.");
  if (!task.dueAt) throw new Error("Set a due date before approving the task.");
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, task.assigneeId));
  if (!employee || employee.branchId !== theme.branchId)
    throw new Error("Assigned employee is not at this property.");
  const evidence = await db
    .select({
      reviewId: observations.reviewId,
      quote: observations.evidenceQuote,
    })
    .from(memberships)
    .innerJoin(observations, eq(observations.id, memberships.observationId))
    .where(eq(memberships.themeId, task.themeId));
  const payload = {
    business: business.name,
    branch: theme.branchId,
    title: task.title,
    description: task.description,
    assigneeRole: task.assigneeRole,
    assignee: employee.name,
    dueAt: task.dueAt?.toISOString() ?? null,
    evidence,
    approvedBy: "demo owner",
    approvedAt: now().toISOString(),
  };
  const simulated = await localHandoff.simulate(payload);
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(tasks)
      .set({
        status: "approved_open",
        approvedAt: now(),
        approver: "demo owner",
        approvalSnapshot: payload,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          inArray(tasks.status, ["proposed", "deferred"]),
        ),
      )
      .returning();
    if (!updated)
      throw new Error("Task has already changed state. Refresh and try again.");
    await tx
      .insert(handoffs)
      .values({
        id: randomUUID(),
        approvedTaskId: taskId,
        payload: simulated.payload,
        simulatedStatus: simulated.status,
      })
      .onConflictDoNothing();
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "task_approved",
      entityType: "task",
      entityId: taskId,
      businessId: theme.businessId,
      description: "Owner approved the task proposal.",
      metadata: { evidenceCount: evidence.length },
    });
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "local adapter",
      role: "system",
      type: "handoff_simulated",
      entityType: "task",
      entityId: taskId,
      businessId: theme.businessId,
      description: "Simulated Orbyte integration handoff saved locally.",
    });
  });
  return await oneTask(taskId);
}
export async function startTask(
  taskId: string,
  role: string,
  employeeId: string,
) {
  const task = await oneTask(taskId);
  if (role !== "owner" && (role !== "staff" || task.assigneeId !== employeeId))
    throw new Error("Only the assigned employee can start this task.");
  requireTransition(
    task.status,
    ["approved_open", "needs_rework"],
    "in_progress",
  );
  await db
    .update(tasks)
    .set({ status: "in_progress" })
    .where(eq(tasks.id, taskId));
  await event(
    "task_started",
    "task",
    taskId,
    "Assigned employee started the work.",
    role === "owner" ? "demo owner" : employeeId,
    role,
  );
}
export async function reportTask(
  taskId: string,
  role: string,
  employeeId: string,
  note: string,
) {
  const task = await oneTask(taskId);
  if (role !== "owner" && (role !== "staff" || task.assigneeId !== employeeId))
    throw new Error("Only the assigned employee can report on this task.");
  requireTransition(
    task.status,
    ["approved_open", "in_progress", "needs_rework"],
    "reported",
  );
  if (note.trim().length < 10)
    throw new Error("A work report of at least 10 characters is required.");
  const actor = role === "owner" ? "demo owner" : employeeId;
  const businessId = (await oneTheme(task.themeId)).businessId;
  return db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(tasks)
      .set({
        status: "reported",
        employeeReport: note.trim(),
        reportedAt: timestamp,
        reportedBy: actor,
        reportVersion: sql`${tasks.reportVersion} + 1`,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          inArray(tasks.status, [
            "approved_open",
            "in_progress",
            "needs_rework",
          ]),
        ),
      )
      .returning();
    if (!updated)
      throw new WorkflowError(
        "This task has changed. Refresh before submitting the report again.",
      );
    await tx.insert(taskReportAttempts).values({
      id: randomUUID(),
      taskId,
      version: updated.reportVersion,
      note: note.trim(),
      reportedAt: timestamp,
      reportedBy: actor,
      decision: "pending",
    });
    await tx.insert(events).values({
      id: randomUUID(),
      actor,
      role,
      type: "task_reported",
      entityType: "task",
      entityId: taskId,
      businessId,
      description:
        updated.reportVersion > 1
          ? "Corrected work report submitted for owner verification."
          : "Work reported; waiting for managerial verification.",
      metadata: {
        reportVersion: updated.reportVersion,
        note: note.trim(),
        outcome: "reported",
      },
    });
    return updated;
  });
}
export async function verifyTask(
  taskId: string,
  role: string,
  note = "",
  reportVersion: number,
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  requireTransition(task.status, ["reported"], "resolved");
  if (!Number.isInteger(reportVersion) || reportVersion !== task.reportVersion)
    throw new WorkflowError(
      "The completion report has changed. Review the latest report before deciding.",
    );
  if (!task.employeeReport) throw new Error("Employee work report is missing.");
  if (note.trim() && note.trim().length < 10)
    throw new Error(
      "Verification note must describe what the manager checked.",
    );
  const resolutionNote = note.trim() || task.employeeReport.trim();
  const businessId = (await oneTheme(task.themeId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(tasks)
      .set({
        status: "resolved",
        resolutionNote,
        resolvedAt: timestamp,
        verifiedAt: timestamp,
        verifiedBy: "demo owner",
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "reported"),
          eq(tasks.reportVersion, reportVersion),
        ),
      )
      .returning({ id: tasks.id });
    if (!updated)
      throw new WorkflowError(
        "This completion report has already been decided. Refresh and try again.",
      );
    await tx
      .update(taskReportAttempts)
      .set({
        decision: "approved",
        decidedAt: timestamp,
        decidedBy: "demo owner",
        decisionReason: note.trim() || null,
      })
      .where(
        and(
          eq(taskReportAttempts.taskId, taskId),
          eq(taskReportAttempts.version, reportVersion),
          eq(taskReportAttempts.decision, "pending"),
        ),
      );
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "task_verified",
      entityType: "task",
      entityId: taskId,
      businessId,
      description: "Owner confirmed the employee-reported work.",
      metadata: {
        reportVersion,
        verification: note.trim() || "Owner confirmation",
        outcome: "resolved",
      },
    });
  });
  return await oneTask(taskId);
}
export async function rejectTaskReport(
  taskId: string,
  role: string,
  reasonInput: string,
  reportVersion: number,
) {
  requireOwner(role);
  const reason = decisionReason(reasonInput);
  const task = await oneTask(taskId);
  requireTransition(task.status, ["reported"], "needs_rework");
  if (!Number.isInteger(reportVersion) || reportVersion !== task.reportVersion)
    throw new WorkflowError(
      "The completion report has changed. Review the latest report before deciding.",
    );
  const businessId = (await oneTheme(task.themeId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(tasks)
      .set({
        status: "needs_rework",
        rejectionReason: reason,
        rejectedAt: timestamp,
        rejectedBy: "demo owner",
        resolutionNote: null,
        resolvedAt: null,
        verifiedAt: null,
        verifiedBy: null,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "reported"),
          eq(tasks.reportVersion, reportVersion),
        ),
      )
      .returning({ id: tasks.id });
    if (!updated)
      throw new WorkflowError(
        "This completion report has already been decided. Refresh and try again.",
      );
    await tx
      .update(taskReportAttempts)
      .set({
        decision: "rejected",
        decisionReason: reason,
        decidedAt: timestamp,
        decidedBy: "demo owner",
      })
      .where(
        and(
          eq(taskReportAttempts.taskId, taskId),
          eq(taskReportAttempts.version, reportVersion),
          eq(taskReportAttempts.decision, "pending"),
        ),
      );
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "task_report_rejected",
      entityType: "task",
      entityId: taskId,
      businessId,
      description: "Owner returned the completion report for rework.",
      metadata: { reason, reportVersion, outcome: "needs_rework" },
    });
  });
  return await oneTask(taskId);
}
export async function resolveTask(
  taskId: string,
  role: string,
  note: string,
  reportVersion: number,
) {
  return verifyTask(taskId, role, note, reportVersion);
}
export async function createReply(
  reviewId: string,
  taskId: string,
  role: string,
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  canDraftReply(task.status, task.resolutionNote);
  const [existing] = await db
    .select()
    .from(replies)
    .where(eq(replies.reviewId, reviewId));
  if (existing) return existing;
  const review = await oneReview(reviewId);
  const theme = await oneTheme(task.themeId);
  if (theme.businessId !== review.businessId)
    throw new Error("Review and task belong to different businesses.");
  const linked = await db
    .select({ id: observations.id })
    .from(observations)
    .innerJoin(memberships, eq(memberships.observationId, observations.id))
    .where(
      and(
        eq(observations.reviewId, reviewId),
        eq(memberships.themeId, task.themeId),
      ),
    )
    .limit(1);
  if (!linked.length)
    throw new Error("Review is not evidence for this resolved task.");
  const unresolved = await unresolvedReviewComplaints(reviewId, task.themeId);
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, review.businessId));
  let text: string,
    provider: string,
    model: string | null = null;
  const fallbackText = `Thank you for sharing your experience at ${business.name}. We reviewed your feedback about ${theme.title.toLowerCase()}. Our team has verified this work: ${task.resolutionNote!.trim()}${unresolved.length ? ` We are still reviewing your other concern${unresolved.length === 1 ? "" : "s"} and cannot yet claim those are resolved.` : ""} Thank you for helping us improve.`;
  if (aiMode() === "live") {
    try {
      const draft = await draftWithOpenAI(
        review.originalText,
        task.resolutionNote!,
        business.name,
        unresolved,
      );
      text = draft.text;
      provider = "openai";
      model = modelName();
    } catch {
      text = fallbackText;
      provider = "template_fallback";
    }
  } else {
    text = fallbackText;
    provider = "fixture";
  }
  const id = randomUUID();
  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(replies)
      .values({
        id,
        reviewId,
        taskId,
        themeId: task.themeId,
        text,
        provider,
        mode: aiMode(),
        model,
        status: "draft",
        draftVersion: 1,
        partialWarning: partialReplyWarning(unresolved),
      })
      .onConflictDoNothing()
      .returning({ id: replies.id });
    if (!inserted) return false;
    await tx.insert(replyDraftVersions).values({
      id: randomUUID(),
      replyId: id,
      version: 1,
      text,
      source: provider,
    });
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "system",
      role: "system",
      type: "reply_drafted",
      entityType: "reply",
      entityId: id,
      businessId: review.businessId,
      description: `Draft created by ${provider}; owner approval required.`,
      metadata: { draftVersion: 1, outcome: "draft" },
    });
    return true;
  });
  return created
    ? await oneReply(id)
    : (
        await db.select().from(replies).where(eq(replies.reviewId, reviewId))
      )[0];
}
export async function prepareReplies(taskId: string, role: string) {
  requireOwner(role);
  const task = await oneTask(taskId);
  canDraftReply(task.status, task.resolutionNote);
  const linked = await db
    .selectDistinct({ reviewId: observations.reviewId })
    .from(observations)
    .innerJoin(memberships, eq(memberships.observationId, observations.id))
    .where(eq(memberships.themeId, task.themeId));
  // Bound provider requests while drafting several independent reviews at once.
  for (let index = 0; index < linked.length; index += 6) {
    await Promise.all(
      linked
        .slice(index, index + 6)
        .map(({ reviewId }) => createReply(reviewId, taskId, role)),
    );
  }
  return { count: linked.length };
}
async function unresolvedReviewComplaints(
  reviewId: string,
  resolvedThemeId: string,
) {
  const points = await db
    .select({
      id: observations.id,
      summary: observations.summary,
      themeId: memberships.themeId,
    })
    .from(observations)
    .leftJoin(memberships, eq(memberships.observationId, observations.id))
    .where(
      and(
        eq(observations.reviewId, reviewId),
        eq(observations.kind, "operational_complaint"),
      ),
    );
  const unresolved: string[] = [];
  for (const point of points) {
    if (point.themeId === resolvedThemeId) continue;
    if (!point.themeId) {
      unresolved.push(point.summary);
      continue;
    }
    const [fixed] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(eq(tasks.themeId, point.themeId), eq(tasks.status, "resolved")),
      )
      .limit(1);
    if (!fixed) unresolved.push(point.summary);
  }
  return unresolved;
}
export async function editReply(
  replyId: string,
  role: string,
  text: string,
  expectedVersion: number,
) {
  requireOwner(role);
  const reply = await oneReply(replyId);
  if (reply.status === "simulated_published")
    throw new Error("A posted reply cannot be edited.");
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion !== reply.draftVersion
  )
    throw new WorkflowError(
      "This reply changed. Review the current draft before editing it.",
    );
  if (text.trim().length < 10 || text.length > 1200)
    throw new Error("Reply must be 10–1200 characters.");
  const unresolved = await unresolvedReviewComplaints(
    reply.reviewId,
    reply.themeId,
  );
  const businessId = (await oneReview(reply.reviewId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(replies)
      .set({
        text: text.trim(),
        status: "draft",
        draftVersion: sql`${replies.draftVersion} + 1`,
        approvedVersion: null,
        editedAt: timestamp,
        approvedAt: null,
        approver: null,
        partialApproved: false,
        partialWarning: partialReplyWarning(unresolved),
      })
      .where(
        and(
          eq(replies.id, replyId),
          eq(replies.draftVersion, expectedVersion),
          inArray(replies.status, [
            "draft",
            "needs_revision",
            "approved_ready",
          ]),
        ),
      )
      .returning({ draftVersion: replies.draftVersion });
    if (!updated)
      throw new WorkflowError(
        "This reply changed. Review the current draft before editing it.",
      );
    await tx.insert(replyDraftVersions).values({
      id: randomUUID(),
      replyId,
      version: updated.draftVersion,
      text: text.trim(),
      source: "owner_revision",
      createdAt: timestamp,
    });
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "reply_edited",
      entityType: "reply",
      entityId: replyId,
      businessId,
      description:
        reply.status === "approved_ready"
          ? "Edited approved reply returned to draft."
          : reply.status === "needs_revision"
            ? "Rejected reply revised and returned for approval."
            : "Owner edited the reply draft.",
      metadata: {
        previousVersion: expectedVersion,
        draftVersion: updated.draftVersion,
        outcome: "draft",
      },
    });
  });
  return await oneReply(replyId);
}
export async function approveReply(
  replyId: string,
  role: string,
  partialApproved: boolean,
  expectedVersion: number,
) {
  requireOwner(role);
  const reply = await oneReply(replyId);
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion !== reply.draftVersion
  )
    throw new WorkflowError(
      "This reply changed. Review the current draft before approving it.",
    );
  if (
    reply.status === "approved_ready" &&
    reply.approvedVersion === expectedVersion
  )
    return reply;
  requireTransition(reply.status, ["draft"], "approved_ready");
  const task = await oneTask(reply.taskId);
  canDraftReply(task.status, task.resolutionNote);
  const unresolved = await unresolvedReviewComplaints(
    reply.reviewId,
    reply.themeId,
  );
  if (unresolved.length && !reply.partialWarning) {
    await db
      .update(replies)
      .set({ partialWarning: partialReplyWarning(unresolved) })
      .where(eq(replies.id, replyId));
  }
  assertReplyApproval(reply.text, unresolved, partialApproved);
  const businessId = (await oneReview(reply.reviewId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(replies)
      .set({
        status: "approved_ready",
        approvedVersion: expectedVersion,
        approvedAt: timestamp,
        approver: "demo owner",
        partialApproved: unresolved.length > 0,
        partialWarning: partialReplyWarning(unresolved),
      })
      .where(
        and(
          eq(replies.id, replyId),
          eq(replies.status, "draft"),
          eq(replies.draftVersion, expectedVersion),
        ),
      )
      .returning({ id: replies.id });
    if (!updated)
      throw new WorkflowError(
        "This reply changed before approval. Review the current draft.",
      );
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "reply_approved",
      entityType: "reply",
      entityId: replyId,
      businessId,
      description:
        "Owner approved the current reply draft; ready to post manually.",
      metadata: {
        draftVersion: expectedVersion,
        outcome: "approved_ready",
        partialApproved: unresolved.length > 0,
      },
    });
  });
  return await oneReply(replyId);
}
export async function rejectReply(
  replyId: string,
  role: string,
  reasonInput: string,
  expectedVersion: number,
) {
  requireOwner(role);
  const reason = decisionReason(reasonInput);
  const reply = await oneReply(replyId);
  requireTransition(reply.status, ["draft"], "needs_revision");
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion !== reply.draftVersion
  )
    throw new WorkflowError(
      "This reply changed. Review the current draft before rejecting it.",
    );
  const businessId = (await oneReview(reply.reviewId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(replies)
      .set({
        status: "needs_revision",
        rejectionReason: reason,
        rejectedAt: timestamp,
        rejectedBy: "demo owner",
        approvedVersion: null,
        approvedAt: null,
        approver: null,
        partialApproved: false,
      })
      .where(
        and(
          eq(replies.id, replyId),
          eq(replies.status, "draft"),
          eq(replies.draftVersion, expectedVersion),
        ),
      )
      .returning({ id: replies.id });
    if (!updated)
      throw new WorkflowError(
        "This reply has already been decided. Refresh and try again.",
      );
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "reply_rejected",
      entityType: "reply",
      entityId: replyId,
      businessId,
      description: "Owner rejected the reply draft and requested revision.",
      metadata: {
        reason,
        draftVersion: expectedVersion,
        outcome: "needs_revision",
        previousStatus: reply.status,
      },
    });
  });
  return await oneReply(replyId);
}
export async function approveReplyBatch(replyIds: unknown, role: string) {
  requireOwner(role);
  if (
    !Array.isArray(replyIds) ||
    replyIds.length < 1 ||
    replyIds.length > 300 ||
    !replyIds.every((id) => typeof id === "string")
  )
    throw new Error("Select 1–300 replies for batch review.");
  const unique = [...new Set(replyIds)];
  const versions = new Map<string, number>();
  for (const id of unique) {
    const reply = await oneReply(id);
    const theme = await oneTheme(reply.themeId);
    if (
      !canBatchApproveReply(reply.status, reply.partialWarning, theme.severity)
    )
      throw new Error(
        "Only unambiguous lower-severity drafts can be batch approved. Review this reply individually.",
      );
    versions.set(id, reply.draftVersion);
  }
  for (const id of unique)
    await approveReply(id, role, false, versions.get(id)!);
  return { approved: unique.length };
}
export async function simulatePublish(replyId: string, role: string) {
  requireOwner(role);
  const reply = await oneReply(replyId);
  if (reply.status === "simulated_published") return reply;
  if (
    reply.status !== "approved_ready" ||
    reply.approvedVersion !== reply.draftVersion
  ) {
    await event(
      "reply_publish_denied",
      "reply",
      replyId,
      "Simulated publishing blocked: the current draft has no valid owner approval.",
      "demo owner",
      "owner",
      {
        draftVersion: reply.draftVersion,
        status: reply.status,
        outcome: "denied",
      },
    );
    throw new WorkflowError(
      "The current reply draft is not approved. Revise and approve it before posting.",
    );
  }
  const businessId = (await oneReview(reply.reviewId)).businessId;
  await db.transaction(async (tx) => {
    const timestamp = now();
    const [updated] = await tx
      .update(replies)
      .set({
        status: "simulated_published",
        publishedAt: timestamp,
      })
      .where(
        and(
          eq(replies.id, replyId),
          eq(replies.status, "approved_ready"),
          eq(replies.draftVersion, reply.draftVersion),
          eq(replies.approvedVersion, reply.draftVersion),
        ),
      )
      .returning({ id: replies.id });
    if (!updated)
      throw new WorkflowError(
        "This reply changed before publishing. Refresh and check its approval.",
      );
    await tx.insert(events).values({
      id: randomUUID(),
      actor: "demo owner",
      role: "owner",
      type: "reply_simulated_published",
      entityType: "reply",
      entityId: replyId,
      businessId,
      description:
        "Reply marked as posted in this demo; no external platform was called.",
      metadata: {
        draftVersion: reply.draftVersion,
        outcome: "simulated_published",
      },
    });
  });
  return await oneReply(replyId);
}
export async function analyzePendingBatch(businessId: string, limit = 5) {
  const pending = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.processingStatus, "pending"),
        eq(reviews.businessId, businessId),
      ),
    )
    .limit(Math.max(1, Math.min(limit, 5)));
  const results = [];
  for (const item of pending) results.push(await analyzeReview(item.id));
  return results;
}
