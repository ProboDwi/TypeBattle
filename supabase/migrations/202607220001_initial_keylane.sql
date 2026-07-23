begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.user_role as enum ('player', 'admin');
create type public.text_difficulty as enum ('easy', 'medium', 'hard');
create type public.text_status as enum ('draft', 'published', 'archived');
create type public.practice_mode as enum ('quote', 'timed_30', 'timed_60', 'daily');
create type public.session_status as enum ('started', 'finished', 'abandoned', 'invalid');
create type public.room_visibility as enum ('public', 'private');
create type public.room_status as enum ('waiting', 'countdown', 'racing', 'finished', 'cancelled');
create type public.connection_status as enum ('online', 'offline', 'left');
create type public.participant_race_status as enum ('waiting', 'racing', 'finished', 'dnf', 'left', 'kicked');
create type public.queue_status as enum ('waiting', 'matched', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null check (username::text ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text check (bio is null or char_length(bio) <= 280),
  avatar_seed text not null check (char_length(avatar_seed) between 1 and 64),
  role public.user_role not null default 'player',
  level integer not null default 1 check (level >= 1),
  experience integer not null default 0 check (experience >= 0),
  rating integer not null default 1000 check (rating between 100 and 4000),
  best_wpm numeric(8,2) not null default 0 check (best_wpm >= 0),
  average_wpm numeric(8,2) not null default 0 check (average_wpm >= 0),
  average_accuracy numeric(5,2) not null default 0 check (average_accuracy between 0 and 100),
  total_practices integer not null default 0 check (total_practices >= 0),
  total_races integer not null default 0 check (total_races >= 0),
  total_wins integer not null default 0 check (total_wins between 0 and total_races),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sound_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  game_theme text not null default 'system' check (game_theme in ('system', 'light', 'dark')),
  updated_at timestamptz not null default now()
);

create table public.text_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (char_length(name) between 2 and 50),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.typing_texts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.text_categories(id),
  title text not null check (char_length(title) between 3 and 100),
  content text not null check (char_length(content) between 120 and 450),
  language text not null default 'id' check (language ~ '^[a-z]{2}$'),
  difficulty public.text_difficulty not null,
  status public.text_status not null default 'draft',
  character_count integer not null default 0 check (character_count >= 0),
  word_count integer not null default 0 check (word_count >= 0),
  estimated_seconds integer check (estimated_seconds is null or estimated_seconds > 0),
  source_label text check (source_label is null or char_length(source_label) <= 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  typing_text_id uuid not null references public.typing_texts(id),
  mode public.practice_mode not null,
  status public.session_status not null default 'started',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms > 0),
  correct_characters integer not null default 0 check (correct_characters >= 0),
  incorrect_keystrokes integer not null default 0 check (incorrect_keystrokes >= 0),
  total_keystrokes integer not null default 0 check (total_keystrokes >= 0),
  wpm numeric(8,2) check (wpm is null or wpm >= 0),
  accuracy numeric(5,2) check (accuracy is null or accuracy between 0 and 100),
  completed boolean not null default false,
  suspicious boolean not null default false,
  suspicious_reason text,
  focus_losses integer not null default 0 check (focus_losses >= 0),
  created_at timestamptz not null default now()
);

create table public.race_rooms (
  id uuid primary key default gen_random_uuid(),
  code varchar(8) unique not null check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name text not null check (char_length(name) between 3 and 60),
  host_id uuid not null references public.profiles(id),
  typing_text_id uuid references public.typing_texts(id),
  visibility public.room_visibility not null default 'private',
  status public.room_status not null default 'waiting',
  max_players integer not null default 5 check (max_players between 2 and 8),
  countdown_seconds integer not null default 3 check (countdown_seconds between 3 and 10),
  difficulty public.text_difficulty,
  category_id uuid references public.text_categories(id),
  starts_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.race_participants (
  id uuid primary key default gen_random_uuid(),
  race_room_id uuid not null references public.race_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  is_ready boolean not null default false,
  connection_status public.connection_status not null default 'online',
  race_status public.participant_race_status not null default 'waiting',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  current_character integer not null default 0 check (current_character >= 0),
  correct_characters integer not null default 0 check (correct_characters >= 0),
  incorrect_keystrokes integer not null default 0 check (incorrect_keystrokes >= 0),
  total_keystrokes integer not null default 0 check (total_keystrokes >= 0),
  wpm numeric(8,2) check (wpm is null or wpm >= 0),
  accuracy numeric(5,2) check (accuracy is null or accuracy between 0 and 100),
  placement integer check (placement is null or placement between 1 and 8),
  last_sequence integer not null default 0 check (last_sequence >= 0),
  finish_nonce uuid not null default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  finished_at timestamptz,
  last_seen_at timestamptz default now(),
  unique (race_room_id, user_id),
  unique (race_room_id, placement)
);

create table public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_room_id uuid not null references public.race_rooms(id),
  user_id uuid not null references public.profiles(id),
  typing_text_id uuid not null references public.typing_texts(id),
  placement integer not null check (placement between 1 and 8),
  duration_ms integer not null check (duration_ms > 0),
  correct_characters integer not null check (correct_characters >= 0),
  incorrect_keystrokes integer not null check (incorrect_keystrokes >= 0),
  total_keystrokes integer not null check (total_keystrokes >= 0),
  wpm numeric(8,2) not null check (wpm >= 0),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  rating_before integer not null,
  rating_after integer not null,
  rating_change integer not null check (rating_change between -40 and 40),
  suspicious boolean not null default false,
  suspicious_reason text,
  created_at timestamptz not null default now(),
  unique (race_room_id, user_id),
  unique (race_room_id, placement)
);

create table public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 100 and 4000),
  status public.queue_status not null default 'waiting',
  queued_at timestamptz not null default now(),
  matched_room_id uuid references public.race_rooms(id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null,
  icon_name text not null,
  requirement_type text not null,
  requirement_value integer not null check (requirement_value >= 0),
  experience_reward integer not null default 0 check (experience_reward >= 0),
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  obtained_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date unique not null,
  typing_text_id uuid not null references public.typing_texts(id),
  created_at timestamptz not null default now()
);

create table public.user_daily_results (
  id uuid primary key default gen_random_uuid(),
  daily_challenge_id uuid not null references public.daily_challenges(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  practice_session_id uuid not null references public.practice_sessions(id),
  wpm numeric(8,2) not null check (wpm >= 0),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  created_at timestamptz not null default now(),
  unique (daily_challenge_id, user_id)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  id bigint generated always as identity primary key,
  rate_key text not null,
  action text not null,
  occurred_at timestamptz not null default now()
);

create index profiles_rating_idx on public.profiles (rating desc);
create index profiles_username_idx on public.profiles (username);
create index profiles_created_at_idx on public.profiles (created_at desc);
create index typing_texts_category_status_idx on public.typing_texts (category_id, status, difficulty);
create index typing_texts_created_at_idx on public.typing_texts (created_at desc);
create index practice_sessions_user_created_idx on public.practice_sessions (user_id, created_at desc);
create index practice_sessions_status_wpm_idx on public.practice_sessions (status, suspicious, wpm desc);
create index race_rooms_code_idx on public.race_rooms (code);
create index race_rooms_status_created_idx on public.race_rooms (status, created_at desc);
create index race_participants_room_idx on public.race_participants (race_room_id, joined_at);
create index race_participants_user_idx on public.race_participants (user_id, joined_at desc);
create index race_results_user_created_idx on public.race_results (user_id, created_at desc);
create index race_results_wpm_idx on public.race_results (suspicious, wpm desc);
create index matchmaking_waiting_idx on public.matchmaking_queue (status, rating, queued_at);
create index user_achievements_user_idx on public.user_achievements (user_id, obtained_at desc);
create index daily_results_challenge_wpm_idx on public.user_daily_results (daily_challenge_id, wpm desc);
create index audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index rate_limits_lookup_idx on public.rate_limits (rate_key, action, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger preferences_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.text_categories
for each row execute function public.set_updated_at();
create trigger texts_updated_at before update on public.typing_texts
for each row execute function public.set_updated_at();
create trigger rooms_updated_at before update on public.race_rooms
for each row execute function public.set_updated_at();

create or replace function public.count_typing_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.content = regexp_replace(trim(new.content), '\s+', ' ', 'g');
  new.character_count = char_length(new.content);
  new.word_count = array_length(regexp_split_to_array(new.content, '\s+'), 1);
  new.estimated_seconds = greatest(15, ceil(new.word_count / 40.0 * 60)::integer);
  return new;
end;
$$;

create trigger count_typing_text before insert or update of content on public.typing_texts
for each row execute function public.count_typing_text();

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = check_user and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_username text;
  safe_username text;
  requested_display_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player'));
  safe_username := regexp_replace(requested_username, '[^a-z0-9_]', '_', 'g');
  safe_username := left(safe_username, 20);
  if char_length(safe_username) < 3 then safe_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8); end if;
  if exists(select 1 from public.profiles where username = safe_username) then
    safe_username := left(safe_username, 11) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  requested_display_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', safe_username)), 50);

  insert into public.profiles (id, username, display_name, avatar_seed)
  values (new.id, safe_username, coalesce(nullif(requested_display_name, ''), safe_username), new.id::text);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) then
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
      or new.last_played_at is distinct from old.last_played_at then
      raise exception 'protected profile fields cannot be updated directly';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.level_from_experience(value integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor(sqrt(greatest(value, 0) / 100.0))::integer + 1);
$$;

create or replace function public.consume_rate_limit(
  p_key text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare recent_count integer;
begin
  delete from public.rate_limits where occurred_at < now() - interval '1 day';
  select count(*) into recent_count from public.rate_limits
  where rate_key = p_key and action = p_action
    and occurred_at >= now() - make_interval(secs => p_window_seconds);
  if recent_count >= p_limit then return false; end if;
  insert into public.rate_limits(rate_key, action) values (p_key, p_action);
  return true;
end;
$$;

create or replace function public.generate_room_code()
returns text language plpgsql volatile set search_path = '' as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; result text := ''; i integer;
begin
  for i in 1..6 loop result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1); end loop;
  return result;
end;
$$;

create or replace function public.get_or_create_daily_challenge(p_date date default (now() at time zone 'Asia/Jakarta')::date)
returns public.daily_challenges language plpgsql security definer set search_path = '' as $$
declare result public.daily_challenges;
begin
  select * into result from public.daily_challenges where challenge_date = p_date;
  if found then return result; end if;
  insert into public.daily_challenges(challenge_date, typing_text_id)
  select p_date, id from public.typing_texts
  where status = 'published'
  order by md5(id::text || p_date::text)
  limit 1
  on conflict (challenge_date) do nothing;
  select * into result from public.daily_challenges where challenge_date = p_date;
  return result;
end;
$$;

create or replace function public.evaluate_achievements(p_user uuid)
returns table(code text, name text) language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_achievements(user_id, achievement_id)
  select p_user, a.id from public.achievements a
  join public.profiles p on p.id = p_user
  where not exists(select 1 from public.user_achievements ua where ua.user_id = p_user and ua.achievement_id = a.id)
    and case a.requirement_type
      when 'practices' then p.total_practices >= a.requirement_value
      when 'races' then p.total_races >= a.requirement_value
      when 'wins' then p.total_wins >= a.requirement_value
      when 'best_wpm' then p.best_wpm >= a.requirement_value
      when 'streak' then p.current_streak >= a.requirement_value
      when 'perfect_accuracy' then exists(select 1 from public.practice_sessions s where s.user_id = p_user and s.completed and s.accuracy = 100 and not s.suspicious)
      else false end
  on conflict do nothing;

  update public.profiles p set experience = p.experience + rewards.total_reward,
    level = public.level_from_experience(p.experience + rewards.total_reward)
  from (
    select coalesce(sum(a.experience_reward), 0)::integer total_reward
    from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p_user and ua.obtained_at >= statement_timestamp() - interval '2 seconds'
  ) rewards where p.id = p_user and rewards.total_reward > 0;

  return query select a.code, a.name from public.user_achievements ua
  join public.achievements a on a.id = ua.achievement_id
  where ua.user_id = p_user and ua.obtained_at >= statement_timestamp() - interval '2 seconds';
end;
$$;

create or replace function public.start_practice(
  p_mode public.practice_mode,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns table(session_id uuid, text_id uuid, title text, content text, difficulty public.text_difficulty, category_name text, started_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare selected_text public.typing_texts; challenge public.daily_challenges; new_session public.practice_sessions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_mode = 'daily' then
    challenge := public.get_or_create_daily_challenge();
    select * into selected_text from public.typing_texts where id = challenge.typing_text_id;
  else
    select * into selected_text from public.typing_texts
    where status = 'published'
      and (p_difficulty is null or typing_texts.difficulty = p_difficulty)
      and (p_category_id is null or category_id = p_category_id)
    order by random() limit 1;
  end if;
  if selected_text.id is null then raise exception 'no published text available'; end if;
  insert into public.practice_sessions(user_id, typing_text_id, mode)
  values(auth.uid(), selected_text.id, p_mode) returning * into new_session;
  return query select new_session.id, selected_text.id, selected_text.title, selected_text.content,
    selected_text.difficulty, c.name, new_session.started_at
    from public.text_categories c where c.id = selected_text.category_id;
end;
$$;

create or replace function public.finish_practice(
  p_session_id uuid,
  p_current_character integer,
  p_incorrect_keystrokes integer,
  p_total_keystrokes integer,
  p_client_duration_ms integer,
  p_focus_losses integer default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.practice_sessions; t public.typing_texts; official_ms integer; final_wpm numeric; final_accuracy numeric;
  is_suspicious boolean := false; is_completed boolean := false; reasons text[] := '{}'; xp integer := 10; is_pb boolean := false; daily public.daily_challenges;
begin
  select * into s from public.practice_sessions where id = p_session_id for update;
  if s.id is null or s.user_id <> auth.uid() then raise exception 'session not found'; end if;
  if s.status <> 'started' then
    if s.status = 'finished' then return jsonb_build_object('id', s.id, 'wpm', s.wpm, 'accuracy', s.accuracy, 'durationMs', s.duration_ms, 'duplicate', true); end if;
    raise exception 'session cannot be finished';
  end if;
  select * into t from public.typing_texts where id = s.typing_text_id;
  if s.started_at > clock_timestamp() then raise exception 'session has not started'; end if;
  official_ms := greatest(1, floor(extract(epoch from (clock_timestamp() - s.started_at)) * 1000)::integer);
  is_completed := p_current_character = t.character_count
    or (s.mode = 'timed_30' and official_ms >= 30000)
    or (s.mode = 'timed_60' and official_ms >= 60000);
  final_wpm := round(((least(p_current_character, t.character_count) / 5.0) / (official_ms / 60000.0))::numeric, 2);
  final_accuracy := case when p_total_keystrokes <= 0 then 0 else round((greatest(0, p_total_keystrokes - p_incorrect_keystrokes)::numeric / p_total_keystrokes * 100), 2) end;
  if p_current_character <> t.character_count and s.mode in ('quote', 'daily') then reasons := array_append(reasons, 'incomplete_text'); end if;
  if p_total_keystrokes < p_current_character or p_incorrect_keystrokes > p_total_keystrokes then reasons := array_append(reasons, 'inconsistent_keystrokes'); end if;
  if official_ms < 3000 or final_wpm > 220 then reasons := array_append(reasons, 'implausible_speed'); end if;
  if abs(official_ms - greatest(p_client_duration_ms, 1)) > greatest(5000, official_ms * 0.25) then reasons := array_append(reasons, 'duration_mismatch'); end if;
  if p_focus_losses > 12 then reasons := array_append(reasons, 'excessive_focus_loss'); end if;
  is_suspicious := array_length(reasons, 1) is not null;
  if final_accuracy >= 95 then xp := xp + 5; end if;
  if s.mode = 'daily' then xp := xp + 10; end if;

  update public.practice_sessions set status = case when is_suspicious then 'invalid' else 'finished' end,
    finished_at = now(), duration_ms = official_ms, correct_characters = least(p_current_character, t.character_count),
    incorrect_keystrokes = greatest(p_incorrect_keystrokes, 0), total_keystrokes = greatest(p_total_keystrokes, 0),
    wpm = final_wpm, accuracy = final_accuracy, completed = is_completed,
    suspicious = is_suspicious, suspicious_reason = nullif(array_to_string(reasons, ','), ''), focus_losses = greatest(p_focus_losses, 0)
  where id = s.id;

  if not is_suspicious and is_completed then
    update public.profiles p set
      best_wpm = greatest(p.best_wpm, final_wpm),
      average_wpm = round(((p.average_wpm * p.total_practices + final_wpm) / (p.total_practices + 1))::numeric, 2),
      average_accuracy = round(((p.average_accuracy * p.total_practices + final_accuracy) / (p.total_practices + 1))::numeric, 2),
      total_practices = p.total_practices + 1,
      experience = p.experience + xp,
      level = public.level_from_experience(p.experience + xp),
      current_streak = case when p.last_played_at is null then 1 when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date then p.current_streak when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date - 1 then p.current_streak + 1 else 1 end,
      longest_streak = greatest(p.longest_streak, case when p.last_played_at is null then 1 when (p.last_played_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date - 1 then p.current_streak + 1 else p.current_streak end),
      last_played_at = now()
    where p.id = auth.uid()
    returning best_wpm = final_wpm into is_pb;
    if s.mode = 'daily' then
      daily := public.get_or_create_daily_challenge();
      insert into public.user_daily_results(daily_challenge_id, user_id, practice_session_id, wpm, accuracy)
      values(daily.id, auth.uid(), s.id, final_wpm, final_accuracy) on conflict do nothing;
    end if;
    perform public.evaluate_achievements(auth.uid());
  end if;
  return jsonb_build_object('id', s.id, 'wpm', final_wpm, 'accuracy', final_accuracy, 'durationMs', official_ms,
    'errors', greatest(p_incorrect_keystrokes, 0), 'suspicious', is_suspicious, 'suspiciousReason', nullif(array_to_string(reasons, ','), ''),
    'experienceGained', case when is_suspicious then 0 else xp end, 'personalBest', is_pb);
end;
$$;

commit;
