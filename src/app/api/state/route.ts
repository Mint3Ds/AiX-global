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
  } catch {
    return NextResponse.json(
      {
        error:
          "Workspace unavailable. Check the database connection and try again.",
      },
      { status: 500 },
    );
  }
}
