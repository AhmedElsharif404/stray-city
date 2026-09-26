begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('member', 'moderator', 'admin');
create type public.place_category as enum (
  'sidequest',
  'cheap_eat',
  'restaurant',
  'cafe',
  'popup_event',
  'hidden_gem',
  'park',
  'landmark'
);
create type public.external_data_source as enum (
  'community',
  'admin',
  'nyc_parks',
  'nyc_restaurant_inspection',
  'ticketmaster'
);
create type public.moderation_status as enum ('clean', 'pending_review', 'removed');
create type public.friendship_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type public.trail_kind as enum ('standard', 'mystery');
create type public.audience as enum ('private', 'crew', 'public');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.rsvp_status as enum ('interested', 'going', 'maybe', 'declined');
create type public.invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.media_kind as enum ('photo', 'video');
create type public.location_visibility as enum ('hidden', 'borough', 'neighborhood', 'exact');
create type public.report_target_type as enum (
  'echo',
  'scrapbook_item',
  'story',
  'open_plan',
  'trail',
  'plan_message'
);
create type public.reaction_kind as enum ('heart', 'wow', 'laugh', 'thanks');
create type public.trail_member_role as enum ('viewer', 'editor');
create type public.plan_message_kind as enum ('message', 'quick_reply');
create type public.street_cred_reason as enum (
  'verified_check_in',
  'echo_created',
  'scrapbook_contribution',
  'story_created',
  'trail_completed',
  'admin_adjustment'
);
create type public.etl_source as enum ('nyc_parks', 'nyc_restaurant_inspection', 'ticketmaster');
create type public.etl_run_status as enum ('running', 'succeeded', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (bio is null or char_length(bio) <= 280),
  avatar_path text,
  home_borough text,
  role public.app_role not null default 'member',
  public_leaderboard boolean not null default false,
  signals_enabled boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.places (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  category public.place_category not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    ) stored,
  address text,
  borough text not null,
  neighborhood text,
  description text not null default '',
  photos text[] not null default '{}'::text[],
  local_tips text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  cuisine text,
  sidequest_objective text,
  cost_verified boolean not null default false,
  cost_info text,
  hidden_gem_verified boolean not null default false,
  inspection_grade text,
  inspection_score integer,
  inspection_date date,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  source public.external_data_source not null default 'community',
  external_id text,
  source_url text,
  source_payload jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_cost_consistency check (
    (cost_verified and cost_info is not null and btrim(cost_info) <> '')
    or (not cost_verified)
  ),
  constraint places_event_window check (
    event_ends_at is null or event_starts_at is null or event_ends_at > event_starts_at
  )
);

create unique index places_external_identity_idx
  on public.places(source, external_id);
create index places_location_idx on public.places using gist(location);
create index places_discovery_idx on public.places(borough, neighborhood, category) where is_active;
create index places_tags_idx on public.places using gin(tags);
create index places_verified_cost_idx on public.places(category, borough) where cost_verified and is_active;
create index places_events_idx on public.places(event_starts_at, event_ends_at)
  where category = 'popup_event' and is_active;

create table public.place_price_audits (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete restrict,
  previous_cost_verified boolean not null,
  previous_cost_info text,
  new_cost_verified boolean not null,
  new_cost_info text,
  note text,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.trails (
  id uuid primary key default extensions.gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  cover_path text,
  kind public.trail_kind not null default 'standard',
  visibility public.audience not null default 'public',
  status public.publish_status not null default 'draft',
  tags text[] not null default '{}'::text[],
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  moderation_status public.moderation_status not null default 'clean',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index trails_discovery_idx on public.trails(status, visibility, kind) where deleted_at is null;
create index trails_tags_idx on public.trails using gin(tags);

create table public.trail_places (
  trail_id uuid not null references public.trails(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict,
  position integer not null check (position > 0),
  title_override text,
  clue text,
  objective text,
  unlock_radius_m integer not null default 150 check (unlock_radius_m between 25 and 1000),
  created_at timestamptz not null default now(),
  primary key (trail_id, place_id),
  unique (trail_id, position)
);

create table public.trail_members (
  trail_id uuid not null references public.trails(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.trail_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (trail_id, user_id)
);

create table public.trail_progress (
  trail_id uuid not null references public.trails(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  current_position integer not null default 0 check (current_position >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (trail_id, user_id)
);

create table public.trail_place_completions (
  trail_id uuid not null,
  place_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  check_in_id uuid not null unique,
  completed_at timestamptz not null default now(),
  primary key (trail_id, place_id, user_id),
  foreign key (trail_id, place_id)
    references public.trail_places(trail_id, place_id) on delete cascade
);

create table public.check_ins (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  accuracy_m double precision not null check (accuracy_m > 0 and accuracy_m <= 150),
  distance_m double precision not null check (distance_m >= 0),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create index check_ins_user_time_idx on public.check_ins(user_id, created_at desc);
create index check_ins_user_place_time_idx on public.check_ins(user_id, place_id, created_at desc);

alter table public.trail_place_completions
  add constraint trail_place_completions_check_in_id_fkey
  foreign key (check_in_id) references public.check_ins(id) on delete restrict;

create table public.echo_unlocks (
  user_id uuid not null references public.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.echoes (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  photo_path text not null,
  text text not null check (char_length(text) between 1 and 1000),
  moderation_status public.moderation_status not null default 'clean',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index echoes_place_time_idx on public.echoes(place_id, created_at desc) where deleted_at is null;
create index echoes_user_time_idx on public.echoes(user_id, created_at desc);

create table public.echo_reactions (
  echo_id uuid not null references public.echoes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction public.reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (echo_id, user_id)
);

create table public.scrapbook_items (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  photo_path text,
  tip text check (tip is null or char_length(tip) between 1 and 500),
  moderation_status public.moderation_status not null default 'clean',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint scrapbook_has_content check (photo_path is not null or tip is not null)
);

create index scrapbook_place_time_idx
  on public.scrapbook_items(place_id, created_at desc) where deleted_at is null;

create table public.friendships (
  id uuid primary key default extensions.gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx
  on public.friendships(least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_idx on public.friendships(requester_id, status);
create index friendships_addressee_idx on public.friendships(addressee_id, status);

create table public.open_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  note text check (note is null or char_length(note) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visibility public.audience not null default 'crew',
  location_visibility public.location_visibility not null default 'exact',
  moderation_status public.moderation_status not null default 'clean',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint open_plans_valid_window check (ends_at > starts_at)
);

create index open_plans_time_idx on public.open_plans(starts_at, ends_at) where deleted_at is null;

create table public.open_plan_locations (
  plan_id uuid primary key references public.open_plans(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict
);

create table public.plan_rsvps (
  plan_id uuid not null references public.open_plans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status public.rsvp_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create table public.plan_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null references public.open_plans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind public.plan_message_kind not null default 'message',
  body text not null check (char_length(body) between 1 and 1000),
  moderation_status public.moderation_status not null default 'clean',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index plan_messages_plan_time_idx
  on public.plan_messages(plan_id, created_at) where deleted_at is null;

create table public.plan_polls (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null references public.open_plans(id) on delete cascade,
  creator_id uuid not null references public.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 240),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plan_poll_options (
  id uuid primary key default extensions.gen_random_uuid(),
  poll_id uuid not null references public.plan_polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  position integer not null check (position > 0),
  unique (poll_id, position),
  unique (poll_id, id)
);

create table public.plan_poll_votes (
  poll_id uuid not null references public.plan_polls(id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  foreign key (poll_id, option_id)
    references public.plan_poll_options(poll_id, id) on delete cascade
);

create table public.strays (
  id uuid primary key default extensions.gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  trail_id uuid references public.trails(id) on delete cascade,
  open_plan_id uuid references public.open_plans(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint strays_not_self check (sender_id <> recipient_id),
  constraint strays_exactly_one_target check (
    num_nonnulls(place_id, trail_id, open_plan_id) = 1
  )
);

create index strays_recipient_idx on public.strays(recipient_id, status, created_at desc);

create table public.signal_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    ) stored,
  accuracy_m double precision not null check (accuracy_m > 0 and accuracy_m <= 250),
  radius_m integer not null default 1000 check (radius_m between 100 and 5000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  revoked_at timestamptz,
  constraint signal_session_expiry check (expires_at > created_at)
);

create unique index signal_sessions_one_live_per_user_idx
  on public.signal_sessions(user_id) where revoked_at is null;
create index signal_sessions_location_idx on public.signal_sessions using gist(location);
create index signal_sessions_expiry_idx on public.signal_sessions(expires_at) where revoked_at is null;

create table public.stories (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  media_path text not null,
  media_kind public.media_kind not null,
  caption text check (caption is null or char_length(caption) <= 500),
  location_visibility public.location_visibility not null default 'neighborhood',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  saved_echo_id uuid unique references public.echoes(id) on delete set null,
  moderation_status public.moderation_status not null default 'clean',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint story_expiry_after_creation check (expires_at > created_at)
);

create index stories_user_expiry_idx on public.stories(user_id, expires_at desc) where deleted_at is null;
create index stories_active_idx on public.stories(expires_at) where deleted_at is null;

create table public.story_locations (
  story_id uuid primary key references public.stories(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict
);

create table public.content_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status public.moderation_status not null default 'pending_review',
  moderator_id uuid references public.users(id) on delete set null,
  moderator_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, target_type, target_id)
);

create index content_reports_queue_idx on public.content_reports(status, created_at);

create table public.street_cred_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reason public.street_cred_reason not null,
  points integer not null check (points between -1000 and 1000 and points <> 0),
  place_id uuid references public.places(id) on delete set null,
  source_id uuid,
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index street_cred_user_time_idx on public.street_cred_events(user_id, created_at desc);
create index street_cred_weekly_idx on public.street_cred_events(created_at desc, user_id);

create table public.badges (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text not null,
  icon text not null,
  criteria jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  award_context jsonb not null default '{}'::jsonb,
  primary key (user_id, badge_id)
);

create table public.stray_cards (
  id uuid primary key default extensions.gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  trail_id uuid references public.trails(id) on delete cascade,
  echo_id uuid references public.echoes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  summary text check (summary is null or char_length(summary) <= 500),
  image_path text not null,
  share_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stray_cards_exactly_one_subject check (
    num_nonnulls(place_id, trail_id, echo_id) = 1
  )
);

create table public.etl_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  source public.etl_source not null,
  status public.etl_run_status not null default 'running',
  cursor text,
  rows_seen integer not null default 0,
  rows_upserted integer not null default 0,
  rows_rejected integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.etl_rejections (
  id uuid primary key default extensions.gen_random_uuid(),
  run_id uuid not null references public.etl_runs(id) on delete cascade,
  external_id text,
  reason text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    '[^a-z0-9_]',
    '',
    'g'
  ));

  if char_length(requested_username) < 3 then
    requested_username := 'stray_' || left(replace(new.id::text, '-', ''), 8);
  else
    requested_username := left(requested_username, 30);
  end if;

  if exists (select 1 from public.users where username = requested_username) then
    requested_username := left(requested_username, 25) || '_' || left(replace(new.id::text, '-', ''), 4);
  end if;

  insert into public.users (id, username, display_name, avatar_path)
  values (
    new.id,
    requested_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New Stray'),
    nullif(new.raw_user_meta_data ->> 'avatar_path', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_service_role()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('moderator', 'admin')
      and deleted_at is null
  );
$$;

create or replace function public.are_friends(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select first_user = second_user or exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = first_user and addressee_id = second_user)
        or (requester_id = second_user and addressee_id = first_user)
      )
  )
  where auth.uid() in (first_user, second_user)
    or public.is_admin()
    or public.is_service_role();
$$;

create or replace function public.can_view_trail(requested_trail_id uuid, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (viewer_id = auth.uid() or public.is_admin() or public.is_service_role()) and exists (
    select 1
    from public.trails t
    where t.id = requested_trail_id
      and t.deleted_at is null
      and t.moderation_status <> 'removed'
      and (
        t.creator_id = viewer_id
        or public.is_admin()
        or exists (
          select 1 from public.trail_members tm
          where tm.trail_id = t.id and tm.user_id = viewer_id
        )
        or (
          t.status = 'published'
          and (
            t.visibility = 'public'
            or (t.visibility = 'crew' and public.are_friends(t.creator_id, viewer_id))
          )
        )
      )
  );
$$;

create or replace function public.can_view_trail_stop(
  requested_trail_id uuid,
  requested_position integer,
  viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (viewer_id = auth.uid() or public.is_admin() or public.is_service_role())
    and public.can_view_trail(t.id, viewer_id)
    and (
      t.kind = 'standard'
      or t.creator_id = viewer_id
      or public.is_admin()
      or exists (
        select 1 from public.trail_members tm
        where tm.trail_id = t.id and tm.user_id = viewer_id and tm.role = 'editor'
      )
      or requested_position <= coalesce((
        select tp.current_position
        from public.trail_progress tp
        where tp.trail_id = t.id and tp.user_id = viewer_id
      ), 0) + 1
    )
  from public.trails t
  where t.id = requested_trail_id;
$$;

create or replace function public.can_view_open_plan(requested_plan_id uuid, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (viewer_id = auth.uid() or public.is_admin() or public.is_service_role()) and exists (
    select 1
    from public.open_plans p
    where p.id = requested_plan_id
      and p.deleted_at is null
      and p.moderation_status <> 'removed'
      and (
        p.creator_id = viewer_id
        or public.is_admin()
        or p.visibility = 'public'
        or (p.visibility = 'crew' and public.are_friends(p.creator_id, viewer_id))
        or exists (
          select 1 from public.plan_rsvps r
          where r.plan_id = p.id and r.user_id = viewer_id and r.status = 'going'
        )
      )
  );
$$;

create or replace function public.can_read_echo(requested_echo_id uuid, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (viewer_id = auth.uid() or public.is_admin() or public.is_service_role()) and exists (
    select 1
    from public.echoes e
    where e.id = requested_echo_id
      and e.deleted_at is null
      and e.moderation_status <> 'removed'
      and (
        e.user_id = viewer_id
        or public.is_admin()
        or exists (
          select 1 from public.echo_unlocks u
          where u.user_id = viewer_id and u.place_id = e.place_id
        )
      )
  );
$$;

create or replace function public.protect_user_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and not public.is_admin()
    and not public.is_service_role() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

create trigger protect_user_role_before_update
  before update on public.users
  for each row execute function public.protect_user_role();

create or replace function public.protect_moderation_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.moderation_status is distinct from old.moderation_status
    and not public.is_admin()
    and not public.is_service_role()
    and coalesce(current_setting('stray.internal_moderation', true), '') <> 'on' then
    raise exception 'Only a moderator can change moderation status';
  end if;
  return new;
end;
$$;

create trigger protect_echo_moderation before update on public.echoes
  for each row execute function public.protect_moderation_status();
create trigger protect_scrapbook_moderation before update on public.scrapbook_items
  for each row execute function public.protect_moderation_status();
create trigger protect_trail_moderation before update on public.trails
  for each row execute function public.protect_moderation_status();
create trigger protect_plan_moderation before update on public.open_plans
  for each row execute function public.protect_moderation_status();
create trigger protect_plan_message_moderation before update on public.plan_messages
  for each row execute function public.protect_moderation_status();
create trigger protect_story_moderation before update on public.stories
  for each row execute function public.protect_moderation_status();

create or replace function public.validate_friendship_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.requester_id is distinct from old.requester_id
    or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Friendship participants cannot be changed';
  end if;
  if old.status = 'pending'
    and auth.uid() = old.addressee_id
    and new.status in ('accepted', 'declined', 'blocked') then
    new.responded_at := now();
    return new;
  end if;
  if old.status = 'accepted'
    and auth.uid() in (old.requester_id, old.addressee_id)
    and new.status = 'blocked' then
    new.responded_at := now();
    return new;
  end if;
  raise exception 'Invalid friendship transition';
end;
$$;

create trigger validate_friendship_before_update
  before update on public.friendships
  for each row execute function public.validate_friendship_transition();

create or replace function public.validate_stray_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.place_id is distinct from old.place_id
    or new.trail_id is distinct from old.trail_id
    or new.open_plan_id is distinct from old.open_plan_id then
    raise exception 'Invite participants and target cannot be changed';
  end if;
  if auth.uid() = old.sender_id and old.status = 'pending' then
    if new.status not in ('pending', 'cancelled') then
      raise exception 'The sender can only edit or cancel a pending invite';
    end if;
    return new;
  end if;
  if auth.uid() = old.recipient_id and old.status = 'pending'
    and new.status in ('accepted', 'declined')
    and new.message = old.message then
    new.responded_at := now();
    return new;
  end if;
  raise exception 'Invalid invite transition';
end;
$$;

create trigger validate_stray_before_update
  before update on public.strays
  for each row execute function public.validate_stray_update();

create or replace function public.validate_report_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exists boolean;
begin
  case new.target_type
    when 'echo' then select exists(select 1 from public.echoes where id = new.target_id) into target_exists;
    when 'scrapbook_item' then select exists(select 1 from public.scrapbook_items where id = new.target_id) into target_exists;
    when 'story' then select exists(select 1 from public.stories where id = new.target_id) into target_exists;
    when 'open_plan' then select exists(select 1 from public.open_plans where id = new.target_id) into target_exists;
    when 'trail' then select exists(select 1 from public.trails where id = new.target_id) into target_exists;
    when 'plan_message' then select exists(select 1 from public.plan_messages where id = new.target_id) into target_exists;
  end case;
  if not coalesce(target_exists, false) then
    raise exception 'Report target does not exist';
  end if;
  return new;
end;
$$;

create trigger validate_content_report_before_insert
  before insert on public.content_reports
  for each row execute function public.validate_report_target();

create or replace function public.mark_reported_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('stray.internal_moderation', 'on', true);
  case new.target_type
    when 'echo' then update public.echoes set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
    when 'scrapbook_item' then update public.scrapbook_items set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
    when 'story' then update public.stories set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
    when 'open_plan' then update public.open_plans set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
    when 'trail' then update public.trails set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
    when 'plan_message' then update public.plan_messages set moderation_status = 'pending_review' where id = new.target_id and moderation_status = 'clean';
  end case;
  perform set_config('stray.internal_moderation', 'off', true);
  return new;
end;
$$;

create trigger mark_reported_content_after_insert
  after insert on public.content_reports
  for each row execute function public.mark_reported_content();

create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  daily_count integer;
  actor_id uuid;
  recent_limit integer;
  daily_limit integer;
  recent_window interval;
begin
  actor_id := coalesce(
    (to_jsonb(new) ->> 'creator_id')::uuid,
    (to_jsonb(new) ->> 'user_id')::uuid
  );

  if actor_id is null or public.is_admin() or public.is_service_role() then
    return new;
  end if;

  case tg_table_name
    when 'echoes' then recent_limit := 5; daily_limit := 25; recent_window := interval '10 minutes';
    when 'scrapbook_items' then recent_limit := 10; daily_limit := 60; recent_window := interval '10 minutes';
    when 'stories' then recent_limit := 5; daily_limit := 30; recent_window := interval '10 minutes';
    when 'open_plans' then recent_limit := 5; daily_limit := 15; recent_window := interval '1 hour';
    when 'plan_messages' then recent_limit := 30; daily_limit := 200; recent_window := interval '10 minutes';
    else return new;
  end case;

  if tg_table_name = 'open_plans' then
    execute format('select count(*) from public.%I where creator_id = $1 and created_at > now() - $2', tg_table_name)
      into recent_count using actor_id, recent_window;
    execute format('select count(*) from public.%I where creator_id = $1 and created_at > now() - interval ''1 day''', tg_table_name)
      into daily_count using actor_id;
  else
    execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - $2', tg_table_name)
      into recent_count using actor_id, recent_window;
    execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 day''', tg_table_name)
      into daily_count using actor_id;
  end if;

  if recent_count >= recent_limit or daily_count >= daily_limit then
    raise exception 'Posting rate limit exceeded for %', tg_table_name using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger rate_limit_echoes before insert on public.echoes
  for each row execute function public.enforce_post_rate_limit();
create trigger rate_limit_scrapbook before insert on public.scrapbook_items
  for each row execute function public.enforce_post_rate_limit();
create trigger rate_limit_stories before insert on public.stories
  for each row execute function public.enforce_post_rate_limit();
create trigger rate_limit_open_plans before insert on public.open_plans
  for each row execute function public.enforce_post_rate_limit();
create trigger rate_limit_plan_messages before insert on public.plan_messages
  for each row execute function public.enforce_post_rate_limit();

create or replace function public.award_street_cred(
  awarded_user_id uuid,
  award_reason public.street_cred_reason,
  award_points integer,
  award_dedupe_key text,
  award_place_id uuid default null,
  award_source_id uuid default null,
  award_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.street_cred_events (
    user_id, reason, points, place_id, source_id, dedupe_key, metadata
  ) values (
    awarded_user_id, award_reason, award_points, award_place_id,
    award_source_id, award_dedupe_key, award_metadata
  ) on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.reward_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb := to_jsonb(new);
  actor_id uuid := (to_jsonb(new) ->> 'user_id')::uuid;
  record_id uuid := (to_jsonb(new) ->> 'id')::uuid;
  related_place_id uuid := nullif(to_jsonb(new) ->> 'place_id', '')::uuid;
begin
  if tg_table_name = 'echoes' then
    perform public.award_street_cred(actor_id, 'echo_created', 5, 'echo:' || record_id, related_place_id, record_id);
  elsif tg_table_name = 'scrapbook_items' then
    perform public.award_street_cred(actor_id, 'scrapbook_contribution', 2, 'scrapbook:' || record_id, related_place_id, record_id);
  elsif tg_table_name = 'stories' then
    perform public.award_street_cred(actor_id, 'story_created', 2, 'story:' || record_id, null, record_id);
  elsif tg_table_name = 'check_ins' and (payload ->> 'verified')::boolean then
    perform public.award_street_cred(actor_id, 'verified_check_in', 10, 'checkin:' || record_id, related_place_id, record_id);
  end if;
  return new;
end;
$$;

create trigger reward_echo after insert on public.echoes
  for each row execute function public.reward_contribution();
create trigger reward_scrapbook after insert on public.scrapbook_items
  for each row execute function public.reward_contribution();
create trigger reward_story after insert on public.stories
  for each row execute function public.reward_contribution();
create trigger reward_check_in after insert on public.check_ins
  for each row execute function public.reward_contribution();

create or replace function public.complete_check_in(
  requested_place_id uuid,
  current_lat double precision,
  current_lng double precision,
  current_accuracy_m double precision
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  measured_distance double precision;
  new_check_in_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if current_lat not between -90 and 90 or current_lng not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;
  if current_accuracy_m <= 0 or current_accuracy_m > 150 then
    raise exception 'Location accuracy must be 150 meters or better';
  end if;
  if exists (
    select 1 from public.check_ins
    where user_id = actor_id and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Please wait before checking in again';
  end if;
  if exists (
    select 1 from public.check_ins
    where user_id = actor_id
      and place_id = requested_place_id
      and created_at > now() - interval '30 minutes'
  ) then
    raise exception 'This place was checked in too recently';
  end if;

  select extensions.st_distance(
    p.location,
    extensions.st_setsrid(extensions.st_makepoint(current_lng, current_lat), 4326)::extensions.geography
  ) into measured_distance
  from public.places p
  where p.id = requested_place_id and p.is_active;

  if measured_distance is null then raise exception 'Place not found'; end if;
  if measured_distance > greatest(150, current_accuracy_m) then
    raise exception 'You are too far from this place';
  end if;

  insert into public.check_ins (user_id, place_id, accuracy_m, distance_m)
  values (actor_id, requested_place_id, current_accuracy_m, measured_distance)
  returning id into new_check_in_id;

  insert into public.echo_unlocks (user_id, place_id, check_in_id)
  values (actor_id, requested_place_id, new_check_in_id)
  on conflict (user_id, place_id) do nothing;

  return new_check_in_id;
end;
$$;

create or replace function public.complete_trail_stop(
  requested_trail_id uuid,
  requested_place_id uuid,
  current_lat double precision,
  current_lng double precision,
  current_accuracy_m double precision
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  stop_position integer;
  stop_radius integer;
  measured_distance double precision;
  current_progress integer;
  stop_count integer;
  verified_check_in_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if current_lat not between -90 and 90 or current_lng not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;
  if current_accuracy_m <= 0 or current_accuracy_m > 150 then
    raise exception 'Location accuracy must be 150 meters or better';
  end if;
  if not public.can_view_trail(requested_trail_id, actor_id) then
    raise exception 'Trail not found';
  end if;

  select tp.position, tp.unlock_radius_m,
    extensions.st_distance(
      p.location,
      extensions.st_setsrid(extensions.st_makepoint(current_lng, current_lat), 4326)::extensions.geography
    )
  into stop_position, stop_radius, measured_distance
  from public.trail_places tp
  join public.places p on p.id = tp.place_id and p.is_active
  where tp.trail_id = requested_trail_id and tp.place_id = requested_place_id;

  if stop_position is null then raise exception 'Trail stop not found'; end if;
  if measured_distance > greatest(stop_radius, current_accuracy_m) then
    raise exception 'You are too far from this trail stop';
  end if;

  select coalesce(tp.current_position, 0)
  into current_progress
  from public.trail_progress tp
  where tp.trail_id = requested_trail_id and tp.user_id = actor_id;
  current_progress := coalesce(current_progress, 0);

  if stop_position > current_progress + 1 then
    raise exception 'Complete the previous mystery stop first';
  end if;

  select ci.id into verified_check_in_id
  from public.check_ins ci
  where ci.user_id = actor_id
    and ci.place_id = requested_place_id
    and ci.verified
    and ci.created_at > now() - interval '10 minutes'
  order by ci.created_at desc
  limit 1;

  if verified_check_in_id is null then
    verified_check_in_id := public.complete_check_in(
      requested_place_id, current_lat, current_lng, current_accuracy_m
    );
  end if;

  insert into public.trail_place_completions (
    trail_id, place_id, user_id, check_in_id
  ) values (
    requested_trail_id, requested_place_id, actor_id, verified_check_in_id
  ) on conflict (trail_id, place_id, user_id) do nothing;

  select count(*) into stop_count
  from public.trail_places where trail_id = requested_trail_id;

  insert into public.trail_progress (
    trail_id, user_id, current_position, completed_at
  ) values (
    requested_trail_id,
    actor_id,
    greatest(current_progress, stop_position),
    case when stop_position = stop_count then now() end
  )
  on conflict (trail_id, user_id) do update
  set current_position = greatest(public.trail_progress.current_position, excluded.current_position),
      completed_at = coalesce(public.trail_progress.completed_at, excluded.completed_at),
      updated_at = now();

  if stop_position = stop_count then
    perform public.award_street_cred(
      actor_id,
      'trail_completed',
      30,
      'trail:' || requested_trail_id || ':user:' || actor_id,
      requested_place_id,
      requested_trail_id
    );
  end if;

  return greatest(current_progress, stop_position);
end;
$$;

create or replace function public.verify_place_cost(
  requested_place_id uuid,
  verified boolean,
  cost_description text,
  audit_note text default null
)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  old_place public.places;
  updated_place public.places;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if verified and nullif(btrim(cost_description), '') is null then
    raise exception 'Verified pricing requires cost information';
  end if;

  select * into old_place from public.places where id = requested_place_id for update;
  if not found then raise exception 'Place not found'; end if;

  update public.places
  set cost_verified = verified,
      cost_info = case when verified then btrim(cost_description) else null end,
      updated_at = now()
  where id = requested_place_id
  returning * into updated_place;

  insert into public.place_price_audits (
    place_id, admin_id, previous_cost_verified, previous_cost_info,
    new_cost_verified, new_cost_info, note
  ) values (
    requested_place_id, auth.uid(), old_place.cost_verified, old_place.cost_info,
    updated_place.cost_verified, updated_place.cost_info, audit_note
  );

  return updated_place;
end;
$$;

create or replace function public.begin_signal_session(
  current_lat double precision,
  current_lng double precision,
  current_accuracy_m double precision,
  requested_radius_m integer default 1000
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_session_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.users where id = actor_id and signals_enabled and deleted_at is null
  ) then
    raise exception 'Signals must be enabled first';
  end if;
  if current_lat not between -90 and 90 or current_lng not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;
  if current_accuracy_m <= 0 or current_accuracy_m > 250 then
    raise exception 'Location accuracy must be 250 meters or better';
  end if;
  if requested_radius_m not between 100 and 5000 then
    raise exception 'Signal radius must be between 100 and 5000 meters';
  end if;

  update public.signal_sessions
  set revoked_at = now()
  where user_id = actor_id and revoked_at is null;

  insert into public.signal_sessions (user_id, lat, lng, accuracy_m, radius_m)
  values (actor_id, current_lat, current_lng, current_accuracy_m, requested_radius_m)
  returning id into new_session_id;

  return new_session_id;
end;
$$;

create or replace function public.end_signal_session(active_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signal_sessions
  set revoked_at = now()
  where id = active_session_id and user_id = auth.uid() and revoked_at is null;
end;
$$;

create or replace function public.nearby_crew(active_session_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  distance_band_m integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with mine as (
    select s.*
    from public.signal_sessions s
    join public.users u on u.id = s.user_id
    where s.id = active_session_id
      and s.user_id = auth.uid()
      and s.revoked_at is null
      and s.expires_at > now()
      and u.signals_enabled
  )
  select
    other_user.id,
    other_user.username,
    other_user.display_name,
    other_user.avatar_path,
    (ceil(extensions.st_distance(other.location, mine.location) / 100.0) * 100)::integer
  from mine
  join public.signal_sessions other
    on other.user_id <> mine.user_id
   and other.revoked_at is null
   and other.expires_at > now()
   and extensions.st_dwithin(other.location, mine.location, least(other.radius_m, mine.radius_m))
  join public.users other_user
    on other_user.id = other.user_id
   and other_user.signals_enabled
   and other_user.deleted_at is null
  where public.are_friends(mine.user_id, other.user_id)
  order by extensions.st_distance(other.location, mine.location);
$$;

create or replace function public.visible_stories()
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  media_path text,
  media_kind public.media_kind,
  caption text,
  created_at timestamptz,
  expires_at timestamptz,
  place_id uuid,
  place_name text,
  borough text,
  neighborhood text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.user_id,
    u.username,
    u.display_name,
    u.avatar_path,
    s.media_path,
    s.media_kind,
    s.caption,
    s.created_at,
    s.expires_at,
    case when s.location_visibility = 'exact' or s.user_id = auth.uid() then p.id end,
    case when s.location_visibility = 'exact' or s.user_id = auth.uid() then p.name end,
    case when s.location_visibility in ('borough', 'neighborhood', 'exact') or s.user_id = auth.uid() then p.borough end,
    case when s.location_visibility in ('neighborhood', 'exact') or s.user_id = auth.uid() then p.neighborhood end
  from public.stories s
  join public.users u on u.id = s.user_id and u.deleted_at is null
  join public.story_locations sl on sl.story_id = s.id
  join public.places p on p.id = sl.place_id
  where s.deleted_at is null
    and s.moderation_status <> 'removed'
    and s.expires_at > now()
    and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()));
$$;

create or replace function public.visible_open_plans()
returns table (
  id uuid,
  creator_id uuid,
  title text,
  note text,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility public.audience,
  place_id uuid,
  place_name text,
  borough text,
  neighborhood text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    op.id,
    op.creator_id,
    op.title,
    op.note,
    op.starts_at,
    op.ends_at,
    op.visibility,
    case
      when op.location_visibility = 'exact'
        or op.creator_id = auth.uid()
        or exists (
          select 1 from public.plan_rsvps r
          where r.plan_id = op.id and r.user_id = auth.uid() and r.status = 'going'
        ) then p.id
    end,
    case
      when op.location_visibility = 'exact'
        or op.creator_id = auth.uid()
        or exists (
          select 1 from public.plan_rsvps r
          where r.plan_id = op.id and r.user_id = auth.uid() and r.status = 'going'
        ) then p.name
    end,
    case when op.location_visibility in ('borough', 'neighborhood', 'exact') or op.creator_id = auth.uid() then p.borough end,
    case when op.location_visibility in ('neighborhood', 'exact') or op.creator_id = auth.uid() then p.neighborhood end
  from public.open_plans op
  join public.open_plan_locations opl on opl.plan_id = op.id
  join public.places p on p.id = opl.place_id
  where public.can_view_open_plan(op.id, auth.uid())
    and op.ends_at > now();
$$;

create or replace function public.crew_board()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  weekly_points bigint,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as (
    select u.id, u.username, u.display_name, u.avatar_path
    from public.users u
    where u.deleted_at is null
      and (u.id = auth.uid() or public.are_friends(u.id, auth.uid()))
  ), totals as (
    select e.id, e.username, e.display_name, e.avatar_path,
      coalesce(sum(s.points) filter (
        where s.created_at >= date_trunc('week', now())
      ), 0)::bigint as points
    from eligible e
    left join public.street_cred_events s on s.user_id = e.id
    group by e.id, e.username, e.display_name, e.avatar_path
  )
  select id, username, display_name, avatar_path, points,
    dense_rank() over (order by points desc, username)::bigint
  from totals
  order by points desc, username;
$$;

create or replace function public.public_leaderboard()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  weekly_points bigint,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select u.id, u.username, u.display_name, u.avatar_path,
      coalesce(sum(s.points) filter (
        where s.created_at >= date_trunc('week', now())
      ), 0)::bigint as points
    from public.users u
    left join public.street_cred_events s on s.user_id = u.id
    where u.public_leaderboard and u.deleted_at is null
    group by u.id, u.username, u.display_name, u.avatar_path
  )
  select id, username, display_name, avatar_path, points,
    dense_rank() over (order by points desc, username)::bigint
  from totals
  order by points desc, username
  limit 100;
$$;

create or replace function public.can_read_user_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    public.is_admin()
    or split_part(object_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.users u
      where u.avatar_path = object_name
        and u.deleted_at is null
        and (
          u.id = auth.uid()
          or u.public_leaderboard
          or public.are_friends(u.id, auth.uid())
        )
    )
    or exists (
      select 1 from public.scrapbook_items si
      where si.photo_path = object_name
        and si.deleted_at is null
        and si.moderation_status <> 'removed'
    )
    or exists (
      select 1 from public.echoes e
      where e.photo_path = object_name
        and public.can_read_echo(e.id, auth.uid())
    )
    or exists (
      select 1 from public.stories s
      where s.media_path = object_name
        and s.deleted_at is null
        and s.moderation_status <> 'removed'
        and s.expires_at > now()
        and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
    );
$$;

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger places_set_updated_at before update on public.places
  for each row execute function public.set_updated_at();
create trigger trails_set_updated_at before update on public.trails
  for each row execute function public.set_updated_at();
create trigger trail_progress_set_updated_at before update on public.trail_progress
  for each row execute function public.set_updated_at();
create trigger echoes_set_updated_at before update on public.echoes
  for each row execute function public.set_updated_at();
create trigger scrapbook_set_updated_at before update on public.scrapbook_items
  for each row execute function public.set_updated_at();
create trigger friendships_set_updated_at before update on public.friendships
  for each row execute function public.set_updated_at();
create trigger open_plans_set_updated_at before update on public.open_plans
  for each row execute function public.set_updated_at();
create trigger plan_rsvps_set_updated_at before update on public.plan_rsvps
  for each row execute function public.set_updated_at();
create trigger plan_messages_set_updated_at before update on public.plan_messages
  for each row execute function public.set_updated_at();
create trigger stories_set_updated_at before update on public.stories
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.places enable row level security;
alter table public.place_price_audits enable row level security;
alter table public.favorites enable row level security;
alter table public.trails enable row level security;
alter table public.trail_places enable row level security;
alter table public.trail_members enable row level security;
alter table public.trail_progress enable row level security;
alter table public.trail_place_completions enable row level security;
alter table public.check_ins enable row level security;
alter table public.echo_unlocks enable row level security;
alter table public.echoes enable row level security;
alter table public.echo_reactions enable row level security;
alter table public.scrapbook_items enable row level security;
alter table public.friendships enable row level security;
alter table public.open_plans enable row level security;
alter table public.open_plan_locations enable row level security;
alter table public.plan_rsvps enable row level security;
alter table public.plan_messages enable row level security;
alter table public.plan_polls enable row level security;
alter table public.plan_poll_options enable row level security;
alter table public.plan_poll_votes enable row level security;
alter table public.strays enable row level security;
alter table public.signal_sessions enable row level security;
alter table public.stories enable row level security;
alter table public.story_locations enable row level security;
alter table public.content_reports enable row level security;
alter table public.street_cred_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.stray_cards enable row level security;
alter table public.etl_runs enable row level security;
alter table public.etl_rejections enable row level security;

create policy users_read_active on public.users for select
  using (deleted_at is null or id = auth.uid() or public.is_admin());
create policy users_update_self on public.users for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy places_read_active on public.places for select
  using (is_active or public.is_admin());
create policy places_admin_write on public.places for all
  using (public.is_admin()) with check (public.is_admin());

create policy price_audits_admin_read on public.place_price_audits for select
  using (public.is_admin());

create policy favorites_owner_all on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy trails_read_visible on public.trails for select
  using (public.can_view_trail(id, auth.uid()));
create policy trails_create_self on public.trails for insert
  with check (creator_id = auth.uid());
create policy trails_update_owner on public.trails for update
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

create policy trail_places_read_visible on public.trail_places for select
  using (public.can_view_trail_stop(trail_id, position, auth.uid()));
create policy trail_places_owner_write on public.trail_places for all
  using (exists(select 1 from public.trails t where t.id = trail_id and (t.creator_id = auth.uid() or public.is_admin())))
  with check (exists(select 1 from public.trails t where t.id = trail_id and (t.creator_id = auth.uid() or public.is_admin())));

create policy trail_members_read_related on public.trail_members for select
  using (user_id = auth.uid() or public.can_view_trail(trail_id, auth.uid()));
create policy trail_members_owner_write on public.trail_members for all
  using (exists(select 1 from public.trails t where t.id = trail_id and t.creator_id = auth.uid()))
  with check (exists(select 1 from public.trails t where t.id = trail_id and t.creator_id = auth.uid()));

create policy trail_progress_owner_read on public.trail_progress for select
  using (user_id = auth.uid() or public.is_admin());
create policy trail_completions_owner_read on public.trail_place_completions for select
  using (user_id = auth.uid() or public.is_admin());

create policy check_ins_owner_read on public.check_ins for select
  using (user_id = auth.uid() or public.is_admin());
create policy echo_unlocks_owner_read on public.echo_unlocks for select
  using (user_id = auth.uid() or public.is_admin());

create policy echoes_read_unlocked on public.echoes for select
  using (public.can_read_echo(id, auth.uid()));
create policy echoes_create_self on public.echoes for insert
  with check (user_id = auth.uid());
create policy echoes_update_self on public.echoes for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy echo_reactions_read on public.echo_reactions for select
  using (public.can_read_echo(echo_id, auth.uid()));
create policy echo_reactions_owner_write on public.echo_reactions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_read_echo(echo_id, auth.uid()));

create policy scrapbook_public_read on public.scrapbook_items for select
  using (deleted_at is null and moderation_status <> 'removed');
create policy scrapbook_create_self on public.scrapbook_items for insert
  with check (user_id = auth.uid());
create policy scrapbook_update_self on public.scrapbook_items for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy friendships_participant_read on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id) or public.is_admin());
create policy friendships_request on public.friendships for insert
  with check (requester_id = auth.uid() and status = 'pending');
create policy friendships_participant_update on public.friendships for update
  using (auth.uid() in (requester_id, addressee_id) or public.is_admin())
  with check (auth.uid() in (requester_id, addressee_id) or public.is_admin());
create policy friendships_participant_delete on public.friendships for delete
  using (auth.uid() in (requester_id, addressee_id) or public.is_admin());

create policy open_plans_read_visible on public.open_plans for select
  using (public.can_view_open_plan(id, auth.uid()));
create policy open_plans_create_self on public.open_plans for insert
  with check (creator_id = auth.uid());
create policy open_plans_update_owner on public.open_plans for update
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

create policy open_plan_locations_owner_read on public.open_plan_locations for select
  using (exists(select 1 from public.open_plans p where p.id = plan_id and (p.creator_id = auth.uid() or public.is_admin())));
create policy open_plan_locations_owner_write on public.open_plan_locations for all
  using (exists(select 1 from public.open_plans p where p.id = plan_id and (p.creator_id = auth.uid() or public.is_admin())))
  with check (exists(select 1 from public.open_plans p where p.id = plan_id and (p.creator_id = auth.uid() or public.is_admin())));

create policy plan_rsvps_read_visible on public.plan_rsvps for select
  using (public.can_view_open_plan(plan_id, auth.uid()));
create policy plan_rsvps_owner_write on public.plan_rsvps for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_view_open_plan(plan_id, auth.uid()));

create policy plan_messages_read_visible on public.plan_messages for select
  using (deleted_at is null and moderation_status <> 'removed' and public.can_view_open_plan(plan_id, auth.uid()));
create policy plan_messages_create_self on public.plan_messages for insert
  with check (user_id = auth.uid() and public.can_view_open_plan(plan_id, auth.uid()));
create policy plan_messages_update_self on public.plan_messages for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy plan_polls_read_visible on public.plan_polls for select
  using (public.can_view_open_plan(plan_id, auth.uid()));
create policy plan_polls_create_self on public.plan_polls for insert
  with check (creator_id = auth.uid() and public.can_view_open_plan(plan_id, auth.uid()));
create policy plan_polls_update_self on public.plan_polls for update
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy poll_options_read_visible on public.plan_poll_options for select
  using (exists(select 1 from public.plan_polls pp where pp.id = poll_id and public.can_view_open_plan(pp.plan_id, auth.uid())));
create policy poll_options_creator_write on public.plan_poll_options for all
  using (exists(select 1 from public.plan_polls pp where pp.id = poll_id and pp.creator_id = auth.uid()))
  with check (exists(select 1 from public.plan_polls pp where pp.id = poll_id and pp.creator_id = auth.uid()));

create policy poll_votes_read_visible on public.plan_poll_votes for select
  using (exists(select 1 from public.plan_polls pp where pp.id = poll_id and public.can_view_open_plan(pp.plan_id, auth.uid())));
create policy poll_votes_owner_write on public.plan_poll_votes for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists(select 1 from public.plan_polls pp where pp.id = poll_id and public.can_view_open_plan(pp.plan_id, auth.uid()))
    and exists(select 1 from public.plan_poll_options po where po.id = option_id and po.poll_id = poll_id)
  );

create policy strays_participant_read on public.strays for select
  using (auth.uid() in (sender_id, recipient_id) or public.is_admin());
create policy strays_sender_create on public.strays for insert
  with check (sender_id = auth.uid() and public.are_friends(sender_id, recipient_id));
create policy strays_participant_update on public.strays for update
  using (auth.uid() in (sender_id, recipient_id))
  with check (auth.uid() in (sender_id, recipient_id));

create policy signal_sessions_owner_read on public.signal_sessions for select
  using (user_id = auth.uid());

create policy stories_crew_read on public.stories for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      expires_at > now()
      and deleted_at is null
      and moderation_status <> 'removed'
      and public.are_friends(user_id, auth.uid())
    )
  );
create policy stories_create_self on public.stories for insert
  with check (user_id = auth.uid());
create policy stories_update_self on public.stories for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy story_locations_owner_read on public.story_locations for select
  using (exists(select 1 from public.stories s where s.id = story_id and (s.user_id = auth.uid() or public.is_admin())));
create policy story_locations_owner_write on public.story_locations for all
  using (exists(select 1 from public.stories s where s.id = story_id and (s.user_id = auth.uid() or public.is_admin())))
  with check (exists(select 1 from public.stories s where s.id = story_id and (s.user_id = auth.uid() or public.is_admin())));

create policy reports_owner_read on public.content_reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_create_self on public.content_reports for insert
  with check (reporter_id = auth.uid() and status = 'pending_review');
create policy reports_admin_update on public.content_reports for update
  using (public.is_admin()) with check (public.is_admin());

create policy street_cred_visible on public.street_cred_events for select
  using (
    user_id = auth.uid()
    or public.are_friends(user_id, auth.uid())
    or exists(select 1 from public.users u where u.id = user_id and u.public_leaderboard)
  );

create policy badges_public_read on public.badges for select using (true);
create policy user_badges_visible on public.user_badges for select
  using (
    user_id = auth.uid()
    or public.are_friends(user_id, auth.uid())
    or exists(select 1 from public.users u where u.id = user_id and u.public_leaderboard)
  );

create policy stray_cards_public_read on public.stray_cards for select
  using (is_published or creator_id = auth.uid() or public.is_admin());
create policy stray_cards_create_self on public.stray_cards for insert
  with check (creator_id = auth.uid());
create policy stray_cards_update_self on public.stray_cards for update
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

create policy etl_runs_admin_read on public.etl_runs for select using (public.is_admin());
create policy etl_rejections_admin_read on public.etl_rejections for select using (public.is_admin());

insert into public.badges (slug, name, description, icon, criteria, sort_order) values
  ('first-footprint', 'First Footprint', 'Complete your first verified check-in.', 'footprints', '{"verified_check_ins": 1}', 10),
  ('astoria-insider', 'Astoria Insider', 'Visit five distinct places in Astoria.', 'map-pin', '{"neighborhood": "Astoria", "distinct_places": 5}', 20),
  ('echo-keeper', 'Echo Keeper', 'Leave five Echoes around the city.', 'message-circle-heart', '{"echoes_created": 5}', 30),
  ('sidequest-seeker', 'Sidequest Seeker', 'Complete five Sidequest check-ins.', 'compass', '{"category": "sidequest", "verified_check_ins": 5}', 40),
  ('borough-hopper', 'Borough Hopper', 'Check in across four boroughs.', 'train-front', '{"distinct_boroughs": 4}', 50),
  ('flavor-finder', 'Flavor Finder', 'Visit five food spots.', 'utensils', '{"food_check_ins": 5}', 60),
  ('trail-duo', 'Trail Duo', 'Complete a trail with a Crew member.', 'users', '{"crew_trail_completions": 1}', 70),
  ('hidden-gem-hunter', 'Hidden Gem Hunter', 'Visit five verified hidden gems.', 'gem', '{"verified_hidden_gem_check_ins": 5}', 80),
  ('city-legend', 'City Legend', 'Earn 1,000 Street Cred.', 'crown', '{"street_cred": 1000}', 90)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  criteria = excluded.criteria,
  sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('place-media', 'place-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('user-media', 'user-media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('stray-cards', 'stray-cards', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy place_media_public_read on storage.objects for select
  using (bucket_id = 'place-media');
create policy place_media_admin_insert on storage.objects for insert
  with check (bucket_id = 'place-media' and public.is_admin());
create policy place_media_admin_update on storage.objects for update
  using (bucket_id = 'place-media' and public.is_admin())
  with check (bucket_id = 'place-media' and public.is_admin());
create policy place_media_admin_delete on storage.objects for delete
  using (bucket_id = 'place-media' and public.is_admin());

create policy user_media_authorized_read on storage.objects for select
  using (bucket_id = 'user-media' and public.can_read_user_media(name));
create policy user_media_owner_insert on storage.objects for insert
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy user_media_owner_update on storage.objects for update
  using (bucket_id = 'user-media' and owner_id = auth.uid()::text)
  with check (bucket_id = 'user-media' and owner_id = auth.uid()::text);
create policy user_media_owner_delete on storage.objects for delete
  using (bucket_id = 'user-media' and owner_id = auth.uid()::text);

create policy stray_cards_public_media_read on storage.objects for select
  using (bucket_id = 'stray-cards');
create policy stray_cards_owner_insert on storage.objects for insert
  with check (
    bucket_id = 'stray-cards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy stray_cards_owner_update on storage.objects for update
  using (bucket_id = 'stray-cards' and owner_id = auth.uid()::text)
  with check (bucket_id = 'stray-cards' and owner_id = auth.uid()::text);
create policy stray_cards_owner_delete on storage.objects for delete
  using (bucket_id = 'stray-cards' and owner_id = auth.uid()::text);

grant usage on schema public to anon, authenticated;
grant select on public.places, public.badges, public.stray_cards to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on function public.award_street_cred(uuid, public.street_cred_reason, integer, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.complete_check_in(uuid, double precision, double precision, double precision) from public;
revoke all on function public.complete_trail_stop(uuid, uuid, double precision, double precision, double precision) from public;
revoke all on function public.verify_place_cost(uuid, boolean, text, text) from public;
revoke all on function public.begin_signal_session(double precision, double precision, double precision, integer) from public;
revoke all on function public.end_signal_session(uuid) from public;
revoke all on function public.nearby_crew(uuid) from public;
revoke all on function public.visible_stories() from public;
revoke all on function public.visible_open_plans() from public;
revoke all on function public.crew_board() from public;
revoke all on function public.public_leaderboard() from public;

grant execute on function public.complete_check_in(uuid, double precision, double precision, double precision) to authenticated;
grant execute on function public.complete_trail_stop(uuid, uuid, double precision, double precision, double precision) to authenticated;
grant execute on function public.verify_place_cost(uuid, boolean, text, text) to authenticated;
grant execute on function public.begin_signal_session(double precision, double precision, double precision, integer) to authenticated;
grant execute on function public.end_signal_session(uuid) to authenticated;
grant execute on function public.nearby_crew(uuid) to authenticated;
grant execute on function public.visible_stories() to authenticated;
grant execute on function public.visible_open_plans() to authenticated;
grant execute on function public.crew_board() to authenticated;
grant execute on function public.public_leaderboard() to anon, authenticated;

comment on table public.users is 'Application profiles extending auth.users; contains no exact location data.';
comment on column public.places.cost_verified is 'Only true after manual admin verification; cost filters must require this flag.';
comment on column public.places.inspection_grade is 'Informational NYC inspection data; never used as pricing or hidden-gem evidence.';
comment on table public.echo_unlocks is 'Persistent proof that a verified check-in unlocked Echoes at a place.';
comment on table public.signal_sessions is 'Short-lived opt-in foreground web location checks; raw coordinates are never shared.';
comment on table public.open_plan_locations is 'Exact Open Plan place kept separate to prevent column-level location leaks.';
comment on table public.story_locations is 'Exact Story place kept separate; visible_stories() applies the poster location setting.';
comment on table public.street_cred_events is 'Immutable append-only reward ledger; clients have no insert/update policy.';

commit;
