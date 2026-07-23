begin;

drop view if exists public.leaderboard_wpm;
create view public.leaderboard_wpm with (security_barrier = true) as
select distinct on (s.user_id) s.user_id, p.username, p.display_name, s.wpm, s.accuracy, s.finished_at
from public.practice_sessions s join public.profiles p on p.id = s.user_id
where s.user_id is not null and s.status = 'finished' and s.completed and not s.suspicious and s.accuracy >= 90
order by s.user_id, s.wpm desc, s.finished_at asc;

create or replace view public.leaderboard_wpm_entries with (security_barrier = true) as
select s.id, s.user_id, p.username, p.display_name, s.wpm, s.accuracy, s.finished_at
from public.practice_sessions s join public.profiles p on p.id = s.user_id
where s.user_id is not null and s.status = 'finished' and s.completed and not s.suspicious and s.accuracy >= 90;

revoke all on public.leaderboard_wpm, public.leaderboard_wpm_entries from public;
grant select on public.leaderboard_wpm, public.leaderboard_wpm_entries to anon, authenticated;

commit;
