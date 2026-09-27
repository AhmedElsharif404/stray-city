create table if not exists public.user_private_contacts (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_private_contacts enable row level security;

create policy private_contacts_read_self_or_admin
  on public.user_private_contacts for select
  using (user_id = auth.uid() or public.is_admin() or public.is_service_role());

create policy private_contacts_update_self_or_admin
  on public.user_private_contacts for update
  using (user_id = auth.uid() or public.is_admin() or public.is_service_role())
  with check (user_id = auth.uid() or public.is_admin() or public.is_service_role());

grant select, update on public.user_private_contacts to authenticated;

create trigger user_private_contacts_set_updated_at
  before update on public.user_private_contacts
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_phone text;
begin
  requested_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    '[^a-z0-9_]',
    '',
    'g'
  ));
  requested_phone := nullif(new.raw_user_meta_data ->> 'phone_e164', '');

  if requested_phone is null or requested_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'A valid phone number in international format is required';
  end if;

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

  insert into public.user_private_contacts (user_id, phone_e164)
  values (new.id, requested_phone);

  update public.imessage_profiles
  set user_id = new.id
  where phone_e164 = requested_phone
    and user_id is null;
  return new;
end;
$$;

create or replace function public.admin_private_contacts()
returns table (
  user_id uuid,
  username text,
  display_name text,
  phone_e164 text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.username, u.display_name, c.phone_e164, c.created_at
  from public.users u
  join public.user_private_contacts c on c.user_id = u.id
  where public.is_admin()
    and u.deleted_at is null
  order by u.created_at desc;
$$;

revoke all on function public.admin_private_contacts() from public;
grant execute on function public.admin_private_contacts() to authenticated;

comment on table public.user_private_contacts is
  'Private account contact data. Never expose through public profile, review, leaderboard, or crew APIs.';

create table if not exists public.imessage_profiles (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  user_id uuid unique references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.imessage_profiles enable row level security;

create policy imessage_profiles_read_self_or_admin
  on public.imessage_profiles for select
  using (user_id = auth.uid() or public.is_admin() or public.is_service_role());

grant select on public.imessage_profiles to authenticated;

create trigger imessage_profiles_set_updated_at
  before update on public.imessage_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.user_gallery_items (
  id uuid primary key default gen_random_uuid(),
  imessage_profile_id uuid not null references public.imessage_profiles(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  image_url text,
  storage_path text,
  caption text check (caption is null or char_length(caption) <= 500),
  captured_at timestamptz not null default now(),
  source text not null default 'api' check (source in ('api', 'imessage')),
  provider_message_id text unique,
  created_at timestamptz not null default now(),
  check (image_url is not null or storage_path is not null)
);

create index if not exists user_gallery_items_profile_created_idx
  on public.user_gallery_items (imessage_profile_id, created_at desc);

create index if not exists user_gallery_items_user_created_idx
  on public.user_gallery_items (user_id, created_at desc)
  where user_id is not null;

alter table public.user_gallery_items enable row level security;

create policy gallery_items_read_self_or_admin
  on public.user_gallery_items for select
  using (user_id = auth.uid() or public.is_admin() or public.is_service_role());

grant select on public.user_gallery_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imessage-gallery',
  'imessage-gallery',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.imessage_profiles is
  'Private mapping from an iMessage sender phone number to an optional Stray City account.';

comment on table public.user_gallery_items is
  'Private user gallery populated by the protected API and Spectrum iMessage agent.';
