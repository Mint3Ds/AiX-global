# Live demo choreography — Clarity

This maps the on-stage demo to the **Domain 2 expected journey**:
**Trigger → Connected Data → Decision Logic → Human Approval → Action → Visible Result & Activity Log.**
It follows the official judge journey in the app's own `README.md`.

> ★ = keep this step even in the tight 5-minute variant. Everything else is cuttable.

---

## Before you walk on stage (do this early)

1. Start the app and confirm it loads: `npm run dev` → `http://localhost:3000` (or open the hosted Replit and log in — password is in the app repo README).
2. Confirm the business selector shows **Harbour House Hotel** (the default).
3. Set `AI_MODE=fixture` so the demo is **deterministic** — the new-review text below produces the same three observations every time. (Live mode calls Jev + OpenAI and is non-deterministic; don't risk it on stage.)
4. Have the **new-review text** on your clipboard (see step 2 below).
5. Open the deck and the app in **two windows/tabs** so `D` → app and `Alt-Tab`/`⌘~` → deck is one motion. Don't hunt for tabs mid-pitch.
6. **Record a backup screen capture** of this exact journey now, and keep the file on the desktop. If the network or DB misbehaves on stage, play the recording and narrate over it — clearly saying it's a backup.

---

## The journey (narrate as you click)

### ★ 1 — Trigger + Connected Data: open a real issue
- Go to **Issues** → open **"Room air conditioning not cooling"** (Central property).
- Show the **distinct source review count** and open 2–3 of the linked reviews: point at the **exact quote**, the date, rating, and the **simulated source label**.
- Say: *"24 distinct source reviews across three simulated platforms already point at this one problem. Every number traces back to a real quote — and the Garden property stays separate."*

> Judge value: connected data + evidence traceability (Technical Execution).

### ★ 2 — Decision Logic: feed a new review, watch it decompose
- Go to **New review**. Paste **exactly** (fixture mode depends on exact text):

  > `The AC in room 226 blew warm air all night. We also saw a small insect near the bathroom sink. The front desk was patient and helpful.`

- Save. Point out it's **saved first (verbatim) with a fresh synthetic source ID**, *then* analysed.
- Show the **three labelled observations**: the AC issue, the insect issue, the front-desk praise — each with its exact-substring quote. Note the AC issue's distinct count ticks up by one.
- Say: *"The review is preserved before any AI touches it. Then it becomes three separate, evidence-linked signals — not one score."*

> Judge value: accurate, easy-to-learn behaviour; the signature capability (Innovation).

### 3 — Human Approval: approve a task (this is the core must-have)
- From the AC issue, **propose a task**. Edit the title/description if you like.
- Assign a **fictional employee** at the same property, set a **due date**, then **Approve & assign**.
- Say: *"This is owner-only. The role switcher is a demo, not real auth — and the backend enforces it: `requireOwner` throws if a non-owner tries. Approval stores a snapshot and sends it to the simulated Orbyte handoff — a local payload, no external API."*

> Judge value: meaningful human approval + honesty about simulation (Technical Execution · Impact).

### 4 — Action: staff report → owner verify
- Switch role to **Staff**, submit a short **work report** on the task.
- Switch back to **Owner**, open the task, press **Verify completed work**. It moves to **Completed**.
- Say: *"Two roles, both recorded. The resolution note is now the verified record of what actually happened."*

### ★ 5 — Visible Result + Activity Log + the honesty moment
- Go to **Manage replies**, open the reply draft for one of the AC reviews.
- Point at the **partial-reply warning**: the unresolved **insect** concern is flagged *before* the reply can be approved. Approve the truthful reply and **simulate posting**.
- Open **Activity** and show the append-only trail of everything you just did.
- Say: *"Clarity won't let the owner reply 'all fixed' while something's still open — it surfaces the unresolved issue. Nothing was auto-posted; every consequential action is in the log."*

> Judge value: human control + audit trail + the partial-reply guardrail (the detail that wins trust).

### Optional 6 — Recurrence / search (only if time)
- Go to **Reviews**, search **"breakfast"** to show full-text search + filters.
- Mention a later review on a verified issue flags **possible recurrence** and allows a new task while preserving the first task's history.

---

## Return to the deck
Press `Esc`, then `Alt-Tab` (`⌘~` on macOS) back to the deck window, and press `→` to go to **Impact**.

---

## Guardrails (from the brief)
- **Don't change business logic to make the demo prettier.** If a feature isn't there, say so.
- All records are **synthetic**. Say it once, early.
- If anything fails: switch to the **backup recording**, say it's a backup, and keep narrating the same five steps. Don't debug on stage.
