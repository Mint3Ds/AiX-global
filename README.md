# Clarity

Clarity is a synthetic review-to-resolution workspace for small businesses. The default judge demo is **Harbour House Hotel**, a fictional independent hotel with two properties. The original Nusa Table restaurant remains available, and a smaller Luma Salon workspace demonstrates that the same review workflow can serve another business type. Use the business selector at the top of the app. The selector scopes reviews, issues, staff, tasks, replies, and activity to that business.

Every business, employee, guest review, source label, and outcome in this repository is team-created fiction. All three hotel review sources are **simulated**. No source is scraped or connected. The Orbyte handoff and reply publication are local simulations; there is no Orbyte or review-platform API call. The role switcher demonstrates workflow rules, but it is not production authentication.

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | AIx Global                                  |
| **Team Domain**        | Domain 2                                    |
| **SDG Track (1–17)**   | SDG 8 — Decent Work and Economic Growth     |
| **Team Leader**        | Bhone Myat Paing Soe                        |
| **University**         | Monash University, Sunway University, Univeristy of Nottingham Malaysia |
| **Number of Members**  | 4                                           |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/Mint3Ds/AiX-global          |
| Live Demo         | insert youtube link here                       |
| RunPod Endpoint   | insert runpoint endpoint here                  |
| Slide Deck        | https://canva.link/gjz6konw9zie5y9             |
| Demo Video        | insert youtube link here                       |

---


## Run locally with teammates

Requires Node.js 22.12+ (or Node 24+) and PostgreSQL 16+. Clone the shared GitHub repository, then run:

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL in the ignored .env.local file and start PostgreSQL.
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The default `AI_MODE=fixture` needs no AI keys. Each teammate runs their own database and migration/seed; GitHub shares code and JSON fixtures, not local PostgreSQL rows. `db:migrate` and `db:seed` are repeatable and do not reset owner work. They insert the source fixtures and labelled historical analyses only when those rows are absent. The separate demo review is never seeded. Do not commit `.env.local`.

For a fresh local PostgreSQL installation on macOS, the previous setup still applies: install/start `postgresql@16`, create a `visit2value` role and database, then use the URL in `.env.example`. Replit requires a provisioned PostgreSQL database and `DATABASE_URL` Secret. Import this repository, run the same migration/seed commands, and set `AI_MODE=fixture` as a Secret. If publishing a Replit App, check its published database and Secrets separately.

NOTE: The old project name was named 'visited2value' and its name is still present within the code. This shouldn't matter to anyone running the live prototype, but if you're configuring yourself, please keep note.

### Configuration

| Variable           | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `DATABASE_URL`     | PostgreSQL connection URL; required.                                           |
| `AI_MODE`          | `fixture` for deterministic demo or `live` for actual provider calls.          |
| `TYPESAFE_API_KEY` | Server-side Jev key for live screening.                                        |
| `OPENAI_API_KEY`   | Server-side OpenAI key for fallback, extraction, matching, and reply drafting. |
| `OPENAI_MODEL`     | OpenAI model; defaults to `gpt-5-mini`.                                        |
| `HOST`, `PORT`     | Optional shell-provided bind host and port.                                    |

In live mode, Jev decides whether a review has any specific business feedback; OpenAI takes over screening if Jev fails. OpenAI extracts distinct observations, proposes same-property issue matches, and drafts a reply after verified work. Provider failures leave the source review searchable and retryable. Fixture mode processes only exact labelled text; arbitrary new text enters `needs_review` for manual classification or can be retried in live mode. The historical seed's provider is labelled `fixture`, never Jev.

## Judge journey

1. Open **Harbour House Hotel**. There are 244 historical synthetic reviews across three simulated sources, with at least 24 distinct source reviews supporting the Central property's air-conditioning issue and a separate insect issue. Open an issue and inspect the exact quotes, full reviews, dates, ratings, and source labels. The Garden property stays separate.
2. Open **New review**. The prefilled hotel text mentions warm AC, a small insect, and helpful front-desk staff. Give it a new source review ID if you have previously run the demo, then save and analyse. It is not part of the seed. In fixture mode its exact text yields three labelled observations. In live mode it goes through Jev and OpenAI. The review is saved before analysis, and the AC issue gains one distinct source review.
3. Open **Issues**, inspect the new evidence, and optionally remove and restore a mistaken grouping. The distinct-review count follows the evidence.
4. Propose an AC task. Select a fictional employee, set a due date, save, and approve. The approved task remains in Clarity. **Activity** shows a locally simulated Orbyte handoff with the approval, assignee, property, due date, and evidence references.
5. Switch to **Staff**, choose the assigned fictional employee, start work, and submit a specific work report. Switch back to **Owner** to inspect the report and enter a separate verification note. Only this verification resolves the task.
6. Draft a reply to the new review. It must address the whole source review: the unresolved insect concern triggers a conspicuous partial-reply warning. Read or edit the draft and explicitly approve a truthful partial reply. Approval leaves it ready; **Simulate publishing** changes the local demo status to `simulated_published` and adds an activity event. No external post occurs.
7. Return to **Reviews** to search all original text, including generic reviews, and filter by property, simulated source, rating, status, and observation category. Search for a topic such as “breakfast.” A later review related to a verified issue flags possible recurrence and permits a new task while preserving the first task's history.

The restaurant and salon use the same review and issue model, with their own data. The hotel has the complete demonstration. On an already used local database, the prefilled source ID may be taken; enter a different synthetic source ID to inject the same prepared text again. The app rejects a source ID if its original evidence is changed.

## Commands and code map

```sh
npm run typecheck
npm run lint
npm test
TEST_BASE_URL=http://localhost:3000 npm test  # adds local route tests, including one synthetic intake
npm run build
```

`npm run db:reset` is destructive and guarded by `CONFIRM_DEMO_RESET=yes`; use it only on an intentionally disposable database. Ordinary startup never drops data.

- `src/components/Workspace.tsx`, `src/components/design/`, `src/styles/`: interface and design components.
- `src/app/api/`: business-scoped route handlers.
- `src/domain/`: analysis validation, evidence, issue counts, priority, workflow rules, and service orchestration.
- `src/integrations/jev`, `src/integrations/openai`: real live provider adapters; keys remain server-side.
- `src/integrations/orbyte/handoff.ts`: the local simulated handoff interface, not an Orbyte API.
- `src/data/schema.ts`, `migrations/`: PostgreSQL/Drizzle schema and additive migrations.
- `scripts/seed-impl.ts`, `scripts/generate-hotel-fixtures.py`, `data/fixtures/visit2value/`: repeatable synthetic data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow and [dataset documentation](data/fixtures/visit2value/DATASET_README.md) for fixture provenance. Production use would need authorized review-source access, real identity and permissions, operational verification controls, and a documented Orbyte integration. This demo makes no claim of real posting or measured business improvement.
