begin;

create or replace function public.finish_race(
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
  saved public.race_results;
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
  if auth.uid() is null then raise exception 'participant not found'; end if;

  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  select * into participant
  from public.race_participants
  where race_room_id = p_room_id and user_id = auth.uid()
  for update;

  select * into saved
  from public.race_results
  where race_room_id = p_room_id and user_id = auth.uid();

  if saved.id is not null then
    return jsonb_build_object(
      'placement', saved.placement,
      'wpm', saved.wpm,
      'accuracy', saved.accuracy,
      'durationMs', saved.duration_ms,
      'ratingChange', saved.rating_change,
      'suspicious', saved.suspicious,
      'duplicate', true,
      'newAchievements', '[]'::jsonb
    );
  end if;

  if room.id is null or room.starts_at is null
    or room.starts_at > clock_timestamp()
    or room.status not in ('countdown', 'racing')
  then
    raise exception 'race is not active';
  end if;

  if participant.id is null or participant.finish_nonce <> p_nonce then
    raise exception 'invalid participant or nonce';
  end if;
  if participant.race_status <> 'racing' then
    raise exception 'participant cannot finish';
  end if;

  select * into target
  from public.typing_texts
  where id = room.typing_text_id;

  if target.id is null then raise exception 'race text not found'; end if;
  if p_current_character <> target.character_count then
    raise exception 'race text is incomplete';
  end if;
  if p_incorrect_keystrokes < 0
    or p_total_keystrokes < p_current_character
    or p_incorrect_keystrokes > p_total_keystrokes
    or p_client_duration_ms <= 0
    or p_focus_losses < 0
  then
    raise exception 'invalid result counters';
  end if;

  if room.status = 'countdown' then
    update public.race_rooms set status = 'racing' where id = room.id;
    room.status := 'racing';
  end if;

  official_ms := greatest(
    1,
    floor(extract(epoch from (clock_timestamp() - room.starts_at)) * 1000)::integer
  );
  final_wpm := round(
    ((target.character_count / 5.0) / (official_ms / 60000.0))::numeric,
    2
  );
  final_accuracy := case
    when p_total_keystrokes <= 0 then 0
    else round(
      (
        greatest(0, p_total_keystrokes - p_incorrect_keystrokes)::numeric
        / p_total_keystrokes
        * 100
      ),
      2
    )
  end;

  -- Network reordering can make an older progress snapshot arrive last. It
  -- must not invalidate an otherwise complete result.
  reasons := array_remove(
    coalesce(participant.integrity_events, '{}'::text[]),
    'sequence_regressed'
  );
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
      and not integrity_event = any(reasons)
    then
      reasons := array_append(reasons, integrity_event);
    elsif integrity_event like 'input:%'
      and not 'programmatic_input' = any(reasons)
    then
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

  select coalesce(rating, 1000) into rating_before
  from public.profiles
  where id = auth.uid()
  for update;

  if rating_before is null then raise exception 'profile not found'; end if;

  select coalesce(
    avg(
      1.0 / (
        1.0 + power(10.0, (opponent.rating - rating_before) / 400.0)
      )
    ),
    0.5
  )
  into expected_score
  from public.race_participants rp
  join public.profiles opponent on opponent.id = rp.user_id
  where rp.race_room_id = room.id
    and rp.user_id <> auth.uid()
    and rp.race_status not in ('left', 'kicked');

  actual_score := case
    when player_count <= 1 then 0.5
    else (player_count - next_place)::numeric / (player_count - 1)
  end;
  rating_delta := case
    when is_suspicious then 0
    else greatest(
      -40,
      least(40, round(24 * (actual_score - expected_score))::integer)
    )
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
    target.character_count,
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
    total_wins = total_wins
      + case when next_place = 1 and not is_suspicious then 1 else 0 end,
    experience = experience + xp,
    level = public.level_from_experience(experience + xp),
    last_played_at = now()
  where id = auth.uid();

  if not is_suspicious then
    begin
      select coalesce(
        jsonb_agg(jsonb_build_object('code', unlocked.code, 'name', unlocked.name)),
        '[]'::jsonb
      )
      into earned
      from public.evaluate_achievements(auth.uid()) unlocked;
    exception when others then
      earned := '[]'::jsonb;
    end;
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

revoke execute on function public.finish_race(
  uuid, uuid, integer, integer, integer, integer, integer, text[]
)
from public, anon;
grant execute on function public.finish_race(
  uuid, uuid, integer, integer, integer, integer, integer, text[]
)
to authenticated;

commit;
