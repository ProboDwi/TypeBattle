begin;

create or replace function public.start_practice(
  p_mode public.practice_mode,
  p_difficulty public.text_difficulty default null,
  p_category_id uuid default null
)
returns table(session_id uuid, text_id uuid, title text, content text, difficulty public.text_difficulty, category_name text, started_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare selected_text public.typing_texts; challenge public.daily_challenges; new_session public.practice_sessions; start_time timestamptz := clock_timestamp() + interval '3 seconds';
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_mode = 'daily' then
    challenge := public.get_or_create_daily_challenge();
    select * into selected_text from public.typing_texts where id = challenge.typing_text_id;
  else
    select * into selected_text from public.typing_texts
    where status = 'published' and (p_difficulty is null or typing_texts.difficulty = p_difficulty)
      and (p_category_id is null or category_id = p_category_id)
    order by random() limit 1;
  end if;
  if selected_text.id is null then raise exception 'no published text available'; end if;
  insert into public.practice_sessions(user_id, typing_text_id, mode, started_at)
  values(auth.uid(), selected_text.id, p_mode, start_time) returning * into new_session;
  return query select new_session.id, selected_text.id, selected_text.title, selected_text.content,
    selected_text.difficulty, c.name, new_session.started_at from public.text_categories c where c.id = selected_text.category_id;
end;
$$;

grant execute on function public.start_practice(public.practice_mode, public.text_difficulty, uuid) to authenticated;

commit;
