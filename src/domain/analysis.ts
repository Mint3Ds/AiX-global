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
  businessId: z.string().min(1),
  branchId: z.string().min(1),
  source: z.string().min(3).max(100),
  sourceReviewId: z.string().min(3).max(100),
  rating: z.number().int().min(1).max(5),
  reviewedAt: z.iso.datetime({ offset: true }),
  text: z
    .string()
    .max(3000, "Review text must be 3000 characters or fewer.")
    .refine((text) => text.trim().length >= 5, {
      message: "Write at least 5 characters of review text.",
    }),
  isSynthetic: z.literal(true),
});
export function verifyEvidence(text: string, inputs: ObservationInput[]) {
  const equivalent = (character: string) =>
    character === "‘" || character === "’"
      ? "'"
      : character === "“" || character === "”"
        ? '"'
        : character;
  return inputs.map((input) => {
    const quote = input.evidenceQuote;
    for (let start = 0; start <= text.length - quote.length; start++) {
      let matches = true;
      for (let index = 0; index < quote.length; index++) {
        if (equivalent(text[start + index]) !== equivalent(quote[index])) {
          matches = false;
          break;
        }
      }
      if (matches)
        return {
          ...input,
          evidenceQuote: text.slice(start, start + quote.length),
        };
    }
    throw new Error(
      "Evidence quote is not an exact substring of the review after supported quotation-mark normalization.",
    );
  });
}
