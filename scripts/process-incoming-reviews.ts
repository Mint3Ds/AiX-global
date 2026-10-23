import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { z } from "zod";

const root = resolve(process.cwd(), "data/fixtures/visit2value/incoming");
const batches = [
  {
    file: "restaurant.json",
    businessId: "nusa-table",
    branches: ["sunway", "bangsar"],
  },
  {
    file: "hotel.json",
    businessId: "harbour-house",
    branches: ["hotel-central", "hotel-garden"],
  },
  { file: "salon.json", businessId: "luma-salon", branches: ["salon-main"] },
] as const;
const rowSchema = z
  .object({
    sourceReviewId: z.string().min(3).max(100),
    branchId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    reviewedAt: z.iso.datetime({ offset: true }),
    text: z.string().trim().min(5).max(3000),
  })
  .strict();
type IncomingReview = z.infer<typeof rowSchema>;
const loaded: { businessId: string; review: IncomingReview }[] = [];
const ids = new Set<string>();
const texts = new Set<string>();

for (const batch of batches) {
  const path = resolve(root, batch.file);
  const rows = z.array(rowSchema).parse(JSON.parse(readFileSync(path, "utf8")));
  for (const [index, review] of rows.entries()) {
    if (!(batch.branches as readonly string[]).includes(review.branchId))
      throw new Error(
        `${batch.file} row ${index + 1}: unknown branch ${review.branchId}`,
      );
    const id = `${batch.businessId}:${review.sourceReviewId}`;
    if (ids.has(id))
      throw new Error(
        `${batch.file} row ${index + 1}: duplicate sourceReviewId`,
      );
    ids.add(id);
    const text = review.text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (texts.has(text))
      throw new Error(
        `${batch.file} row ${index + 1}: duplicate review wording`,
      );
    texts.add(text);
    loaded.push({ businessId: batch.businessId, review });
  }
  console.log(`${batch.file}: ${rows.length} reviews ready`);
}

if (!process.argv.includes("--run")) {
  console.log(
    "Validation complete. Add --run to import and analyze these reviews.",
  );
} else {
  if (loaded.length === 0) throw new Error("No reviews to process.");
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.AI_MODE !== "live")
    throw new Error("Set AI_MODE=live to analyze new review wording.");
  const { intake, analyzeReview } = await import("../src/domain/service");
  const { pool } = await import("../src/data/db");
  let analyzed = 0;
  let alreadyProcessed = 0;
  let nextIndex = 0;
  const failures: string[] = [];
  const statuses = new Map<string, number>();
  try {
    const worker = async () => {
      while (nextIndex < loaded.length) {
        const { businessId, review } = loaded[nextIndex++];
        try {
          const { reviewId } = await intake({
            ...review,
            businessId,
            source: "Generated review batch",
            isSynthetic: true,
          });
          const result = await analyzeReview(reviewId);
          if (result.alreadyProcessed) alreadyProcessed++;
          else analyzed++;
          statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
          console.log(
            `${businessId}/${review.sourceReviewId}: ${result.status}`,
          );
        } catch (error) {
          const message = `${businessId}/${review.sourceReviewId}: ${error instanceof Error ? error.message : String(error)}`;
          failures.push(message);
          console.error(message);
        }
      }
    };
    await Promise.all(Array.from({ length: 12 }, () => worker()));
  } finally {
    await pool.end();
  }
  console.log(
    `Processed ${analyzed}; already processed ${alreadyProcessed}; statuses: ${JSON.stringify(Object.fromEntries(statuses))}.`,
  );
  if (failures.length)
    throw new Error(`${failures.length} reviews failed to process.`);
}
