import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertDatabaseConfigured, db } from "@/data/db";
import { taskReportAttachments } from "@/data/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertDatabaseConfigured();
    const { id } = await params;
    const [attachment] = await db
      .select()
      .from(taskReportAttachments)
      .where(eq(taskReportAttachments.id, id));
    if (!attachment) return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(attachment.dataBase64, "base64"), {
      headers: {
        "Content-Type": attachment.mediaType,
        "Content-Length": String(
          Buffer.byteLength(attachment.dataBase64, "base64"),
        ),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
