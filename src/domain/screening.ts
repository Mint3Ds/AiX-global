import type { Screening } from "./analysis";
export type ScreenOutcome =
  | {
      ok: true;
      result: Screening;
      provider: "jev" | "openai_fallback";
      model: string;
      jevError?: unknown;
      timings: { jevMs: number; openaiFallbackMs: number };
    }
  | {
      ok: false;
      provider: "openai_fallback";
      model: string;
      jevError: unknown;
      openaiError: unknown;
      timings: { jevMs: number; openaiFallbackMs: number };
    };
// Injection keeps the fallback rule testable without provider credentials.
export async function screenWithFallback(
  text: string,
  jev: (text: string) => Promise<{ result: Screening; model: string }>,
  openai: (text: string) => Promise<Screening>,
  openaiModel: string,
): Promise<ScreenOutcome> {
  const started = performance.now();
  let jevMs = 0;
  let openaiFallbackMs = 0;
  let fallbackStarted = 0;
  try {
    const answer = await jev(text);
    jevMs = Math.round(performance.now() - started);
    return {
      ok: true,
      result: answer.result,
      provider: "jev",
      model: answer.model,
      timings: { jevMs, openaiFallbackMs },
    };
  } catch (jevError) {
    jevMs = Math.round(performance.now() - started);
    fallbackStarted = performance.now();
    try {
      const result = await openai(text);
      openaiFallbackMs = Math.round(performance.now() - fallbackStarted);
      return {
        ok: true,
        result,
        provider: "openai_fallback",
        model: openaiModel,
        jevError,
        timings: { jevMs, openaiFallbackMs },
      };
    } catch (openaiError) {
      openaiFallbackMs = Math.round(performance.now() - fallbackStarted);
      return {
        ok: false,
        provider: "openai_fallback",
        model: openaiModel,
        jevError,
        openaiError,
        timings: { jevMs, openaiFallbackMs },
      };
    }
  }
}
