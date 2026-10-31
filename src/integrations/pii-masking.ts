import { scrubPII } from "@/domain/privacy";

/** Compatibility adapter for integrations that mask text at provider edges. */
export function maskGuestPii(text: string): string {
  return scrubPII(text).sanitizedText;
}
