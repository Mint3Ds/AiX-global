# Visit2Value architecture

## New review flow

1. `POST /api/action` with `type: intake` validates branch, source ID, rating, timestamp, text, and synthetic flag, then saves the unmodified text as `pending` and records an activity event. The source key is unique per business and source.
2. A separate `analyze` call moves the review to `processing`. `AI_MODE` must explicitly be `fixture` or `live`. Fixture mode looks up **exact** supplied text. Live mode asks Jev the specific-feedback question, then uses OpenAI for the same decision if Jev fails. Generic reviews end as `generic` and remain searchable.
3. For useful feedback, each extracted observation retains a source-language quote, a short summary, and a normalized grouping description. `verifyEvidence` rejects a quote that is not an exact substring of the review. A bad provider response marks analysis failed; it never becomes customer evidence.
4. Each observation is matched independently. Live matching passes a bounded set of same-business, same-branch, same-kind themes to OpenAI and validates the returned ID. Fixture matching uses labelled expected theme IDs. Suggestions remain unconfirmed until an owner acts. A new live topic can create a suggested theme.
5. Priority is recalculated from distinct source review IDs and owner-editable severity using `src/config/priority.ts`. These are triage suggestions, not proof of risk. Corrections recompute counts and priority.
6. The owner sees evidence, can remove or reassign membership, and can edit, approve, reject, or defer a task. Only a server-side `owner` demo role can approve. Approval saves a payload snapshot and one locally simulated Orbyte handoff.
7. A task can become `resolved` only with a note of work actually done. Only then can the owner request a draft reply for a review linked to that theme. A reply can be edited and approved as `approved_ready`; editing it later returns it to `draft`. No platform posting occurs.
8. Activity events capture each consequential step. Application code only inserts audit events. Analysis runs are append-only. Completed reviews are not automatically reanalysed, which preserves owner corrections and prevents duplicate observations or handoffs.

## Stored relationships

- `businesses` → `branches` → `reviews`. Every review has one branch and original text.
- `analysis_runs` → `observations`: one review has many analysis versions and zero or more points. Providers and mode are stored for each stage/run and observation.
- `themes` ↔ `observations` through `theme_memberships`. Membership has source and confirmation state. A review can contribute several observations but counts once per theme.
- `tasks` → `themes`; `handoffs` → approved tasks; `replies` → reviews and resolved tasks. Unique constraints prevent duplicate handoffs and conflicting replies.
- `activity_events` references entities by ID and records actor, role, time, event type, and metadata.

Drizzle models are in `src/data/schema.ts`; SQL migration is in `migrations/0001_initial.sql`. The migration and seed are repeatable. Startup never resets tables. PostgreSQL is the durable store; the JSON files are source fixtures.

## Provider boundaries

`src/integrations/jev/screen.ts` implements TypeSafe's documented `POST /v1/systemone` request with `jev-latest`, a `noul` question, bearer authentication, a timeout, and one retry. It returns the same application-level yes/no shape used by `src/integrations/openai/client.ts`. The OpenAI adapter owns structured screening fallback, separate observation extraction, theme matching, and post-resolution drafting. Prompts are in those two adapter files. API keys are read only on the server.

The default OpenAI model is `gpt-5-mini`, configurable with `OPENAI_MODEL`. The official model documentation lists structured outputs, and a configured account successfully completed live screening, extraction, matching, and reply drafting smoke calls on 22 October 2026. Jev also completed a live screening call; an intentionally invalid Jev key verified the real OpenAI fallback path. Provider errors are visible as failed/needs-review states with retry; fixture results are never used silently in live mode.

`src/data/fixtures.ts` reads the existing synthetic seed, demo-new, and expected-analysis files. A known demo review can be analysed in fixture mode even when entered under a new database ID, because lookup uses its exact original text. Unknown text receives no fixture analysis. Source quotes remain in English, Malay, or mixed wording; normalized descriptions are separate. `src/domain/language.ts` stores conservative display labels and does not gate analysis.

## Owner control and Orbyte fit

The role switcher is an explicit demo simulation. Mutation handlers still check the owner role, but there is no secure authentication or production RBAC. Task transitions and reply transitions are enforced in `src/domain/workflow.ts` and `src/domain/service.ts`. The `WorkflowHandoffAdapter` interface and its local implementation are in `src/integrations/orbyte/handoff.ts`; they save a task/evidence/approval payload locally and return `simulated_queued`. There is no invented Orbyte endpoint. A future authorized connector could implement that interface once actual API details are known.

Restaurant categories and theme labels live in `src/config/business.ts`; priority thresholds live in `src/config/priority.ts`; UI wording lives in `src/components/Workspace.tsx`. Hotel and salon variants would supply different categories and operational task text while keeping the same normalized pipeline.

## Concrete example

The separate synthetic demo input, “The booth rocked when I leaned back, but the fried rice was beautifully smoky,” produces two stored points: a seating `operational_complaint` with quote “The booth rocked when I leaned back,” and fried rice `specific_praise` with its own exact quote. Only the seating point joins the Sunway unsteady-seating issue. An owner inspects it, approves an inspection task, records the fictional work done, then edits and approves one truthful reply to that review. The source review, provider labels, task status, handoff snapshot, resolution note, final draft, and activity sequence remain after refresh.
