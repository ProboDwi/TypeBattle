begin;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and auth.uid() = old.id and not public.is_admin(auth.uid()) then
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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.count_typing_text() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.get_or_create_daily_challenge(date) from public, anon;
grant execute on function public.get_or_create_daily_challenge(date) to authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.cleanup_stale_game_state() to service_role;

revoke execute on function public.start_practice(public.practice_mode, public.text_difficulty, uuid) from public, anon;
revoke execute on function public.finish_practice(uuid, integer, integer, integer, integer, integer) from public, anon;
revoke execute on function public.create_race_room(text, public.room_visibility, integer, public.text_difficulty, uuid) from public, anon;
revoke execute on function public.join_race_room(text) from public, anon;
revoke execute on function public.set_race_ready(uuid, boolean) from public, anon;
revoke execute on function public.start_race(uuid) from public, anon;
revoke execute on function public.race_progress_snapshot(uuid, integer, integer, integer, integer) from public, anon;
revoke execute on function public.finish_race(uuid, uuid, integer, integer, integer, integer) from public, anon;
revoke execute on function public.leave_race_room(uuid) from public, anon;
revoke execute on function public.kick_race_participant(uuid, uuid) from public, anon;
revoke execute on function public.cancel_race_room(uuid) from public, anon;
revoke execute on function public.update_race_room_settings(uuid, text, public.room_visibility, integer, public.text_difficulty, uuid) from public, anon;
revoke execute on function public.join_matchmaking() from public, anon;
revoke execute on function public.leave_matchmaking() from public, anon;

commit;
