begin;

create or replace function public.is_room_participant(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.race_participants where race_room_id = p_room_id and user_id = p_user_id and race_status not in ('kicked', 'left'));
$$;

drop policy if exists rooms_participant_read on public.race_rooms;
create policy rooms_participant_read on public.race_rooms for select to authenticated using (
  visibility = 'public' or host_id = auth.uid() or public.is_room_participant(id) or public.is_admin()
);
drop policy if exists participants_member_read on public.race_participants;
create policy participants_member_read on public.race_participants for select to authenticated using (
  public.is_room_participant(race_room_id) or public.is_admin()
);
drop policy if exists race_realtime_read on realtime.messages;
drop policy if exists race_realtime_write on realtime.messages;
create policy race_realtime_read on realtime.messages for select to authenticated using (
  realtime.topic() ~ '^race:[0-9a-f-]{36}$' and public.is_room_participant(substring(realtime.topic() from 6)::uuid)
);
create policy race_realtime_write on realtime.messages for insert to authenticated with check (
  realtime.topic() ~ '^race:[0-9a-f-]{36}$' and public.is_room_participant(substring(realtime.topic() from 6)::uuid)
);

commit;
