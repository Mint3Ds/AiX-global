export const restaurantConfig = {
  businessId: "nusa-table",
  businessName: "Nusa Table",
  businessType: "restaurant",
  timezone: "Asia/Kuala_Lumpur",
  categories: [
    "food_quality",
    "service",
    "cleanliness",
    "environment",
    "safety",
    "pricing",
    "accessibility",
    "customer_suggestions",
    "furniture",
    "menu",
    "staff",
    "beverage",
    "amenity",
    "process",
    "tableware",
  ],
} as const;
export const themeCatalog: Record<
  string,
  {
    title: string;
    type: "operational_issue" | "suggestion" | "positive_pattern";
    branchId: string;
    severity: number;
  }
> = {
  "sunway-seating": {
    title: "Unsteady seating",
    type: "operational_issue",
    branchId: "sunway",
    severity: 3,
  },
  "sunway-dumpling-temperature": {
    title: "Cool soup dumplings",
    type: "operational_issue",
    branchId: "sunway",
    severity: 2,
  },
  "bangsar-dumpling-temperature": {
    title: "Cool soup dumplings",
    type: "operational_issue",
    branchId: "bangsar",
    severity: 2,
  },
  "busy-period-service": {
    title: "Slow service at busy times",
    type: "operational_issue",
    branchId: "sunway",
    severity: 2,
  },
  "fried-rice-praise": {
    title: "Fried rice praise",
    type: "positive_pattern",
    branchId: "sunway",
    severity: 1,
  },
  "vegetarian-options": {
    title: "More vegetarian choices",
    type: "suggestion",
    branchId: "sunway",
    severity: 1,
  },
  "staff-attentiveness": {
    title: "Thoughtful staff",
    type: "positive_pattern",
    branchId: "sunway",
    severity: 1,
  },
};
