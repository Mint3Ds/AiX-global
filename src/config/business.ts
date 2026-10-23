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
export const hotelConfig = {
  businessId: "harbour-house",
  businessName: "Harbour House Hotel",
  businessType: "hotel",
  timezone: "Asia/Kuala_Lumpur",
} as const;
export const salonConfig = {
  businessId: "luma-salon",
  businessName: "Luma Salon",
  businessType: "salon",
  timezone: "Asia/Kuala_Lumpur",
} as const;
export const businessConfigs = [hotelConfig, restaurantConfig, salonConfig];
export const defaultBusinessId = hotelConfig.businessId;
export const themeCatalog: Record<
  string,
  {
    title: string;
    type: "operational_issue" | "suggestion" | "positive_pattern";
    branchId: string;
    severity: number;
  }
> = {
  "hotel-central-ac": {
    title: "Room air conditioning not cooling",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 2,
  },
  "hotel-central-insects": {
    title: "Insect sightings in bathrooms",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 3,
  },
  "hotel-central-staff-praise": {
    title: "Helpful front desk",
    type: "positive_pattern",
    branchId: "hotel-central",
    severity: 1,
  },
  "hotel-central-checkin": {
    title: "Slow check-in",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 2,
  },
  "hotel-central-cleanliness": {
    title: "Room cleanliness concerns",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 2,
  },
  "hotel-central-breakfast": {
    title: "Vegetarian breakfast options",
    type: "suggestion",
    branchId: "hotel-central",
    severity: 1,
  },
  "hotel-central-noise": {
    title: "Street noise in rooms",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 2,
  },
  "hotel-central-pool": {
    title: "Longer pool hours",
    type: "suggestion",
    branchId: "hotel-central",
    severity: 1,
  },
  "hotel-central-pricing": {
    title: "Breakfast surcharge concerns",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 1,
  },
  "hotel-central-accessibility": {
    title: "Lift button accessibility",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 3,
  },
  "hotel-central-wifi": {
    title: "Unreliable Wi-Fi",
    type: "operational_issue",
    branchId: "hotel-central",
    severity: 2,
  },
  "hotel-central-beds": {
    title: "Comfortable beds",
    type: "positive_pattern",
    branchId: "hotel-central",
    severity: 1,
  },
  "hotel-garden-breakfast-praise": {
    title: "Breakfast praised",
    type: "positive_pattern",
    branchId: "hotel-garden",
    severity: 1,
  },
  "hotel-garden-noise": {
    title: "Late-night street noise",
    type: "operational_issue",
    branchId: "hotel-garden",
    severity: 2,
  },
  "hotel-garden-clean-praise": {
    title: "Clean rooms praised",
    type: "positive_pattern",
    branchId: "hotel-garden",
    severity: 1,
  },
  "hotel-garden-checkin": {
    title: "Weekend check-in delays",
    type: "operational_issue",
    branchId: "hotel-garden",
    severity: 2,
  },
  "hotel-garden-water": {
    title: "Water refill stations",
    type: "suggestion",
    branchId: "hotel-garden",
    severity: 1,
  },
  "hotel-garden-ac-noise": {
    title: "Noisy air conditioning",
    type: "operational_issue",
    branchId: "hotel-garden",
    severity: 2,
  },
  "hotel-garden-staff-praise": {
    title: "Welcoming reception staff",
    type: "positive_pattern",
    branchId: "hotel-garden",
    severity: 1,
  },
  "salon-stylist-praise": {
    title: "Clear stylist communication",
    type: "positive_pattern",
    branchId: "salon-main",
    severity: 1,
  },
  "salon-delay": {
    title: "Appointment delays",
    type: "operational_issue",
    branchId: "salon-main",
    severity: 2,
  },
  "salon-fragrance": {
    title: "Fragrance-free shampoo",
    type: "suggestion",
    branchId: "salon-main",
    severity: 1,
  },
  "salon-clean": {
    title: "Clean wash station",
    type: "positive_pattern",
    branchId: "salon-main",
    severity: 1,
  },
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
