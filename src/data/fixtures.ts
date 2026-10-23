import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { observationSchema, type ObservationInput } from "@/domain/analysis";
const root = resolve(process.cwd(), "data/fixtures/visit2value");
const seedReviewSchema = z.object({
  id: z.string(),
  businessId: z.enum(["nusa-table", "harbour-house", "luma-salon"]),
  branchId: z.string().min(1),
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
const hotelRoot = resolve(root, "hotel");
export const hotelSeedReviews = z
  .array(seedReviewSchema)
  .parse(
    JSON.parse(readFileSync(resolve(hotelRoot, "reviews.seed.json"), "utf8")),
  );
export const hotelDemoReviews = z
  .array(seedReviewSchema)
  .parse(
    JSON.parse(
      readFileSync(resolve(hotelRoot, "reviews.demo-new.json"), "utf8"),
    ),
  );
export const salonSeedReviews = z
  .array(seedReviewSchema)
  .parse(
    JSON.parse(readFileSync(resolve(hotelRoot, "salon.seed.json"), "utf8")),
  );
const generatedAnalysis = [
  "reviews.analysis.json",
  "salon.analysis.json",
  "reviews.demo-analysis.json",
].flatMap((file) =>
  z
    .array(
      z.object({
        reviewId: z.string(),
        useful: z.boolean(),
        observations: z.array(
          observationSchema.extend({ expectedThemeId: z.string().optional() }),
        ),
      }),
    )
    .parse(JSON.parse(readFileSync(resolve(hotelRoot, file), "utf8"))),
);
const generatedById = new Map(
  generatedAnalysis.map((row) => [row.reviewId, row]),
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
export function fixtureForExactText(
  text: string,
  businessId?: string,
): FixtureAnalysis | null {
  const review = [
    ...seedReviews,
    ...demoReviews,
    ...hotelSeedReviews,
    ...hotelDemoReviews,
    ...salonSeedReviews,
  ].find(
    (item) =>
      item.text === text && (!businessId || item.businessId === businessId),
  );
  if (!review) {
    const candidate = [
      ...hotelSeedReviews,
      ...hotelDemoReviews,
      ...salonSeedReviews,
      ...seedReviews,
      ...demoReviews,
    ]
      .filter((item) => !businessId || item.businessId === businessId)
      .map((item) => ({
        item,
        analysis:
          fromExpected(item.id) ?? extra[item.id] ?? generatedById.get(item.id),
      }))
      .find(
        ({ item, analysis }) =>
          item.text.length >= 20 && text.includes(item.text) && analysis,
      );
    if (!candidate?.analysis) return null;
    const observations = candidate.analysis.observations.filter((point) =>
      text.includes(point.evidenceQuote),
    );
    if (!observations.length && candidate.analysis.useful) return null;
    return { useful: observations.length > 0, observations };
  }
  return (
    fromExpected(review.id) ??
    extra[review.id] ??
    generatedById.get(review.id) ??
    null
  );
}
export function seedFixture(reviewId: string) {
  return fromExpected(reviewId) ?? generatedById.get(reviewId) ?? null;
}
