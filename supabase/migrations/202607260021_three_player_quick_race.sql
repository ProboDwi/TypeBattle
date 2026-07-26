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
  candidate_ids uuid[] := '{}'::uuid[];
  new_room public.race_rooms;
  code_value text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quick-race-matchmaking', 0)
  );

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

  for candidate in
    select q.*
    from public.matchmaking_queue q
    where q.user_id <> auth.uid()
      and q.status = 'waiting'
      and abs(q.rating - own_rating)
        <= 150 + least(
          450,
          extract(epoch from (now() - q.queued_at))::integer / 2
        )
    order by abs(q.rating - own_rating), q.queued_at
    limit 2
    for update skip locked
  loop
    candidate_ids := array_append(candidate_ids, candidate.user_id);
  end loop;

  if cardinality(candidate_ids) < 2 then
    return jsonb_build_object(
      'status', 'waiting',
      'humanCandidates', cardinality(candidate_ids)
    );
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
    code_value, 'Quick Race', candidate_ids[1], 'public', 3, 5,
    now() + interval '30 minutes'
  )
  returning * into new_room;

  insert into public.race_participants(race_room_id, user_id)
  select new_room.id, player_id
  from unnest(candidate_ids || array[auth.uid()]) as players(player_id);

  update public.matchmaking_queue
  set status = 'matched', matched_room_id = new_room.id
  where user_id = any(candidate_ids || array[auth.uid()]);

  return jsonb_build_object(
    'status', 'matched',
    'roomId', new_room.id,
    'code', new_room.code,
    'opponent', 'humans',
    'humanCount', 3,
    'botCount', 0,
    'playerCount', 3
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
  candidate_ids uuid[] := '{}'::uuid[];
  selected_bot_ids uuid[];
  new_room public.race_rooms;
  code_value text;
  own_rating integer;
  available_bot_count integer;
  human_opponent_count integer;
  required_bot_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quick-race-matchmaking', 0)
  );

  select count(*) into available_bot_count
  from public.profiles
  where id = any(p_bot_user_ids) and is_bot;

  if cardinality(p_bot_user_ids) < 2
    or available_bot_count <> cardinality(p_bot_user_ids)
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
  for candidate in
    select q.*
    from public.matchmaking_queue q
    where q.user_id <> auth.uid()
      and q.status = 'waiting'
      and abs(q.rating - own_rating)
        <= 150 + least(
          450,
          extract(epoch from (clock_timestamp() - q.queued_at))::integer / 2
        )
    order by abs(q.rating - own_rating), q.queued_at
    limit 2
    for update skip locked
  loop
    candidate_ids := array_append(candidate_ids, candidate.user_id);
  end loop;

  human_opponent_count := cardinality(candidate_ids);
  required_bot_count := 2 - human_opponent_count;
  if required_bot_count > 0 then
    selected_bot_ids := p_bot_user_ids[1:required_bot_count];
  else
    selected_bot_ids := '{}'::uuid[];
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
    code_value,
    case
      when required_bot_count = 0 then 'Quick Race'
      when required_bot_count = 1 then 'Quick Race + KeyBot'
      else 'Quick Race vs KeyBots'
    end,
    auth.uid(),
    'public',
    3,
    5,
    now() + interval '30 minutes'
  )
  returning * into new_room;

  insert into public.race_participants(race_room_id, user_id)
  select new_room.id, player_id
  from unnest(array[auth.uid()] || candidate_ids) as players(player_id);

  if required_bot_count > 0 then
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
    from unnest(selected_bot_ids)
      with ordinality as bots(bot_id, ordinality);
  end if;

  update public.matchmaking_queue
  set status = 'matched', matched_room_id = new_room.id
  where user_id = any(array[auth.uid()] || candidate_ids);

  return jsonb_build_object(
    'status', 'matched',
    'roomId', new_room.id,
    'code', new_room.code,
    'opponent', case
      when required_bot_count = 0 then 'humans'
      when required_bot_count = 1 then 'mixed'
      else 'bots'
    end,
    'humanCount', human_opponent_count + 1,
    'botCount', required_bot_count,
    'playerCount', 3
  );
end;
$$;

revoke execute on function public.join_matchmaking()
from public, anon;
grant execute on function public.join_matchmaking()
to authenticated;

revoke execute on function public.matchmake_with_bots(uuid[])
from public, anon;
grant execute on function public.matchmake_with_bots(uuid[])
to authenticated;

commit;
