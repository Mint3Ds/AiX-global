import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { observationSchema, type ObservationInput } from "@/domain/analysis";
const root = resolve(process.cwd(), "data/fixtures/visit2value");
const seedReviewSchema = z.object({
  id: z.string(),
  businessId: z.literal("nusa-table"),
  branchId: z.enum(["sunway", "bangsar"]),
  source: z.string(),
  sourceReviewId: z.string(),
  rating: z.number().int().min(1).max(5),
  reviewedAt: z.iso.datetime({ offset: true }),
  text: z.string(),
  isSynthetic: z.literal(true),
});
export type FixtureReview = z.infer<typeof seedReviewSchema>;
export const seedReviews = z
  .array(seedReviewSchema)
  .parse(JSON.parse(readFileSync(resolve(root, "reviews.seed.json"), "utf8")));
export const demoReviews = z
  .array(seedReviewSchema)
  .parse(
    JSON.parse(readFileSync(resolve(root, "reviews.demo-new.json"), "utf8")),
  );
const expected = z
  .object({
    reviews: z.array(
      z.object({
        reviewId: z.string(),
        hasSpecificUsefulBusinessFeedback: z.boolean(),
        expectedObservations: z.array(
          z.object({
            category: z.string(),
            aspect: z.string(),
            kind: z.string(),
            sentiment: z.string(),
            evidenceQuote: z.string(),
            normalizedSummary: z.string(),
            expectedThemeId: z.string().optional(),
          }),
        ),
      }),
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(resolve(root, "reviews.expected-analysis.json"), "utf8"),
    ),
  );
export type FixtureObservation = ObservationInput & {
  expectedThemeId?: string;
};
export type FixtureAnalysis = {
  useful: boolean;
  observations: FixtureObservation[];
};
function fromExpected(reviewId: string): FixtureAnalysis | null {
  const item = expected.reviews.find((row) => row.reviewId === reviewId);
  if (!item) return null;
  return {
    useful: item.hasSpecificUsefulBusinessFeedback,
    observations: item.expectedObservations
      .map((row) => ({
        category: row.category,
        aspect: row.aspect,
        kind:
          row.kind === "other"
            ? "other_specific_feedback"
            : (row.kind as ObservationInput["kind"]),
        sentiment: row.sentiment as ObservationInput["sentiment"],
        evidenceQuote: row.evidenceQuote,
        summary: row.normalizedSummary,
        normalizedDescription: row.normalizedSummary,
        expectedThemeId: row.expectedThemeId,
      }))
      .map((row) => ({
        ...observationSchema.parse(row),
        expectedThemeId: row.expectedThemeId,
      })),
  };
}
const extra: Record<string, FixtureAnalysis> = {
  "demo-review-002": { useful: false, observations: [] },
  "demo-review-003": {
    useful: true,
    observations: [
      {
        category: "food",
        aspect: "noodles",
        kind: "specific_praise",
        sentiment: "positive",
        evidenceQuote: "The noodles had a lovely springy texture.",
        summary: "Noodles had a pleasant springy texture.",
        normalizedDescription: "Noodles have a pleasant texture.",
      },
    ],
  },
  "demo-review-004": {
    useful: true,
    observations: [
      {
        category: "pricing",
        aspect: "tea_size",
        kind: "suggestion",
        sentiment: "neutral",
        evidenceQuote: "Could you offer a smaller tea size at a lower price?",
        summary: "Consider a smaller lower-priced tea.",
        normalizedDescription: "Request for a smaller lower-priced tea.",
      },
    ],
  },
  "demo-review-005": {
    useful: true,
    observations: [
      {
        category: "menu",
        aspect: "vegetarian_variety",
        kind: "suggestion",
        sentiment: "neutral",
        evidenceQuote: "Pilihan tanpa daging boleh ditambah lagi",
        summary: "Consider more meat-free choices.",
        normalizedDescription: "Request for more vegetarian choices.",
        expectedThemeId: "vegetarian-options",
      },
      {
        category: "staff",
        aspect: "friendliness",
        kind: "specific_praise",
        sentiment: "positive",
        evidenceQuote: "staf pun sangat mesra.",
        summary: "Staff were friendly.",
        normalizedDescription: "Staff friendliness praised.",
      },
    ],
  },
};
export function fixtureForExactText(text: string): FixtureAnalysis | null {
  const review = [...seedReviews, ...demoReviews].find(
    (item) => item.text === text,
  );
  if (!review) return null;
  return fromExpected(review.id) ?? extra[review.id] ?? null;
}
export function seedFixture(reviewId: string) {
  return fromExpected(reviewId);
}
