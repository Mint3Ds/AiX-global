import { scrubPII } from "@/domain/privacy";

/**
 * Mask guest personal identifiers at the integration/provider boundary before
 * payloads leave the system or are sent to external services.
 */
export function maskGuestPii(text: string): string {
  return scrubPII(text).sanitizedText;
}
