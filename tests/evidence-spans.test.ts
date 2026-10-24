import { describe, expect, it } from "vitest";
import { verifyEvidence, type ObservationInput } from "../src/domain/analysis";
import { evidenceSpans } from "../src/domain/evidence-spans";
import { normalizeOpenAIError } from "../src/integrations/provider-errors";

const observation = (evidenceQuote: string): ObservationInput => ({
  category: "service",
  aspect: "check-in",
  kind: "operational_complaint",
  sentiment: "negative",
  summary: "Slow check-in",
  normalizedDescription: "Check-in took too long",
  evidenceQuote,
});

describe("source evidence", () => {
  it("saves the exact source punctuation after a known quote variation", () => {
    const text = "The guest said “check-in wasn’t ready.” We waited.";
    const [verified] = verifyEvidence(text, [
      observation('The guest said "check-in wasn\'t ready."'),
    ]);
    expect(verified.evidenceQuote).toBe(
      "The guest said “check-in wasn’t ready.”",
    );
    expect(text.includes(verified.evidenceQuote)).toBe(true);
  });

  it("rejects paraphrases and stitched excerpts", () => {
    const text = "The room was late. The bed was comfortable.";
    expect(() =>
      verifyEvidence(text, [observation("The room was delayed.")]),
    ).toThrow();
    expect(() =>
      verifyEvidence(text, [observation("The room was late. The bed")]),
    ).not.toThrow();
    expect(() =>
      verifyEvidence(text, [
        observation("The room was late. bed was comfortable."),
      ]),
    ).toThrow();
  });

  it("returns numbered original sentences for model references", () => {
    const text = "The room was late. The bed was comfortable!";
    expect(evidenceSpans(text)).toEqual([
      { id: "s1", text: "The room was late." },
      { id: "s2", text: "The bed was comfortable!" },
    ]);
  });
});

describe("provider errors", () => {
  it("returns useful categories without passing through SDK response text", () => {
    expect(
      normalizeOpenAIError({ name: "APIConnectionTimeoutError" }).kind,
    ).toBe("timeout");
    expect(
      normalizeOpenAIError({ status: 401, message: "secret response" }).message,
    ).not.toContain("secret");
    expect(normalizeOpenAIError({ status: 429 }).kind).toBe("rate_limit");
    expect(normalizeOpenAIError({ status: 503 }).kind).toBe("availability");
  });
});
