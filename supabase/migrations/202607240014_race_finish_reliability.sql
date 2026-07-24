begin;

-- Keep trusted SECURITY DEFINER result functions able to update computed
-- profile totals, even when an older project missed the reliability patch.
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

-- Persist each player's result when they finish, but keep the room active
-- until all racers finish, leave, or become inactive after a generous limit.
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
    select * into target
    from public.typing_texts
    where id = room.typing_text_id;

    timeout_seconds := least(
      1800,
      greatest(600, coalesce(target.estimated_seconds, 60) * 8)
    );
    deadline_at := room.starts_at + make_interval(secs => timeout_seconds);

    if room.status in ('countdown', 'racing')
      and deadline_at <= clock_timestamp()
    then
      update public.race_participants
      set race_status = 'dnf',
        connection_status = 'offline',
        finished_at = now(),
        last_seen_at = now()
      where race_room_id = room.id
        and race_status = 'racing'
        and coalesce(last_progress_at, room.starts_at)
          <= clock_timestamp() - interval '2 minutes';

      if not exists (
        select 1
        from public.race_participants
        where race_room_id = room.id and race_status = 'racing'
      ) then
        update public.race_rooms
        set status = 'finished', finished_at = now()
        where id = room.id;
        room.status := 'finished';
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'status', room.status,
    'startsAt', room.starts_at,
    'deadlineAt', deadline_at
  );
end;
$$;

create or replace function public.cleanup_stale_game_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_count integer;
  finished_count integer;
begin
  update public.race_rooms
  set status = 'cancelled', finished_at = now()
  where status = 'waiting' and expires_at < now();
  get diagnostics cancelled_count = row_count;

  update public.race_participants rp
  set race_status = 'dnf',
    connection_status = 'offline',
    finished_at = now(),
    last_seen_at = now()
  from public.race_rooms rr
  join public.typing_texts t on t.id = rr.typing_text_id
  where rp.race_room_id = rr.id
    and rp.race_status = 'racing'
    and rr.status in ('countdown', 'racing')
    and rr.starts_at + make_interval(
      secs => least(1800, greatest(600, coalesce(t.estimated_seconds, 60) * 8))
    ) <= clock_timestamp()
    and coalesce(rp.last_progress_at, rr.starts_at)
      <= clock_timestamp() - interval '2 minutes';

  update public.race_rooms rr
  set status = 'finished', finished_at = now()
  where rr.status in ('countdown', 'racing')
    and not exists (
      select 1
      from public.race_participants rp
      where rp.race_room_id = rr.id and rp.race_status = 'racing'
    );
  get diagnostics finished_count = row_count;

  delete from public.matchmaking_queue
  where queued_at < now() - interval '15 minutes';
  delete from public.rate_limits
  where occurred_at < now() - interval '1 day';

  return jsonb_build_object(
    'cancelledRooms', cancelled_count,
    'finishedRooms', finished_count
  );
end;
$$;

revoke execute on function public.sync_race_state(uuid)
from public, anon;
grant execute on function public.sync_race_state(uuid)
to authenticated;

revoke execute on function public.cleanup_stale_game_state()
from public, anon, authenticated;
grant execute on function public.cleanup_stale_game_state()
to service_role;

commit;
