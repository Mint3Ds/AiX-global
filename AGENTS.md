<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database Setup & Migration Instructions for Agents

> [!IMPORTANT]
> **Database columns updated:** New columns have been added to the database schema (such as review triage dwell tracking: `first_viewed_at`, `last_viewed_at`, `triaged_at`, and `triage_duration_seconds`).
>
> If you encounter database errors regarding missing columns or when re-initializing the local database, **rerun migrations and seeds**:
>
> ```sh
> npm run db:migrate
> npm run db:seed
> ```
>
> Or to cleanly reset and reseed the database from scratch:
>
> ```sh
> npm run db:reset
> ```
