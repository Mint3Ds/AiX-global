import { NextResponse } from "next/server";
import {
  demoReviews,
  hotelDemoReviews,
  hotelSeedReviews,
  salonSeedReviews,
  seedReviews,
} from "@/data/fixtures";

export const runtime = "nodejs";

const reviewsByBusiness = {
  "harbour-house": [...hotelDemoReviews, ...hotelSeedReviews].slice(0, 5),
  "luma-salon": salonSeedReviews.slice(0, 5),
  "nusa-table": [...demoReviews, ...seedReviews].slice(0, 5),
};

export function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId") || "";
  return NextResponse.json(
    reviewsByBusiness[businessId as keyof typeof reviewsByBusiness] ?? [],
  );
}
