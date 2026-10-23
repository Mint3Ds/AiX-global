import { and, eq } from "drizzle-orm";
import nextEnv from "@next/env";
import { hotelSeedReviews, seedFixture } from "../src/data/fixtures";
import { analysisRuns, observations, reviews } from "../src/data/schema";

nextEnv.loadEnvConfig(process.cwd());
const { db, pool } = await import("../src/data/db");

let updated = 0;
let skipped = 0;

try {
  for (const fixtureReview of hotelSeedReviews) {
    const fixture = seedFixture(fixtureReview.id);
    if (!fixture) continue;
    const [stored] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, fixtureReview.id));
    if (!stored) continue;
    if (
      !stored.isSynthetic ||
      stored.businessId !== fixtureReview.businessId ||
      stored.sourceReviewId !== fixtureReview.sourceReviewId
    ) {
      skipped++;
      continue;
    }
    const runs = await db
      .select()
      .from(analysisRuns)
      .where(eq(analysisRuns.reviewId, stored.id));
    if (runs.length !== 1 || runs[0].mode !== "fixture") {
      skipped++;
      continue;
    }
    const points = await db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.reviewId, stored.id),
          eq(observations.analysisRunId, runs[0].id),
        ),
      );
    if (points.length !== fixture.observations.length) {
      skipped++;
      continue;
    }
    const orderedPoints = points.sort(
      (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0),
    );
    const oldQuotes = orderedPoints.map((point) => point.evidenceQuote);
    if (
      oldQuotes.some((quote) => !stored.originalText.includes(quote)) ||
      fixture.observations.some(
        (point) => !fixtureReview.text.includes(point.evidenceQuote),
      )
    ) {
      skipped++;
      continue;
    }
    if (stored.originalText === fixtureReview.text) continue;

    await db.transaction(async (tx) => {
      await tx
        .update(reviews)
        .set({ originalText: fixtureReview.text, updatedAt: new Date() })
        .where(eq(reviews.id, stored.id));
      for (let index = 0; index < orderedPoints.length; index++) {
        const point = fixture.observations[index];
        const start = fixtureReview.text.indexOf(point.evidenceQuote);
        await tx
          .update(observations)
          .set({
            evidenceQuote: point.evidenceQuote,
            summary: point.summary,
            normalizedDescription: point.normalizedDescription,
            startOffset: start,
            endOffset: start + point.evidenceQuote.length,
          })
          .where(eq(observations.id, orderedPoints[index].id));
      }
    });
    updated++;
  }
  console.log(
    `Updated ${updated} hotel fixture reviews; skipped ${skipped} nonmatching records.`,
  );
} finally {
  await pool.end();
}
