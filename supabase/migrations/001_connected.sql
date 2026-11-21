-- Run once in the NEW Tasklane Connected Supabase project.
create table public.workspace_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 3 and 600),
  answer jsonb not null check (jsonb_typeof(answer) = 'object'),
  created_at timestamptz not null default now(),
  rating text check (rating in ('helpful','unhelpful')),
  feedback text not null default '' check (char_length(feedback) <= 1000),
  flagged boolean not null default false,
  needs_review boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','resolved')),
  review_note text not null default '' check (char_length(review_note) <= 1000),
  version integer not null default 1
);
create index conversations_owner_created on public.conversations(user_id,created_at desc,id);
create index conversations_review_queue on public.conversations(review_status,created_at desc) where needs_review;
create table public.review_events (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.workspace_admins enable row level security;
alter table public.conversations enable row level security;
alter table public.review_events enable row level security;
-- Browser-facing roles cannot write any tables, including admin membership.
revoke all on public.workspace_admins,public.conversations,public.review_events from anon,authenticated;
grant select on public.conversations to authenticated;
create policy own_conversations on public.conversations for select to authenticated using ((select auth.uid()) = user_id);
grant all on public.workspace_admins,public.conversations,public.review_events to service_role;
grant usage,select on sequence public.review_events_id_seq to service_role;

create function public.review_conversation(p_id uuid,p_actor uuid,p_version integer,p_note text)
returns setof public.conversations language plpgsql security definer set search_path = '' as $$
declare changed public.conversations;
begin
  if not exists (select 1 from public.workspace_admins where user_id=p_actor) then
    raise exception 'Forbidden' using errcode='42501';
  end if;
  update public.conversations set review_status='resolved',review_note=p_note,version=version+1
    where id=p_id and version=p_version and needs_review returning * into changed;
  if not found then raise exception 'Record changed or unavailable' using errcode='40001'; end if;
  insert into public.review_events(conversation_id,reviewer_id,note) values(p_id,p_actor,p_note);
  return next changed;
end $$;
revoke all on function public.review_conversation(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.review_conversation(uuid,uuid,integer,text) to service_role;
