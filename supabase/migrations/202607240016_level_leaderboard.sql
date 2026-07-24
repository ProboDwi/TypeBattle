begin;

create or replace view public.leaderboard_level
with (security_barrier = true) as
select
  id as user_id,
  username,
  display_name,
  level,
  experience
from public.profiles
order by level desc, experience desc, created_at asc;

revoke all on public.leaderboard_level from public;
grant select on public.leaderboard_level to anon, authenticated;

commit;
