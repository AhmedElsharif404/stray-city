begin;

create or replace function public.evaluate_user_badges(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_cred bigint;
begin
  if target_user_id is null then return; end if;

  select coalesce(sum(points), 0) into total_cred
  from public.street_cred_events where user_id = target_user_id;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('verified_check_ins', 1)
  from public.badges b
  where b.slug = 'first-footprint'
    and exists (select 1 from public.check_ins where user_id = target_user_id and verified)
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('neighborhood', 'Astoria', 'distinct_places', count(distinct ci.place_id))
  from public.badges b
  join public.check_ins ci on ci.user_id = target_user_id and ci.verified
  join public.places p on p.id = ci.place_id and p.neighborhood = 'Astoria'
  where b.slug = 'astoria-insider'
  group by b.id
  having count(distinct ci.place_id) >= 5
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('echoes_created', count(*))
  from public.badges b
  join public.echoes e on e.user_id = target_user_id and e.deleted_at is null
  where b.slug = 'echo-keeper'
  group by b.id
  having count(*) >= 5
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('sidequest_check_ins', count(distinct ci.place_id))
  from public.badges b
  join public.check_ins ci on ci.user_id = target_user_id and ci.verified
  join public.places p on p.id = ci.place_id and p.category = 'sidequest'
  where b.slug = 'sidequest-seeker'
  group by b.id
  having count(distinct ci.place_id) >= 5
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('distinct_boroughs', count(distinct p.borough))
  from public.badges b
  join public.check_ins ci on ci.user_id = target_user_id and ci.verified
  join public.places p on p.id = ci.place_id
  where b.slug = 'borough-hopper'
  group by b.id
  having count(distinct p.borough) >= 4
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('food_places', count(distinct ci.place_id))
  from public.badges b
  join public.check_ins ci on ci.user_id = target_user_id and ci.verified
  join public.places p on p.id = ci.place_id and p.category in ('cheap_eat', 'restaurant', 'cafe')
  where b.slug = 'flavor-finder'
  group by b.id
  having count(distinct ci.place_id) >= 5
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('hidden_gems', count(distinct ci.place_id))
  from public.badges b
  join public.check_ins ci on ci.user_id = target_user_id and ci.verified
  join public.places p on p.id = ci.place_id and p.hidden_gem_verified
  where b.slug = 'hidden-gem-hunter'
  group by b.id
  having count(distinct ci.place_id) >= 5
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('trail_id', mine.trail_id)
  from public.badges b
  join public.trail_progress mine
    on mine.user_id = target_user_id and mine.completed_at is not null
  where b.slug = 'trail-duo'
    and exists (
      select 1
      from public.trail_progress theirs
      where theirs.trail_id = mine.trail_id
        and theirs.user_id <> target_user_id
        and theirs.completed_at is not null
        and public.are_friends(target_user_id, theirs.user_id)
    )
  limit 1
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id, award_context)
  select target_user_id, b.id, jsonb_build_object('street_cred', total_cred)
  from public.badges b
  where b.slug = 'city-legend' and total_cred >= 1000
  on conflict do nothing;
end;
$$;

create or replace function public.evaluate_badges_after_cred()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.evaluate_user_badges(new.user_id);
  return new;
end;
$$;

create trigger evaluate_badges_on_cred
  after insert on public.street_cred_events
  for each row execute function public.evaluate_badges_after_cred();

create or replace function public.request_friend_by_username(requested_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  requested_user_id uuid;
  friendship_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select id into requested_user_id
  from public.users
  where username = lower(btrim(requested_username)) and deleted_at is null;
  if requested_user_id is null then raise exception 'User not found'; end if;
  if requested_user_id = actor_id then raise exception 'You cannot add yourself'; end if;

  insert into public.friendships (requester_id, addressee_id)
  values (actor_id, requested_user_id)
  returning id into friendship_id;
  return friendship_id;
exception
  when unique_violation then raise exception 'A Crew request already exists';
end;
$$;

create or replace function public.respond_to_friend_request(
  requested_friendship_id uuid,
  response public.friendship_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if response not in ('accepted', 'declined', 'blocked') then
    raise exception 'Invalid friendship response';
  end if;
  update public.friendships
  set status = response, responded_at = now(), updated_at = now()
  where id = requested_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending';
  if not found then raise exception 'Pending Crew request not found'; end if;
end;
$$;

create or replace function public.save_story_as_echo(requested_story_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  story_row public.stories;
  story_place_id uuid;
  new_echo_id uuid;
begin
  select * into story_row
  from public.stories
  where id = requested_story_id and user_id = auth.uid() and deleted_at is null
  for update;
  if not found then raise exception 'Story not found'; end if;
  if story_row.saved_echo_id is not null then return story_row.saved_echo_id; end if;

  select place_id into story_place_id
  from public.story_locations where story_id = requested_story_id;

  insert into public.echoes (place_id, user_id, photo_path, text)
  values (
    story_place_id,
    auth.uid(),
    story_row.media_path,
    coalesce(nullif(story_row.caption, ''), 'A moment saved from my Stray Story.')
  ) returning id into new_echo_id;

  update public.stories set saved_echo_id = new_echo_id where id = requested_story_id;
  return new_echo_id;
end;
$$;

create or replace function public.nearby_places(
  current_lat double precision,
  current_lng double precision,
  radius_m integer default 5000,
  result_limit integer default 50
)
returns table (
  id uuid,
  name text,
  category public.place_category,
  lat double precision,
  lng double precision,
  borough text,
  neighborhood text,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select p.id, p.name, p.category, p.lat, p.lng, p.borough, p.neighborhood,
    extensions.st_distance(
      p.location,
      extensions.st_setsrid(extensions.st_makepoint(current_lng, current_lat), 4326)::extensions.geography
    ) as distance_m
  from public.places p
  where p.is_active
    and extensions.st_dwithin(
      p.location,
      extensions.st_setsrid(extensions.st_makepoint(current_lng, current_lat), 4326)::extensions.geography,
      least(greatest(radius_m, 100), 25000)
    )
  order by p.location operator(extensions.<->)
    extensions.st_setsrid(extensions.st_makepoint(current_lng, current_lat), 4326)::extensions.geography
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.evaluate_user_badges(uuid) from public, anon, authenticated;
revoke all on function public.request_friend_by_username(text) from public;
revoke all on function public.respond_to_friend_request(uuid, public.friendship_status) from public;
revoke all on function public.save_story_as_echo(uuid) from public;

grant execute on function public.request_friend_by_username(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, public.friendship_status) to authenticated;
grant execute on function public.save_story_as_echo(uuid) to authenticated;
grant execute on function public.nearby_places(double precision, double precision, integer, integer) to anon, authenticated;

do $$
declare
  live_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach live_table in array array[
      'friendships',
      'strays',
      'open_plans',
      'plan_rsvps',
      'plan_messages',
      'plan_polls',
      'plan_poll_votes',
      'stories'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = live_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', live_table);
      end if;
    end loop;
  end if;
end;
$$;

commit;
