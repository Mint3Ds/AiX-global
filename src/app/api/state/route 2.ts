import { NextResponse } from "next/server";
import { getState } from "@/domain/service";
import { assertDatabaseConfigured } from "@/data/db";
export const runtime = "nodejs";
export async function GET() {
  try {
    assertDatabaseConfigured();
    return NextResponse.json(await getState());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 500 },
    );
  }
}
