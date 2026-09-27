# Stray City — AI continuation handoff

This repository is ready to continue in another AI coding platform. No secrets are included. Start by reading this file and `README.md`, then inspect the latest Git history.

## Current state

- TypeScript monorepo managed with pnpm 11.
- React/Vite/Tailwind/Leaflet frontend in `apps/web`.
- Express ETL service in `apps/server`.
- Shared types and Zod schemas in `packages/shared`.
- Supabase/Postgres migrations and development seed in `supabase`.
- Private GitHub repository: `https://github.com/AhmedElsharif404/stray-city`.
- The app runs without credentials in clearly labeled sample mode.
- The latest local verification passed formatting, linting, type-checking, 11 tests, and production builds.

## NYC Place Catalog work completed

- Added a provider-adapter contract and cached OSM JSON/GeoJSON adapter.
- The catalog importer never bulk-queries public Overpass endpoints.
- Added NYC coordinate-boundary validation and borough inference only when missing.
- Added source-ID deduplication, then normalized-name plus distance deduplication.
- Added paginated NYC Open Data and Ticketmaster ingestion with retry/backoff.
- NYC Parks records normalize to parks or attractions.
- DOHMH inspections enrich matching restaurant/café/bakery records only; they do not create places or infer prices/hidden-gem labels.
- Ticketmaster events are idempotently upserted and expired events are archived with `is_active=false`.
- Added `place_sources`, richer ETL counters, unique slugs, catalog metadata, and audited admin curation in migration `202609260003_nyc_place_catalog.sql`.
- Expanded the admin page with place search, category, verified cost, price level, hidden-gem verification, and sidequest objective controls.
- Expanded the development seed to 25 sample NYC places, including multiple Astoria locations.
- Added tests for catalog normalization, NYC bounds, deduplication, and inspection matching.
- Leaflet supports managed MapTiler or Stadia Maps tiles. Raw public OpenStreetMap tile servers are intentionally not used.

## Important files

- `apps/server/src/etl/catalog.ts` — cached catalog adapter and normalization.
- `apps/server/src/etl/matching.ts` — distance, deduplication, and inspection matching.
- `apps/server/src/etl/normalizers.ts` — Parks, inspections, and Ticketmaster normalization.
- `apps/server/src/etl/sources.ts` — pagination and upstream source clients.
- `apps/server/src/etl/runner.ts` — run logging, validation, provenance, upserts, enrichment, and event archival.
- `apps/server/src/etl/cli.ts` — command-line ETL entrypoint.
- `supabase/migrations/202609260003_nyc_place_catalog.sql` — catalog schema and curation RPC.
- `supabase/seed.sql` — 25 labeled sample places.
- `apps/web/src/pages/AdminPage.tsx` — protected manual curation UI.
- `README.md` — full local setup, environment variables, deployment, and ETL operations.

## Install and verify

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected test total at handoff: 11 tests across shared, server, and web packages.

## Run locally

```bash
pnpm dev:web
pnpm dev:server
```

Frontend: `http://localhost:5173`

Server health check: `http://localhost:8787/health`

## Apply Supabase schema and seed

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db seed
```

For a disposable local Supabase environment:

```bash
supabase start
supabase db reset
```

The catalog migration was statically reviewed and the application compiles against it, but it was not applied to a live Supabase project in this workspace because no project credentials or local container runtime were provided.

## Environment variables

Copy `.env.example` values into `apps/web/.env.local` and `apps/server/.env` as appropriate.

Frontend:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPTILER_KEY=
VITE_STADIA_MAPS_API_KEY=
VITE_SERVER_URL=http://localhost:8787
```

Server:

```dotenv
PORT=8787
WEB_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TICKETMASTER_API_KEY=
MAPTILER_KEY=
NYC_OPEN_DATA_APP_TOKEN=
CATALOG_DATA_PATH=
ETL_ADMIN_TOKEN=
ETL_CRON_ENABLED=false
ETL_CRON_SCHEDULE=0 */6 * * *
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ETL_ADMIN_TOKEN` in frontend/Vite variables.

## Run the ETL

```bash
npm run etl:parks
npm run etl:inspections
npm run etl:events
npm run etl:catalog
npm run etl:all
```

Optional limit example:

```bash
ETL_LIMIT=5000 npm run etl:catalog
```

On Windows PowerShell, set the limit first:

```powershell
$env:ETL_LIMIT='5000'
npm run etl:catalog
```

## Catalog input format

Set `CATALOG_DATA_PATH` to a cached `.json` or `.geojson` export. The adapter accepts:

- a GeoJSON `FeatureCollection` (`features` array);
- an OSM-style JSON object (`elements` array);
- a plain JSON array of records.

Useful source fields include `id`, `lat`/`lon`, `geometry.coordinates`, `tags`, or `properties`. Supported POI tags normalize to restaurant, café, bakery, bar, museum, gallery, theatre, cinema, library, bookstore, park, garden, market, attraction, viewpoint, public art, landmark, and music venue.

## External dependencies still requiring a decision or credential

- **Supabase:** project URL, anon key, and server-only service-role key are required for real persistence.
- **Ticketmaster:** `TICKETMASTER_API_KEY` is required for event ingestion.
- **Base catalog:** choose and license a production-safe cached OSM extract/provider, then set `CATALOG_DATA_PATH`.
- **Map tiles:** provide either a browser-restricted MapTiler key or Stadia Maps key. The app deliberately does not fall back to raw OSM public tiles.
- **NYC Open Data:** an app token is optional but recommended for steadier quotas.

## Suggested continuation prompt

Use this with another coding agent:

> Continue the Stray City repository from `AI_HANDOFF.md`. Preserve the current architecture and security model. First run the existing verification suite. Then apply and validate the Supabase migrations in a local or staging project, ingest a licensed cached NYC OSM/POI extract through `CATALOG_DATA_PATH`, inspect ETL run counts and rejected rows, and add integration tests for the real Supabase workflow. Do not commit secrets, use public Overpass for bulk ingestion, scrape prohibited sites, or replace managed Leaflet tiles with raw OSM public tiles.
