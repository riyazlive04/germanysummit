# Germany Readiness Suite

A three-module web app for the **Germany Career Summit 2026** (20 June 2026,
Chennai), built for B2 Consultants / German Note. One shared attendee profile,
three modules:

1. **Reality Check** (`/reality-check`) - a 5-dimension Germany Readiness Score
   (0-100), animated pentagon radar, tier, and a named archetype.
2. **CV & LinkedIn Lab** (`/cv-lab`) - paste/upload a résumé + a target German
   JD → ATS match score, missing keywords, weak-bullet flags, top 3 fixes.
   **Diagnosis only** - it never rewrites your CV.
3. **90-Day Roadmap** (`/roadmap`) - an AI, directional, week-by-week plan built
   from the readiness profile + CV gaps.

Plus **`/room`** - a live big-screen aggregate (average radar, tiers,
archetypes, score distribution, on-arrival → end-of-day shift), gated by
`ADMIN_KEY`.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma (SQLite local /
Postgres prod) · Anthropic API behind an env-configurable provider adapter ·
results POST to an n8n webhook (Sheets + WhatsApp).

## Quick start

```bash
npm install
cp .env.example .env        # fill in ANTHROPIC_API_KEY (and others as needed)
npx prisma db push          # create the local SQLite schema
npm run dev                 # http://localhost:3000
```

### Environment

See `.env.example`. Minimum for full local function: `DATABASE_URL` (preset to
SQLite), `ANTHROPIC_API_KEY` (for the CV Lab + Roadmap), `ADMIN_KEY` (for
`/room`). `N8N_WEBHOOK_URL` is optional - when empty, delivery silently no-ops.

### FlexiFunnels pass-through

Module pages read `ff_name` / `ff_email` / `ff_phone` from the URL; with
`ff_email` present the email gate is skipped and the attendee is greeted by name.
A `session` param (`pre_event` | `on_arrival` | `end_of_day`) tags the row for
the before/after room view.

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Start the production server |
| `npm run db:push` | Push schema to the DB |
| `npm run db:studio` | Prisma Studio |

## Architecture seams

- **One profile per email.** All three modules upsert the same `Submission`
  row, so results compound. `session` + timestamps are the seam for the
  post-summit "Guided Mode" / accountability-sprint re-scoring (not built yet).
- **LLM adapter** (`src/lib/llm.ts`) - swap provider/model in one place.
- **JSON columns as encoded strings** (`src/lib/submission.ts`) - one schema
  works on both SQLite and Postgres.

## Guardrails (non-negotiable)

The AI **diagnoses and drafts directional guidance only**. It never produces a
finished résumé/cover letter or implies the human coach is unnecessary. The app
is additive to the paper kit - it earns its place by doing what paper can't:
compute, aggregate, personalize, and follow home.

Deployment: see [DEPLOY.md](DEPLOY.md).
