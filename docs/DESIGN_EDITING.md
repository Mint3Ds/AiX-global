# Editing Clarity's design

The live product uses one Ledger-inspired visual language across Dashboard, Reviews, Issues, New review, Tasks, Replies, Activity, and `/launch`. The standalone `mockups/` pages are references and do not style the live app.

## Start here

- **Shared colors, font, widths, corners, and motion:** `src/styles/tokens.css`. For example, change `--action` to update the main green, or `--metric-sage` for the dashboard's green metric surface.
- **Navigation and business/role selectors:** `src/components/design/WorkspaceHeader.tsx`. Edit a tab's `label`; keep its `id` unless changing navigation behavior.
- **Logo and product name:** `src/components/design/BrandIdentity.tsx`. The workspace and launch page share this component.
- **Page heading and status badges:** `src/components/design/PageHeading.tsx`. Edit `statusLabels` for visible badge text.
- **Dashboard:** `src/components/design/DashboardView.tsx` for composition/copy and `src/styles/dashboard.css` for presentation. Metric numbers come from live state in `Workspace.tsx`.
- **Reviews, Issues, New review, Tasks, Replies:** the named screen sections in `src/components/Workspace.tsx`. Their base layout is in `src/styles/workspace.css`, and the matching named CSS sections are in `src/styles/ledger.css`.
- **Activity:** `src/components/design/ActivityView.tsx` for labels and timeline rows, `activity-model.ts` for task/reply grouping, and the `ACTIVITY` section in `ledger.css` for styling.
- **Launch film page:** `src/app/launch/page.tsx` for content and `src/styles/launch-film.css` for layout. It shares tokens and the brand component with the workspace.
- **Small screens:** `src/styles/responsive.css`; the launch page's phone rule is in `launch-film.css`.
- **Action success messages:** `actionSuccessMessage()` near the top of `src/components/Workspace.tsx`.

## CSS order

`src/app/globals.css` imports styles in this order: tokens → shell → buttons → workspace → dashboard → ledger → launch film → responsive. Later rules can override earlier ones. If a color or size seems to ignore your change, search for the selector in later files. Prefer changing an existing rule over adding another override at the end.

- `tokens.css` defines shared decisions. Edit tokens before changing individual components.
- `shell.css` defines the page frame, header, typography, and shared headings.
- `buttons.css` defines primary and secondary control states.
- `workspace.css` defines form and screen structures.
- `dashboard.css` and `ledger.css` define each screen's composition.
- `responsive.css` handles the workspace on narrow screens and reduced motion.

## Safe manual edits

1. Change text or CSS, save, and inspect the page at desktop and phone widths with `npm run dev`.
2. Keep button labels specific, focus indicators visible, and status text alongside any status color.
3. Run `npm run typecheck`, `npm run lint`, and `npm run build` before sharing changes.
4. Use `rg 'text or CSS class' src` to find a screen or style quickly.

The `Workspace.tsx` component owns browser state and calls `/api/action`; `src/domain/service.ts` enforces the real task and reply rules. Visual edits should not change API action names, status values, `businessId`, report/draft versions, or evidence IDs unless you also intend to change backend behavior.
