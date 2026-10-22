import { describe, expect, it, vi } from "vitest";
import { screenWithFallback } from "../src/domain/screening";
const feedback = "The fried rice was amazing.";
describe("Jev to OpenAI screening", () => {
  it("uses Jev for specific praise and skips fallback", async () => {
    const jev = vi.fn().mockResolvedValue({
      result: { containsSpecificFeedback: true, reason: "dish named" },
      model: "jev-latest",
    });
    const openai = vi.fn();
    const result = await screenWithFallback(
      feedback,
      jev,
      openai,
      "gpt-5-mini",
    );
    expect(result.ok && result.provider).toBe("jev");
    expect(openai).not.toHaveBeenCalled();
  });
  it("asks OpenAI the same decision after Jev fails", async () => {
    const jev = vi.fn().mockRejectedValue(new Error("timeout"));
    const openai = vi.fn().mockResolvedValue({
      containsSpecificFeedback: false,
      reason: "vague opinion",
    });
    const result = await screenWithFallback(
      "Amazing!",
      jev,
      openai,
      "gpt-5-mini",
    );
    expect(result).toMatchObject({
      ok: true,
      provider: "openai_fallback",
      model: "gpt-5-mini",
      result: { containsSpecificFeedback: false },
    });
    expect(openai).toHaveBeenCalledWith("Amazing!");
  });
  it("reports both-provider failure instead of inserting a fixture", async () => {
    const result = await screenWithFallback(
      feedback,
      async () => {
        throw new Error("timeout");
      },
      async () => {
        throw new Error("unavailable");
      },
      "gpt-5-mini",
    );
    expect(result).toMatchObject({ ok: false, provider: "openai_fallback" });
  });
});
