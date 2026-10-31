import { ZodError } from "zod";
import { WorkflowError } from "./workflow";

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
  if (
    error instanceof Error &&
    /Failed query:|ECONNREFUSED|ENOTFOUND|connection terminated|database .* does not exist|relation .* does not exist/i.test(
      error.message,
    )
  )
    return "Workspace unavailable. Check the database connection and try again.";
  return error instanceof Error ? error.message : "Action failed. Try again.";
}
