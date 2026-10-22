import { z } from "zod";
export const observationSchema = z.object({
  category: z.string().min(1),
  aspect: z.string().min(1),
  kind: z.enum([
    "operational_complaint",
    "suggestion",
    "specific_praise",
    "other_specific_feedback",
  ]),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  evidenceQuote: z.string().min(1),
  summary: z.string().min(1),
  normalizedDescription: z.string().min(1),
});
export const screeningSchema = z.object({
  containsSpecificFeedback: z.boolean(),
  reason: z.string(),
});
export const extractionSchema = z.object({
  observations: z.array(observationSchema),
});
export const matchingSchema = z.object({
  themeId: z.string(),
  reason: z.string(),
});
export const replySchema = z.object({ text: z.string().min(1).max(1200) });
export type ObservationInput = z.infer<typeof observationSchema>;
export type Screening = z.infer<typeof screeningSchema>;
export type Match = z.infer<typeof matchingSchema>;
export const intakeSchema = z.object({
  branchId: z.enum(["sunway", "bangsar"]),
  source: z.enum([
    "Demo Review Portal A",
    "Demo Review Portal B",
    "Demo Feedback Form",
  ]),
  sourceReviewId: z.string().min(3).max(100),
  rating: z.number().int().min(1).max(5),
  reviewedAt: z.iso.datetime({ offset: true }),
  text: z.string().trim().min(5).max(3000),
  isSynthetic: z.literal(true),
});
export function verifyEvidence(text: string, inputs: ObservationInput[]) {
  for (const input of inputs)
    if (!text.includes(input.evidenceQuote))
      throw new Error(
        `Evidence quote is not an exact substring of the review: ${input.evidenceQuote}`,
      );
  return inputs;
}
