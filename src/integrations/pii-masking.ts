import { scrubPII } from "@/domain/privacy";

/**
 * Masks guest personally identifiable information (PII) before transmission
 * across third-party LLM or integration boundaries.
 */
export function maskGuestPii(text: string): string {
  return scrubPII(text).sanitizedText;
}

