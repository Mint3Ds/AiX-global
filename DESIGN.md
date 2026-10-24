# Clarity design guide

The visual design is kept in `src/components/design/` and `src/styles/`. The review and AI workflows stay in `src/components/Workspace.tsx` and the existing API/domain files.

## Where to edit

| Change                                                        | File                                        |
| ------------------------------------------------------------- | ------------------------------------------- |
| Colors, shared type defaults, focus outline                   | `src/styles/tokens.css`                     |
| Header, navigation, field guide, general page headings        | `src/styles/shell.css`                      |
| Shared primary, secondary, and text buttons                   | `src/styles/buttons.css`                    |
| Dashboard hero, review diagram, metrics, spotlight cards      | `src/styles/dashboard.css`                  |
| Review, issue, task, reply, activity, and form styling        | `src/styles/workspace.css`                  |
| Tablet and phone layouts, reduced motion                      | `src/styles/responsive.css`                 |
| Brand markup, navigation labels, field guide steps            | `src/components/design/WorkspaceHeader.tsx` |
| Dashboard wording, illustration, and card markup              | `src/components/design/DashboardView.tsx`   |
| Data passed into the dashboard and markup for working screens | `src/components/Workspace.tsx`              |

`src/app/globals.css` imports the style files in order. `src/app/layout.tsx` imports `globals.css`, and `src/app/page.tsx` mounts the workspace. There are no image assets in this design; the small brand mark and review diagram are HTML and CSS.

## Editing rules

Change color variables in `tokens.css` first. Keep responsive rules in `responsive.css` so the desktop rules remain easy to scan. Edit visual copy and layout in the two `design/` components. When changing a working review, issue, task, or reply screen, locate its `tab === "..."` section in `Workspace.tsx`; keep its existing action calls and data bindings intact.

Run `npm run typecheck`, `npm run lint`, and `npm test` after editing. Then open `http://localhost:3000` and check both the dashboard and a working screen.
