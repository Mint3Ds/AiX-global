import { NextResponse } from "next/server";
import { getState } from "@/domain/service";
import { assertDatabaseConfigured } from "@/data/db";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    assertDatabaseConfigured();
    return NextResponse.json(
      await getState(
        new URL(request.url).searchParams.get("businessId") || undefined,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 500 },
    );
  }
}
