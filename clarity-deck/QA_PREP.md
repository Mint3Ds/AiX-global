# Q&A preparation — Clarity

Answers grounded in the actual code (`src/domain/`, `src/config/`, `src/integrations/`, `data/fixtures/`, `ARCHITECTURE.md`). Keep answers short; lead with the bold line.

---

**What makes Clarity different from a review dashboard?**
**It turns feedback into tracked, owner-approved *work*, with evidence at every step.** A dashboard shows sentiment; Clarity extracts each distinct observation, keeps the exact quote, groups recurring issues by property, and drives an approval → task → verification → reply workflow with an append-only audit log.

**Why is this more than sentiment analysis?**
**Because one review is many signals, and a score throws them away.** Our demo review becomes three labelled observations (two issues + one praise), each linked to its verbatim quote. `verifyEvidence` rejects any quote that isn't an exact substring of the source — so the system can't invent or paraphrase.

**What exactly is automated vs. human?**
**Automated:** intake (verbatim save), screening (Jev → OpenAI fallback), observation extraction, issue matching, distinct-count and priority computation. **Human-gated:** approving a task, assigning staff, verifying completed work, and approving every reply. Nothing is auto-posted.

**How does human approval work — and is it enforced or just UI?**
**Enforced server-side.** `requireOwner(role)` throws if a non-owner attempts an owner action; `requireTransition` validates every state change; `canDraftReply` blocks a reply unless the task is `resolved` with a truthful note. The role switcher is explicitly a demo, not production auth — we say so.

**What happens when an approval is rejected / a reply shouldn't go out?**
**The work doesn't advance, and the evidence is preserved.** A reply tied to a review with other unresolved complaints carries a stored **partial-reply warning**; the owner must explicitly approve it or leave it. Batch approval is restricted to unambiguous drafts with no unresolved or high-severity concerns.

**How does the activity log work?**
**`activity_events` is business-scoped and append-only** for consequential actions (approvals, assignments, verifications, reply status changes). Published demo replies become historical records and can't be edited.

**What's the measurable business benefit, and how is it calculated?**
**Reclaimed staff time on triage, benchmarked against published literature.** Manual triage baseline = 600s (conservative lower bound of Johnston 2001's 10–15 min). `calculateWorkspaceMetrics` tracks per-review dwell and computes `measuredTimeReductionPercent` and `hoursReclaimed = specificReviews × (600 − measuredTriage) / 3600`. Response readiness is benchmarked against the 31.5% industry response rate (Proserpio & Zervas 2017). **These run on synthetic data — it's a target, not a field result.**

**Aren't those numbers made up?**
**No — the benchmarks are peer-reviewed and cited in the code (`metrics.ts`), and the reduction is computed, not hard-coded.** We deliberately avoided claiming a headline "50%". We'd validate the real figure with timed review batches, quote-accuracy checks, and approved-task completion rates.

**How would a second SME adopt it?**
**They select a business — no rebuild.** The data model is multi-tenant: every route and query is scoped by `businessId`, and a review's property must belong to its business. We already run three SME types on one database: Harbour House Hotel (244 reviews), Nusa Table restaurant (80), and Luma Salon (18).

**What's Clarity's relationship to Orbyte?**
**It's a reusable feedback-to-work module that would plug into Orbyte.** Today the Orbyte handoff is a **local simulation** — `WorkflowHandoffAdapter` writes a `simulated_queued` payload (business, property, assignee, due date, quote references). There's no live Orbyte or review-platform API call. Production would need a documented integration.

**What AI do you actually use?**
**Jev (via Typesafe) for screening, with OpenAI as fallback and for extraction, matching, and reply drafting** (`OPENAI_MODEL` defaults to `gpt-5-mini`). Keys stay server-side. For the demo we run **fixture mode**: deterministic, no keys needed, exact-text lookups. Provider failures leave the review searchable and retryable rather than dropping it.

**What about privacy / Malaysia's PDPA?**
**Data minimisation and provenance are built in; full PDPA compliance is future work.** All demo data is synthetic. There's a PII-masking integration (`src/integrations/pii-masking.ts`) and a privacy domain module. Production would add real consent, retention, access controls, and authorised source access — we don't claim that's done.

**Which SDG and why?**
**SDG 8 — Decent Work and Economic Growth.** We cut low-value busywork so small-business staff spend time on the operational fixes that improve the workplace and help the business grow.

**Is anything faked in the demo?**
**The data is synthetic and the Orbyte handoff + reply posting are simulated — and we label both.** Everything else (extraction, evidence verification, approvals, state machine, activity log, metrics) is real code running against a real PostgreSQL database.

**What's the tech stack?**
**Next.js 16 · React 19 · TypeScript · PostgreSQL + Drizzle ORM · Zod validation · Recharts.** Clear separation of presentation (components/CSS) from domain/provider logic.

**What would you build next?**
Authorised, real review-source ingestion; a documented Orbyte integration replacing the simulated handoff; production identity/permissions replacing the demo role switch; and a validation study to turn the pilot target into a measured result.

---

### If pushed on a weakness, be honest
- "The approval is just a role dropdown" → *it's a demo switch, but the backend enforces owner-only actions and valid state transitions.*
- "You don't have real integrations" → *correct; the Orbyte handoff and posting are simulated and labelled as such. The module is built to drop a real adapter in.*
- "Your metrics aren't from real users" → *correct; they're computed on synthetic data against published benchmarks. We've designed the validation method.*
