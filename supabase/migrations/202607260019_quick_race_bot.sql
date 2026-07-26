begin;

alter table public.profiles
  add column if not exists is_bot boolean not null default false;

alter table public.race_participants
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_target_wpm integer;

alter table public.race_participants
  drop constraint if exists race_participants_bot_target_check;
alter table public.race_participants
  add constraint race_participants_bot_target_check check (
    (not is_bot and bot_target_wpm is null)
    or (is_bot and bot_target_wpm between 15 and 120)
  );

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
    and auth.uid() = old.id
    and not public.is_admin(auth.uid())
  then
    if new.role is distinct from old.role
      or new.is_bot is distinct from old.is_bot
      or new.level is distinct from old.level
      or new.experience is distinct from old.experience
      or new.rating is distinct from old.rating
      or new.best_wpm is distinct from old.best_wpm
      or new.average_wpm is distinct from old.average_wpm
      or new.average_accuracy is distinct from old.average_accuracy
      or new.total_practices is distinct from old.total_practices
      or new.total_races is distinct from old.total_races
      or new.total_wins is distinct from old.total_wins
      or new.current_streak is distinct from old.current_streak
      or new.longest_streak is distinct from old.longest_streak
      or new.last_played_at is distinct from old.last_played_at
    then
      raise exception 'protected profile fields cannot be updated directly';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_fields()
from public, anon, authenticated;

create or replace function public.matchmake_with_bot(p_bot_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  own_queue public.matchmaking_queue;
  candidate public.matchmaking_queue;
  new_room public.race_rooms;
  code_value text;
  own_rating integer;
  target_wpm integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = p_bot_user_id and is_bot
  ) then
    raise exception 'bot profile not found';
  end if;

  select * into own_queue
  from public.matchmaking_queue
  where user_id = auth.uid()
  for update;

  if own_queue.id is null then raise exception 'queue entry not found'; end if;
  if own_queue.status = 'matched' and own_queue.matched_room_id is not null then
    select * into new_room
    from public.race_rooms
    where id = own_queue.matched_room_id;
    return jsonb_build_object(
      'status', 'matched',
      'roomId', new_room.id,
      'code', new_room.code,
      'opponent', 'existing'
    );
  end if;
  if own_queue.status <> 'waiting' then raise exception 'queue is not waiting'; end if;
  if own_queue.queued_at > clock_timestamp() - interval '10 seconds' then
    raise exception 'bot wait period has not elapsed';
  end if;

  own_rating := own_queue.rating;
  select q.* into candidate
  from public.matchmaking_queue q
  where q.user_id <> auth.uid()
    and q.status = 'waiting'
    and abs(q.rating - own_rating)
      <= 150 + least(
        450,
        extract(epoch from (clock_timestamp() - q.queued_at))::integer / 2
      )
  order by abs(q.rating - own_rating), q.queued_at
  for update skip locked
  limit 1;

  loop
    code_value := public.generate_room_code();
    exit when not exists (
      select 1 from public.race_rooms where code = code_value
    );
  end loop;

  if candidate.id is not null then
    insert into public.race_rooms(
      code, name, host_id, visibility, max_players, countdown_seconds, expires_at
    )
    values(
      code_value, 'Quick Race', candidate.user_id, 'public', 2, 5,
      now() + interval '30 minutes'
    )
    returning * into new_room;

    insert into public.race_participants(race_room_id, user_id)
    values
      (new_room.id, candidate.user_id),
      (new_room.id, auth.uid());

    update public.matchmaking_queue
    set status = 'matched', matched_room_id = new_room.id
    where user_id in (candidate.user_id, auth.uid());

    return jsonb_build_object(
      'status', 'matched',
      'roomId', new_room.id,
      'code', new_room.code,
      'opponent', 'human'
    );
  end if;

  target_wpm := greatest(
    24,
    least(
      72,
      round(32 + ((own_rating - 1000) / 60.0) + random() * 8)::integer
    )
  );

  insert into public.race_rooms(
    code, name, host_id, visibility, max_players, countdown_seconds, expires_at
  )
  values(
    code_value, 'Quick Race vs KeyBot', auth.uid(), 'public', 2, 5,
    now() + interval '30 minutes'
  )
  returning * into new_room;

  insert into public.race_participants(
    race_room_id,
    user_id,
    is_ready,
    is_bot,
    bot_target_wpm,
    connection_status
  )
  values
    (new_room.id, auth.uid(), false, false, null, 'online'),
    (new_room.id, p_bot_user_id, true, true, target_wpm, 'online');

  update public.matchmaking_queue
  set status = 'matched', matched_room_id = new_room.id
  where user_id = auth.uid();

  return jsonb_build_object(
    'status', 'matched',
    'roomId', new_room.id,
    'code', new_room.code,
    'opponent', 'bot'
  );
end;
$$;

create or replace function public.finish_due_race_bot(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  target public.typing_texts;
  bot_participant public.race_participants;
  bot_rating integer;
  duration_ms integer;
  error_count integer;
  total_count integer;
  accuracy_value numeric;
  next_place integer;
begin
  if auth.uid() is null or not public.is_room_participant(p_room_id) then
    raise exception 'participant not found';
  end if;

  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  select * into bot_participant
  from public.race_participants
  where race_room_id = p_room_id and is_bot
  for update;

  if bot_participant.id is null then
    return jsonb_build_object('hasBot', false);
  end if;
  if bot_participant.race_status = 'finished' then
    return jsonb_build_object(
      'hasBot', true,
      'finished', true,
      'placement', bot_participant.placement
    );
  end if;
  if room.starts_at is null
    or room.typing_text_id is null
    or room.status not in ('countdown', 'racing')
    or bot_participant.race_status <> 'racing'
  then
    return jsonb_build_object('hasBot', true, 'finished', false);
  end if;

  select * into target
  from public.typing_texts
  where id = room.typing_text_id;

  duration_ms := greatest(
    3000,
    ceil(
      ((target.character_count / 5.0) / bot_participant.bot_target_wpm)
      * 60000
    )::integer
  );

  if room.starts_at
    + make_interval(secs => duration_ms / 1000.0)
    > clock_timestamp()
  then
    return jsonb_build_object(
      'hasBot', true,
      'finished', false,
      'durationMs', duration_ms
    );
  end if;

  select rating into bot_rating
  from public.profiles
  where id = bot_participant.user_id;

  select count(*) + 1 into next_place
  from public.race_results
  where race_room_id = room.id;

  error_count := greatest(1, round(target.character_count * 0.02)::integer);
  total_count := target.character_count + error_count;
  accuracy_value := round(
    target.character_count::numeric / total_count * 100,
    2
  );

  insert into public.race_results(
    race_room_id,
    user_id,
    typing_text_id,
    placement,
    duration_ms,
    correct_characters,
    incorrect_keystrokes,
    total_keystrokes,
    wpm,
    accuracy,
    rating_before,
    rating_after,
    rating_change,
    suspicious,
    suspicious_reason
  )
  values(
    room.id,
    bot_participant.user_id,
    target.id,
    next_place,
    duration_ms,
    target.character_count,
    error_count,
    total_count,
    bot_participant.bot_target_wpm,
    accuracy_value,
    bot_rating,
    bot_rating,
    0,
    false,
    null
  )
  on conflict (race_room_id, user_id) do nothing;

  update public.race_participants
  set race_status = 'finished',
    progress = 100,
    current_character = target.character_count,
    correct_characters = target.character_count,
    incorrect_keystrokes = error_count,
    total_keystrokes = total_count,
    wpm = bot_target_wpm,
    accuracy = accuracy_value,
    placement = next_place,
    finished_at = now(),
    last_seen_at = now()
  where id = bot_participant.id;

  if not exists (
    select 1
    from public.race_participants
    where race_room_id = room.id and race_status = 'racing'
  ) then
    update public.race_rooms
    set status = 'finished', finished_at = now()
    where id = room.id;
  end if;

  return jsonb_build_object(
    'hasBot', true,
    'finished', true,
    'placement', next_place,
    'durationMs', duration_ms
  );
end;
$$;

create or replace view public.public_profiles
with (security_invoker = true) as
select
  id, username, display_name, bio, avatar_seed, level, rating, best_wpm,
  average_wpm, average_accuracy, total_practices, total_races, total_wins,
  current_streak, longest_streak, created_at
from public.profiles
where not is_bot;

create or replace view public.leaderboard_wpm
with (security_invoker = true) as
select distinct on (s.user_id)
  s.user_id, p.username, p.display_name, s.wpm, s.accuracy, s.finished_at
from public.practice_sessions s
join public.profiles p on p.id = s.user_id
where s.user_id is not null
  and not p.is_bot
  and s.status = 'finished'
  and s.completed
  and not s.suspicious
  and s.accuracy >= 90
order by s.user_id, s.wpm desc, s.finished_at asc;

create or replace view public.leaderboard_rating
with (security_invoker = true) as
select id as user_id, username, display_name, rating, total_wins
from public.profiles
where not is_bot
order by rating desc;

create or replace view public.leaderboard_daily
with (security_invoker = true) as
select
  d.challenge_date, r.user_id, p.username, p.display_name, r.wpm,
  r.accuracy, r.created_at
from public.user_daily_results r
join public.daily_challenges d on d.id = r.daily_challenge_id
join public.profiles p on p.id = r.user_id
where not p.is_bot;

create or replace view public.leaderboard_level
with (security_barrier = true) as
select id as user_id, username, display_name, level, experience
from public.profiles
where not is_bot
order by level desc, experience desc, created_at asc;

revoke execute on function public.matchmake_with_bot(uuid)
from public, anon;
grant execute on function public.matchmake_with_bot(uuid)
to authenticated;

revoke execute on function public.finish_due_race_bot(uuid)
from public, anon;
grant execute on function public.finish_due_race_bot(uuid)
to authenticated;

grant select on public.public_profiles, public.leaderboard_wpm,
  public.leaderboard_rating, public.leaderboard_daily,
  public.leaderboard_level
to anon, authenticated;

commit;
