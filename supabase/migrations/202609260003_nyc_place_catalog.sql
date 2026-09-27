alter type public.place_category add value if not exists 'bakery';
alter type public.place_category add value if not exists 'bar';
alter type public.place_category add value if not exists 'museum';
alter type public.place_category add value if not exists 'gallery';
alter type public.place_category add value if not exists 'theatre';
alter type public.place_category add value if not exists 'cinema';
alter type public.place_category add value if not exists 'library';
alter type public.place_category add value if not exists 'bookstore';
alter type public.place_category add value if not exists 'garden';
alter type public.place_category add value if not exists 'market';
alter type public.place_category add value if not exists 'attraction';
alter type public.place_category add value if not exists 'viewpoint';
alter type public.place_category add value if not exists 'public_art';
alter type public.place_category add value if not exists 'music_venue';
alter type public.external_data_source add value if not exists 'osm_catalog';
alter type public.etl_source add value if not exists 'osm_catalog';

alter table public.places
  add column if not exists slug text,
  add column if not exists website_url text,
  add column if not exists phone text,
  add column if not exists opening_hours jsonb,
  add column if not exists price_level smallint check (price_level between 1 and 4);

update public.places
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
  || '-' || left(replace(id::text, '-', ''), 8)
where slug is null;

alter table public.places alter column slug set not null;
create unique index if not exists places_slug_idx on public.places(slug);
create index if not exists places_search_idx
  on public.places using gin(to_tsvector('english', name || ' ' || coalesce(description, '') || ' ' || coalesce(cuisine, '')));

create or replace function public.set_place_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(replace(new.id::text, '-', ''), 8);
  end if;
  return new;
end;
$$;

drop trigger if exists places_slug_before_write on public.places;
create trigger places_slug_before_write
before insert or update of name, slug on public.places
for each row execute function public.set_place_slug();

create table public.place_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  provider text not null,
  external_id text not null,
  source_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  unique(provider, external_id)
);

create index place_sources_place_idx on public.place_sources(place_id);
alter table public.place_sources enable row level security;
create policy place_sources_admin_read on public.place_sources
for select using (public.is_admin());

alter table public.etl_runs
  add column if not exists records_read integer not null default 0,
  add column if not exists records_created integer not null default 0,
  add column if not exists records_updated integer not null default 0,
  add column if not exists records_skipped integer not null default 0;

create table public.admin_audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_values jsonb not null,
  after_values jsonb not null,
  created_at timestamptz not null default now()
);

create index admin_audit_log_entity_idx on public.admin_audit_log(entity_type, entity_id, created_at desc);
alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_admin_read on public.admin_audit_log
for select using (public.is_admin());

create or replace function public.curate_place(
  requested_place_id uuid,
  requested_cost_verified boolean,
  requested_cost_info text,
  requested_price_level smallint,
  requested_hidden_gem_verified boolean,
  requested_category public.place_category,
  requested_sidequest_objective text
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
  if requested_cost_verified and nullif(btrim(requested_cost_info), '') is null then
    raise exception 'Verified pricing requires cost information';
  end if;
  if requested_price_level is not null and requested_price_level not between 1 and 4 then
    raise exception 'Price level must be between 1 and 4';
  end if;

  select * into old_place from public.places where id = requested_place_id for update;
  if not found then raise exception 'Place not found'; end if;

  update public.places
  set cost_verified = requested_cost_verified,
      cost_info = case when requested_cost_verified then nullif(btrim(requested_cost_info), '') else null end,
      price_level = case when requested_cost_verified then requested_price_level else null end,
      hidden_gem_verified = requested_hidden_gem_verified,
      category = requested_category,
      sidequest_objective = nullif(btrim(requested_sidequest_objective), ''),
      updated_at = now()
  where id = requested_place_id
  returning * into updated_place;

  insert into public.admin_audit_log (
    admin_id, entity_type, entity_id, action, before_values, after_values
  ) values (
    auth.uid(), 'place', requested_place_id, 'curate', to_jsonb(old_place), to_jsonb(updated_place)
  );

  return updated_place;
end;
$$;

revoke all on function public.curate_place(uuid, boolean, text, smallint, boolean, public.place_category, text) from public;
grant execute on function public.curate_place(uuid, boolean, text, smallint, boolean, public.place_category, text) to authenticated;

comment on table public.place_sources is 'Provider provenance and raw payloads for idempotent place imports.';
comment on table public.admin_audit_log is 'Immutable audit trail for staff curation changes.';
