import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const time = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: time("created_at"),
});
export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  locationLabel: text("location_label").notNull(),
  createdAt: time("created_at"),
});
export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id),
  name: text("name").notNull(),
  jobTitle: text("job_title").notNull(),
  createdAt: time("created_at"),
});
export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id),
    source: text("source").notNull(),
    sourceReviewId: text("source_review_id").notNull(),
    rating: integer("rating").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    originalText: text("original_text").notNull(),
    isSynthetic: boolean("is_synthetic").notNull(),
    processingStatus: text("processing_status").notNull().default("pending"),
    processingStage: text("processing_stage"),
    language: text("language").notNull().default("unknown"),
    createdAt: time("created_at"),
    updatedAt: time("updated_at"),
  },
  (t) => [
    uniqueIndex("reviews_source_unique").on(
      t.businessId,
      t.source,
      t.sourceReviewId,
    ),
    index("reviews_branch_idx").on(t.branchId),
  ],
);
export const analysisRuns = pgTable("analysis_runs", {
  id: text("id").primaryKey(),
  reviewId: text("review_id")
    .notNull()
    .references(() => reviews.id),
  decision: text("decision").notNull(),
  screeningProvider: text("screening_provider").notNull(),
  screeningModel: text("screening_model"),
  extractionProvider: text("extraction_provider"),
  extractionModel: text("extraction_model"),
  matchingProvider: text("matching_provider"),
  matchingModel: text("matching_model"),
  promptVersion: text("prompt_version").notNull(),
  mode: text("mode").notNull(),
  safeError: text("safe_error"),
  createdAt: time("created_at"),
});
export const observations = pgTable(
  "observations",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id),
    analysisRunId: text("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id),
    category: text("category").notNull(),
    aspect: text("aspect").notNull(),
    kind: text("kind").notNull(),
    sentiment: text("sentiment").notNull(),
    summary: text("summary").notNull(),
    normalizedDescription: text("normalized_description").notNull(),
    evidenceQuote: text("evidence_quote").notNull(),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    provider: text("provider").notNull(),
    mode: text("mode").notNull(),
    model: text("model"),
    createdAt: time("created_at"),
  },
  (t) => [index("observations_review_idx").on(t.reviewId)],
);
export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("suggested"),
  priority: text("priority").notNull().default("low"),
  priorityReason: text("priority_reason").notNull().default(""),
  severity: integer("severity").notNull().default(1),
  createdAt: time("created_at"),
  updatedAt: time("updated_at"),
});
export const memberships = pgTable(
  "theme_memberships",
  {
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id),
    observationId: text("observation_id")
      .notNull()
      .references(() => observations.id),
    source: text("source").notNull(),
    confirmation: text("confirmation").notNull().default("suggested"),
    createdAt: time("created_at"),
    updatedAt: time("updated_at"),
  },
  (t) => [
    primaryKey({ columns: [t.themeId, t.observationId] }),
    uniqueIndex("membership_observation_unique").on(t.observationId),
  ],
);
export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    assigneeRole: text("assignee_role").notNull(),
    assigneeId: text("assignee_id").references(() => employees.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    employeeReport: text("employee_report"),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    reportedBy: text("reported_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    recurrenceOfTaskId: text("recurrence_of_task_id"),
    status: text("status").notNull().default("proposed"),
    proposedAt: time("proposed_at"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    approver: text("approver"),
    approvalSnapshot: jsonb("approval_snapshot"),
  },
  (t) => [index("tasks_theme_idx").on(t.themeId)],
);
export const handoffs = pgTable("handoffs", {
  id: text("id").primaryKey(),
  approvedTaskId: text("approved_task_id")
    .notNull()
    .references(() => tasks.id)
    .unique(),
  payload: jsonb("payload").notNull(),
  simulatedStatus: text("simulated_status").notNull(),
  createdAt: time("created_at"),
});
export const replies = pgTable("replies", {
  id: text("id").primaryKey(),
  reviewId: text("review_id")
    .notNull()
    .references(() => reviews.id)
    .unique(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  themeId: text("theme_id")
    .notNull()
    .references(() => themes.id),
  text: text("text").notNull(),
  status: text("status").notNull().default("draft"),
  provider: text("provider").notNull(),
  mode: text("mode").notNull(),
  model: text("model"),
  generatedAt: time("generated_at"),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approver: text("approver"),
  partialWarning: text("partial_warning"),
  partialApproved: boolean("partial_approved").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});
export const events = pgTable("activity_events", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  role: text("role").notNull(),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  businessId: text("business_id").references(() => businesses.id),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: time("created_at"),
});
