import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/data/db";
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
  events,
} from "../src/data/schema";
import {
  seedReviews,
  hotelSeedReviews,
  salonSeedReviews,
  seedFixture,
} from "../src/data/fixtures";
import {
  businessConfigs,
  restaurantConfig,
  themeCatalog,
} from "../src/config/business";
import { priorityFor, priorityRules } from "../src/config/priority";
import { verifyEvidence } from "../src/domain/analysis";
import { detectReviewLanguage } from "../src/domain/language";
const seedLegacyReviews = process.env.SEED_LEGACY_REVIEWS === "yes";
try {
  for (const config of businessConfigs)
    await db
      .insert(businesses)
      .values({
        id: config.businessId,
        name: config.businessName,
        businessType: config.businessType,
        timezone: config.timezone,
      })
      .onConflictDoNothing();
  const branchSeed = [
    ["sunway", "Nusa Table Sunway", "nusa-table", "Sunway, Selangor"],
    ["bangsar", "Nusa Table Bangsar", "nusa-table", "Bangsar, Kuala Lumpur"],
    ["hotel-central", "Harbour House Central", "harbour-house", "Kuala Lumpur"],
    ["hotel-garden", "Harbour House Garden", "harbour-house", "Petaling Jaya"],
    ["salon-main", "Luma Salon", "luma-salon", "Kuala Lumpur"],
  ] as const;
  for (const [id, name, businessId, locationLabel] of branchSeed)
    await db
      .insert(branches)
      .values({
        id,
        businessId,
        name,
        locationLabel,
      })
      .onConflictDoNothing();
  for (const [id, businessId, branchId, name, jobTitle] of [
    [
      "hotel-employee-1",
      "harbour-house",
      "hotel-central",
      "Aina Rahman",
      "Maintenance technician",
    ],
    [
      "hotel-employee-2",
      "harbour-house",
      "hotel-central",
      "Daniel Lim",
      "Housekeeping lead",
    ],
    [
      "hotel-employee-3",
      "harbour-house",
      "hotel-garden",
      "Sara Wong",
      "Duty supervisor",
    ],
    [
      "hotel-employee-4",
      "harbour-house",
      "hotel-central",
      "Nurul Aziz",
      "Front desk supervisor",
    ],
    [
      "hotel-employee-5",
      "harbour-house",
      "hotel-central",
      "Wei Jian",
      "Facilities technician",
    ],
    [
      "hotel-employee-6",
      "harbour-house",
      "hotel-garden",
      "Priya Nair",
      "Housekeeping supervisor",
    ],
    [
      "hotel-employee-7",
      "harbour-house",
      "hotel-garden",
      "Amir Hakim",
      "Guest services agent",
    ],
    [
      "hotel-employee-8",
      "harbour-house",
      "hotel-garden",
      "Chloe Tan",
      "Maintenance technician",
    ],
    [
      "restaurant-employee-1",
      "nusa-table",
      "sunway",
      "Farah Ismail",
      "Floor manager",
    ],
    ["salon-employee-1", "luma-salon", "salon-main", "Maya Tan", "Stylist"],
    [
      "salon-employee-2",
      "luma-salon",
      "salon-main",
      "Alicia Lee",
      "Senior stylist",
    ],
    [
      "salon-employee-3",
      "luma-salon",
      "salon-main",
      "Hana Yusuf",
      "Receptionist",
    ],
  ] as const)
    await db
      .insert(employees)
      .values({ id, businessId, branchId, name, jobTitle })
      .onConflictDoNothing();
  for (const [id, t] of Object.entries(themeCatalog))
    await db
      .insert(themes)
      .values({
        id,
        businessId: branchSeed.find(
          ([branchId]) => branchId === t.branchId,
        )![2],
        branchId: t.branchId,
        title: t.title,
        type: t.type,
        severity: t.severity,
        priority: "low",
        priorityReason: "Awaiting evidence count.",
      })
      .onConflictDoNothing();
  for (const review of seedLegacyReviews
    ? [...seedReviews, ...hotelSeedReviews, ...salonSeedReviews]
    : []) {
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
      .onConflictDoNothing();
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
  for (const [id] of Object.entries(themeCatalog)) {
    const result = await db.execute(
      sql`SELECT count(DISTINCT o.review_id)::integer AS count,
        count(DISTINCT o.review_id) FILTER (WHERE r.reviewed_at >= now() - (${priorityRules.recentDays} * interval '1 day'))::integer AS recent
        FROM theme_memberships m JOIN observations o ON o.id=m.observation_id JOIN reviews r ON r.id=o.review_id WHERE m.theme_id=${id}`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    const recent = Number(result.rows[0]?.recent ?? 0);
    const [current] = await db.select().from(themes).where(eq(themes.id, id));
    const p = priorityFor(
      current.type,
      count,
      current.severity,
      recent,
      current.status === "recurrence",
    );
    await db
      .update(themes)
      .set({ priority: p.priority, priorityReason: p.reason })
      .where(eq(themes.id, id));
  }
  if (seedLegacyReviews)
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
  if (seedLegacyReviews)
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
        businessId: restaurantConfig.businessId,
        metadata: { reviewCount: seedReviews.length },
      })
      .onConflictDoNothing();
  console.log(
    seedLegacyReviews
      ? `Seed ready: ${seedReviews.length} restaurant, ${hotelSeedReviews.length} hotel, ${salonSeedReviews.length} salon reviews; separate demo reviews were not inserted.`
      : "Business, branch, employee, and theme records ready for new review batches.",
  );
} finally {
  await pool.end();
}
