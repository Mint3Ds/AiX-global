import { NextResponse } from "next/server";
import { getState } from "@/domain/service";
import { assertDatabaseConfigured } from "@/data/db";
import {
  databaseErrorCode,
  isTransientDatabaseError,
  retryDatabaseRead,
} from "@/data/database-retry";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    assertDatabaseConfigured();
    return NextResponse.json(
      await retryDatabaseRead(() =>
        getState(
          new URL(request.url).searchParams.get("businessId") || undefined,
        ),
      ),
    );
  } catch (error) {
    const transient = isTransientDatabaseError(error);
    const notConfigured =
      error instanceof Error && error.message.includes("DATABASE_URL is required");
    const code = databaseErrorCode(error);
    console.error("[api/state] Workspace read failed", {
      code: code || (notConfigured ? "DATABASE_NOT_CONFIGURED" : "UNKNOWN"),
      transient,
    });
    return NextResponse.json(
      {
        error: notConfigured
          ? "Workspace database is not configured. Set DATABASE_URL and restart the app."
          : transient
            ? "The database connection was interrupted. Clarity retried automatically; try again shortly."
            : "Workspace data could not be loaded. Check the database setup and try again.",
        code: notConfigured
          ? "DATABASE_NOT_CONFIGURED"
          : transient
            ? "DATABASE_TEMPORARILY_UNAVAILABLE"
            : "WORKSPACE_LOAD_FAILED",
      },
      {
        status: transient || notConfigured ? 503 : 500,
        headers: transient ? { "Retry-After": "1" } : undefined,
      },
    );
  }
}
