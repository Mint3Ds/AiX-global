import type { Screening } from "./analysis";
export type ScreenOutcome =
  | {
      ok: true;
      result: Screening;
      provider: "jev" | "openai_fallback";
      model: string;
      jevError?: unknown;
    }
  | {
      ok: false;
      provider: "openai_fallback";
      model: string;
      jevError: unknown;
      openaiError: unknown;
    };
// Injection keeps the fallback rule testable without provider credentials.
export async function screenWithFallback(
  text: string,
  jev: (text: string) => Promise<{ result: Screening; model: string }>,
  openai: (text: string) => Promise<Screening>,
  openaiModel: string,
): Promise<ScreenOutcome> {
  try {
    const answer = await jev(text);
    return {
      ok: true,
      result: answer.result,
      provider: "jev",
      model: answer.model,
    };
  } catch (jevError) {
    try {
      return {
        ok: true,
        result: await openai(text),
        provider: "openai_fallback",
        model: openaiModel,
        jevError,
      };
    } catch (openaiError) {
      return {
        ok: false,
        provider: "openai_fallback",
        model: openaiModel,
        jevError,
        openaiError,
      };
    }
  }
}
