import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "../src/data/db";
import {
  businesses,
  branches,
  employees,
  reviews,
  analysisRuns,
  observations,
  themes,
  memberships,
  tasks,
  taskReportAttempts,
  replies,
  events,
} from "../src/data/schema";
import {
  seedReviews,
  hotelSeedReviews,
  salonSeedReviews,
  seedFixture,
} from "../src/data/fixtures";
import {
  businessConfigs,
  restaurantConfig,
  themeCatalog,
} from "../src/config/business";
import { priorityFor, priorityRules } from "../src/config/priority";
import { verifyEvidence } from "../src/domain/analysis";
import { detectReviewLanguage } from "../src/domain/language";
const seedLegacyReviews = process.env.SEED_LEGACY_REVIEWS !== "no";
try {
  for (const config of businessConfigs)
    await db
      .insert(businesses)
      .values({
        id: config.businessId,
        name: config.businessName,
        businessType: config.businessType,
        timezone: config.timezone,
      })
      .onConflictDoNothing();
  const branchSeed = [
    ["sunway", "Nusa Table Sunway", "nusa-table", "Sunway, Selangor"],
    ["bangsar", "Nusa Table Bangsar", "nusa-table", "Bangsar, Kuala Lumpur"],
    ["hotel-central", "Harbour House Central", "harbour-house", "Kuala Lumpur"],
    ["hotel-garden", "Harbour House Garden", "harbour-house", "Petaling Jaya"],
    ["salon-main", "Luma Salon", "luma-salon", "Kuala Lumpur"],
  ] as const;
  for (const [id, name, businessId, locationLabel] of branchSeed)
    await db
      .insert(branches)
      .values({
        id,
        businessId,
        name,
        locationLabel,
        timezone:
          businessConfigs.find((config) => config.businessId === businessId)
            ?.timezone || "Asia/Kuala_Lumpur",
      })
      .onConflictDoNothing();
  for (const [id, businessId, branchId, name, jobTitle] of [
    [
      "hotel-employee-1",
      "harbour-house",
      "hotel-central",
      "Aina Rahman",
      "Maintenance technician",
    ],
    [
      "hotel-employee-2",
      "harbour-house",
      "hotel-central",
      "Daniel Lim",
      "Housekeeping lead",
    ],
    [
      "hotel-employee-3",
      "harbour-house",
      "hotel-garden",
      "Sara Wong",
      "Duty supervisor",
    ],
    [
      "hotel-employee-4",
      "harbour-house",
      "hotel-central",
      "Nurul Aziz",
      "Front desk supervisor",
    ],
    [
      "hotel-employee-5",
      "harbour-house",
      "hotel-central",
      "Wei Jian",
      "Facilities technician",
    ],
    [
      "hotel-employee-6",
      "harbour-house",
      "hotel-garden",
      "Priya Nair",
      "Housekeeping supervisor",
    ],
    [
      "hotel-employee-7",
      "harbour-house",
      "hotel-garden",
      "Amir Hakim",
      "Guest services agent",
    ],
    [
      "hotel-employee-8",
      "harbour-house",
      "hotel-garden",
      "Chloe Tan",
      "Maintenance technician",
    ],
    [
      "restaurant-employee-1",
      "nusa-table",
      "sunway",
      "Farah Ismail",
      "Floor manager",
    ],
    ["salon-employee-1", "luma-salon", "salon-main", "Maya Tan", "Stylist"],
    [
      "salon-employee-2",
      "luma-salon",
      "salon-main",
      "Alicia Lee",
      "Senior stylist",
    ],
    [
      "salon-employee-3",
      "luma-salon",
      "salon-main",
      "Hana Yusuf",
      "Receptionist",
    ],
  ] as const)
    await db
      .insert(employees)
      .values({
        id,
        businessId,
        branchId,
        name,
        jobTitle,
        orbyteStaffId: `ORB-${id.toUpperCase()}`,
      })
      .onConflictDoNothing();
  for (const [id, t] of Object.entries(themeCatalog))
    await db
      .insert(themes)
      .values({
        id,
        businessId: branchSeed.find(
          ([branchId]) => branchId === t.branchId,
        )![2],
        branchId: t.branchId,
        title: t.title,
        type: t.type,
        severity: t.severity,
        priority: "low",
        priorityReason: "Awaiting evidence count.",
      })
      .onConflictDoNothing();
  const TARGET_HOTEL_THEMES = new Set([
    "hotel-central-ac",
    "hotel-central-insects",
    "hotel-central-accessibility",
    "hotel-central-wifi",
  ]);

  const hotelTargetReviewIds: string[] = [];
  for (const r of hotelSeedReviews) {
    const f = seedFixture(r.id);
    if (
      f?.observations.some(
        (obs) =>
          obs.expectedThemeId && TARGET_HOTEL_THEMES.has(obs.expectedThemeId),
      )
    ) {
      hotelTargetReviewIds.push(r.id);
    }
  }

  // Pre-calculate deterministic varying triage times averaging exactly 20.0 seconds
  const TARGET_TRIAGE_SUM = hotelTargetReviewIds.length * 20;
  const TRIAGE_PATTERN = [1, -1, 2, -2, 3, -3, 4, -4, 2, -2, 1, -1, 3, -3];
  const targetTriageMap = new Map<string, number>();
  let runningTriageSum = 0;
  hotelTargetReviewIds.forEach((revId, idx) => {
    if (idx === hotelTargetReviewIds.length - 1) {
      targetTriageMap.set(revId, TARGET_TRIAGE_SUM - runningTriageSum);
    } else {
      const offset = TRIAGE_PATTERN[idx % TRIAGE_PATTERN.length];
      const val = 20 + offset;
      runningTriageSum += val;
      targetTriageMap.set(revId, val);
    }
  });

  for (const review of seedLegacyReviews
    ? [...seedReviews, ...hotelSeedReviews, ...salonSeedReviews]
    : []) {
    const triageDuration = targetTriageMap.get(review.id) ?? null;
    const reviewedDate = new Date(review.reviewedAt);
    const firstViewed = triageDuration
      ? new Date(reviewedDate.getTime() + 7200000)
      : null;
    const triagedAt = triageDuration && firstViewed
      ? new Date(firstViewed.getTime() + triageDuration * 1000)
      : null;

    await db
      .insert(reviews)
      .values({
        id: review.id,
        businessId: review.businessId,
        branchId: review.branchId,
        source: review.source,
        sourceReviewId: review.sourceReviewId,
        rating: review.rating,
        reviewedAt: reviewedDate,
        originalText: review.text,
        isSynthetic: true,
        isHistoricalImport: true,
        processingStatus: "pending",
        language: detectReviewLanguage(review.text),
        firstViewedAt: firstViewed,
        lastViewedAt: triagedAt,
        triagedAt: triagedAt,
        triageDurationSeconds: triageDuration,
      })
      .onConflictDoUpdate({
        target: reviews.id,
        set: {
          firstViewedAt: firstViewed,
          lastViewedAt: triagedAt,
          triagedAt: triagedAt,
          triageDurationSeconds: triageDuration,
        },
      });
    const fixture = seedFixture(review.id);
    if (!fixture) continue;
    const existing = await db
      .select({ id: analysisRuns.id })
      .from(analysisRuns)
      .where(eq(analysisRuns.reviewId, review.id))
      .limit(1);
    if (existing.length) continue;
    verifyEvidence(review.text, fixture.observations);
    await db.transaction(async (tx) => {
      const runId = randomUUID();
      await tx.insert(analysisRuns).values({
        id: runId,
        reviewId: review.id,
        decision: fixture.useful ? "contains_specific_feedback" : "generic",
        screeningProvider: "fixture",
        extractionProvider: fixture.useful ? "fixture" : null,
        matchingProvider: fixture.useful ? "fixture" : null,
        promptVersion: "fixture-v1",
        mode: "fixture",
      });
      for (const input of fixture.observations) {
        const id = randomUUID();
        const start = review.text.indexOf(input.evidenceQuote);
        await tx.insert(observations).values({
          id,
          reviewId: review.id,
          branchId: review.branchId,
          analysisRunId: runId,
          category: input.category,
          aspect: input.aspect,
          kind: input.kind,
          sentiment: input.sentiment,
          summary: input.summary,
          normalizedDescription: input.normalizedDescription,
          evidenceQuote: input.evidenceQuote,
          startOffset: start,
          endOffset: start + input.evidenceQuote.length,
          provider: "fixture",
          mode: "fixture",
        });
        if (
          input.expectedThemeId &&
          themeCatalog[input.expectedThemeId]?.branchId === review.branchId
        )
          await tx.insert(memberships).values({
            themeId: input.expectedThemeId,
            observationId: id,
            source: "fixture",
            confirmation: "suggested",
          });
      }
      await tx
        .update(reviews)
        .set({
          processingStatus: fixture.useful ? "complete" : "generic",
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, review.id));
    });
  }
  for (const [id] of Object.entries(themeCatalog)) {
    const result = await db.execute(
      sql`SELECT count(DISTINCT o.review_id)::integer AS count,
        count(DISTINCT o.review_id) FILTER (WHERE r.reviewed_at >= now() - (${priorityRules.recentDays} * interval '1 day'))::integer AS recent
        FROM theme_memberships m JOIN observations o ON o.id=m.observation_id JOIN reviews r ON r.id=o.review_id WHERE m.theme_id=${id}`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    const recent = Number(result.rows[0]?.recent ?? 0);
    const [current] = await db.select().from(themes).where(eq(themes.id, id));
    const p = priorityFor(
      current.type,
      count,
      current.severity,
      recent,
      current.status === "recurrence",
    );
    await db
      .update(themes)
      .set({ priority: p.priority, priorityReason: p.reason })
      .where(eq(themes.id, id));
  }
  if (seedLegacyReviews) {
    await db
      .insert(tasks)
      .values({
        id: "task-sunway-seating",
        themeId: "sunway-seating",
        branchId: "sunway",
        title: "Inspect and repair unstable seating",
        description:
          "Inspect seating at the Sunway branch; repair or replace any unsafe items found. Record what was actually done.",
        assigneeRole: "floor manager",
        status: "proposed",
      })
      .onConflictDoNothing();

    // 4 Organic completed operational tasks for Harbour House Hotel
    const completedHotelTasks = [
      {
        id: "task-hotel-ac-overhaul",
        themeId: "hotel-central-ac",
        branchId: "hotel-central",
        title: "Overhaul central chiller coils and calibrate guestroom thermostats",
        description:
          "Inspect fan coil units across Central guestrooms with recurring cooling complaints. Replace faulty digital thermostats, clean evaporator filters, and verify 18°C supply airflow.",
        priority: "high",
        assigneeRole: "Maintenance technician",
        assigneeId: "hotel-employee-1",
        status: "resolved",
        dueAt: new Date("2026-10-24T18:00:00+08:00"),
        approvedAt: new Date("2026-10-22T10:15:00+08:00"),
        reportedAt: new Date("2026-10-23T16:30:00+08:00"),
        reportedBy: "hotel-employee-1",
        employeeReport:
          "Completed diagnostic across all 24 flagged guestrooms. Flushed blocked condenser drain lines in rooms 202, 214, and 305; replaced two faulty thermostatic expansion valves and calibrated wall controllers. All rooms now holding steady at 19°C.",
        reportVersion: 1,
        verifiedAt: new Date("2026-10-24T09:30:00+08:00"),
        verifiedBy: "demo owner",
        resolutionNote:
          "Manager verified digital temperature logs and physically inspected rooms 202 and 305. Airflow and cooling operating within standard specifications. Closed.",
        approver: "demo owner",
        taskVersion: 1,
      },
      {
        id: "task-hotel-pest-mitigation",
        themeId: "hotel-central-insects",
        branchId: "hotel-central",
        title: "Deep sanitation and plumbing riser sealing in guest bathrooms",
        description:
          "Conduct targeted pest inspection along bathroom plumbing risers, install sealed drain traps, and perform non-toxic botanical misting in affected guest bathrooms.",
        priority: "urgent",
        assigneeRole: "Housekeeping lead",
        assigneeId: "hotel-employee-2",
        status: "resolved",
        dueAt: new Date("2026-10-23T18:00:00+08:00"),
        approvedAt: new Date("2026-10-21T09:45:00+08:00"),
        reportedAt: new Date("2026-10-22T15:00:00+08:00"),
        reportedBy: "hotel-employee-2",
        employeeReport:
          "Housekeeping team completed deep steam sanitation and resealed pipe collars under vanities across all 13 reported rooms. Placed secondary mesh drain covers and completed evening botanical barrier treatment.",
        reportVersion: 1,
        verifiedAt: new Date("2026-10-23T11:00:00+08:00"),
        verifiedBy: "demo owner",
        resolutionNote:
          "Post-treatment inspection conducted with housekeeping lead. Traps verified intact and zero insect activity observed over 48-hour follow-up window.",
        approver: "demo owner",
        taskVersion: 1,
      },
      {
        id: "task-hotel-lift-accessibility",
        themeId: "hotel-central-accessibility",
        branchId: "hotel-central",
        title: "Re-align elevator control panels and install tactile braille indicators",
        description:
          "Service main guest elevators A and B. Re-align recessed call buttons, test emergency intercom responsiveness, and install high-contrast tactile floor indicators.",
        priority: "urgent",
        assigneeRole: "Facilities technician",
        assigneeId: "hotel-employee-5",
        status: "resolved",
        dueAt: new Date("2026-10-22T18:00:00+08:00"),
        approvedAt: new Date("2026-10-20T11:20:00+08:00"),
        reportedAt: new Date("2026-10-21T17:15:00+08:00"),
        reportedBy: "hotel-employee-5",
        employeeReport:
          "Serviced both main elevator car panels with lift contractor. Replaced sticky floor 3 and 5 micro-switches, re-centered panel backplates, and affixed high-contrast tactile braille indicators at standard ADA height.",
        reportVersion: 1,
        verifiedAt: new Date("2026-10-22T14:30:00+08:00"),
        verifiedBy: "demo owner",
        resolutionNote:
          "Inspected and tested all floor buttons on both elevator cars. Smooth tactile response verified and intercom audio tested loud and clear.",
        approver: "demo owner",
        taskVersion: 1,
      },
      {
        id: "task-hotel-wifi-mesh",
        themeId: "hotel-central-wifi",
        branchId: "hotel-central",
        title: "Deploy dual-band mesh access points and optimize corridor coverage",
        description:
          "Address weak Wi-Fi signal reports on 3rd and 4th floor corridors. Install enterprise ceiling APs and rebalance 5GHz channel allocation to eliminate dead zones.",
        priority: "high",
        assigneeRole: "Maintenance technician",
        assigneeId: "hotel-employee-1",
        status: "resolved",
        dueAt: new Date("2026-10-25T18:00:00+08:00"),
        approvedAt: new Date("2026-10-23T14:20:00+08:00"),
        reportedAt: new Date("2026-10-24T18:45:00+08:00"),
        reportedBy: "hotel-employee-1",
        employeeReport:
          "Installed 3 enterprise ceiling access points along north and south wings. Rebalanced radio frequencies to avoid co-channel interference and tested throughput in far-corner rooms; verified minimum 85 Mbps download speed.",
        reportVersion: 1,
        verifiedAt: new Date("2026-10-25T10:00:00+08:00"),
        verifiedBy: "demo owner",
        resolutionNote:
          "Floor walk conducted with network tester. Verified strong signal coverage in rooms 310–324 with zero packet drops.",
        approver: "demo owner",
        taskVersion: 1,
      },
    ];

    for (const t of completedHotelTasks) {
      await db
        .insert(tasks)
        .values(t)
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assigneeId: t.assigneeId,
            assigneeRole: t.assigneeRole,
            employeeReport: t.employeeReport,
            reportVersion: t.reportVersion,
            reportedAt: t.reportedAt,
            reportedBy: t.reportedBy,
            resolutionNote: t.resolutionNote,
            verifiedAt: t.verifiedAt,
            verifiedBy: t.verifiedBy,
            resolvedAt: t.verifiedAt,
            approvedAt: t.approvedAt,
            approver: t.approver,
          },
        });

      await db
        .insert(taskReportAttempts)
        .values({
          id: `attempt-${t.id}-v1`,
          taskId: t.id,
          version: 1,
          note: t.employeeReport,
          reportedAt: t.reportedAt,
          reportedBy: t.reportedBy,
          decision: "accepted",
          decisionReason: t.resolutionNote,
          decidedAt: t.verifiedAt,
          decidedBy: t.verifiedBy,
        })
        .onConflictDoNothing();
    }

    await db
      .update(themes)
      .set({
        status: "owner_confirmed",
        updatedAt: new Date(),
      })
      .where(inArray(themes.id, Array.from(TARGET_HOTEL_THEMES)));

    const completedHotelReplies = [
      {
        id: "reply-hotel-ac-001",
        reviewId: "hotel-001",
        taskId: "task-hotel-ac-overhaul",
        themeId: "hotel-central-ac",
        text: "Thank you for sharing your feedback. We apologize for the air conditioning issue during your stay. Our maintenance team has since inspected and flushed the chiller coils, replaced faulty expansion valves, and verified that all room units are cooling properly.",
        status: "simulated_published",
        provider: "fixture",
        mode: "fixture",
        model: "gpt-4o",
        approvedAt: new Date("2026-10-24T11:00:00+08:00"),
        approver: "demo owner",
        publishedAt: new Date("2026-10-24T11:05:00+08:00"),
      },
      {
        id: "reply-hotel-insects-025",
        reviewId: "hotel-025",
        taskId: "task-hotel-pest-mitigation",
        themeId: "hotel-central-insects",
        text: "Thank you for bringing this to our attention. We take guest hygiene very seriously. Our housekeeping team has conducted deep steam sanitation, resealed plumbing risers, and completed barrier pest treatments across all affected rooms.",
        status: "simulated_published",
        provider: "fixture",
        mode: "fixture",
        model: "gpt-4o",
        approvedAt: new Date("2026-10-23T12:00:00+08:00"),
        approver: "demo owner",
        publishedAt: new Date("2026-10-23T12:10:00+08:00"),
      },
      {
        id: "reply-hotel-accessibility-038",
        reviewId: "hotel-038",
        taskId: "task-hotel-lift-accessibility",
        themeId: "hotel-central-accessibility",
        text: "Thank you for your valuable feedback regarding our elevator accessibility. We have fully serviced both main lift cars with our contractor, replaced sticky floor switches, and installed high-contrast tactile braille indicators.",
        status: "simulated_published",
        provider: "fixture",
        mode: "fixture",
        model: "gpt-4o",
        approvedAt: new Date("2026-10-22T15:00:00+08:00"),
        approver: "demo owner",
        publishedAt: new Date("2026-10-22T15:15:00+08:00"),
      },
      {
        id: "reply-hotel-wifi-051",
        reviewId: "hotel-051",
        taskId: "task-hotel-wifi-mesh",
        themeId: "hotel-central-wifi",
        text: "Thank you for staying with us and letting us know about the Wi-Fi connection. We have deployed dual-band enterprise ceiling access points along our 3rd and 4th floor corridors, providing strong, seamless coverage throughout the property.",
        status: "simulated_published",
        provider: "fixture",
        mode: "fixture",
        model: "gpt-4o",
        approvedAt: new Date("2026-10-25T11:00:00+08:00"),
        approver: "demo owner",
        publishedAt: new Date("2026-10-25T11:20:00+08:00"),
      },
    ];

    for (const rep of completedHotelReplies) {
      await db
        .insert(replies)
        .values(rep)
        .onConflictDoNothing();
    }

    for (const config of businessConfigs) {
      const reviewCount = [
        ...seedReviews,
        ...hotelSeedReviews,
        ...salonSeedReviews,
      ].filter((review) => review.businessId === config.businessId).length;
      await db
        .insert(events)
        .values({
          id:
            config.businessId === restaurantConfig.businessId
              ? "event-seed-v1"
              : `event-seed-v1-${config.businessId}`,
          actor: "seed process",
          role: "system",
          type: "dataset_seeded",
          entityType: "business",
          entityId: config.businessId,
          description: `${reviewCount} historical synthetic reviews are available with labelled fixture analyses. This entry records dataset setup, not customer or staff activity.`,
          businessId: config.businessId,
          metadata: { reviewCount },
        })
        .onConflictDoNothing();
    }

    const seedEvents: (typeof events.$inferInsert)[] = [];

    const recentHotel = [...hotelSeedReviews]
      .sort(
        (a, b) =>
          new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime(),
      )
      .slice(0, 15);

    for (const rev of recentHotel) {
      const revTime = new Date(rev.reviewedAt);
      seedEvents.push({
        id: `event-intake-${rev.id}`,
        actor: "demo user",
        role: "staff",
        type: "review_intake",
        entityType: "review",
        entityId: rev.id,
        description: "Synthetic review saved with original wording.",
        businessId: rev.businessId,
        metadata: { branchId: rev.branchId, source: rev.source },
        createdAt: revTime,
      });
      seedEvents.push({
        id: `event-analysis-${rev.id}`,
        actor: "system",
        role: "system",
        type: "analysis_completed",
        entityType: "review",
        entityId: rev.id,
        description:
          "Review specific feedback; screening by fixture, extraction by fixture, matching by fixture.",
        businessId: rev.businessId,
        metadata: { mode: "fixture", provider: "fixture" },
        createdAt: new Date(revTime.getTime() + 1500),
      });
    }

    seedEvents.push(
      {
        id: "event-confirm-hotel-ac",
        actor: "demo owner",
        role: "owner",
        type: "theme_confirmed",
        entityType: "theme",
        entityId: "hotel-central-ac",
        description: "Owner confirmed the suggested theme.",
        businessId: "harbour-house",
        createdAt: new Date("2026-10-25T14:00:00+08:00"),
      },
      {
        id: "event-confirm-hotel-insects",
        actor: "demo owner",
        role: "owner",
        type: "theme_confirmed",
        entityType: "theme",
        entityId: "hotel-central-insects",
        description: "Owner confirmed the suggested theme.",
        businessId: "harbour-house",
        createdAt: new Date("2026-10-26T10:00:00+08:00"),
      },
    );

    for (const t of completedHotelTasks) {
      seedEvents.push(
        {
          id: `event-task-proposed-${t.id}`,
          actor: "demo owner",
          role: "owner",
          type: "task_proposed",
          entityType: "task",
          entityId: t.id,
          description: `Owner proposed remediation task: "${t.title}".`,
          businessId: "harbour-house",
          createdAt: new Date(t.approvedAt.getTime() - 900000),
        },
        {
          id: `event-task-approved-${t.id}`,
          actor: "demo owner",
          role: "owner",
          type: "task_approved",
          entityType: "task",
          entityId: t.id,
          description: `Owner approved task and assigned to ${t.assigneeRole}.`,
          businessId: "harbour-house",
          createdAt: t.approvedAt,
        },
        {
          id: `event-task-reported-${t.id}`,
          actor: t.assigneeRole,
          role: "staff",
          type: "task_reported",
          entityType: "task",
          entityId: t.id,
          description: `Staff submitted completion report: "${t.employeeReport.slice(0, 80)}..."`,
          businessId: "harbour-house",
          createdAt: t.reportedAt,
        },
        {
          id: `event-task-verified-${t.id}`,
          actor: "demo owner",
          role: "owner",
          type: "task_verified",
          entityType: "task",
          entityId: t.id,
          description: `Owner verified remediation and resolved task: "${t.resolutionNote.slice(0, 80)}..."`,
          businessId: "harbour-house",
          createdAt: t.verifiedAt,
        },
      );
    }

    for (const evt of seedEvents) {
      await db.insert(events).values(evt).onConflictDoNothing();
    }
  }
  console.log(
    seedLegacyReviews
      ? `Seed ready: ${seedReviews.length} restaurant, ${hotelSeedReviews.length} hotel, ${salonSeedReviews.length} salon reviews; separate demo reviews were not inserted.`
      : "Business, branch, employee, and theme records ready for new review batches.",
  );
} finally {
  await pool.end();
}
