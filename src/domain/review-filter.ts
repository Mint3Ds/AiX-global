export type ReviewCategoryOption = { key: string; name: string };

/** A compact, stable filter taxonomy for the many labels produced by analysis. */
export const REVIEW_CATEGORY_GROUPS: ReviewCategoryOption[] = [
  { key: "air-conditioning", name: "Air conditioning" },
  { key: "bathroom-cleanliness", name: "Bathroom & cleanliness" },
  { key: "arrival", name: "Arrival & check-in" },
  { key: "staff-service", name: "Staff & service" },
  { key: "food", name: "Food & breakfast" },
  { key: "noise-sleep", name: "Noise & sleep" },
  { key: "room-comfort", name: "Room comfort" },
  { key: "amenities-access", name: "Amenities & access" },
  { key: "price-value", name: "Price & value" },
  { key: "other", name: "Other feedback" },
];

/** Map free-form model labels to a small set of useful review filters. */
export function reviewCategoryGroup(value: string): string {
  const category = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[‐‑‒–—_]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (/\b(air conditioning|aircon|hvac|climate|ventilat\w*|cooling|temperature)\b/.test(category))
    return "air-conditioning";
  if (/\b(bath|bathroom|shower|sink|toilet|clean\w*|housekeep\w*|pest|insect|hygiene)\b/.test(category))
    return "bathroom-cleanliness";
  if (/\b(check in|check out|checkin|checkout|arrival|departure|queue|wait time)\b/.test(category))
    return "arrival";
  if (/\b(staff|service|reception|front desk|respons\w*|request|communication|consultation)\b/.test(category))
    return "staff-service";
  if (/\b(food|breakfast|dining|restaurant|coffee|beverage)\b/.test(category))
    return "food";
  if (/\b(noise|quiet|sound|sleep)\b/.test(category)) return "noise-sleep";
  if (/\b(bed|bedding|comfort|furnish\w*|pillow|curtain|lighting|room size|room layout|room condition)\b/.test(category))
    return "room-comfort";
  if (/\b(amenit\w*|facilit\w*|wifi|wi fi|internet|pool|gym|elevator|lift|parking|transport|access\w*|location|wayfinding)\b/.test(category))
    return "amenities-access";
  if (/\b(price|pricing|value|bill|payment|cost|refund|charge)\b/.test(category))
    return "price-value";
  return "other";
}

/** Only show categories represented in this workspace; never list raw model labels. */
export function reviewCategoryOptions(categories: string[]): ReviewCategoryOption[] {
  const present = new Set(categories.map(reviewCategoryGroup));
  return REVIEW_CATEGORY_GROUPS.filter((group) => present.has(group.key));
}
