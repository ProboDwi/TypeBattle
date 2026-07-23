begin;

create or replace function public.finish_practice(
  p_session_id uuid,
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
  s public.practice_sessions;
  t public.typing_texts;
  official_ms integer;
  final_wpm numeric;
  final_accuracy numeric;
  is_suspicious boolean := false;
  is_completed boolean := false;
  reasons text[] := '{}'::text[];
  integrity_event text;
  xp integer := 10;
  previous_best numeric;
  previous_average numeric;
  previous_experience integer;
  final_experience integer;
  is_pb boolean := false;
  daily public.daily_challenges;
  earned jsonb := '[]'::jsonb;
begin
  select * into s
  from public.practice_sessions
  where id = p_session_id
  for update;

  if s.id is null or s.user_id <> auth.uid() then
    raise exception 'session not found';
  end if;

  if s.status <> 'started' then
    if s.status in ('finished', 'invalid') then
      return jsonb_build_object(
        'id', s.id,
        'wpm', s.wpm,
        'accuracy', s.accuracy,
        'durationMs', s.duration_ms,
        'suspicious', s.suspicious,
        'duplicate', true,
        'newAchievements', '[]'::jsonb,
        'experienceGained', 0
      );
    end if;
    raise exception 'session cannot be finished';
  end if;

  if p_current_character < 0
    or p_incorrect_keystrokes < 0
    or p_total_keystrokes < 0
    or p_client_duration_ms <= 0
    or p_focus_losses < 0
  then
    raise exception 'invalid result counters';
  end if;

  select * into t
  from public.typing_texts
  where id = s.typing_text_id;

  if s.started_at > clock_timestamp() then
    raise exception 'session has not started';
  end if;

  select best_wpm, average_wpm, experience
  into previous_best, previous_average, previous_experience
  from public.profiles
  where id = auth.uid()
  for update;

  official_ms := greatest(
    1,
    floor(
      extract(epoch from (clock_timestamp() - s.started_at)) * 1000
    )::integer
  );
  is_completed := p_current_character = t.character_count
    or (s.mode = 'timed_30' and official_ms >= 30000)
    or (s.mode = 'timed_60' and official_ms >= 60000);
  final_wpm := round(
    (
      (least(p_current_character, t.character_count) / 5.0)
      / (official_ms / 60000.0)
    )::numeric,
    2
  );
  final_accuracy := case
    when p_total_keystrokes <= 0 then 0
    else round(
      (
        greatest(
          0,
          p_total_keystrokes - p_incorrect_keystrokes
        )::numeric
        / p_total_keystrokes
        * 100
      ),
      2
    )
  end;

  if not is_completed then
    reasons := array_append(reasons, 'incomplete_session');
  end if;
  if p_current_character > t.character_count then
    reasons := array_append(reasons, 'character_overflow');
  end if;
  if p_total_keystrokes < p_current_character
    or p_incorrect_keystrokes > p_total_keystrokes
  then
    reasons := array_append(reasons, 'inconsistent_keystrokes');
  end if;
  if official_ms < 3000 or final_wpm > 220 then
    reasons := array_append(reasons, 'implausible_speed');
  end if;
  if abs(official_ms - p_client_duration_ms)
    > greatest(5000, official_ms * 0.25)
  then
    reasons := array_append(reasons, 'duration_mismatch');
  end if;
  if p_focus_losses > 12 then
    reasons := array_append(reasons, 'excessive_focus_loss');
  end if;

  foreach integrity_event in array coalesce(
    p_integrity_events,
    '{}'::text[]
  )
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
  if final_accuracy >= 95 then
    xp := xp + 5;
  end if;
  if s.mode = 'daily' then
    xp := xp + 10;
  end if;

  update public.practice_sessions
  set status = (
      case when is_suspicious then 'invalid' else 'finished' end
    )::public.session_status,
    finished_at = now(),
    duration_ms = official_ms,
    correct_characters = least(p_current_character, t.character_count),
    incorrect_keystrokes = p_incorrect_keystrokes,
    total_keystrokes = p_total_keystrokes,
    wpm = final_wpm,
    accuracy = final_accuracy,
    completed = is_completed,
    suspicious = is_suspicious,
    suspicious_reason = nullif(array_to_string(reasons, ','), ''),
    focus_losses = p_focus_losses,
    integrity_events = coalesce(p_integrity_events, '{}'::text[])
  where id = s.id;

  if not is_suspicious and is_completed then
    is_pb := final_wpm > previous_best;
    update public.profiles p
    set best_wpm = greatest(p.best_wpm, final_wpm),
      average_wpm = round(
        (
          (p.average_wpm * p.total_practices + final_wpm)
          / (p.total_practices + 1)
        )::numeric,
        2
      ),
      average_accuracy = round(
        (
          (p.average_accuracy * p.total_practices + final_accuracy)
          / (p.total_practices + 1)
        )::numeric,
        2
      ),
      total_practices = p.total_practices + 1,
      experience = p.experience + xp,
      level = public.level_from_experience(p.experience + xp),
      current_streak = case
        when p.last_played_at is null then 1
        when (p.last_played_at at time zone 'Asia/Jakarta')::date
          = (now() at time zone 'Asia/Jakarta')::date
          then p.current_streak
        when (p.last_played_at at time zone 'Asia/Jakarta')::date
          = (now() at time zone 'Asia/Jakarta')::date - 1
          then p.current_streak + 1
        else 1
      end,
      longest_streak = greatest(
        p.longest_streak,
        case
          when p.last_played_at is null then 1
          when (p.last_played_at at time zone 'Asia/Jakarta')::date
            = (now() at time zone 'Asia/Jakarta')::date - 1
            then p.current_streak + 1
          else p.current_streak
        end
      ),
      last_played_at = now()
    where p.id = auth.uid();

    if s.mode = 'daily' then
      daily := public.get_or_create_daily_challenge();
      insert into public.user_daily_results(
        daily_challenge_id,
        user_id,
        practice_session_id,
        wpm,
        accuracy
      )
      values (
        daily.id,
        auth.uid(),
        s.id,
        final_wpm,
        final_accuracy
      )
      on conflict do nothing;
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'code',
          unlocked.code,
          'name',
          unlocked.name
        )
      ),
      '[]'::jsonb
    )
    into earned
    from public.evaluate_achievements(auth.uid()) unlocked;
  end if;

  select experience
  into final_experience
  from public.profiles
  where id = auth.uid();

  return jsonb_build_object(
    'id', s.id,
    'wpm', final_wpm,
    'accuracy', final_accuracy,
    'durationMs', official_ms,
    'errors', p_incorrect_keystrokes,
    'suspicious', is_suspicious,
    'suspiciousReason', nullif(array_to_string(reasons, ','), ''),
    'experienceGained', case
      when is_suspicious or not is_completed then 0
      else greatest(0, final_experience - previous_experience)
    end,
    'personalBest', is_pb,
    'averageDelta', round(
      (final_wpm - previous_average)::numeric,
      2
    ),
    'newAchievements', earned
  );
end;
$$;

revoke execute on function public.finish_practice(
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  text[]
)
from public, anon;

grant execute on function public.finish_practice(
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  text[]
)
to authenticated;

commit;
