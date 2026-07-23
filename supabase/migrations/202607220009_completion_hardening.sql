begin;

alter table public.practice_sessions
  add column if not exists integrity_events text[] not null default '{}'::text[];

alter table public.race_participants
  add column if not exists integrity_events text[] not null default '{}'::text[],
  add column if not exists last_progress_at timestamptz;

create or replace function public.evaluate_achievements(p_user uuid)
returns table(code text, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  unlocked record;
  unlocked_ids uuid[] := '{}'::uuid[];
  reward_total integer := 0;
begin
  for unlocked in
    select a.*
    from public.achievements a
    join public.profiles p on p.id = p_user
    where not exists (
      select 1
      from public.user_achievements ua
      where ua.user_id = p_user and ua.achievement_id = a.id
    )
      and case a.requirement_type
        when 'practices' then p.total_practices >= a.requirement_value
        when 'races' then p.total_races >= a.requirement_value
        when 'wins' then p.total_wins >= a.requirement_value
        when 'best_wpm' then p.best_wpm >= a.requirement_value
        when 'streak' then p.current_streak >= a.requirement_value
        when 'perfect_accuracy' then exists (
          select 1
          from public.practice_sessions s
          where s.user_id = p_user
            and s.completed
            and s.accuracy = 100
            and not s.suspicious
        )
        else false
      end
  loop
    insert into public.user_achievements(user_id, achievement_id)
    values (p_user, unlocked.id)
    on conflict do nothing;

    if found then
      unlocked_ids := array_append(unlocked_ids, unlocked.id);
      reward_total := reward_total + unlocked.experience_reward;
    end if;
  end loop;

  if reward_total > 0 then
    update public.profiles p
    set experience = p.experience + reward_total,
      level = public.level_from_experience(p.experience + reward_total)
    where p.id = p_user;
  end if;

  return query
  select a.code, a.name
  from public.achievements a
  where a.id = any(unlocked_ids)
  order by a.created_at;
end;
$$;

drop function if exists public.finish_practice(uuid, integer, integer, integer, integer, integer);

create function public.finish_practice(
  p_session_id uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_client_duration_ms integer,
  p_focus_losses integer default 0,
  p_integrity_events text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.practice_sessions;
  t public.typing_texts;
  official_ms integer;
  final_wpm numeric;
  final_accuracy numeric;
  is_suspicious boolean := false;
  is_completed boolean := false;
  reasons text[] := '{}'::text[];
  integrity_event text;
  xp integer := 10;
  previous_best numeric;
  previous_average numeric;
  previous_experience integer;
  final_experience integer;
  is_pb boolean := false;
  daily public.daily_challenges;
  earned jsonb := '[]'::jsonb;
begin
  select * into s
  from public.practice_sessions
  where id = p_session_id
  for update;

  if s.id is null or s.user_id <> auth.uid() then
    raise exception 'session not found';
  end if;

  if s.status <> 'started' then
    if s.status in ('finished', 'invalid') then
      return jsonb_build_object(
        'id', s.id,
        'wpm', s.wpm,
        'accuracy', s.accuracy,
        'durationMs', s.duration_ms,
        'suspicious', s.suspicious,
        'duplicate', true,
        'newAchievements', '[]'::jsonb,
        'experienceGained', 0
      );
    end if;
    raise exception 'session cannot be finished';
  end if;

  if p_current_character < 0
    or p_incorrect_keystrokes < 0
    or p_total_keystrokes < 0
    or p_client_duration_ms <= 0
    or p_focus_losses < 0 then
    raise exception 'invalid result counters';
  end if;

  select * into t from public.typing_texts where id = s.typing_text_id;
  if s.started_at > clock_timestamp() then
    raise exception 'session has not started';
  end if;

  select best_wpm, average_wpm, experience
  into previous_best, previous_average, previous_experience
  from public.profiles
  where id = auth.uid()
  for update;

  official_ms := greatest(
    1,
    floor(extract(epoch from (clock_timestamp() - s.started_at)) * 1000)::integer
  );
  is_completed := p_current_character = t.character_count
    or (s.mode = 'timed_30' and official_ms >= 30000)
    or (s.mode = 'timed_60' and official_ms >= 60000);
  final_wpm := round(
    ((least(p_current_character, t.character_count) / 5.0) / (official_ms / 60000.0))::numeric,
    2
  );
  final_accuracy := case
    when p_total_keystrokes <= 0 then 0
    else round(
      (greatest(0, p_total_keystrokes - p_incorrect_keystrokes)::numeric / p_total_keystrokes * 100),
      2
    )
  end;

  if not is_completed then
    reasons := array_append(reasons, 'incomplete_session');
  end if;
  if p_current_character > t.character_count then
    reasons := array_append(reasons, 'character_overflow');
  end if;
  if p_total_keystrokes < p_current_character
    or p_incorrect_keystrokes > p_total_keystrokes then
    reasons := array_append(reasons, 'inconsistent_keystrokes');
  end if;
  if official_ms < 3000 or final_wpm > 220 then
    reasons := array_append(reasons, 'implausible_speed');
  end if;
  if abs(official_ms - p_client_duration_ms) > greatest(5000, official_ms * 0.25) then
    reasons := array_append(reasons, 'duration_mismatch');
  end if;
  if p_focus_losses > 12 then
    reasons := array_append(reasons, 'excessive_focus_loss');
  end if;

  foreach integrity_event in array coalesce(p_integrity_events, '{}'::text[])
  loop
    if integrity_event in ('paste', 'drop')
      and not integrity_event = any(reasons) then
      reasons := array_append(reasons, integrity_event);
    elsif integrity_event like 'input:%'
      and not 'programmatic_input' = any(reasons) then
      reasons := array_append(reasons, 'programmatic_input');
    end if;
  end loop;

  is_suspicious := cardinality(reasons) > 0;
  if final_accuracy >= 95 then xp := xp + 5; end if;
  if s.mode = 'daily' then xp := xp + 10; end if;

  update public.practice_sessions
  set status = (
      case when is_suspicious then 'invalid' else 'finished' end
    )::public.session_status,
    finished_at = now(),
    duration_ms = official_ms,
    correct_characters = least(p_current_character, t.character_count),
    incorrect_keystrokes = p_incorrect_keystrokes,
    total_keystrokes = p_total_keystrokes,
    wpm = final_wpm,
    accuracy = final_accuracy,
    completed = is_completed,
    suspicious = is_suspicious,
    suspicious_reason = nullif(array_to_string(reasons, ','), ''),
    focus_losses = p_focus_losses,
    integrity_events = coalesce(p_integrity_events, '{}'::text[])
  where id = s.id;

  if not is_suspicious and is_completed then
    is_pb := final_wpm > previous_best;
    update public.profiles p
    set best_wpm = greatest(p.best_wpm, final_wpm),
      average_wpm = round(
        ((p.average_wpm * p.total_practices + final_wpm) / (p.total_practices + 1))::numeric,
        2
      ),
      average_accuracy = round(
        ((p.average_accuracy * p.total_practices + final_accuracy) / (p.total_practices + 1))::numeric,
        2
      ),
      total_practices = p.total_practices + 1,
      experience = p.experience + xp,
      level = public.level_from_experience(p.experience + xp),
      current_streak = case
        when p.last_played_at is null then 1
        when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date then p.current_streak
        when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date - 1 then p.current_streak + 1
        else 1
      end,
      longest_streak = greatest(
        p.longest_streak,
        case
          when p.last_played_at is null then 1
          when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date - 1 then p.current_streak + 1
          else p.current_streak
        end
      ),
      last_played_at = now()
    where p.id = auth.uid();

    if s.mode = 'daily' then
      daily := public.get_or_create_daily_challenge();
      insert into public.user_daily_results(
        daily_challenge_id,
        user_id,
        practice_session_id,
        wpm,
        accuracy
      )
      values (daily.id, auth.uid(), s.id, final_wpm, final_accuracy)
      on conflict do nothing;
    end if;

    select coalesce(
      jsonb_agg(jsonb_build_object('code', unlocked.code, 'name', unlocked.name)),
      '[]'::jsonb
    )
    into earned
    from public.evaluate_achievements(auth.uid()) unlocked;
  end if;

  select experience into final_experience
  from public.profiles
  where id = auth.uid();

  return jsonb_build_object(
    'id', s.id,
    'wpm', final_wpm,
    'accuracy', final_accuracy,
    'durationMs', official_ms,
    'errors', p_incorrect_keystrokes,
    'suspicious', is_suspicious,
    'suspiciousReason', nullif(array_to_string(reasons, ','), ''),
    'experienceGained', case
      when is_suspicious or not is_completed then 0
      else greatest(0, final_experience - previous_experience)
    end,
    'personalBest', is_pb,
    'averageDelta', round((final_wpm - previous_average)::numeric, 2),
    'newAchievements', earned
  );
end;
$$;

create or replace function public.sync_race_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  target public.typing_texts;
  deadline_at timestamptz;
  timeout_seconds integer;
begin
  if auth.uid() is null or not public.is_room_participant(p_room_id) then
    raise exception 'participant not found';
  end if;

  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  if room.id is null then raise exception 'room not found'; end if;

  if room.status = 'countdown' and room.starts_at <= clock_timestamp() then
    update public.race_rooms set status = 'racing' where id = room.id;
    room.status := 'racing';
  end if;

  if room.typing_text_id is not null and room.starts_at is not null then
    select * into target from public.typing_texts where id = room.typing_text_id;
    timeout_seconds := least(300, greatest(90, coalesce(target.estimated_seconds, 60) * 3));
    deadline_at := room.starts_at + make_interval(secs => timeout_seconds);

    if room.status in ('countdown', 'racing') and deadline_at <= clock_timestamp() then
      update public.race_participants
      set race_status = 'dnf',
        connection_status = 'offline',
        finished_at = now(),
        last_seen_at = now()
      where race_room_id = room.id and race_status = 'racing';

      update public.race_rooms
      set status = 'finished', finished_at = now()
      where id = room.id;
      room.status := 'finished';
    end if;
  end if;

  return jsonb_build_object(
    'status', room.status,
    'startsAt', room.starts_at,
    'deadlineAt', deadline_at
  );
end;
$$;

create or replace function public.race_progress_snapshot(
  p_room_id uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_sequence integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  target_length integer;
  previous public.race_participants;
  seconds_since_progress numeric;
  maximum_jump integer;
begin
  select * into previous
  from public.race_participants
  where race_room_id = p_room_id and user_id = auth.uid()
  for update;

  if previous.id is null or previous.race_status <> 'racing' then
    raise exception 'participant cannot progress';
  end if;

  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or room.starts_at is null then
    raise exception 'race not found';
  end if;

  if room.starts_at > clock_timestamp() then
    update public.race_participants
    set integrity_events = array_append(integrity_events, 'progress_before_start')
    where id = previous.id;
    return false;
  end if;

  perform public.sync_race_state(p_room_id);
  select * into room from public.race_rooms where id = p_room_id;
  if room.status <> 'racing' then return false; end if;

  if p_sequence <= previous.last_sequence then
    update public.race_participants
    set integrity_events = array_append(integrity_events, 'sequence_regressed')
    where id = previous.id;
    return false;
  end if;

  if p_current_character < previous.current_character then
    update public.race_participants
    set integrity_events = array_append(integrity_events, 'progress_regressed')
    where id = previous.id;
    return false;
  end if;

  seconds_since_progress := greatest(
    0.18,
    extract(epoch from (clock_timestamp() - coalesce(previous.last_progress_at, room.starts_at)))
  );
  maximum_jump := greatest(12, ceil(seconds_since_progress * 25)::integer);
  if p_current_character - previous.current_character > maximum_jump then
    update public.race_participants
    set integrity_events = array_append(integrity_events, 'progress_jump')
    where id = previous.id;
    return false;
  end if;

  if p_current_character < 0
    or p_incorrect_keystrokes < 0
    or p_total_keystrokes < p_current_character
    or p_incorrect_keystrokes > p_total_keystrokes then
    update public.race_participants
    set integrity_events = array_append(integrity_events, 'inconsistent_keystrokes')
    where id = previous.id;
    return false;
  end if;

  select character_count into target_length
  from public.typing_texts
  where id = room.typing_text_id;

  update public.race_participants
  set current_character = least(p_current_character, target_length),
    correct_characters = least(p_current_character, target_length),
    incorrect_keystrokes = p_incorrect_keystrokes,
    total_keystrokes = p_total_keystrokes,
    progress = round((least(p_current_character, target_length)::numeric / target_length * 100), 2),
    last_sequence = p_sequence,
    last_seen_at = now(),
    last_progress_at = clock_timestamp(),
    connection_status = 'online'
  where id = previous.id;

  return true;
end;
$$;

drop function if exists public.finish_race(uuid, uuid, integer, integer, integer, integer);

create function public.finish_race(
  p_room_id uuid,
  p_nonce uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_client_duration_ms integer,
  p_focus_losses integer default 0,
  p_integrity_events text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  participant public.race_participants;
  target public.typing_texts;
  official_ms integer;
  final_wpm numeric;
  final_accuracy numeric;
  next_place integer;
  player_count integer;
  rating_before integer;
  expected_score numeric;
  actual_score numeric;
  rating_delta integer;
  rating_after integer;
  reasons text[] := '{}'::text[];
  integrity_event text;
  is_suspicious boolean := false;
  xp integer := 15;
  earned jsonb := '[]'::jsonb;
begin
  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  if room.id is null or room.starts_at is null or room.starts_at > clock_timestamp()
    or room.status not in ('countdown', 'racing') then
    raise exception 'race is not active';
  end if;

  if room.status = 'countdown' then
    update public.race_rooms set status = 'racing' where id = room.id;
    room.status := 'racing';
  end if;

  select * into participant
  from public.race_participants
  where race_room_id = room.id and user_id = auth.uid()
  for update;

  if participant.id is null or participant.finish_nonce <> p_nonce then
    raise exception 'invalid participant or nonce';
  end if;

  if participant.race_status = 'finished' then
    return (
      select jsonb_build_object(
        'placement', placement,
        'wpm', wpm,
        'accuracy', accuracy,
        'durationMs', duration_ms,
        'ratingChange', rating_change,
        'duplicate', true,
        'newAchievements', '[]'::jsonb
      )
      from public.race_results
      where race_room_id = room.id and user_id = auth.uid()
    );
  end if;

  if participant.race_status <> 'racing' then
    raise exception 'participant cannot finish';
  end if;
  if p_current_character < 0
    or p_incorrect_keystrokes < 0
    or p_total_keystrokes < 0
    or p_client_duration_ms <= 0
    or p_focus_losses < 0 then
    raise exception 'invalid result counters';
  end if;

  select * into target from public.typing_texts where id = room.typing_text_id;
  official_ms := greatest(
    1,
    floor(extract(epoch from (clock_timestamp() - room.starts_at)) * 1000)::integer
  );
  final_wpm := round(
    ((least(p_current_character, target.character_count) / 5.0) / (official_ms / 60000.0))::numeric,
    2
  );
  final_accuracy := case
    when p_total_keystrokes <= 0 then 0
    else round(
      (greatest(0, p_total_keystrokes - p_incorrect_keystrokes)::numeric / p_total_keystrokes * 100),
      2
    )
  end;

  reasons := coalesce(participant.integrity_events, '{}'::text[]);
  if p_current_character <> target.character_count then
    reasons := array_append(reasons, 'incomplete_text');
  end if;
  if p_current_character > target.character_count then
    reasons := array_append(reasons, 'character_overflow');
  end if;
  if p_total_keystrokes < p_current_character
    or p_incorrect_keystrokes > p_total_keystrokes then
    reasons := array_append(reasons, 'inconsistent_keystrokes');
  end if;
  if official_ms < 3000 or final_wpm > 220 then
    reasons := array_append(reasons, 'implausible_speed');
  end if;
  if abs(official_ms - p_client_duration_ms) > greatest(5000, official_ms * 0.25) then
    reasons := array_append(reasons, 'duration_mismatch');
  end if;
  if p_focus_losses > 12 then
    reasons := array_append(reasons, 'excessive_focus_loss');
  end if;

  foreach integrity_event in array coalesce(p_integrity_events, '{}'::text[])
  loop
    if integrity_event in ('paste', 'drop')
      and not integrity_event = any(reasons) then
      reasons := array_append(reasons, integrity_event);
    elsif integrity_event like 'input:%'
      and not 'programmatic_input' = any(reasons) then
      reasons := array_append(reasons, 'programmatic_input');
    end if;
  end loop;

  is_suspicious := cardinality(reasons) > 0;
  select count(*) + 1 into next_place
  from public.race_results
  where race_room_id = room.id;
  select count(*) into player_count
  from public.race_participants
  where race_room_id = room.id and race_status not in ('left', 'kicked');
  select rating into rating_before
  from public.profiles
  where id = auth.uid()
  for update;

  select coalesce(
    avg(
      1.0 / (
        1.0 + power(
          10.0,
          (coalesce(existing.rating_before, opponent.rating) - rating_before) / 400.0
        )
      )
    ),
    0.5
  )
  into expected_score
  from public.race_participants rp
  join public.profiles opponent on opponent.id = rp.user_id
  left join public.race_results existing
    on existing.race_room_id = rp.race_room_id and existing.user_id = rp.user_id
  where rp.race_room_id = room.id
    and rp.user_id <> auth.uid()
    and rp.race_status not in ('left', 'kicked');

  actual_score := case
    when player_count <= 1 then 0.5
    else (player_count - next_place)::numeric / (player_count - 1)
  end;
  rating_delta := case
    when is_suspicious then 0
    else greatest(-40, least(40, round(24 * (actual_score - expected_score))::integer))
  end;
  rating_after := greatest(100, least(4000, rating_before + rating_delta));
  rating_delta := rating_after - rating_before;

  if next_place = 1 then xp := xp + 15; end if;
  if is_suspicious then xp := 0; end if;

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
  values (
    room.id,
    auth.uid(),
    target.id,
    next_place,
    official_ms,
    least(p_current_character, target.character_count),
    p_incorrect_keystrokes,
    p_total_keystrokes,
    final_wpm,
    final_accuracy,
    rating_before,
    rating_after,
    rating_delta,
    is_suspicious,
    nullif(array_to_string(reasons, ','), '')
  );

  update public.race_participants
  set race_status = 'finished',
    progress = 100,
    current_character = target.character_count,
    correct_characters = target.character_count,
    incorrect_keystrokes = p_incorrect_keystrokes,
    total_keystrokes = p_total_keystrokes,
    wpm = final_wpm,
    accuracy = final_accuracy,
    placement = next_place,
    finished_at = now(),
    last_seen_at = now(),
    integrity_events = reasons
  where id = participant.id;

  update public.profiles
  set rating = rating_after,
    total_races = total_races + 1,
    total_wins = total_wins + case when next_place = 1 and not is_suspicious then 1 else 0 end,
    experience = experience + xp,
    level = public.level_from_experience(experience + xp),
    last_played_at = now()
  where id = auth.uid();

  if not is_suspicious then
    select coalesce(
      jsonb_agg(jsonb_build_object('code', unlocked.code, 'name', unlocked.name)),
      '[]'::jsonb
    )
    into earned
    from public.evaluate_achievements(auth.uid()) unlocked;
  end if;

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
    'placement', next_place,
    'wpm', final_wpm,
    'accuracy', final_accuracy,
    'durationMs', official_ms,
    'ratingChange', rating_delta,
    'suspicious', is_suspicious,
    'suspiciousReason', nullif(array_to_string(reasons, ','), ''),
    'experienceGained', xp,
    'newAchievements', earned
  );
end;
$$;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role public.user_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'admin cannot demote self';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'profile not found'; end if;

  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'user.role',
    'profile',
    p_user_id,
    jsonb_build_object('role', p_role)
  );
  return true;
end;
$$;

create or replace function public.admin_moderate_result(
  p_result_id uuid,
  p_type text,
  p_valid boolean,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;

  if p_type = 'practice' then
    update public.practice_sessions
    set suspicious = not p_valid,
      status = case when p_valid then 'finished' else 'invalid' end,
      suspicious_reason = case
        when p_valid then null
        else coalesce(nullif(trim(p_note), ''), 'Ditandai admin')
      end
    where id = p_result_id;
  elsif p_type = 'race' then
    update public.race_results
    set suspicious = not p_valid,
      suspicious_reason = case
        when p_valid then null
        else coalesce(nullif(trim(p_note), ''), 'Ditandai admin')
      end
    where id = p_result_id;
  else
    raise exception 'invalid result type';
  end if;

  if not found then raise exception 'result not found'; end if;

  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'result.moderate',
    p_type,
    p_result_id,
    jsonb_build_object('valid', p_valid, 'note', p_note)
  );
  return true;
end;
$$;

revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.finish_practice(uuid, integer, integer, integer, integer, integer, text[]) from public, anon;
revoke execute on function public.sync_race_state(uuid) from public, anon;
revoke execute on function public.race_progress_snapshot(uuid, integer, integer, integer, integer) from public, anon;
revoke execute on function public.finish_race(uuid, uuid, integer, integer, integer, integer, integer, text[]) from public, anon;
revoke execute on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_moderate_result(uuid, text, boolean, text) from public, anon;

grant execute on function public.finish_practice(uuid, integer, integer, integer, integer, integer, text[]) to authenticated;
grant execute on function public.sync_race_state(uuid) to authenticated;
grant execute on function public.race_progress_snapshot(uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.finish_race(uuid, uuid, integer, integer, integer, integer, integer, text[]) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_moderate_result(uuid, text, boolean, text) to authenticated;

commit;
