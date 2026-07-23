begin;

create or replace function public.start_practice(
  p_mode public.practice_mode,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns table(
  session_id uuid,
  text_id uuid,
  title text,
  content text,
  difficulty public.text_difficulty,
  category_name text,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_text public.typing_texts;
  previous_text_id uuid;
  challenge public.daily_challenges;
  new_session public.practice_sessions;
  start_time timestamptz := clock_timestamp() + interval '3 seconds';
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  if p_mode = 'daily' then
    challenge := public.get_or_create_daily_challenge();
    select * into selected_text
    from public.typing_texts
    where id = challenge.typing_text_id;
  else
    select practice.typing_text_id into previous_text_id
    from public.practice_sessions practice
    where practice.user_id = auth.uid()
    order by practice.created_at desc
    limit 1;

    select candidate.* into selected_text
    from public.typing_texts candidate
    where candidate.status = 'published'
      and (p_difficulty is null or candidate.difficulty = p_difficulty)
      and (p_category_id is null or candidate.category_id = p_category_id)
      and (previous_text_id is null or candidate.id <> previous_text_id)
    order by random()
    limit 1;

    -- If an exact difficulty has no alternative, keep the requested category
    -- and widen only the difficulty. Never return the previous text.
    if selected_text.id is null and previous_text_id is not null then
      select candidate.* into selected_text
      from public.typing_texts candidate
      where candidate.status = 'published'
        and (p_category_id is null or candidate.category_id = p_category_id)
        and candidate.id <> previous_text_id
      order by random()
      limit 1;
    end if;
  end if;

  if selected_text.id is null then
    raise exception 'no published text available';
  end if;

  insert into public.practice_sessions(user_id, typing_text_id, mode, started_at)
  values(auth.uid(), selected_text.id, p_mode, start_time)
  returning * into new_session;

  return query
  select
    new_session.id,
    selected_text.id,
    selected_text.title,
    selected_text.content,
    selected_text.difficulty,
    category.name,
    new_session.started_at
  from public.text_categories category
  where category.id = selected_text.category_id;
end;
$$;

create or replace function public.pick_race_text(p_room_id uuid)
returns public.typing_texts
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  selected_text public.typing_texts;
begin
  select * into room
  from public.race_rooms
  where id = p_room_id;

  if room.id is null then raise exception 'room not found'; end if;

  select candidate.* into selected_text
  from public.typing_texts candidate
  where candidate.status = 'published'
    and (room.difficulty is null or candidate.difficulty = room.difficulty)
    and (room.category_id is null or candidate.category_id = room.category_id)
    and not exists (
      select 1
      from public.race_participants current_participant
      join lateral (
        select previous_room.typing_text_id
        from public.race_participants history
        join public.race_rooms previous_room
          on previous_room.id = history.race_room_id
        where history.user_id = current_participant.user_id
          and previous_room.id <> room.id
          and previous_room.typing_text_id is not null
        order by
          coalesce(previous_room.starts_at, previous_room.created_at) desc
        limit 1
      ) recent on true
      where current_participant.race_room_id = room.id
        and current_participant.race_status = 'waiting'
        and recent.typing_text_id = candidate.id
    )
  order by random()
  limit 1;

  -- Keep the category authoritative but widen difficulty when needed. The
  -- previous text of every participant remains excluded.
  if selected_text.id is null then
    select candidate.* into selected_text
    from public.typing_texts candidate
    where candidate.status = 'published'
      and (room.category_id is null or candidate.category_id = room.category_id)
      and not exists (
        select 1
        from public.race_participants current_participant
        join lateral (
          select previous_room.typing_text_id
          from public.race_participants history
          join public.race_rooms previous_room
            on previous_room.id = history.race_room_id
          where history.user_id = current_participant.user_id
            and previous_room.id <> room.id
            and previous_room.typing_text_id is not null
          order by
            coalesce(previous_room.starts_at, previous_room.created_at) desc
          limit 1
        ) recent on true
        where current_participant.race_room_id = room.id
          and current_participant.race_status = 'waiting'
          and recent.typing_text_id = candidate.id
      )
    order by random()
    limit 1;
  end if;

  return selected_text;
end;
$$;

create or replace function public.start_race(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  selected_text public.typing_texts;
  total_players integer;
  ready_players integer;
  start_time timestamptz;
begin
  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  if room.id is null or room.host_id <> auth.uid() then
    raise exception 'only the host can start';
  end if;
  if room.status <> 'waiting' then raise exception 'room is not waiting'; end if;

  select count(*), count(*) filter(where is_ready)
  into total_players, ready_players
  from public.race_participants
  where race_room_id = room.id and race_status = 'waiting';

  if total_players < 2 then raise exception 'at least two players are required'; end if;
  if ready_players <> total_players then raise exception 'all players must be ready'; end if;

  selected_text := public.pick_race_text(room.id);
  if selected_text.id is null then raise exception 'no published text available'; end if;

  start_time := clock_timestamp() + make_interval(secs => room.countdown_seconds);
  update public.race_rooms
  set typing_text_id = selected_text.id,
    status = 'countdown',
    starts_at = start_time
  where id = room.id;

  update public.race_participants
  set race_status = 'racing',
    progress = 0,
    current_character = 0,
    correct_characters = 0,
    incorrect_keystrokes = 0,
    total_keystrokes = 0,
    last_sequence = 0
  where race_room_id = room.id and race_status = 'waiting';

  return jsonb_build_object(
    'roomId', room.id,
    'startsAt', start_time,
    'countdownSeconds', room.countdown_seconds,
    'text', jsonb_build_object(
      'id', selected_text.id,
      'title', selected_text.title,
      'content', selected_text.content,
      'difficulty', selected_text.difficulty
    )
  );
end;
$$;

create or replace function public.set_race_ready(
  p_room_id uuid,
  p_ready boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.race_rooms;
  total_players integer;
  ready_players integer;
  selected_text public.typing_texts;
  start_time timestamptz;
begin
  select * into room
  from public.race_rooms
  where id = p_room_id
  for update;

  if room.id is null or room.status <> 'waiting' then
    raise exception 'room is not waiting';
  end if;

  update public.race_participants
  set is_ready = p_ready,
    connection_status = 'online',
    last_seen_at = now()
  where race_room_id = p_room_id
    and user_id = auth.uid()
    and race_status = 'waiting';

  if not found then raise exception 'participant not found'; end if;

  select count(*), count(*) filter(where is_ready)
  into total_players, ready_players
  from public.race_participants
  where race_room_id = room.id and race_status = 'waiting';

  if room.visibility = 'public'
    and total_players >= 2
    and ready_players = total_players then
    selected_text := public.pick_race_text(room.id);
    if selected_text.id is null then
      raise exception 'no published text available';
    end if;

    start_time := clock_timestamp() + make_interval(secs => room.countdown_seconds);
    update public.race_rooms
    set typing_text_id = selected_text.id,
      status = 'countdown',
      starts_at = start_time
    where id = room.id;

    update public.race_participants
    set race_status = 'racing',
      progress = 0,
      current_character = 0,
      correct_characters = 0,
      incorrect_keystrokes = 0,
      total_keystrokes = 0,
      last_sequence = 0
    where race_room_id = room.id and race_status = 'waiting';

    return jsonb_build_object(
      'ready', p_ready,
      'started', true,
      'startsAt', start_time,
      'text', jsonb_build_object(
        'id', selected_text.id,
        'title', selected_text.title,
        'content', selected_text.content,
        'difficulty', selected_text.difficulty
      )
    );
  end if;

  return jsonb_build_object('ready', p_ready, 'started', false);
end;
$$;

revoke execute on function public.pick_race_text(uuid)
from public, anon, authenticated;

grant execute on function public.start_practice(
  public.practice_mode,
  public.text_difficulty,
  uuid
) to authenticated;
grant execute on function public.start_race(uuid) to authenticated;
grant execute on function public.set_race_ready(uuid, boolean) to authenticated;

commit;
