begin;

create or replace function public.create_race_room(
  p_name text,
  p_visibility public.room_visibility,
  p_max_players integer,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns public.race_rooms language plpgsql security definer set search_path = '' as $$
declare new_room public.race_rooms; candidate text; attempts integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_name)) not between 3 and 60 or p_max_players not between 2 and 8 then raise exception 'invalid room settings'; end if;
  if exists(
    select 1 from public.race_participants rp join public.race_rooms rr on rr.id = rp.race_room_id
    where rp.user_id = auth.uid() and rp.race_status not in ('left', 'kicked', 'finished', 'dnf')
      and rr.status in ('waiting', 'countdown', 'racing')
  ) then raise exception 'already in an active room'; end if;

  update public.race_rooms set status = 'cancelled', finished_at = now()
  where status = 'waiting' and expires_at < now();
  loop
    attempts := attempts + 1;
    candidate := public.generate_room_code();
    exit when not exists(select 1 from public.race_rooms where code = candidate);
    if attempts > 20 then raise exception 'could not generate room code'; end if;
  end loop;
  insert into public.race_rooms(code, name, host_id, visibility, max_players, difficulty, category_id)
  values(candidate, trim(p_name), auth.uid(), p_visibility, p_max_players, p_difficulty, p_category_id)
  returning * into new_room;
  insert into public.race_participants(race_room_id, user_id) values(new_room.id, auth.uid());
  return new_room;
end;
$$;

create or replace function public.join_race_room(p_code text)
returns public.race_rooms language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; participant_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into room from public.race_rooms where code = upper(trim(p_code)) for update;
  if room.id is null then raise exception 'room not found'; end if;
  if room.status <> 'waiting' then raise exception 'race already started or finished'; end if;
  if room.expires_at < now() then
    update public.race_rooms set status = 'cancelled', finished_at = now() where id = room.id;
    raise exception 'room expired';
  end if;
  if exists(
    select 1 from public.race_participants rp join public.race_rooms rr on rr.id = rp.race_room_id
    where rp.user_id = auth.uid() and rp.race_room_id <> room.id
      and rp.race_status not in ('left', 'kicked', 'finished', 'dnf') and rr.status in ('waiting', 'countdown', 'racing')
  ) then raise exception 'already in another room'; end if;
  select count(*) into participant_count from public.race_participants
  where race_room_id = room.id and race_status not in ('left', 'kicked');
  if participant_count >= room.max_players then raise exception 'room is full'; end if;
  insert into public.race_participants(race_room_id, user_id)
  values(room.id, auth.uid())
  on conflict (race_room_id, user_id) do update set race_status = 'waiting', connection_status = 'online', is_ready = false, last_seen_at = now();
  return room;
end;
$$;

create or replace function public.set_race_ready(p_room_id uuid, p_ready boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.race_rooms where id = p_room_id and status = 'waiting') then raise exception 'room is not waiting'; end if;
  update public.race_participants set is_ready = p_ready, connection_status = 'online', last_seen_at = now()
  where race_room_id = p_room_id and user_id = auth.uid() and race_status = 'waiting';
  if not found then raise exception 'participant not found'; end if;
  return p_ready;
end;
$$;

create or replace function public.start_race(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; selected_text public.typing_texts; total_players integer; ready_players integer; start_time timestamptz;
begin
  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or room.host_id <> auth.uid() then raise exception 'only the host can start'; end if;
  if room.status <> 'waiting' then raise exception 'room is not waiting'; end if;
  select count(*), count(*) filter(where is_ready) into total_players, ready_players
  from public.race_participants where race_room_id = room.id and race_status = 'waiting';
  if total_players < 2 then raise exception 'at least two players are required'; end if;
  if ready_players <> total_players then raise exception 'all players must be ready'; end if;
  select * into selected_text from public.typing_texts
  where status = 'published'
    and (room.difficulty is null or difficulty = room.difficulty)
    and (room.category_id is null or category_id = room.category_id)
  order by random() limit 1;
  if selected_text.id is null then raise exception 'no published text available'; end if;
  start_time := clock_timestamp() + make_interval(secs => room.countdown_seconds);
  update public.race_rooms set typing_text_id = selected_text.id, status = 'countdown', starts_at = start_time where id = room.id;
  update public.race_participants set race_status = 'racing', progress = 0, current_character = 0,
    correct_characters = 0, incorrect_keystrokes = 0, total_keystrokes = 0, last_sequence = 0
  where race_room_id = room.id and race_status = 'waiting';
  return jsonb_build_object('roomId', room.id, 'startsAt', start_time, 'countdownSeconds', room.countdown_seconds,
    'text', jsonb_build_object('id', selected_text.id, 'title', selected_text.title, 'content', selected_text.content, 'difficulty', selected_text.difficulty));
end;
$$;

create or replace function public.race_progress_snapshot(
  p_room_id uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_sequence integer
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; target_length integer; previous public.race_participants;
begin
  select * into room from public.race_rooms where id = p_room_id;
  if room.id is null or room.status not in ('countdown', 'racing') or room.starts_at is null or room.starts_at > now() then raise exception 'race has not started'; end if;
  select * into previous from public.race_participants where race_room_id = p_room_id and user_id = auth.uid() for update;
  if previous.id is null or previous.race_status <> 'racing' then raise exception 'participant cannot progress'; end if;
  if p_sequence <= previous.last_sequence or p_current_character < previous.current_character then raise exception 'invalid progress sequence'; end if;
  if p_current_character - previous.current_character > 120 then raise exception 'progress jump rejected'; end if;
  select character_count into target_length from public.typing_texts where id = room.typing_text_id;
  update public.race_participants set current_character = least(greatest(p_current_character, 0), target_length),
    correct_characters = least(greatest(p_current_character, 0), target_length),
    incorrect_keystrokes = greatest(p_incorrect_keystrokes, 0), total_keystrokes = greatest(p_total_keystrokes, 0),
    progress = round((least(greatest(p_current_character, 0), target_length)::numeric / target_length * 100), 2),
    last_sequence = p_sequence, last_seen_at = now(), connection_status = 'online'
  where id = previous.id;
  return true;
end;
$$;

create or replace function public.finish_race(
  p_room_id uuid,
  p_nonce uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_client_duration_ms integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; participant public.race_participants; target public.typing_texts; official_ms integer;
  final_wpm numeric; final_accuracy numeric; next_place integer; player_count integer; finished_count integer;
  rating_before integer; expected_score numeric; actual_score numeric; rating_delta integer; rating_after integer;
  reasons text[] := '{}'; is_suspicious boolean := false; xp integer := 15;
begin
  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or room.starts_at is null or room.starts_at > now() or room.status not in ('countdown', 'racing') then raise exception 'race is not active'; end if;
  select * into participant from public.race_participants where race_room_id = room.id and user_id = auth.uid() for update;
  if participant.id is null or participant.finish_nonce <> p_nonce then raise exception 'invalid participant or nonce'; end if;
  if participant.race_status = 'finished' then
    return (select jsonb_build_object('placement', placement, 'wpm', wpm, 'accuracy', accuracy, 'durationMs', duration_ms, 'ratingChange', rating_change, 'duplicate', true) from public.race_results where race_room_id = room.id and user_id = auth.uid());
  end if;
  if participant.race_status <> 'racing' then raise exception 'participant cannot finish'; end if;
  select * into target from public.typing_texts where id = room.typing_text_id;
  official_ms := greatest(1, floor(extract(epoch from (clock_timestamp() - room.starts_at)) * 1000)::integer);
  final_wpm := round(((least(p_current_character, target.character_count) / 5.0) / (official_ms / 60000.0))::numeric, 2);
  final_accuracy := case when p_total_keystrokes <= 0 then 0 else round((greatest(0, p_total_keystrokes - p_incorrect_keystrokes)::numeric / p_total_keystrokes * 100), 2) end;
  if p_current_character <> target.character_count then reasons := array_append(reasons, 'incomplete_text'); end if;
  if p_total_keystrokes < p_current_character or p_incorrect_keystrokes > p_total_keystrokes then reasons := array_append(reasons, 'inconsistent_keystrokes'); end if;
  if official_ms < 3000 or final_wpm > 220 then reasons := array_append(reasons, 'implausible_speed'); end if;
  if abs(official_ms - greatest(p_client_duration_ms, 1)) > greatest(5000, official_ms * 0.25) then reasons := array_append(reasons, 'duration_mismatch'); end if;
  is_suspicious := array_length(reasons, 1) is not null;
  select count(*) + 1 into next_place from public.race_results where race_room_id = room.id;
  select count(*) into player_count from public.race_participants where race_room_id = room.id and race_status not in ('left', 'kicked');
  select rating into rating_before from public.profiles where id = auth.uid() for update;
  select coalesce(avg(1.0 / (1.0 + power(10.0, (op.rating - rating_before) / 400.0))), 0.5)
    into expected_score
  from public.race_participants rp join public.profiles op on op.id = rp.user_id
  where rp.race_room_id = room.id and rp.user_id <> auth.uid() and rp.race_status not in ('left', 'kicked');
  actual_score := case when player_count <= 1 then 0.5 else (player_count - next_place)::numeric / (player_count - 1) end;
  rating_delta := case when is_suspicious then 0 else greatest(-40, least(40, round(24 * (actual_score - expected_score))::integer)) end;
  rating_after := rating_before + rating_delta;
  if next_place = 1 then xp := xp + 15; end if;
  if is_suspicious then xp := 0; end if;

  insert into public.race_results(race_room_id, user_id, typing_text_id, placement, duration_ms,
    correct_characters, incorrect_keystrokes, total_keystrokes, wpm, accuracy, rating_before, rating_after,
    rating_change, suspicious, suspicious_reason)
  values(room.id, auth.uid(), target.id, next_place, official_ms, least(p_current_character, target.character_count),
    greatest(p_incorrect_keystrokes, 0), greatest(p_total_keystrokes, 0), final_wpm, final_accuracy,
    rating_before, rating_after, rating_delta, is_suspicious, nullif(array_to_string(reasons, ','), ''));
  update public.race_participants set race_status = 'finished', progress = 100, current_character = target.character_count,
    correct_characters = target.character_count, incorrect_keystrokes = greatest(p_incorrect_keystrokes, 0),
    total_keystrokes = greatest(p_total_keystrokes, 0), wpm = final_wpm, accuracy = final_accuracy,
    placement = next_place, finished_at = now(), last_seen_at = now() where id = participant.id;
  update public.profiles set rating = rating_after, total_races = total_races + 1,
    total_wins = total_wins + case when next_place = 1 and not is_suspicious then 1 else 0 end,
    experience = experience + xp, level = public.level_from_experience(experience + xp),
    last_played_at = now() where id = auth.uid();
  perform public.evaluate_achievements(auth.uid());
  select count(*) into finished_count from public.race_participants
  where race_room_id = room.id and race_status in ('finished', 'left', 'kicked', 'dnf');
  if not exists(select 1 from public.race_participants where race_room_id = room.id and race_status = 'racing') then
    update public.race_rooms set status = 'finished', finished_at = now() where id = room.id;
  end if;
  return jsonb_build_object('placement', next_place, 'wpm', final_wpm, 'accuracy', final_accuracy,
    'durationMs', official_ms, 'ratingChange', rating_delta, 'suspicious', is_suspicious,
    'suspiciousReason', nullif(array_to_string(reasons, ','), ''), 'experienceGained', xp);
end;
$$;

create or replace function public.leave_race_room(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare room public.race_rooms; next_host uuid;
begin
  select * into room from public.race_rooms where id = p_room_id for update;
  if room.id is null or not exists(select 1 from public.race_participants where race_room_id = room.id and user_id = auth.uid()) then raise exception 'room not found'; end if;
  update public.race_participants set race_status = 'left', connection_status = 'left', is_ready = false, last_seen_at = now()
  where race_room_id = room.id and user_id = auth.uid();
  if room.host_id = auth.uid() and room.status = 'waiting' then
    select user_id into next_host from public.race_participants
    where race_room_id = room.id and race_status = 'waiting' order by joined_at limit 1;
    if next_host is null then update public.race_rooms set status = 'cancelled', finished_at = now() where id = room.id;
    else update public.race_rooms set host_id = next_host where id = room.id; end if;
  end if;
  return jsonb_build_object('hostId', next_host, 'cancelled', next_host is null and room.host_id = auth.uid());
end;
$$;

create or replace function public.kick_race_participant(p_room_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.race_rooms where id = p_room_id and host_id = auth.uid() and status = 'waiting') then raise exception 'only the waiting-room host can kick'; end if;
  if p_user_id = auth.uid() then raise exception 'host cannot kick self'; end if;
  update public.race_participants set race_status = 'kicked', connection_status = 'left', is_ready = false
  where race_room_id = p_room_id and user_id = p_user_id and race_status = 'waiting';
  return found;
end;
$$;

create or replace function public.cancel_race_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.race_rooms set status = 'cancelled', finished_at = now()
  where id = p_room_id and host_id = auth.uid() and status in ('waiting', 'countdown');
  if not found then raise exception 'room cannot be cancelled'; end if;
  return true;
end;
$$;

create or replace function public.join_matchmaking()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare own_rating integer; candidate record; new_room public.race_rooms; code_value text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  delete from public.matchmaking_queue where queued_at < now() - interval '15 minutes';
  select rating into own_rating from public.profiles where id = auth.uid();
  insert into public.matchmaking_queue(user_id, rating, status, queued_at)
  values(auth.uid(), own_rating, 'waiting', now())
  on conflict(user_id) do update set rating = excluded.rating, status = 'waiting', queued_at = now(), matched_room_id = null;
  select q.* into candidate from public.matchmaking_queue q
  where q.user_id <> auth.uid() and q.status = 'waiting'
    and abs(q.rating - own_rating) <= 150 + least(450, extract(epoch from (now() - q.queued_at))::integer / 2)
  order by abs(q.rating - own_rating), q.queued_at for update skip locked limit 1;
  if candidate.id is null then return jsonb_build_object('status', 'waiting'); end if;
  loop code_value := public.generate_room_code(); exit when not exists(select 1 from public.race_rooms where code = code_value); end loop;
  insert into public.race_rooms(code, name, host_id, visibility, max_players, expires_at)
  values(code_value, 'Quick Race', candidate.user_id, 'public', 4, now() + interval '30 minutes') returning * into new_room;
  insert into public.race_participants(race_room_id, user_id) values(new_room.id, candidate.user_id), (new_room.id, auth.uid());
  update public.matchmaking_queue set status = 'matched', matched_room_id = new_room.id
  where user_id in (candidate.user_id, auth.uid());
  return jsonb_build_object('status', 'matched', 'roomId', new_room.id, 'code', new_room.code);
end;
$$;

create or replace function public.leave_matchmaking()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.matchmaking_queue where user_id = auth.uid() and status = 'waiting';
  return found;
end;
$$;

create or replace view public.public_profiles with (security_invoker = true) as
select id, username, display_name, bio, avatar_seed, level, rating, best_wpm, average_wpm,
  average_accuracy, total_practices, total_races, total_wins, current_streak, longest_streak, created_at
from public.profiles;

create or replace view public.leaderboard_wpm with (security_invoker = true) as
select distinct on (s.user_id) s.user_id, p.username, p.display_name, s.wpm, s.accuracy, s.finished_at
from public.practice_sessions s join public.profiles p on p.id = s.user_id
where s.user_id is not null and s.status = 'finished' and s.completed and not s.suspicious and s.accuracy >= 90
order by s.user_id, s.wpm desc, s.finished_at asc;

create or replace view public.leaderboard_rating with (security_invoker = true) as
select id as user_id, username, display_name, rating, total_wins from public.profiles order by rating desc;

create or replace view public.leaderboard_daily with (security_invoker = true) as
select d.challenge_date, r.user_id, p.username, p.display_name, r.wpm, r.accuracy, r.created_at
from public.user_daily_results r join public.daily_challenges d on d.id = r.daily_challenge_id
join public.profiles p on p.id = r.user_id;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.text_categories enable row level security;
alter table public.typing_texts enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.race_rooms enable row level security;
alter table public.race_participants enable row level security;
alter table public.race_results enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.user_daily_results enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.rate_limits enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy preferences_self_all on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categories_public_read on public.text_categories for select using (true);
create policy categories_admin_all on public.text_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy texts_published_read on public.typing_texts for select using (status = 'published' or public.is_admin());
create policy texts_admin_all on public.typing_texts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sessions_self_read on public.practice_sessions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy rooms_participant_read on public.race_rooms for select to authenticated using (
  visibility = 'public' or host_id = auth.uid() or exists(select 1 from public.race_participants where race_room_id = race_rooms.id and user_id = auth.uid()) or public.is_admin()
);
create policy participants_member_read on public.race_participants for select to authenticated using (
  exists(select 1 from public.race_participants own where own.race_room_id = race_participants.race_room_id and own.user_id = auth.uid()) or public.is_admin()
);
create policy results_read on public.race_results for select using (true);
create policy queue_self_read on public.matchmaking_queue for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy achievements_public_read on public.achievements for select using (true);
create policy user_achievements_public_read on public.user_achievements for select using (true);
create policy daily_challenges_public_read on public.daily_challenges for select using (true);
create policy daily_results_public_read on public.user_daily_results for select using (true);
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using (public.is_admin());

revoke all on public.rate_limits from anon, authenticated;
revoke insert, update, delete on public.practice_sessions, public.race_rooms, public.race_participants,
  public.race_results, public.matchmaking_queue, public.user_achievements, public.daily_challenges,
  public.user_daily_results, public.admin_audit_logs from anon, authenticated;

grant select on public.public_profiles, public.leaderboard_wpm, public.leaderboard_rating, public.leaderboard_daily to anon, authenticated;
grant execute on function public.start_practice(public.practice_mode, public.text_difficulty, uuid) to authenticated;
grant execute on function public.finish_practice(uuid, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.create_race_room(text, public.room_visibility, integer, public.text_difficulty, uuid) to authenticated;
grant execute on function public.join_race_room(text) to authenticated;
grant execute on function public.set_race_ready(uuid, boolean) to authenticated;
grant execute on function public.start_race(uuid) to authenticated;
grant execute on function public.race_progress_snapshot(uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.finish_race(uuid, uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.leave_race_room(uuid) to authenticated;
grant execute on function public.kick_race_participant(uuid, uuid) to authenticated;
grant execute on function public.cancel_race_room(uuid) to authenticated;
grant execute on function public.join_matchmaking() to authenticated;
grant execute on function public.leave_matchmaking() to authenticated;
revoke execute on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;

-- Private Supabase Realtime channels. These policies authorize Broadcast and Presence
-- only for authenticated participants of the room encoded in topic race:<room_uuid>.
create policy race_realtime_read on realtime.messages for select to authenticated using (
  realtime.topic() ~ '^race:[0-9a-f-]{36}$' and exists(
    select 1 from public.race_participants rp
    where rp.race_room_id = substring(realtime.topic() from 6)::uuid and rp.user_id = auth.uid()
      and rp.race_status not in ('kicked', 'left')
  )
);
create policy race_realtime_write on realtime.messages for insert to authenticated with check (
  realtime.topic() ~ '^race:[0-9a-f-]{36}$' and exists(
    select 1 from public.race_participants rp
    where rp.race_room_id = substring(realtime.topic() from 6)::uuid and rp.user_id = auth.uid()
      and rp.race_status not in ('kicked', 'left')
  )
);

commit;
