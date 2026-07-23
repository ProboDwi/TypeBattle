begin;

create or replace function public.get_active_race_room()
returns table (
  room_id uuid,
  code varchar(8),
  name text,
  status public.room_status,
  visibility public.room_visibility,
  is_host boolean,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return query
  select
    rr.id,
    rr.code,
    rr.name,
    rr.status,
    rr.visibility,
    rr.host_id = auth.uid(),
    rr.expires_at,
    rr.created_at
  from public.race_participants rp
  join public.race_rooms rr on rr.id = rp.race_room_id
  where rp.user_id = auth.uid()
    and rp.race_status not in ('left', 'kicked', 'finished', 'dnf')
    and rr.status in ('waiting', 'countdown', 'racing')
    and (rr.status <> 'waiting' or rr.expires_at >= now())
  order by rr.created_at desc
  limit 1;
end;
$$;

create or replace function public.create_race_room(
  p_name text,
  p_visibility public.room_visibility,
  p_max_players integer,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns public.race_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_room public.race_rooms;
  candidate text;
  attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(p_name)) not between 3 and 60
    or p_max_players not between 2 and 8
  then
    raise exception 'invalid room settings';
  end if;

  -- Serialize room creation for this user so retries cannot create two rooms.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(auth.uid()::text, 0)
  );

  -- Expired waiting rooms must not block the active-room check.
  update public.race_rooms
  set status = 'cancelled', finished_at = now()
  where status = 'waiting' and expires_at < now();

  if exists(
    select 1
    from public.race_participants rp
    join public.race_rooms rr on rr.id = rp.race_room_id
    where rp.user_id = auth.uid()
      and rp.race_status not in ('left', 'kicked', 'finished', 'dnf')
      and rr.status in ('waiting', 'countdown', 'racing')
  ) then
    raise exception 'already in an active room';
  end if;

  loop
    attempts := attempts + 1;
    candidate := public.generate_room_code();
    exit when not exists(
      select 1 from public.race_rooms where code = candidate
    );
    if attempts > 20 then
      raise exception 'could not generate room code';
    end if;
  end loop;

  insert into public.race_rooms(
    code,
    name,
    host_id,
    visibility,
    max_players,
    difficulty,
    category_id
  )
  values(
    candidate,
    trim(p_name),
    auth.uid(),
    p_visibility,
    p_max_players,
    p_difficulty,
    p_category_id
  )
  returning * into new_room;

  insert into public.race_participants(race_room_id, user_id)
  values(new_room.id, auth.uid());

  return new_room;
end;
$$;

revoke all on function public.get_active_race_room() from public, anon;
grant execute on function public.get_active_race_room() to authenticated;

commit;
