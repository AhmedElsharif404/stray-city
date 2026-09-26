# Stray City

Stray City is a map-first New York City discovery app for overlooked places, affordable food, community trails, place-bound Echoes, short-lived Crew Stories, loose meet-up plans, and rewards earned by actually exploring.

The repository is a TypeScript monorepo with a React/Vite frontend, a small Express ETL service, shared contracts, and a production-oriented Supabase schema. With no credentials configured, the frontend starts in a clearly labeled sample mode so the complete product can still be reviewed.

## What is implemented

- Synced Leaflet map and card list with borough, neighborhood, category, date, verified-budget, text, and vibe filters.
- Stadia Maps tiles when a key is present; a functional no-tile map fallback when it is not. Raw OpenStreetMap tile servers are never used.
- Near Me, Now & Near, category pins with icon-and-text labels, place details, favorites, and shareable canvas-generated Stray Cards.
- Restaurants, cafés, cheap eats, inspection metadata, and audited staff-only price verification.
- Geolocation-gated Echo unlocks, reactions, reports, owner soft-delete, and a separate public scrapbook.
- Mutual Crew requests, Send a Stray, Open Plans, RSVPs, quick replies, plan-poll UI, and foreground-only, expiring Signals.
- 24-hour Crew Stories with four location-precision settings and permanent photo Story-to-Echo conversion.
- Street Cred, nine City Stamps, a weekly Crew Board, and an opt-in public leaderboard.
- Standard and progressive-reveal Mystery Trails, verified trail progress, and a community trail builder.
- Protected ETL for NYC Parks, NYC restaurant inspections, and Ticketmaster, with normalized upserts, run logs, rejection logs, optional scheduling, and tests.
- PostGIS proximity checks, Row Level Security, private user media, Realtime publication, rate limits, deduped rewards, moderation state, and privacy-preserving location RPCs.

## Repository layout

```text
apps/web/       React, Vite, Tailwind CSS, Leaflet, direct Supabase client
apps/server/    Express ETL and scheduled imports only
packages/shared Shared domain types and Zod schemas
supabase/       Local configuration, migrations, and sample place seed
docs/           Schema and privacy design notes
.github/        CI workflow
```

The browser talks directly to Supabase for product reads and writes. The Express service is intentionally limited to external-data normalization and scheduled ETL, keeping the service-role key out of the frontend.

## Prerequisites

- Node.js 20 or newer
- pnpm 11 (Corepack is the easiest installation path)
- A Supabase project, or the Supabase CLI plus a local container runtime for local backend work
- A Stadia Maps API key for rendered map tiles
- Optional: Ticketmaster Discovery API key and NYC Open Data app token for ETL

## Install and run the sample app

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:web
```

Open `http://localhost:5173`. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent, the app uses only visibly labeled sample data. All major screens and non-sensitive interactions remain reviewable. Without a Stadia key, the map retains pins, selection, and the synced list over a neutral grid and explains why tiles are paused.

To run both frontend and ETL server:

```bash
pnpm dev
```

## Configure Supabase

1. Create a Supabase project or start the local stack.
2. Apply both migrations and the seed:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase db seed
   ```

   For a fully local stack, `supabase start` followed by `supabase db reset` applies the migrations and seed.

3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the public values.
4. Copy `apps/server/.env.example` to `apps/server/.env` and fill in the server-only values.
5. In Supabase Auth, add the local URL and deployed frontend URL to the allowed redirect URLs.
6. Never place the service-role key in a `VITE_` variable or expose it to browser code.

The signup trigger creates `public.users` from Auth metadata. Echo and trail proximity checks require HTTPS outside localhost because browsers restrict geolocation on insecure origins.

## Environment variables

### Frontend — `apps/web/.env.local`

| Variable                   | Required      | Purpose                                                 |
| -------------------------- | ------------- | ------------------------------------------------------- |
| `VITE_SUPABASE_URL`        | For real data | Supabase project URL.                                   |
| `VITE_SUPABASE_ANON_KEY`   | For real data | Public anon key; access is constrained by RLS.          |
| `VITE_STADIA_MAPS_API_KEY` | For map tiles | Stadia Maps key used by Leaflet.                        |
| `VITE_SERVER_URL`          | For admin ETL | Express server origin, such as `http://localhost:8787`. |

### Server — `apps/server/.env`

| Variable                    | Required          | Purpose                                                  |
| --------------------------- | ----------------- | -------------------------------------------------------- |
| `PORT`                      | No                | HTTP port; defaults to `8787`.                           |
| `WEB_ORIGIN`                | Yes in production | Comma-separated CORS allowlist.                          |
| `SUPABASE_URL`              | Yes               | Supabase project URL.                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes               | Server-only service-role key used for ETL upserts.       |
| `ETL_ADMIN_TOKEN`           | Yes               | High-entropy token required in the `x-etl-token` header. |
| `TICKETMASTER_API_KEY`      | Ticketmaster only | Discovery API key.                                       |
| `NYC_OPEN_DATA_APP_TOKEN`   | Recommended       | Raises NYC Open Data rate limits.                        |
| `ETL_CRON_ENABLED`          | No                | Set to `true` to enable in-process scheduling.           |
| `ETL_CRON_SCHEDULE`         | No                | Cron expression; defaults to every six hours.            |

## ETL operations

The admin page can trigger individual sources. The same endpoints can be called directly:

```bash
curl -X POST "http://localhost:8787/api/etl/nyc_parks?limit=500" \
  -H "x-etl-token: $ETL_ADMIN_TOKEN"

curl -X POST "http://localhost:8787/api/etl/nyc_restaurant_inspection?limit=500" \
  -H "x-etl-token: $ETL_ADMIN_TOKEN"

curl -X POST "http://localhost:8787/api/etl/ticketmaster?limit=200" \
  -H "x-etl-token: $ETL_ADMIN_TOKEN"

curl -X POST "http://localhost:8787/api/etl/all?limit=500" \
  -H "x-etl-token: $ETL_ADMIN_TOKEN"
```

NYC Parks uses dataset `enfh-gkve`; restaurant inspections use `43nn-pn8j`. Inspection imports set only inspection metadata and never infer price or hidden-gem status. Cost information enters discovery filters only after staff verification.

For production scheduling, prefer a platform cron job calling `/api/etl/all` over an in-process cron when the server can scale horizontally. Keep `ETL_CRON_ENABLED=false` in that setup so multiple instances do not duplicate runs.

## Quality checks

```bash
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions runs the same checks on pushes to `main` and pull requests. Tests cover shared validation, distance calculations, and each upstream normalizer.

## Security and privacy notes

- All user-facing tables have RLS. Sensitive mutations such as verified check-ins, reward awards, Signal searches, and staff price verification go through security-definer RPCs with explicit grants.
- Raw check-in coordinates are used for a PostGIS distance test and discarded. Signal coordinates exist only in a revocable session that expires after 20 minutes.
- Exact Story and Open Plan places live in private companion tables. Masking RPCs return only the precision selected by the author.
- User media is private. Storage read policy follows scrapbook visibility, Echo unlocks, and accepted-Crew Story access.
- Content reports are target-validated and place content into review. UGC uses soft deletion, protected moderation fields, and database-enforced posting limits.
- Authenticated users cannot insert check-ins, unlocks, reward events, or badge awards directly.
- Keep `ETL_ADMIN_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, and provider secrets in the deployment platform's encrypted environment store.

See `docs/database-schema.md` for the full domain model and privacy guarantees.

## Deployment

### Frontend

Deploy `apps/web` to a static host such as Vercel or Netlify:

- Build command from the repository root: `pnpm --filter @stray-city/shared build && pnpm --filter @stray-city/web build`
- Output directory: `apps/web/dist`
- Add the four frontend environment variables.
- Configure an SPA fallback to `index.html`.
- Use HTTPS so geolocation, clipboard, sharing, and camera capture are available.

### ETL server

Deploy the repository to a Node host such as Render, Fly.io, or Railway:

- Build command: `pnpm install --frozen-lockfile && pnpm --filter @stray-city/shared build && pnpm --filter @stray-city/server build`
- Start command: `pnpm --filter @stray-city/server start`
- Health check: `GET /health`
- Add only server variables and set `WEB_ORIGIN` to the deployed frontend origin.

### Supabase

Use a migration deployment job or run `supabase db push` against the production project. Confirm that Realtime is enabled for the tables added by the second migration, Storage policies are present, email redirect URLs are correct, and the seed is omitted if production should start empty.

## GitHub repository handoff

The intended remote is a private repository named `stray-city`, with `livmood` and `luvlkp` invited as collaborators. From an authenticated GitHub CLI session:

```bash
git init -b main
git add .
git commit -m "Build Stray City"
gh repo create stray-city --private --source=. --remote=origin --push
gh api -X PUT repos/OWNER/stray-city/collaborators/livmood -f permission=push
gh api -X PUT repos/OWNER/stray-city/collaborators/luvlkp -f permission=push
```

Replace `OWNER` with the GitHub account or organization that owns the repository. Collaborator invitations remain pending until accepted.
