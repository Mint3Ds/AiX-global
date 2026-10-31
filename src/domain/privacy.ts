/**
 * Redact common contact, identity, payment, and contextual identifiers before
 * review text is persisted or sent to an external analysis provider.
 *
 * Context-sensitive patterns (for example, "booking reference ABC123") are
 * deliberately preferred over broad word matching. This reduces the chance of
 * deleting useful operational feedback while still covering common ways guests
 * disclose personal information. Pattern matching lowers exposure; it cannot
 * guarantee that arbitrary prose is anonymous.
 */
export function scrubPII(text: string): {
  sanitizedText: string;
  redactionCount: number;
} {
  let redactionCount = 0;
  const redact = (replacement: string) => () => {
    redactionCount += 1;
    return replacement;
  };
  const redactAfterLabel = (replacement: string) =>
    (_match: string, label: string) => {
      redactionCount += 1;
      return `${label}${replacement}`;
    };

  const sanitizedText = text
    // Direct contact identifiers.
    .replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, redact("[EMAIL REDACTED]"))
    .replace(
      /(?<![\w@])@[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28}[a-zA-Z0-9])?(?![\w])/g,
      redact("[SOCIAL HANDLE REDACTED]"),
    )
    // Malaysian NRIC and explicitly labelled passport identifiers.
    .replace(/\b\d{6}[-\s]?\d{2}[-\s]?\d{4}\b/g, redact("[IC REDACTED]"))
    .replace(
      /\b(passport(?:\s+(?:number|no\.?))?\s*[:#-]?\s*)[a-zA-Z0-9]{6,12}\b/gi,
      redactAfterLabel("[PASSPORT REDACTED]"),
    )
    // Payment-card-like sequences. Validation remains deliberately length
    // based because reviews often contain spaces or hyphens in card numbers.
    .replace(/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) return match;
      redactionCount += 1;
      return "[CARD REDACTED]";
    })
    // Malaysian mobile numbers in local (01x) and international (+60 1x) form.
    .replace(
      /(?<![\w])(?:\+?60[\s().-]?|0)1[0-9](?:[\s().-]?\d){6,8}(?!\d)/g,
      redact("[PHONE REDACTED]"),
    )
    // Malaysian landlines in local (03...) and international (+60 3...) form.
    .replace(
      /(?<![\w])(?:\+?60[\s().-]?|0)[3-9](?:[\s().-]?\d){7,9}(?!\d)/g,
      redact("[PHONE REDACTED]"),
    )
    .replace(
      /(?<![\w])\+\d{1,3}(?:[\s().-]?\d){7,12}(?!\d)/g,
      redact("[PHONE REDACTED]"),
    )
    // Reservation identifiers are only removed when a nearby label makes the
    // meaning clear; arbitrary order-like words and room feedback are retained.
    .replace(
      /\b((?:booking|reservation|confirmation)(?:\s+(?:reference|ref|number|no\.?|id))?\s*[:#-]?\s*)[a-zA-Z0-9][a-zA-Z0-9-]{4,31}\b/gi,
      redactAfterLabel("[BOOKING REFERENCE REDACTED]"),
    )
    // Vehicle registrations are similarly label-gated to avoid treating
    // ordinary short uppercase words as Malaysian number plates.
    .replace(
      /\b((?:vehicle|car|plate|registration)(?:\s+(?:number|no\.?))?\s*[:#-]?\s*)[a-zA-Z]{1,3}\s?\d{1,4}\s?[a-zA-Z]{0,3}\b/gi,
      redactAfterLabel("[VEHICLE REGISTRATION REDACTED]"),
    )
    // Exact room identifiers can identify a guest when paired with review
    // dates. Preserve the fact that a room was involved, but remove its number.
    .replace(
      /\b(room(?:\s+(?:number|no\.?))?\s*[:#-]?\s*)\d{2,5}\b/gi,
      redactAfterLabel("[ROOM NUMBER REDACTED]"),
    )
    // Addresses are difficult to infer safely. Redact only explicitly labelled
    // address values, stopping at sentence or line punctuation.
    .replace(
      /\b((?:my|home|billing|delivery|residential) address\s*(?:is|:|-)?\s*)([^.\n;]{5,160})/gi,
      redactAfterLabel("[ADDRESS REDACTED]"),
    )
    // Names are removed only after an explicit self-identification or naming
    // phrase. This avoids removing property names and normal review prose.
    .replace(
      /\b((?:[Mm]y name is|[Ii] am|[Ii]'m|[Ss]taff (?:member )?named|[Ee]mployee named|[Mm]anager named)\s+)([A-Z][\p{L}'-]*(?:\s+(?:(?:[Bb]in|[Bb]inti|a\/l|a\/p)\s+)?[A-Z][\p{L}'-]*){0,3})/gu,
      redactAfterLabel("[NAME REDACTED]"),
    )
    // Explicit first-person disclosures of a diagnosis are sensitive personal
    // data. General feedback such as "the room triggered my allergies" remains.
    .replace(
      /\b((?:i have|i was diagnosed with|my diagnosis is)\s+)(diabetes|cancer|hiv|aids|epilepsy|asthma|hypertension|depression|anxiety disorder)\b/gi,
      redactAfterLabel("[HEALTH INFORMATION REDACTED]"),
    );

  return { sanitizedText, redactionCount };
}

/** Never store or display a reviewer-provided Google profile name. */
export function anonymizeReviewerName(originalName?: string): string {
  void originalName;
  return "Google reviewer";
}
