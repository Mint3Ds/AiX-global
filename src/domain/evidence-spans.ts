export type EvidenceSpan = { id: string; text: string };

/** Keep sentence text exactly as it appears in the original review. */
export function evidenceSpans(reviewText: string): EvidenceSpan[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
  const spans = [...segmenter.segment(reviewText)]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
  return spans.map((text, index) => ({ id: `s${index + 1}`, text }));
}
