# Clarity design guide

Clarity uses the Ledger design study as its visual foundation: warm paper, dark ink, restrained green, compact labels, confident headings, and ruled sections. The dashboard reference informs the four metric entry points and the relationship between priority issues, recent activity, and work. Every count and list continues to come from the business-scoped application state.

## Files and ownership

| Area                                                            | Source                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Color, surface, radius, and motion tokens                       | `src/styles/tokens.css`                                               |
| Header, navigation, page headings, loading, footer              | `src/styles/shell.css`                                                |
| Shared button behavior                                          | `src/styles/buttons.css`                                              |
| Dashboard presentation                                          | `src/components/design/DashboardView.tsx`, `src/styles/dashboard.css` |
| Shared page heading and review/reply status labels              | `src/components/design/PageHeading.tsx`                               |
| Header and business/role selectors                              | `src/components/design/WorkspaceHeader.tsx`                           |
| Workflow layouts and existing component structures              | `src/styles/workspace.css`                                            |
| Review register and Ledger composition across working screens   | `src/styles/ledger.css`                                               |
| Tablet, phone, and reduced motion                               | `src/styles/responsive.css`                                           |
| Activity filtering and grouping                                 | `src/components/design/ActivityView.tsx`                              |
| Review selection, filters, task/reply forms, live state/actions | `src/components/Workspace.tsx`                                        |
| Launch film presentation                                        | `src/styles/launch-film.css`                                          |

`src/app/globals.css` declares the import order. Structural workflow styles come before the Ledger composition layer; responsive rules come last. The previous `design-refresh.css` skin has been removed.

## Design rules

- Use `--ink` for primary text and `--muted` for readable supporting text. `--action`, `--action-tint`, and `--on-action` define actions and selection. Keep status colors semantic.
- Use the system sans serif stack. Page titles are 29–40px with restrained weight and tight tracking; body copy is 13–16px. Small uppercase labels are for short metadata, not paragraphs.
- Use dividers for registers, evidence, activity, and grouped work. Reserve bounded surfaces for inputs, selected evidence, and focused editors. Default radii are 6px and 9px; shadows are limited to transient feedback and subtle hover feedback.
- Each screen has one `PageHeading`. It exposes the page title to keyboard focus when navigation changes. The header exposes the current destination with `aria-current`.
- Use real buttons for every action. The dashboard has six working metric destinations. The Reviews register has eight rows per page, stable sorting, progressive filters, a reset action, and source metadata.
- Opening a review from an issue clears incompatible filters and opens the correct register page. Selecting a review on narrow screens moves focus to its detail. Pagination moves focus back to the first review. Task and issue details receive focus on phones when opened directly.
- All extracted observation kinds remain visible, including praise and suggestions. Source wording and backend evidence rules are preserved.
- Busy actions disable the working controls and business/role selectors. Status feedback remains visible while scrolling. Empty states offer a relevant next step. Task approval explains the required due date.
- Motion uses shared 140ms/220ms timings and a short 5px page/content reveal. Prefer opacity and transform. Reduced motion removes transitions, animation, and smooth detail scrolling.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. For route checks, use `TEST_BASE_URL=http://localhost:<port> npm test` against a disposable database.

Inspect Dashboard, Reviews, Issues, New review, Tasks, Replies, Activity, and `/launch` at desktop, tablet, and phone sizes. Exercise review search/sort/filter/reset/pagination, cross-screen evidence links, business switching, task assignment/report/verification, partial reply warnings, and batch approval. Keep API/domain behavior and review evidence unchanged when editing presentation.

The original standalone studies remain in `mockups/` for reference. They are not application routes or a data source.
