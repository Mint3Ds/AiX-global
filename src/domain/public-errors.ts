import { ZodError } from "zod";
import { WorkflowError } from "./workflow";
import {
  databaseErrorCode,
  isDatabaseOperationError,
  isTransientDatabaseError,
} from "@/data/database-retry";

export function publicActionCode(error: unknown) {
  return error instanceof WorkflowError ? error.code : undefined;
}

export function publicActionError(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = String(issue?.path[0] || "");
    if (field === "text")
      return issue?.code === "too_big"
        ? "Review text must be 3000 characters or fewer."
        : "Write at least 5 characters of review text.";
    if (field === "rating") return "Choose a rating from 1 to 5 stars.";
    if (field === "reviewedAt") return "Enter a valid review date and time.";
    if (field === "branchId") return "Choose a valid property.";
    return field
      ? `Check the ${field.replaceAll(/([A-Z])/g, " $1").toLowerCase()} field and try again.`
      : "Check the submitted information and try again.";
  }
  if (error instanceof Error && error.message.includes("DATABASE_URL is required"))
    return "Workspace database is not configured. Set DATABASE_URL and restart the app.";
  if (isTransientDatabaseError(error))
    return "The database connection was interrupted. Refresh the workspace before retrying this action.";
  if (isDatabaseOperationError(error)) {
    const code = databaseErrorCode(error);
    if (code === "42P01" || code === "42703")
      return "The database schema is out of date. Run the database migrations, then refresh the workspace.";
    return "The database rejected this action. Refresh before retrying; the server log records the database error code.";
  }
  return error instanceof Error ? error.message : "Action failed. Try again.";
}
