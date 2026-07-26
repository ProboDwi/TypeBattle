begin;

create or replace function public.join_matchmaking()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  own_rating integer;
  candidate public.matchmaking_queue;
  new_room public.race_rooms;
  code_value text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  delete from public.matchmaking_queue
  where queued_at < now() - interval '15 minutes';

  select rating into own_rating
  from public.profiles
  where id = auth.uid() and not is_bot;
  if own_rating is null then raise exception 'player profile not found'; end if;

  insert into public.matchmaking_queue(user_id, rating, status, queued_at)
  values(auth.uid(), own_rating, 'waiting', now())
  on conflict(user_id) do update
  set rating = excluded.rating,
    status = 'waiting',
    queued_at = now(),
    matched_room_id = null;

  select q.* into candidate
  from public.matchmaking_queue q
  where q.user_id <> auth.uid()
    and q.status = 'waiting'
    and abs(q.rating - own_rating)
      <= 150 + least(
        450,
        extract(epoch from (now() - q.queued_at))::integer / 2
      )
  order by abs(q.rating - own_rating), q.queued_at
  for update skip locked
  limit 1;

  if candidate.id is null then
    return jsonb_build_object('status', 'waiting');
  end if;

  loop
    code_value := public.generate_room_code();
    exit when not exists (
      select 1 from public.race_rooms where code = code_value
    );
  end loop;

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
    'opponent', 'human',
    'playerCount', 2
  );
end;
$$;

create or replace function public.matchmake_with_bots(p_bot_user_ids uuid[])
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
  bot_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select count(*) into bot_count
  from public.profiles
  where id = any(p_bot_user_ids) and is_bot;

  if cardinality(p_bot_user_ids) < 2
    or bot_count <> cardinality(p_bot_user_ids)
  then
    raise exception 'at least two distinct bot profiles are required';
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
      'opponent', 'human',
      'playerCount', 2
    );
  end if;

  insert into public.race_rooms(
    code, name, host_id, visibility, max_players, countdown_seconds, expires_at
  )
  values(
    code_value,
    'Quick Race vs KeyBots',
    auth.uid(),
    'public',
    bot_count + 1,
    5,
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
  values(new_room.id, auth.uid(), false, false, null, 'online');

  insert into public.race_participants(
    race_room_id,
    user_id,
    is_ready,
    is_bot,
    bot_target_wpm,
    connection_status
  )
  select
    new_room.id,
    bot_id,
    true,
    true,
    greatest(
      24,
      least(
        80,
        round(
          29
          + ((own_rating - 1000) / 60.0)
          + random() * 6
          + ((ordinality - 1) * 7)
        )::integer
      )
    ),
    'online'::public.connection_status
  from unnest(p_bot_user_ids) with ordinality as bots(bot_id, ordinality);

  update public.matchmaking_queue
  set status = 'matched', matched_room_id = new_room.id
  where user_id = auth.uid();

  return jsonb_build_object(
    'status', 'matched',
    'roomId', new_room.id,
    'code', new_room.code,
    'opponent', 'bots',
    'botCount', bot_count,
    'playerCount', bot_count + 1
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
  bot_count integer;
  finished_count integer;
begin
  if auth.uid() is null or not public.is_room_participant(p_room_id) then
    raise exception 'participant not found';
  end if;

  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  select count(*) into bot_count
  from public.race_participants
  where race_room_id = p_room_id and is_bot;

  if bot_count = 0 then
    return jsonb_build_object('hasBot', false, 'botCount', 0);
  end if;
  if room.starts_at is null
    or room.typing_text_id is null
    or room.status not in ('countdown', 'racing')
  then
    select count(*) into finished_count
    from public.race_participants
    where race_room_id = p_room_id
      and is_bot
      and race_status = 'finished';
    return jsonb_build_object(
      'hasBot', true,
      'botCount', bot_count,
      'finishedCount', finished_count
    );
  end if;

  select * into target
  from public.typing_texts
  where id = room.typing_text_id;

  for bot_participant in
    select *
    from public.race_participants
    where race_room_id = p_room_id
      and is_bot
      and race_status = 'racing'
    order by bot_target_wpm desc, joined_at
    for update
  loop
    duration_ms := greatest(
      3000,
      ceil(
        ((target.character_count / 5.0) / bot_participant.bot_target_wpm)
        * 60000
      )::integer
    );

    if room.starts_at
      + make_interval(secs => duration_ms / 1000.0)
      <= clock_timestamp()
    then
      select rating into bot_rating
      from public.profiles
      where id = bot_participant.user_id;

      select count(*) + 1 into next_place
      from public.race_results
      where race_room_id = room.id;

      error_count := greatest(
        1,
        round(target.character_count * 0.02)::integer
      );
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
    end if;
  end loop;

  select count(*) into finished_count
  from public.race_participants
  where race_room_id = p_room_id
    and is_bot
    and race_status = 'finished';

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
    'botCount', bot_count,
    'finishedCount', finished_count
  );
end;
$$;

revoke execute on function public.matchmake_with_bots(uuid[])
from public, anon;
grant execute on function public.matchmake_with_bots(uuid[])
to authenticated;

revoke execute on function public.join_matchmaking()
from public, anon;
grant execute on function public.join_matchmaking()
to authenticated;

revoke execute on function public.finish_due_race_bot(uuid)
from public, anon;
grant execute on function public.finish_due_race_bot(uuid)
to authenticated;

commit;
