# Clarity — Grand Finals pitch deck

A self-contained, cinematic web presentation for **Clarity** (Domain 2 · Orbyte Smart SME Challenge).
Built to run offline, on any laptop or projector, with **no build step and no CDN dependency** — so nothing can break on stage.

---

## 1. Run it (two ways)

**Easiest — just open the file.** Double-click `index.html`. It opens in your default browser and works fully offline.

**Recommended for the actual pitch — serve it** (avoids any browser `file://` quirks and lets the live-demo link open cleanly):

```sh
cd clarity-deck
python3 -m http.server 8000
# then open http://localhost:8000 in Chrome
```

Then press **F11** (Windows) or **⌃⌘F** (macOS) for full screen.

> Tip: Chrome gives the cleanest full-screen (no tab/address bar). Open the deck, press `P` to hide the progress rail, then F11.

---

## 2. Presenter controls

| Key | Action |
|---|---|
| `→` `Space` `↓` | Next step / slide |
| `←` `↑` | Previous |
| `R` | Replay the current slide's animation |
| `Home` / `End` | Jump to first / last slide |
| `D` | Open the **live Clarity workspace** in a new tab |
| `Esc` | Return focus to the deck (then `Alt+Tab` / `⌘~` back) |
| `P` | Hide / show the progress rail + counter (hide it for presenting) |
| `O` | Overview — jump to any slide by name |
| `M` | Toggle reduced-motion (instant, no animation) |
| `?` | Show the controls overlay |

Each slide reveals in **presenter-controlled beats** — nothing auto-plays past where you are, so you never wait for an animation. You can also **click anywhere** to advance.

---

## 3. Wire up the live demo button

The deck's **"Open the live Clarity workspace"** button (and the `D` key) points at `http://localhost:3000` by default.

Before the pitch, set it to whatever you're actually running. Open `deck.js`, near the top:

```js
var LOCAL_DEMO  = "http://localhost:3000";          // your local app
var HOSTED_DEMO = "https://ai-x-global.replit.app/"; // the Replit fallback (password in repo README)
```

- Running the app locally for the demo? Leave `LOCAL_DEMO` as is and start it first (`npm run dev`).
- Demoing from Replit? Change the button target to `HOSTED_DEMO`: set `if (demoLaunch) demoLaunch.setAttribute("href", LOCAL_DEMO);` to `... HOSTED_DEMO);`.

See `DEMO_CHOREOGRAPHY.md` for the exact demo path and a backup plan.

---

## 4. Slide order (10 slides)

1. **Cold open** — a real **WebGL 3D** field of review-points drifts out of focus; the camera moves through them and they converge into a luminous lens that frames the line *"Every review is a signal. Only action creates value."* (coming into clarity).
2. **Title** — Clarity · positioning · team · SDG 8
3. **The problem** — the feedback-to-action gap (244 reviews, 3 sources, 2 properties; literature benchmarks)
4. **One review. Three truths.** — the specificity insight (signature sequence)
5. **Introducing Clarity** — Evidence / Patterns / Action pillars
6. **The system** — the 6-step pipeline with the human-control band (signature sequence)
7. **Live demo** — launch into the real app; the end-to-end journey
8. **Impact** — manual vs Clarity triage, methodology, SDG 8 (honest, literature-grounded)
9. **Orbyte ecosystem** — one module, three live SME types, reuse
10. **Close** — callback to the opening

---

## 5. What was changed & verified

**Built from scratch** in this `clarity-deck/` folder. The original app repository and your existing slide deck were **not modified** — they were used only as source material.

- Grounded every claim in the actual code (`src/domain/`, `src/config/`, `data/fixtures/`, `ARCHITECTURE.md`). Rebranded fully to **Clarity** (your current product name; the old deck still read "Visit2Value / V2V").
- Impact numbers are tied to the **published benchmarks already cited in `src/domain/metrics.ts`** (Johnston 2001; Proserpio & Zervas 2017) — no fabricated "50%".
- Honest **live vs simulated** labelling throughout (Orbyte handoff is a local simulation; no external API).

**Motion & 3D:** real WebGL 3D cold-open (Three.js), 3D-depth slide transitions, kinetic headlines, and an ambient living background — with graceful fallbacks everywhere.

**Verified** with headless Chromium (Playwright) at **1920×1080** and **1366×768**:
- Every slide renders; all fragment animations and the pipeline/particle sequences play.
- Forward **and** backward navigation work (backward arrives on a fully-revealed slide).
- No console or page errors on any slide.
- Reduced-motion toggle works; help overlay and progress toggle work.

---

## 6. Known limitations / risk notes

- **The live demo is not part of this deck.** It runs the real Clarity app separately (needs Node + PostgreSQL, or the hosted Replit). Have it already running and logged in before you start. Record a backup screen capture (see `DEMO_CHOREOGRAPHY.md`).
- The cold-open uses **Three.js (WebGL)**, vendored locally in `vendor/three.min.js` (no CDN). If the machine has no WebGL, it **automatically falls back** to a lightweight 2D-canvas version of the same effect — so it can't fail on a WebGL-less projector. Both auto-simplify under `prefers-reduced-motion`. Slide transitions use real 3D depth (CSS perspective) and there's a slow ambient background glow; all motion is disabled when reduced-motion is on.
- Fonts use the system stack (Avenir Next → Inter → system sans) to match the product and avoid any web-font download. On a machine without Avenir Next it falls back gracefully; it will look slightly different but stays on-brand.
- The deck is laid out on a fixed 1280×720 stage scaled to fit, so it is pixel-stable at any resolution and never reflows — but it is designed for landscape 16:9, not portrait.
