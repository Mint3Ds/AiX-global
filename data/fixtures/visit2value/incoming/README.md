# New review batches

Put the replacement reviews in `restaurant.json`, `hotel.json`, and `salon.json`. Each file starts as an empty JSON array. Give the review-generating LLM this five-field format, with one object per review. Do not include comments or Markdown in the JSON files.

Restaurant (`restaurant.json`):

```json
[
  {
    "sourceReviewId": "restaurant-new-001",
    "branchId": "sunway",
    "rating": 3,
    "reviewedAt": "2026-10-20T18:30:00+08:00",
    "text": "The noodles were tasty, but we waited about half an hour for our food after ordering."
  }
]
```

Hotel (`hotel.json`):

```json
[
  {
    "sourceReviewId": "hotel-new-001",
    "branchId": "hotel-central",
    "rating": 2,
    "reviewedAt": "2026-10-21T10:15:00+08:00",
    "text": "Our room stayed warm even after we lowered the air conditioning. The receptionist was helpful when we reported it."
  }
]
```

Salon (`salon.json`):

```json
[
  {
    "sourceReviewId": "salon-new-001",
    "branchId": "salon-main",
    "rating": 4,
    "reviewedAt": "2026-10-22T16:45:00+08:00",
    "text": "The stylist listened carefully and the cut turned out well. My appointment started around fifteen minutes late."
  }
]
```

The five fields are all that the input files need:

| Field | Requirement |
| --- | --- |
| `sourceReviewId` | Stable, unique identifier, 3–100 characters. Use a different ID for every review. |
| `branchId` | Restaurant: `sunway` or `bangsar`; hotel: `hotel-central` or `hotel-garden`; salon: `salon-main`. |
| `rating` | Whole number from 1 to 5. |
| `reviewedAt` | ISO date and time with an explicit timezone offset, such as `+08:00`. |
| `text` | Full original guest wording, 5–3000 characters. |

Write varied, natural wording even when several guests describe the same issue. The processor supplies `businessId` from the file name, `source` as `Generated review batch`, and `isSynthetic: true`. The application creates the internal review ID. In live mode it screens the review, extracts observations and evidence quotes, and links related feedback to issues. The LLM generating these JSON files does not need to provide analysis labels or theme IDs.

Check all three files before importing:

```sh
npx tsx scripts/process-incoming-reviews.ts
```

Once the new batch is complete and `AI_MODE=live`, `DATABASE_URL`, and the live provider credentials are configured, import and analyze it:

```sh
NODE_OPTIONS=--conditions=react-server npx tsx scripts/process-incoming-reviews.ts --run
```

The script uses the application intake and analysis flow. It rejects exact duplicate review wording within the three files and can be rerun using the same source IDs. The `react-server` condition lets the command line process import the same server-only analysis code used by Next. It does not remove existing reviews by itself. The database has been rebuilt for this replacement batch, and normal `db:seed` now prepares business, branch, employee, and theme records without loading the old fixture reviews. Use `SEED_LEGACY_REVIEWS=yes npm run db:seed` only if the old fixtures are intentionally needed again.
