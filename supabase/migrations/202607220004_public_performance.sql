begin;

create or replace view public.public_performance
with (security_barrier = true) as
select s.id, s.user_id, 'practice'::text as kind, s.wpm, s.accuracy, s.created_at
from public.practice_sessions s
where s.completed and s.status = 'finished' and not s.suspicious and s.accuracy >= 90
union all
select r.id, r.user_id, 'race'::text as kind, r.wpm, r.accuracy, r.created_at
from public.race_results r where not r.suspicious;

revoke all on public.public_performance from public;
grant select on public.public_performance to anon, authenticated;

commit;
