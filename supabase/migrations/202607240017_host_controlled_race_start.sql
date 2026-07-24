begin;

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
    last_seen_at = clock_timestamp()
  where race_room_id = p_room_id
    and user_id = auth.uid()
    and race_status = 'waiting';

  if not found then raise exception 'participant not found'; end if;

  -- Readiness only updates lobby state. Starting is always an explicit host
  -- action through public.start_race.
  return jsonb_build_object('ready', p_ready, 'started', false);
end;
$$;

revoke execute on function public.set_race_ready(uuid, boolean)
from public, anon, authenticated;
grant execute on function public.set_race_ready(uuid, boolean)
to authenticated;

commit;
