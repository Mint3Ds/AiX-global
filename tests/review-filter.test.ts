import { describe, expect, it } from "vitest";
import {
  REVIEW_CATEGORY_GROUPS,
  reviewCategoryGroup,
  reviewCategoryOptions,
} from "../src/domain/review-filter";

describe("compact review category filters", () => {
  it("maps common model label variants into the same filter", () => {
    expect(reviewCategoryGroup("Room - climate control")).toBe("air-conditioning");
    expect(reviewCategoryGroup("Air conditioning/ventilation")).toBe(
      "air-conditioning",
    );
    expect(reviewCategoryGroup("Bathroom / shower")).toBe(
      "bathroom-cleanliness",
    );
    expect(reviewCategoryGroup("Room - cleanliness / pest control")).toBe(
      "bathroom-cleanliness",
    );
    expect(reviewCategoryGroup("Staff — reception service/issue resolution")).toBe(
      "staff-service",
    );
  });

  it("shows only represented groups and never exposes every raw category", () => {
    const rawCategories = [
      "Air conditioning",
      "Room - climate control",
      "Climate control",
      "Bathroom/shower",
      "Bathroom / shower",
      "Staff - front desk",
      "Staff — reception service/issue resolution",
      "Food/beverage",
      "General",
    ];
    const options = reviewCategoryOptions(rawCategories);

    expect(options.map((item) => item.key)).toEqual([
      "air-conditioning",
      "bathroom-cleanliness",
      "staff-service",
      "food",
      "other",
    ]);
    expect(options.length).toBeLessThanOrEqual(REVIEW_CATEGORY_GROUPS.length);
    expect(options.some((item) => item.name === "Bathroom/shower")).toBe(false);
  });

  it("keeps category group filtering deterministic for unknown labels", () => {
    expect(reviewCategoryGroup("General experience")).toBe("other");
    expect(reviewCategoryGroup("A totally new model category")).toBe("other");
    expect(reviewCategoryOptions([])).toEqual([]);
  });
});
