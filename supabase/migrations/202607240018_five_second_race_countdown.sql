begin;

alter table public.race_rooms
  alter column countdown_seconds set default 5;

update public.race_rooms
set countdown_seconds = 5
where status = 'waiting'
  and countdown_seconds <> 5;

commit;
