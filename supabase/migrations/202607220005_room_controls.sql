begin;

drop function if exists public.set_race_ready(uuid, boolean);
create function public.set_race_ready(p_room_id uuid, p_ready boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; total_players integer; ready_players integer; selected_text public.typing_texts; start_time timestamptz;
begin
  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or room.status <> 'waiting' then raise exception 'room is not waiting'; end if;
  update public.race_participants set is_ready = p_ready, connection_status = 'online', last_seen_at = now()
  where race_room_id = p_room_id and user_id = auth.uid() and race_status = 'waiting';
  if not found then raise exception 'participant not found'; end if;
  select count(*), count(*) filter(where is_ready) into total_players, ready_players
  from public.race_participants where race_room_id = room.id and race_status = 'waiting';
  if room.visibility = 'public' and total_players >= 2 and ready_players = total_players then
    select * into selected_text from public.typing_texts where status = 'published'
      and (room.difficulty is null or difficulty = room.difficulty)
      and (room.category_id is null or category_id = room.category_id)
    order by random() limit 1;
    if selected_text.id is null then raise exception 'no published text available'; end if;
    start_time := clock_timestamp() + make_interval(secs => room.countdown_seconds);
    update public.race_rooms set typing_text_id = selected_text.id, status = 'countdown', starts_at = start_time where id = room.id;
    update public.race_participants set race_status = 'racing', progress = 0, current_character = 0,
      correct_characters = 0, incorrect_keystrokes = 0, total_keystrokes = 0, last_sequence = 0
    where race_room_id = room.id and race_status = 'waiting';
    return jsonb_build_object('ready', p_ready, 'started', true, 'startsAt', start_time,
      'text', jsonb_build_object('id', selected_text.id, 'title', selected_text.title, 'content', selected_text.content, 'difficulty', selected_text.difficulty));
  end if;
  return jsonb_build_object('ready', p_ready, 'started', false);
end;
$$;

create or replace function public.update_race_room_settings(
  p_room_id uuid,
  p_name text,
  p_visibility public.room_visibility,
  p_max_players integer,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns public.race_rooms language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; current_players integer;
begin
  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or room.host_id <> auth.uid() or room.status <> 'waiting' then raise exception 'room cannot be updated'; end if;
  select count(*) into current_players from public.race_participants where race_room_id = room.id and race_status = 'waiting';
  if p_max_players not between greatest(2, current_players) and 8 then raise exception 'max players is below current players'; end if;
  update public.race_rooms set name = trim(p_name), visibility = p_visibility, max_players = p_max_players,
    difficulty = p_difficulty, category_id = p_category_id where id = room.id returning * into room;
  return room;
end;
$$;

create or replace function public.cleanup_stale_game_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cancelled_count integer; finished_count integer;
begin
  update public.race_rooms set status = 'cancelled', finished_at = now()
  where status = 'waiting' and expires_at < now();
  get diagnostics cancelled_count = row_count;
  update public.race_participants rp set race_status = 'dnf', finished_at = now()
  from public.race_rooms rr join public.typing_texts t on t.id = rr.typing_text_id
  where rp.race_room_id = rr.id and rp.race_status = 'racing'
    and rr.status in ('countdown', 'racing') and rr.starts_at + make_interval(secs => least(300, greatest(90, t.estimated_seconds * 3))) < now();
  update public.race_rooms rr set status = 'finished', finished_at = now()
  where rr.status in ('countdown', 'racing') and not exists(
    select 1 from public.race_participants rp where rp.race_room_id = rr.id and rp.race_status = 'racing'
  );
  get diagnostics finished_count = row_count;
  delete from public.matchmaking_queue where queued_at < now() - interval '15 minutes';
  delete from public.rate_limits where occurred_at < now() - interval '1 day';
  return jsonb_build_object('cancelledRooms', cancelled_count, 'finishedRooms', finished_count);
end;
$$;

grant execute on function public.set_race_ready(uuid, boolean) to authenticated;
grant execute on function public.update_race_room_settings(uuid, text, public.room_visibility, integer, public.text_difficulty, uuid) to authenticated;
revoke execute on function public.cleanup_stale_game_state() from public, anon, authenticated;

commit;
