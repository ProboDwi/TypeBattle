begin;

-- Direct browser updates must not change computed profile statistics. Trusted
-- SECURITY DEFINER game functions run as their owner and remain allowed to
-- persist verified practice/race results.
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

commit;
