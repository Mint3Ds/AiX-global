import { describe, expect, it } from "vitest";
import { anonymizeReviewerName, scrubPII } from "@/domain/privacy";
import { maskGuestPii } from "@/integrations/pii-masking";

describe("review privacy sanitizer", () => {
  it("redacts email addresses", () => {
    expect(scrubPII("Contact me at user@domain.com")).toEqual({
      sanitizedText: "Contact me at [EMAIL REDACTED]",
      redactionCount: 1,
    });
  });

  it("redacts Malaysian mobile numbers", () => {
    expect(scrubPII("Call +6012-3456789 or 012-345 6789")).toEqual({
      sanitizedText: "Call [PHONE REDACTED] or [PHONE REDACTED]",
      redactionCount: 2,
    });
  });

  it("redacts Malaysian identity and card number patterns", () => {
    expect(scrubPII("IC 900101-14-1234; card 4111 1111 1111 1111")).toEqual({
      sanitizedText: "IC [IC REDACTED]; card [CARD REDACTED]",
      redactionCount: 2,
    });
  });

  it("redacts labelled passport, booking, vehicle, and room identifiers", () => {
    expect(
      scrubPII(
        "Passport no. A12345678; booking reference HTL-88XZ1; car plate WXY 1234; room 1807.",
      ),
    ).toEqual({
      sanitizedText:
        "Passport no. [PASSPORT REDACTED]; booking reference [BOOKING REFERENCE REDACTED]; car plate [VEHICLE REGISTRATION REDACTED]; room [ROOM NUMBER REDACTED].",
      redactionCount: 4,
    });
  });

  it("redacts social handles and explicitly provided addresses", () => {
    expect(
      scrubPII(
        "Message @guest_88. My home address is 12 Jalan Ampang, Kuala Lumpur; please post it.",
      ),
    ).toEqual({
      sanitizedText:
        "Message [SOCIAL HANDLE REDACTED]. My home address is [ADDRESS REDACTED]; please post it.",
      redactionCount: 2,
    });
  });

  it("redacts explicitly introduced names and sensitive diagnoses", () => {
    expect(
      scrubPII("My name is Aisyah Binti Rahman and I have diabetes."),
    ).toEqual({
      sanitizedText:
        "My name is [NAME REDACTED] and I have [HEALTH INFORMATION REDACTED].",
      redactionCount: 2,
    });
  });

  it("does not mistake ordinary operational feedback for contextual PII", () => {
    expect(
      scrubPII(
        "The manager named the meeting room Orchid and the room was warm after check-in.",
      ),
    ).toEqual({
      sanitizedText:
        "The manager named the meeting room Orchid and the room was warm after check-in.",
      redactionCount: 0,
    });
  });

  it("preserves text without detected identifiers", () => {
    expect(scrubPII("The room was clean and the staff were helpful.")).toEqual({
      sanitizedText: "The room was clean and the staff were helpful.",
      redactionCount: 0,
    });
  });

  it("never returns a supplied reviewer name", () => {
    expect(anonymizeReviewerName("Guest's real name")).toBe("Google reviewer");
  });

  it("uses the same sanitizer at the provider boundary", () => {
    expect(maskGuestPii("Email guest@example.com or call 03-1234 5678.")).toBe(
      "Email [EMAIL REDACTED] or call [PHONE REDACTED].",
    );
  });
});
