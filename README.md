# Clarity

Clarity is a synthetic review-to-resolution workspace for small businesses. The default judge demo is **Harbour House Hotel**, a fictional independent hotel with two properties. The original Nusa Table restaurant remains available, and a smaller Luma Salon workspace demonstrates that the same review workflow can serve another business type. Use the business selector at the top of the app. The selector scopes reviews, issues, staff, tasks, replies, and activity to that business.

Every business, employee, guest review, source label, and outcome in this repository is team-created fiction. All three hotel review sources are **simulated**. No source is scraped or connected. The Orbyte handoff and reply publication are local simulations; there is no Orbyte or review-platform API call. The role switcher demonstrates workflow rules, but it is not production authentication.

## Team Information

| Field                 | Details                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| **Team Name**         | AiX Global                                                              |
| **Team Domain**       | Domain 2                                                                |
| **SDG Track (1–17)**  | SDG 8 — Decent Work and Economic Growth                                 |
| **Team Leader**       | Bhone Myat Paing Soe                                                    |
| **University**        | Monash University, Sunway University, Univeristy of Nottingham Malaysia |
| **Number of Members** | 4                                                                       |

## Links

| Resource           | Link                                  |
| -----------------  | ------------------------------------- |
| GitHub Repository  | https://github.com/Mint3Ds/AiX-global |
| Live Demo          | https://ai-x-global.replit.app/ (password below) |
| Live Demo Password | AixGlobal123456789                    |
| Slide Deck         | https://canva.link/gjz6konw9zie5y9    |
| Demo Video         | insert youtube link here              |

---

## Run locally with teammates

Requires Node.js 22.12+ (or Node 24+) and PostgreSQL 16+. Clone the shared GitHub repository, then run:

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL in the ignored .env.local file and start PostgreSQL.
npm run db:migrate
npm run db:seed
# Optional: load the historical synthetic demo reviews into a fresh database.
SEED_LEGACY_REVIEWS=yes npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The default `AI_MODE=fixture` needs no AI keys. Each teammate runs their own database and migration/seed; GitHub shares code and JSON fixtures, not local PostgreSQL rows. `db:migrate` and `db:seed` are repeatable and do not reset owner work. Ordinary `db:seed` adds businesses, properties, employees, and themes. `SEED_LEGACY_REVIEWS=yes npm run db:seed` also loads the historical synthetic reviews and labelled analyses where missing. The separate demo review is never seeded. Do not commit `.env.local`.

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
2. Open **New review** and paste this exact synthetic text into the blank form: “The AC in room 226 blew warm air all night. We also saw a small insect near the bathroom sink. The front desk was patient and helpful.” The form generates a new source ID when you save. In fixture mode this exact text yields three labelled observations; other new wording stays in **Needs review**. In live mode it goes through Jev and OpenAI. The review is saved before analysis, and the AC issue gains one distinct source review.
3. Open **Issues**, inspect the new evidence, and optionally remove and restore a mistaken grouping. The distinct-review count follows the evidence.
4. Confirm the AC issue, then create a work task. Choose a fictional employee and due date, then approve and assign it. The task moves to **Assigned work**. The Orbyte handoff is saved locally as a simulation; there is no external delivery.
5. Switch to **Staff** to simulate the assigned employee submitting a specific work report. Switch back to **Owner** to inspect it and press **Verify completed work**. This moves the task to **Completed work tasks**.
6. Prepare replies from the completed task, then use **Manage replies** to inspect each original review beside its draft. The unresolved insect concern triggers a conspicuous partial-reply warning. An owner may leave it for later or explicitly approve a truthful partial reply. Approve and simulate posting records a local status change; no external post occurs. Safe drafts can be batch approved without posting.
7. Return to **Reviews** to search all original text, including generic reviews, and filter by property, rating, status, observation category, and arrival date. Search for a topic such as “breakfast.” A later review related to a verified issue flags possible recurrence and permits a new task while preserving the first task's history.

The restaurant and salon use the same review and issue model, with their own data. The hotel has the complete demonstration. The form creates a new synthetic source ID for each submitted review. Feed replays with the same source identity must preserve the original wording, property, rating, and review timestamp.

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

## Overall Project Structure

Clarity is built as a unified, full-stack Next.js web application that strictly separates visual presentation from core business logic. The frontend leverages standard React components alongside a modular, token-based CSS architecture to provide accessible, responsive workspaces where users can manage AI-suggested themes and assign tasks. Beneath the surface, the backend enforces a robust, multi-tenant data architecture where every API route and state query is strictly scoped by a unique business identifier. This ensures that distinct entities—such as a hotel or a restaurant—can operate securely on the same managed PostgreSQL database. Utilizing Drizzle ORM and Zod runtime validation, the system maintains strict data integrity while immutably linking original review evidence to operational activity logs.

The backend acts as a centralized orchestrator for our multi-stage AI processing pipeline, keeping all sensitive interactions and API keys securely on the server. Upon data ingestion, the system routes customer feedback through the Jev classification model for initial screening, utilizing OpenAI as a reliable fallback for screening, exact-quote observation extraction, and drafting context-aware public replies. To ensure the prototype operates safely without altering live external systems, the architecture utilizes specialized workflow adapters to locally simulate cloud event buses and third-party integrations, such as the Orbyte task handoff. This modular, securely scoped structure not only guarantees end-to-end data provenance but also ensures the codebase is fully portable and ready for seamless cloud deployment on platforms like Replit.

## Replit Integration & Cloud Deployment

Clarity leverages Replit as our official cloud hosting and managed database provider, ensuring a seamless transition from local development to a live, publicly accessible environment. While our Next.js and Drizzle ORM architecture is highly portable, integrating this premium sponsor resource was essential for delivering a fully functional, cloud-ready prototype within the hackathon’s strict timeframe. The codebase is configured so that this GitHub repository can be imported directly into a Replit workspace, utilizing standard npm scripts and avoiding dependency on any laptop-specific services or hardcoded local addresses.

Our deployment relies on two critical Replit features: managed databases and secure environment configuration. Instead of risking data volatility with local files, Clarity utilizes Replit’s managed PostgreSQL database to power our multi-tenant data architecture, ensuring reliable persistence for our business-scoped workflows, task reports, and activity logs. To maintain strict security protocols, we utilize Replit Secrets to handle our environment variables, such as the DATABASE_URL and our GenAI API keys for Jev and OpenAI. This integration seamlessly injects credentials into our Next.js App Router backend, ensuring that all AI model interactions and data queries remain strictly server-side and entirely hidden from the browser.