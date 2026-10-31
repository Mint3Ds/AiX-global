import { NextRequest, NextResponse } from "next/server";
import { assertDatabaseConfigured } from "@/data/db";
import {
  databaseErrorCode,
  databaseErrorLocation,
  isDatabaseOperationError,
  isTransientDatabaseError,
} from "@/data/database-retry";
import { publicActionError, publicActionCode } from "@/domain/public-errors";
import {
  intake,
  analyzeReview,
  manualClassify,
  correctMembership,
  setThemeStatus,
  setSeverity,
  proposeTask,
  editTask,
  decideTask,
  resolveTask,
  createReply,
  prepareReplies,
  editReply,
  approveReply,
  analyzePendingBatch,
  assertActionScope,
  startTask,
  reportTask,
  verifyTask,
  rejectTaskReport,
  rejectReply,
  simulatePublish,
  approveReplyBatch,
  trackReviewView,
  recordReviewDwell,
} from "@/domain/service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let actionType = "unknown";
  try {
    assertDatabaseConfigured();
    const body = await request.json();
    actionType = String(body.type || "unknown");
    const role = String(body.role || "staff");
    const businessId = String(body.businessId || "");
    await assertActionScope(businessId, body);
    let result: unknown = null;
    switch (body.type) {
      case "intake":
        result = await intake(body.data);
        break;
      case "analyze":
        result = await analyzeReview(String(body.reviewId));
        break;
      case "manual_classify":
        result = await manualClassify(String(body.reviewId), role, body.data);
        break;
      case "membership":
        result = await correctMembership(
          String(body.observationId),
          body.themeId || null,
          role,
        );
        break;
      case "theme_status":
        result = await setThemeStatus(String(body.themeId), body.status, role);
        break;
      case "severity":
        result = await setSeverity(
          String(body.themeId),
          Number(body.severity),
          role,
        );
        break;
      case "propose_task":
        result = await proposeTask(String(body.themeId), role);
        break;
      case "edit_task":
        result = await editTask(String(body.taskId), role, body.data);
        break;
      case "decide_task":
        result = await decideTask(String(body.taskId), role, body.decision);
        break;
      case "resolve_task":
        result = await resolveTask(
          String(body.taskId),
          role,
          String(body.note || ""),
          Number(body.reportVersion),
        );
        break;
      case "start_task":
        result = await startTask(
          String(body.taskId),
          role,
          String(body.employeeId || ""),
        );
        break;
      case "report_task":
        result = await reportTask(
          String(body.taskId),
          role,
          String(body.employeeId || ""),
          String(body.note || ""),
          body.attachments || [],
        );
        break;
      case "verify_task":
        result = await verifyTask(
          String(body.taskId),
          role,
          String(body.note || ""),
          Number(body.reportVersion),
          body.attachments || [],
        );
        break;
      case "reject_task_report":
        result = await rejectTaskReport(
          String(body.taskId),
          role,
          String(body.reason || ""),
          String(body.instructions || ""),
          Number(body.reportVersion),
          body.attachments || [],
        );
        break;
      case "draft_reply":
        result = await createReply(
          String(body.reviewId),
          String(body.taskId),
          role,
        );
        break;
      case "prepare_replies":
        result = await prepareReplies(String(body.taskId), role);
        break;
      case "edit_reply":
        result = await editReply(
          String(body.replyId),
          role,
          String(body.text || ""),
          Number(body.draftVersion),
        );
        break;
      case "approve_reply":
        result = await approveReply(
          String(body.replyId),
          role,
          Boolean(body.partialApproved),
          Number(body.draftVersion),
        );
        break;
      case "reject_reply":
        result = await rejectReply(
          String(body.replyId),
          role,
          String(body.reason || ""),
          Number(body.draftVersion),
        );
        break;
      case "approve_reply_batch":
        result = await approveReplyBatch(body.replyIds, role);
        break;
      case "simulate_publish":
        result = await simulatePublish(String(body.replyId), role);
        break;
      case "analyze_batch":
        result = await analyzePendingBatch(businessId, Number(body.limit || 5));
        break;
      case "track_view":
        result = await trackReviewView(
          String(body.reviewId),
          role,
          body.activeSeconds ? Number(body.activeSeconds) : undefined,
        );
        break;
      case "record_dwell":
        result = await recordReviewDwell(
          String(body.reviewId),
          Number(body.durationSeconds || 0),
          role,
          Boolean(body.markTriaged),
        );
        break;
      default:
        throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const databaseFailure = isDatabaseOperationError(error);
    const transient = isTransientDatabaseError(error);
    const notConfigured =
      error instanceof Error && error.message.includes("DATABASE_URL is required");
    if (databaseFailure || notConfigured) {
      console.error("[api/action] Database-backed action failed", {
        action: actionType,
        code:
          databaseErrorCode(error) ||
          (notConfigured ? "DATABASE_NOT_CONFIGURED" : "UNKNOWN"),
        transient,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: publicActionError(error),
        code: publicActionCode(error),
        ...(process.env.NODE_ENV !== "production" && databaseFailure
          ? {
              diagnosticCode: databaseErrorCode(error),
              diagnosticLocation: databaseErrorLocation(error),
            }
          : {}),
      },
      {
        status: transient || notConfigured ? 503 : databaseFailure ? 500 : 400,
      },
    );
  }
}
