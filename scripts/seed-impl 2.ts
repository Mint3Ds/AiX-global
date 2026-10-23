import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/data/db";
import {
  businesses,
  branches,
  reviews,
  analysisRuns,
  observations,
  themes,
  memberships,
  tasks,
  events,
} from "../src/data/schema";
import { seedReviews, seedFixture } from "../src/data/fixtures";
import { restaurantConfig, themeCatalog } from "../src/config/business";
import { priorityFor } from "../src/config/priority";
import { verifyEvidence } from "../src/domain/analysis";
import { detectReviewLanguage } from "../src/domain/language";
try {
  await db
    .insert(businesses)
    .values({
      id: restaurantConfig.businessId,
      name: restaurantConfig.businessName,
      businessType: restaurantConfig.businessType,
      timezone: restaurantConfig.timezone,
    })
    .onConflictDoNothing();
  for (const [id, name] of [
    ["sunway", "Nusa Table Sunway"],
    ["bangsar", "Nusa Table Bangsar"],
  ])
    await db
      .insert(branches)
      .values({
        id,
        businessId: restaurantConfig.businessId,
        name,
        locationLabel:
          id === "sunway" ? "Sunway, Selangor" : "Bangsar, Kuala Lumpur",
      })
      .onConflictDoNothing();
  for (const [id, t] of Object.entries(themeCatalog))
    await db
      .insert(themes)
      .values({
        id,
        businessId: restaurantConfig.businessId,
        branchId: t.branchId,
        title: t.title,
        type: t.type,
        severity: t.severity,
        priority: "low",
        priorityReason: "Awaiting evidence count.",
      })
      .onConflictDoNothing();
  for (const review of seedReviews) {
    await db
      .insert(reviews)
      .values({
        id: review.id,
        businessId: review.businessId,
        branchId: review.branchId,
        source: review.source,
        sourceReviewId: review.sourceReviewId,
        rating: review.rating,
        reviewedAt: new Date(review.reviewedAt),
        originalText: review.text,
        isSynthetic: true,
        processingStatus: "pending",
        language: detectReviewLanguage(review.text),
      })
      .onConflictDoUpdate({
        target: reviews.id,
        set: {
          branchId: review.branchId,
          language: detectReviewLanguage(review.text),
        },
      });
    const fixture = seedFixture(review.id);
    if (!fixture) continue;
    const existing = await db
      .select({ id: analysisRuns.id })
      .from(analysisRuns)
      .where(eq(analysisRuns.reviewId, review.id))
      .limit(1);
    if (existing.length) continue;
    verifyEvidence(review.text, fixture.observations);
    await db.transaction(async (tx) => {
      const runId = randomUUID();
      await tx.insert(analysisRuns).values({
        id: runId,
        reviewId: review.id,
        decision: fixture.useful ? "contains_specific_feedback" : "generic",
        screeningProvider: "fixture",
        extractionProvider: fixture.useful ? "fixture" : null,
        matchingProvider: fixture.useful ? "fixture" : null,
        promptVersion: "fixture-v1",
        mode: "fixture",
      });
      for (const input of fixture.observations) {
        const id = randomUUID();
        const start = review.text.indexOf(input.evidenceQuote);
        await tx.insert(observations).values({
          id,
          reviewId: review.id,
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
          provider: "fixture",
          mode: "fixture",
        });
        if (
          input.expectedThemeId &&
          themeCatalog[input.expectedThemeId]?.branchId === review.branchId
        )
          await tx.insert(memberships).values({
            themeId: input.expectedThemeId,
            observationId: id,
            source: "fixture",
            confirmation: "suggested",
          });
      }
      await tx
        .update(reviews)
        .set({
          processingStatus: fixture.useful ? "complete" : "generic",
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, review.id));
    });
  }
  for (const [id, t] of Object.entries(themeCatalog)) {
    const result = await db.execute(
      sql`SELECT count(DISTINCT o.review_id)::integer AS count FROM theme_memberships m JOIN observations o ON o.id=m.observation_id WHERE m.theme_id=${id}`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    const p = priorityFor(t.type, count, t.severity);
    await db
      .update(themes)
      .set({ priority: p.priority, priorityReason: p.reason })
      .where(eq(themes.id, id));
  }
  await db
    .insert(tasks)
    .values({
      id: "task-sunway-seating",
      themeId: "sunway-seating",
      branchId: "sunway",
      title: "Inspect and repair unstable seating",
      description:
        "Inspect seating at the Sunway branch; repair or replace any unsafe items found. Record what was actually done.",
      assigneeRole: "floor manager",
      status: "proposed",
    })
    .onConflictDoNothing();
  await db
    .insert(events)
    .values({
      id: "event-seed-v1",
      actor: "seed process",
      role: "system",
      type: "dataset_seeded",
      entityType: "business",
      entityId: "nusa-table",
      description:
        "Loaded synthetic seed reviews and labelled fixture analysis subset.",
      metadata: { reviewCount: seedReviews.length },
    })
    .onConflictDoNothing();
  console.log(
    `Seed ready: ${seedReviews.length} reviews; separate demo reviews were not inserted.`,
  );
} finally {
  await pool.end();
}
