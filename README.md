# Visit2Value

Visit2Value turns customer reviews into evidence-backed, owner-approved business actions. The fictional demo restaurant, Nusa Table, has Sunway and Bangsar branches. The app saves original reviews, identifies specific feedback, extracts separate observations, suggests branch-specific themes, and shows the exact quote behind each suggestion. An owner can correct evidence, approve a task, record completed work, and approve a reply that is ready to post manually.

This is a synthetic hackathon prototype for Domain 2, “Orbyte Smart SME Challenge: Less Busywork, Better Business.” The Orbyte handoff is **simulated and stored locally**. No review platform, Orbyte API, or customer account is connected.

## Quick start

Requires Node.js 22.12+ (or Node 24+) and PostgreSQL 16+. If you use `nvm`, run `nvm use` in the repository first; `.nvmrc` selects a compatible version.

```sh
npm ci
cp .env.example .env.local
# Start PostgreSQL and set DATABASE_URL in .env.local as described below.
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. `AI_MODE=fixture` in `.env.local` provides the reliable demo without API keys. The app respects `HOST` and `PORT` supplied by the shell or hosting environment; for example, `PORT=3001 npm run dev` on macOS/Linux. Next.js reads these before `.env.local`, so set custom host and port in your shell or host settings rather than that file. No Git commit, deployment, or external posting is required to run it.

### Local PostgreSQL

If PostgreSQL is already running, create a database and role matching `DATABASE_URL`. On macOS with Homebrew, one setup is:

```sh
brew install postgresql@16
brew services start postgresql@16
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
psql postgres -c "CREATE ROLE visit2value LOGIN PASSWORD 'visit2value';"
createdb -O visit2value visit2value
```

The `.env.example` URL then works locally. Use a stronger local password if appropriate and update your ignored `.env.local`. On Linux or Replit, use an existing PostgreSQL service and its connection URL instead. Do not commit `.env.local`.

### Environment

| Variable           | Purpose                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`     | PostgreSQL connection URL; required at runtime.                                                                                                                                                        |
| `AI_MODE`          | Required: `fixture` or `live`. Current mode appears in the header.                                                                                                                                     |
| `TYPESAFE_API_KEY` | Server-only key for Jev screening in live mode.                                                                                                                                                        |
| `OPENAI_API_KEY`   | Server-only key for fallback, extraction, matching, and reply drafting.                                                                                                                                |
| `OPENAI_MODEL`     | Configurable OpenAI model; default `gpt-5-mini`. The selected model must support Responses structured outputs and be available to your account. Errors are shown rather than silently changing models. |
| `HOST`, `PORT`     | Optional shell or hosting environment variables for server host and port; defaults are `0.0.0.0` and `3000`.                                                                                           |

The default model's documented structured-output support was checked against [official OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-5-mini). A live call with the configured key successfully used `gpt-5-mini` on 22 October 2026; account access can change, so configuration errors remain visible.

### Useful commands

```sh
npm run dev          # development server
npm run build        # production build
npm run start        # built server
npm run db:migrate   # create the schema; safe to repeat
npm run db:seed      # insert source fixtures; safe to repeat
npm run typecheck
npm run lint
npm test
TEST_BASE_URL=http://localhost:3000 npm test  # after completing the demo journey, include persisted route-handler checks
```

Only for an intentionally disposable demo database:

```sh
CONFIRM_DEMO_RESET=yes npm run db:reset
npm run db:migrate
npm run db:seed
```

The reset drops the database's `public` schema and its contents. Ordinary startup never clears data. The seed uses the existing `data/fixtures/visit2value/reviews.seed.json` file and its human-authored expected-analysis subset. It does **not** insert `reviews.demo-new.json`. The duplicate rule is unique `(businessId, source, sourceReviewId)`.

## Four-minute judge demo

1. Start in fixture mode. Dashboard → **Inspect seating evidence**. Show the count of distinct Sunway reviews and the original English and Malay quotes. Bangsar themes remain separate.
2. New review: use the prefilled, separate synthetic text: **“The booth rocked when I leaned back, but the fried rice was beautifully smoky.”** Save and analyse. The review detail shows one seating complaint and one fried rice compliment, each with an exact quote and `fixture` provenance. The seating count rises by one.
3. Issues → Unsteady seating. Inspect a quote. Demonstrate **Correct grouping** by removing an observation, then find that review under Reviews and restore its owner grouping. The count updates.
4. Tasks → the seating proposal. Review or edit it, approve it as the simulated owner, and show the **simulated Orbyte integration** payload. Enter a synthetic resolution note describing work that was actually done in the fictional scenario; mark resolved.
5. Prepare a reply for the new review, edit it to match the resolution note, approve it as **ready to post**, then refresh. Activity shows intake → fixture analysis → correction → approval → simulated handoff → resolution → reply.

For a fresh judge run, reset and reseed a disposable demo database before the presentation. The first demo record's ID in the fixture file is `demo-review-001`; a newly entered database review receives a UUID.

## AI behavior

**Live mode** (`AI_MODE=live`): [TypeSafe's documented `POST /v1/systemone`](https://api.typesafe.ai/docs) asks Jev whether a review has at least one specific useful point. Jev gets one retry. If unavailable, timed out, uncertain, or invalid, the same screening question goes to OpenAI structured output. A useful review proceeds to OpenAI observation extraction and same-branch theme matching. After a resolution note, OpenAI drafts a reply. Each stage records its actual provider, model where available, prompt version, mode, time, and safe failure information. If OpenAI fails, the review remains failed or needs review with a retry route. Provider calls and keys remain server-side.

**Fixture mode** (`AI_MODE=fixture`): exact supplied review text receives labelled deterministic expectations. Generic reviews remain searchable without observations. Unknown text has no fabricated fixture result; it enters `needs_review` for an owner decision or can be retried after switching to live mode. The seed intentionally pre-analyses only the labelled subset; the rest are pending. `Analyse up to 5 pending` handles a small batch.

The selected model uses the official OpenAI JavaScript SDK's [Responses structured parse method](https://developers.openai.com/api/docs/guides/structured-outputs). On 22 October 2026, a separate synthetic live review was screened by Jev (`jev-1.14.0`), extracted by OpenAI (`gpt-5-mini`) into separate seating and fried rice observations, and matched by OpenAI to the appropriate Sunway themes. A second generic synthetic review used a deliberately invalid Jev key for one local server run; real OpenAI screening handled the fallback and stored `openai_fallback`. After a synthetic owner resolution note, OpenAI generated a reply draft, which was edited and approved locally. The temporary test reviews and actions were removed by resetting this disposable local database; the saved keys were not changed. These smoke tests demonstrate the configured paths at that time, not broad model accuracy or production reliability.

## Replit

1. Import the GitHub repository in Replit and select Node.js 22.12+ (or Node 24+). The imported branch must contain these application files and fixtures.
2. Provision Replit's managed PostgreSQL database. Put its connection string in the `DATABASE_URL` Secret. Do not use a local SQLite file.
3. Add `AI_MODE=fixture` for the reliable demo, or `AI_MODE=live` plus `TYPESAFE_API_KEY`, `OPENAI_API_KEY`, and `OPENAI_MODEL` Secrets for live processing.
4. Run `npm ci`, `npm run db:migrate`, `npm run db:seed`, then `npm run dev`. Replit supplies a port; the npm script uses it. For a production run, use `npm run build` and `npm run start`.

Importing the repository gives teammates code, not a shared running website. To send a browser link, publish the Replit App and check the **published** app's Secrets and PostgreSQL database separately. Replit may give the published app its own production database; copy the synthetic development data during publishing when that option is available, or run the migration and seed against the production `DATABASE_URL`. Then open the published URL and confirm it shows 80 reviews before sharing it. See [Replit's production database guide](https://docs.replit.com/references/data-and-storage/create-production-database-when-publishing). Keep the demo database synthetic only.

Do not copy a personal `.env.local` into Replit or GitHub. The demo role switcher is **not production authentication**.

## Where to change the code

- `src/app` and `src/components`: pages, route handlers, and owner interface.
- `src/domain`: evidence rules, language labels, theme counts, and workflow transitions.
- `src/integrations/jev` and `src/integrations/openai`: provider calls and prompts.
- `src/integrations/orbyte`: local simulated handoff interface and payload.
- `src/config`: restaurant categories, seeded theme labels, and priority thresholds.
- `src/data`: Drizzle models, connection, and exact fixture loader.
- `migrations` and `scripts`: schema, migration, repeatable seed, and intentional reset.
- `tests`: focused rules, fixture contracts, and optional local route tests.

[ARCHITECTURE.md](ARCHITECTURE.md) walks through the data flow and approval boundaries. A hotel could replace restaurant categories with room, cleanliness, and check-in observations; a salon could use appointment, service, and hygiene categories. The review → observation → theme → approval → task → reply flow stays the same.

## Boundaries and proposed measurements

This prototype uses team-created synthetic reviews, business identities, staff roles, and outcomes only. A real deployment would need authorized review sources, authentication and permissions, retention and deletion practices, and handling consistent with Malaysia's PDPA principles. This is an architecture note, not legal advice. It does not process payments, file statutory returns, or provide financial or legal advice.

Proposed measurements, **not validated results**, include owner triage time, time from recurring complaint to approved action, confirmed recurring issue count, grouping correction rate, and reply preparation time. No revenue or satisfaction improvement is claimed. Future integrations could connect authorized review sources, production identity, and a real Orbyte workflow after API access and consent are established.

The repository retains its existing MIT license file. [LICENSE-APACHE-2.0](LICENSE-APACHE-2.0) includes the Apache License 2.0 text requested for the hackathon; the team should confirm the intended distribution license before publishing.
