import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/data/db";
import { themes } from "../src/data/schema";
import { screenWithJev } from "../src/integrations/jev/screen";
import {
  extractWithOpenAI,
  matchObservationsWithOpenAI,
  modelName,
  screenWithOpenAI,
} from "../src/integrations/openai/client";
import { candidateThemes } from "../src/domain/themes";
import { verifyEvidence } from "../src/domain/analysis";

const samples = [
  {
    id: "multi_point_hotel",
    expectedSpecific: true,
    text: "The air conditioner barely cooled room 312 throughout the night, and the bathroom smelled musty. Front desk agent Mei was helpful and brought an extra fan.",
  },
  {
    id: "generic_hotel",
    expectedSpecific: false,
    text: "It was okay. Not good, not terrible. I probably would not stay again.",
  },
  {
    id: "single_issue_hotel",
    expectedSpecific: true,
    text: "The shower drain was blocked and water flooded the bathroom floor. The night manager helped us quickly.",
  },
];

const timed = async <T>(fn: () => Promise<T>) => {
  const started = performance.now();
  try {
    return { value: await fn(), ms: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "unknown error",
      ms: Math.round(performance.now() - started),
    };
  }
};

async function run(
  sample: (typeof samples)[number],
  provider: "jev" | "openai",
) {
  const totalStarted = performance.now();
  const screening = await timed(async () =>
    provider === "jev"
      ? (await screenWithJev(sample.text)).result
      : await screenWithOpenAI(sample.text),
  );
  const result: Record<string, unknown> = {
    sample: sample.id,
    provider,
    screeningMs: screening.ms,
  };
  if ("error" in screening) {
    result.error = screening.error;
    result.totalMs = Math.round(performance.now() - totalStarted);
    return result;
  }
  const useful = screening.value.containsSpecificFeedback;
  result.screenedSpecific = useful;
  result.screeningCorrect = useful === sample.expectedSpecific;
  if (!useful) {
    result.observations = 0;
    result.matchingMs = 0;
    result.totalMs = Math.round(performance.now() - totalStarted);
    return result;
  }
  const extraction = await timed(() => extractWithOpenAI(sample.text));
  result.extractionMs = extraction.ms;
  if ("error" in extraction) {
    result.error = extraction.error;
    result.totalMs = Math.round(performance.now() - totalStarted);
    return result;
  }
  const observations = verifyEvidence(
    sample.text,
    extraction.value.observations,
  );
  result.observations = observations.length;
  result.exactEvidence = observations.every((item) =>
    sample.text.includes(item.evidenceQuote),
  );
  const branchThemes = await db
    .select({
      id: themes.id,
      title: themes.title,
      type: themes.type,
      branchId: themes.branchId,
    })
    .from(themes)
    .where(
      and(
        eq(themes.businessId, "harbour-house"),
        eq(themes.branchId, "hotel-central"),
      ),
    );
  const candidatesByObservation = observations.map((observation) =>
    candidateThemes(
      branchThemes,
      "hotel-central",
      observation.kind,
      observation.aspect + " " + observation.normalizedDescription,
    ).slice(0, 20),
  );
  const matching = await timed(() =>
    matchObservationsWithOpenAI(observations, candidatesByObservation),
  );
  result.matchingMs = matching.ms;
  result.validMatches =
    "error" in matching
      ? 0
      : matching.value.matches.filter(
          (match) =>
            match.themeId &&
            candidatesByObservation[match.observationIndex]?.some(
              (candidate) => candidate.id === match.themeId,
            ),
        ).length;
  if ("error" in matching) result.matchingError = matching.error;
  result.totalMs = Math.round(performance.now() - totalStarted);
  return result;
}

try {
  if (process.env.AI_MODE !== "live")
    throw new Error("Set AI_MODE=live to run provider benchmarks.");
  const results = [];
  for (const sample of samples) {
    for (const provider of ["jev", "openai"] as const) {
      results.push(await run(sample, provider));
    }
  }
  console.log(JSON.stringify({ model: modelName(), results }, null, 2));
} finally {
  await pool.end();
}
