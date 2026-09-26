# Stray City database proposal

Status: implemented by `202609260001_initial_schema.sql` and `202609260002_feature_rpcs.sql`.

## Assumptions

- `public.users` is the application profile table and has a one-to-one foreign key to `auth.users`.
- Pop-up events are represented by `places` rows with category `popup_event`; this keeps one map and detail model for every discovery type.
- Media columns store Supabase Storage object paths, not public URLs.
- Restaurant inspection fields are informational metadata only. They never imply price or hidden-gem status.
- An Echo unlock is permanent for a user and place after one verified check-in.
- Signals are an active, foreground-only web check. A session expires after 20 minutes and shares only a rounded distance band with accepted friends who also opted in.
- Street Cred is an immutable event ledger. Totals are derived, so corrections remain auditable.

## Domain map

| Domain     | Core tables                                                                                                              | Notes                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Accounts   | `users`                                                                                                                  | Extends `auth.users`; role, leaderboard, and Signals preferences live here.                                  |
| Discovery  | `places`, `favorites`, `place_price_audits`                                                                              | PostGIS point, source identity, mood tags, event time, verified-cost fields, restaurant inspection metadata. |
| Trails     | `trails`, `trail_places`, `trail_members`, `trail_progress`, `trail_place_completions`                                   | Community/admin trails, collaboration, sequential completion, and mystery-step reveal.                       |
| Echoes     | `check_ins`, `echo_unlocks`, `echoes`, `echo_reactions`                                                                  | Geolocation-gated unlock with no raw check-in coordinates retained.                                          |
| Scrapbooks | `scrapbook_items`                                                                                                        | Public, lower-friction place photos and tips.                                                                |
| Crew       | `friendships`                                                                                                            | A unique unordered user pair prevents duplicate reverse requests.                                            |
| Plans      | `open_plans`, `open_plan_locations`, `plan_rsvps`, `plan_messages`, `plan_polls`, `plan_poll_options`, `plan_poll_votes` | Exact location is separated from the generally readable plan row.                                            |
| Invites    | `strays`                                                                                                                 | Exactly one place, trail, or Open Plan target per invite.                                                    |
| Signals    | `signal_sessions`                                                                                                        | Expiring, private coordinates queried only through a consent-aware RPC.                                      |
| Stories    | `stories`, `story_locations`                                                                                             | 24-hour media; exact place is separated so visibility cannot be bypassed with a direct table read.           |
| Moderation | `content_reports` plus moderation fields on UGC                                                                          | Generic reports are target-validated; reporting moves content to review.                                     |
| Rewards    | `street_cred_events`, `badges`, `user_badges`                                                                            | Append-only point ledger and normalized badge awards.                                                        |
| Sharing    | `stray_cards`                                                                                                            | Public token and generated Storage image for external sharing.                                               |
| ETL        | `etl_runs`, `etl_rejections`, source fields on `places`                                                                  | Idempotent source/external-ID upserts and observable import failures.                                        |

## Important data guarantees

### Location privacy

`stories` and `open_plans` do not expose a `place_id` directly. Their exact place foreign keys live in `story_locations` and `open_plan_locations`, whose row-level policies allow only the owner and staff to read them. The `visible_stories()` and `visible_open_plans()` functions return exact, neighborhood, borough, or hidden data according to each post's setting.

Raw coordinates submitted to `complete_check_in()` are used for a PostGIS distance comparison and are not stored. `check_ins` keeps only the measured distance and browser accuracy. Signal coordinates are stored only in an expiring session, are readable by their owner only, and are never returned by `nearby_crew()`.

### Mystery Trails

The base `trail_places` policy calls `can_view_trail_stop()`. For a Mystery Trail, a participant can read only completed steps plus the next step. Editors, the creator, and staff can see the whole route. `complete_trail_stop()` verifies proximity, requires sequential progress, records a real check-in, and awards completion points once.

### Pricing and inspections

`cost_verified = true` requires non-empty `cost_info`. The partial index for budget discovery contains only active, verified rows. `verify_place_cost()` is staff-only and writes a before/after audit record. Inspection grade, score, and date are independent fields with an explicit database comment that prevents them from being treated as price or hidden-gem evidence.

### Abuse resistance

- Direct inserts into `check_ins`, `echo_unlocks`, `street_cred_events`, `user_badges`, and trail completion tables have no client RLS policy.
- Verified check-ins require acceptable browser accuracy, proximity, a five-minute global cooldown, and a thirty-minute same-place cooldown.
- Echoes, scrapbook items, Stories, Open Plans, and plan messages have database posting limits.
- Street Cred uses a unique dedupe key for every award.
- Friendship and invite state transitions are trigger-validated.
- User-generated content uses soft deletion and protected moderation state.

## Client-facing RPCs

| Function                                                | Purpose                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `complete_check_in(place, lat, lng, accuracy)`          | Verify presence, store privacy-safe proof, unlock the place's Echoes, and award Street Cred. |
| `complete_trail_stop(trail, place, lat, lng, accuracy)` | Verify and advance a sequential trail stop.                                                  |
| `verify_place_cost(place, verified, cost, note)`        | Staff price verification with an audit record.                                               |
| `begin_signal_session(lat, lng, accuracy, radius)`      | Start or replace a short-lived active Signal check.                                          |
| `end_signal_session(session)`                           | Revoke an active Signal session.                                                             |
| `nearby_crew(session)`                                  | Return mutually opted-in accepted friends as rounded distance bands.                         |
| `visible_stories()`                                     | Return active Crew Stories with location fields masked per post.                             |
| `visible_open_plans()`                                  | Return eligible plans with location fields masked per post.                                  |
| `crew_board()`                                          | Return the signed-in user's weekly friends leaderboard.                                      |
| `public_leaderboard()`                                  | Return only users who opted into public ranking.                                             |
| `request_friend_by_username(username)`                  | Create a normalized, mutual-consent Crew request.                                            |
| `respond_to_friend_request(friendship, response)`       | Accept, decline, or block an incoming request.                                               |
| `save_story_as_echo(story)`                             | Atomically preserve an owned photo Story as an Echo.                                         |
| `nearby_places(lat, lng, radius, limit)`                | Return active places ordered by PostGIS distance.                                            |

## Storage

- `place-media`: public reads; staff writes.
- `user-media`: private bucket. Users write only under their own UUID folder. Read access follows scrapbook, unlocked Echo, or active Crew Story rules.
- `stray-cards`: public reads; users write only under their own UUID folder.

## Seeded reference data

The migration seeds the nine requested City Stamp definitions: First Footprint, Astoria Insider, Echo Keeper, Sidequest Seeker, Borough Hopper, Flavor Finder, Trail Duo, Hidden Gem Hunter, and City Legend. `supabase/seed.sql` adds clearly labeled sample places for local development. The web app also ships a labeled demo fallback so reviewers can exercise every flow before connecting a Supabase project.
