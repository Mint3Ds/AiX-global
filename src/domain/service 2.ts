import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/data/db";
import {
  businesses,
  branches,
  reviews,
  analysisRuns,
  observations,
  themes,
  memberships,
  tasks,
  handoffs,
  replies,
  events,
} from "@/data/schema";
import {
  intakeSchema,
  observationSchema,
  verifyEvidence,
  type ObservationInput,
} from "./analysis";
import { requireOwner, requireTransition, canDraftReply } from "./workflow";
import { fixtureForExactText, type FixtureAnalysis } from "@/data/fixtures";
import { restaurantConfig } from "@/config/business";
import { priorityFor } from "@/config/priority";
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
) {
  await db.insert(events).values({
    id: randomUUID(),
    type,
    entityType,
    entityId,
    description,
    actor,
    role,
    metadata,
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
    sql`SELECT count(DISTINCT o.review_id)::integer AS count FROM theme_memberships m JOIN observations o ON o.id=m.observation_id WHERE m.theme_id=${themeId}`,
  );
  const count = Number(result.rows[0]?.count ?? 0);
  const p = priorityFor(theme.type, count, theme.severity);
  await db
    .update(themes)
    .set({ priority: p.priority, priorityReason: p.reason, updatedAt: now() })
    .where(eq(themes.id, themeId));
  return count;
}
export async function getState() {
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
  ] = await Promise.all([
    db.select().from(businesses),
    db.select().from(branches),
    db.select().from(reviews).orderBy(desc(reviews.reviewedAt)),
    db.select().from(analysisRuns).orderBy(desc(analysisRuns.createdAt)),
    db.select().from(observations),
    db.select().from(themes).orderBy(desc(themes.createdAt)),
    db.select().from(memberships),
    db.select().from(tasks),
    db.select().from(handoffs),
    db.select().from(replies),
    db.select().from(events).orderBy(desc(events.createdAt)),
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
    branches: allBranches,
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
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, restaurantConfig.businessId),
        eq(reviews.source, data.source),
        eq(reviews.sourceReviewId, data.sourceReviewId),
      ),
    )
    .limit(1);
  if (existing.length)
    throw new Error(
      `Duplicate source review ID. Existing review: ${existing[0].id}`,
    );
  const id = randomUUID();
  await db.insert(reviews).values({
    id,
    businessId: restaurantConfig.businessId,
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
  });
  await event(
    "review_intake",
    "review",
    id,
    "Synthetic review saved with original wording.",
    "demo user",
    "staff",
    { branchId: data.branchId, source: data.source },
  );
  return { reviewId: id };
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
      fixture = fixtureForExactText(review.originalText);
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
        matchingProvider = "openai";
      }
    }
    if (useful)
      await db
        .update(reviews)
        .set({ processingStage: "theme_matching", updatedAt: now() })
        .where(eq(reviews.id, reviewId));
    verifyEvidence(review.originalText, inputs);
    if (useful && inputs.length === 0)
      throw new Error(
        "Specific feedback was found but extraction returned no observations.",
      );
    const matches: (string | null)[] = [];
    for (const input of inputs) {
      if (aiMode() === "fixture") {
        matches.push(
          (input as ObservationInput & { expectedThemeId?: string })
            .expectedThemeId ?? null,
        );
        continue;
      }
      const branchThemes = await db
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
            eq(themes.type, typeForKind(input.kind)),
          ),
        );
      const candidates = candidateThemes(
        branchThemes,
        review.branchId,
        input.kind,
        `${input.aspect} ${input.normalizedDescription}`,
      );
      const match = await matchWithOpenAI(input, candidates);
      if (
        match.themeId &&
        !candidates.some((candidate) => candidate.id === match.themeId)
      )
        throw new Error("Theme match returned an invalid or cross-branch ID.");
      matches.push(match.themeId || null);
    }
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
      error instanceof Error &&
      /OpenAI model configuration error|OPENAI_API_KEY is not configured/.test(
        error.message,
      )
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
  const observation = input.useful
    ? observationSchema.parse(input.observation)
    : null;
  if (observation) verifyEvidence(review.originalText, [observation]);
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
  if (old) await recalculatePriority(old.themeId);
  if (destinationThemeId) await recalculatePriority(destinationThemeId);
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
  status: "owner_confirmed" | "dismissed",
  role: string,
) {
  requireOwner(role);
  const theme = await oneTheme(themeId);
  requireTransition(theme.status, ["suggested"], status);
  await db
    .update(themes)
    .set({ status, updatedAt: now() })
    .where(eq(themes.id, themeId));
  await event(
    status === "dismissed" ? "theme_dismissed" : "theme_confirmed",
    "theme",
    themeId,
    `Owner ${status === "dismissed" ? "dismissed" : "confirmed"} the suggested theme.`,
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
  const [existing] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.themeId, themeId));
  if (existing) return existing;
  const id = randomUUID();
  await db.insert(tasks).values({
    id,
    themeId,
    branchId: theme.branchId,
    title: `Inspect ${theme.title.toLowerCase()}`,
    description: `Inspect the evidence for ${theme.title.toLowerCase()} and record what was actually done.`,
    assigneeRole: "floor manager",
    status: "proposed",
  });
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
  input: { title: string; description: string; assigneeRole: string },
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  requireTransition(task.status, ["proposed"], "edit");
  const title = input.title.trim(),
    description = input.description.trim(),
    assigneeRole = input.assigneeRole.trim();
  if (!title || !description || !assigneeRole)
    throw new Error("Task title, description, and assignee are required.");
  await db
    .update(tasks)
    .set({ title, description, assigneeRole })
    .where(eq(tasks.id, taskId));
  await event(
    "task_edited",
    "task",
    taskId,
    "Owner edited the task proposal.",
    "demo owner",
    "owner",
  );
}
export async function decideTask(
  taskId: string,
  role: string,
  decision: "approve" | "reject" | "defer",
) {
  requireOwner(role);
  const task = await oneTask(taskId);
  if (decision === "approve" && task.status === "approved_open") return task;
  requireTransition(task.status, ["proposed"], decision);
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
  const evidence = await db
    .select({
      reviewId: observations.reviewId,
      quote: observations.evidenceQuote,
    })
    .from(memberships)
    .innerJoin(observations, eq(observations.id, memberships.observationId))
    .where(eq(memberships.themeId, task.themeId));
  const payload = {
    business: restaurantConfig.businessName,
    branch: theme.branchId,
    title: task.title,
    description: task.description,
    assigneeRole: task.assigneeRole,
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
      .where(and(eq(tasks.id, taskId), eq(tasks.status, "proposed")))
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
      description: "Simulated Orbyte integration handoff saved locally.",
    });
  });
  return await oneTask(taskId);
}
export async function resolveTask(taskId: string, role: string, note: string) {
  requireOwner(role);
  const task = await oneTask(taskId);
  requireTransition(task.status, ["approved_open"], "resolved");
  if (note.trim().length < 10)
    throw new Error(
      "A resolution note of at least 10 characters is required. Describe what actually happened.",
    );
  await db
    .update(tasks)
    .set({ status: "resolved", resolutionNote: note.trim(), resolvedAt: now() })
    .where(eq(tasks.id, taskId));
  await event(
    "task_resolved",
    "task",
    taskId,
    "Owner recorded the completed work and a resolution note.",
    "demo owner",
    "owner",
    { note: note.trim() },
  );
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
  let text: string,
    provider: string,
    model: string | null = null;
  if (aiMode() === "live") {
    const draft = await draftWithOpenAI(
      review.originalText,
      task.resolutionNote!,
    );
    text = draft.text;
    provider = "openai";
    model = modelName();
  } else {
    text = `Thank you for sharing your experience at Nusa Table. We appreciate your feedback about the seating${/fried rice|nasi goreng/i.test(review.originalText) ? " and your kind words about the fried rice" : ""}. Our team has reviewed the concern and recorded the action taken. Thank you for helping us improve.`;
    provider = "fixture";
  }
  const id = randomUUID();
  await db
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
    })
    .onConflictDoNothing();
  await event(
    "reply_drafted",
    "reply",
    id,
    `Draft created by ${provider}; owner approval required.`,
    "system",
    "system",
  );
  return await oneReply(id);
}
export async function editReply(replyId: string, role: string, text: string) {
  requireOwner(role);
  const reply = await oneReply(replyId);
  if (text.trim().length < 10 || text.length > 1200)
    throw new Error("Reply must be 10–1200 characters.");
  await db
    .update(replies)
    .set({
      text: text.trim(),
      status: "draft",
      editedAt: now(),
      approvedAt: null,
      approver: null,
    })
    .where(eq(replies.id, replyId));
  await event(
    "reply_edited",
    "reply",
    replyId,
    reply.status === "approved_ready"
      ? "Edited approved reply returned to draft."
      : "Owner edited the reply draft.",
    "demo owner",
    "owner",
  );
}
export async function approveReply(replyId: string, role: string) {
  requireOwner(role);
  const reply = await oneReply(replyId);
  if (reply.status === "approved_ready") return reply;
  requireTransition(reply.status, ["draft"], "approved_ready");
  const task = await oneTask(reply.taskId);
  canDraftReply(task.status, task.resolutionNote);
  await db
    .update(replies)
    .set({
      status: "approved_ready",
      approvedAt: now(),
      approver: "demo owner",
    })
    .where(eq(replies.id, replyId));
  await event(
    "reply_approved",
    "reply",
    replyId,
    "Owner approved the reply; ready to post manually. Nothing was published.",
    "demo owner",
    "owner",
  );
  return await oneReply(replyId);
}
export async function analyzePendingBatch(limit = 5) {
  const pending = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.processingStatus, "pending"))
    .limit(Math.max(1, Math.min(limit, 5)));
  const results = [];
  for (const item of pending) results.push(await analyzeReview(item.id));
  return results;
}
