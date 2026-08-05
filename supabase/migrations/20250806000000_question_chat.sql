-- Convert Questions into two-way chat (messages + per-user read state).
-- Idempotent. Does not delete existing questions or answers.

-- ---------------------------------------------------------------------------
-- 1. Conversation metadata on questions
-- ---------------------------------------------------------------------------
alter table public.questions
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_by uuid references auth.users (id),
  add column if not exists updated_at timestamptz;

update public.questions
set
  last_message_at = coalesce(last_message_at, created_at),
  updated_at = coalesce(updated_at, created_at)
where last_message_at is null
   or updated_at is null;

alter table public.questions
  alter column last_message_at set default now(),
  alter column updated_at set default now();

alter table public.questions
  alter column last_message_at set not null,
  alter column updated_at set not null;

create index if not exists questions_last_message_at_idx
  on public.questions (last_message_at desc);

create index if not exists questions_updated_at_idx
  on public.questions (updated_at desc);

-- ---------------------------------------------------------------------------
-- 2. Chat messages
-- ---------------------------------------------------------------------------
create table if not exists public.question_messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint question_messages_message_not_blank
    check (char_length(trim(message)) > 0),
  constraint question_messages_message_max_length
    check (char_length(message) <= 10000)
);

create index if not exists question_messages_question_created_idx
  on public.question_messages (question_id, created_at);

create index if not exists question_messages_sender_id_idx
  on public.question_messages (sender_id);

alter table public.question_messages enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Per-user chat read cursors
-- ---------------------------------------------------------------------------
create table if not exists public.question_chat_reads (
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create index if not exists question_chat_reads_user_id_idx
  on public.question_chat_reads (user_id);

alter table public.question_chat_reads enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Migrate existing questions + answers into messages (idempotent)
-- ---------------------------------------------------------------------------
insert into public.question_messages (question_id, sender_id, message, created_at)
select
  q.id,
  q.user_id,
  q.message,
  q.created_at
from public.questions q
where not exists (
  select 1
  from public.question_messages qm
  where qm.question_id = q.id
);

insert into public.question_messages (question_id, sender_id, message, created_at)
select
  a.question_id,
  a.admin_id,
  a.message,
  a.created_at
from public.answers a
where not exists (
  select 1
  from public.question_messages qm
  where qm.question_id = a.question_id
    and qm.sender_id = a.admin_id
    and qm.message = a.message
    and qm.created_at = a.created_at
);

update public.questions q
set
  last_message_at = coalesce(
    (
      select max(qm.created_at)
      from public.question_messages qm
      where qm.question_id = q.id
    ),
    q.created_at
  ),
  last_message_by = (
    select qm.sender_id
    from public.question_messages qm
    where qm.question_id = q.id
    order by qm.created_at desc, qm.id desc
    limit 1
  ),
  updated_at = coalesce(
    (
      select max(qm.created_at)
      from public.question_messages qm
      where qm.question_id = q.id
    ),
    q.created_at
  );

-- Treat historical content as already read for participants (employee + admins).
insert into public.question_chat_reads (question_id, user_id, last_read_at)
select
  q.id,
  q.user_id,
  coalesce(
    (
      select max(qm.created_at)
      from public.question_messages qm
      where qm.question_id = q.id
    ),
    q.created_at
  )
from public.questions q
on conflict (question_id, user_id) do update
set last_read_at = greatest(public.question_chat_reads.last_read_at, excluded.last_read_at);

insert into public.question_chat_reads (question_id, user_id, last_read_at)
select
  q.id,
  p.id,
  coalesce(
    (
      select max(qm.created_at)
      from public.question_messages qm
      where qm.question_id = q.id
    ),
    q.created_at
  )
from public.questions q
cross join public.profiles p
where p.role = 'admin'
on conflict (question_id, user_id) do update
set last_read_at = greatest(public.question_chat_reads.last_read_at, excluded.last_read_at);

-- ---------------------------------------------------------------------------
-- 5. Keep questions.last_* synchronized on new messages
-- ---------------------------------------------------------------------------
create or replace function public.sync_question_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.questions
  set
    last_message_at = new.created_at,
    last_message_by = new.sender_id,
    updated_at = new.created_at
  where id = new.question_id;

  return new;
end;
$$;

drop trigger if exists question_messages_sync_last_message on public.question_messages;

create trigger question_messages_sync_last_message
  after insert on public.question_messages
  for each row
  execute function public.sync_question_last_message();

-- ---------------------------------------------------------------------------
-- 6. RLS helpers / policies for messages
-- ---------------------------------------------------------------------------
drop policy if exists "Employees can read messages in own questions" on public.question_messages;
drop policy if exists "Admins can read all question messages" on public.question_messages;
drop policy if exists "Employees can insert messages in own questions" on public.question_messages;
drop policy if exists "Admins can insert question messages" on public.question_messages;

create policy "Employees can read messages in own questions"
  on public.question_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.questions q
      where q.id = question_messages.question_id
        and q.user_id = auth.uid()
    )
  );

create policy "Admins can read all question messages"
  on public.question_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Employees can insert messages in own questions"
  on public.question_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = question_messages.question_id
        and q.user_id = auth.uid()
    )
  );

create policy "Admins can insert question messages"
  on public.question_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
    and exists (
      select 1
      from public.questions q
      where q.id = question_messages.question_id
    )
  );

-- ---------------------------------------------------------------------------
-- 7. RLS for chat reads
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read own chat reads" on public.question_chat_reads;
drop policy if exists "Users can insert own chat reads" on public.question_chat_reads;
drop policy if exists "Users can update own chat reads" on public.question_chat_reads;

create policy "Users can read own chat reads"
  on public.question_chat_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own chat reads"
  on public.question_chat_reads
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1
        from public.questions q
        where q.id = question_chat_reads.question_id
          and q.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
      )
    )
  );

create policy "Users can update own chat reads"
  on public.question_chat_reads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. Unread count RPCs (message-based)
-- ---------------------------------------------------------------------------
-- Keep legacy name for employee Home badge compatibility.
create or replace function public.count_unread_question_answers()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*)::integer, 0)
  from public.question_messages qm
  join public.questions q on q.id = qm.question_id
  left join public.question_chat_reads r
    on r.question_id = qm.question_id
   and r.user_id = auth.uid()
  where q.user_id = auth.uid()
    and qm.sender_id <> auth.uid()
    and qm.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz);
$$;

revoke all on function public.count_unread_question_answers() from public;
grant execute on function public.count_unread_question_answers() to authenticated;

create or replace function public.count_unread_question_messages_for_admin()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ) then 0
    else coalesce((
      select count(*)::integer
      from public.question_messages qm
      join public.questions q on q.id = qm.question_id
      left join public.question_chat_reads r
        on r.question_id = qm.question_id
       and r.user_id = auth.uid()
      where qm.sender_id = q.user_id
        and qm.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    ), 0)
  end;
$$;

revoke all on function public.count_unread_question_messages_for_admin() from public;
grant execute on function public.count_unread_question_messages_for_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Allow question_message notification type
-- ---------------------------------------------------------------------------
alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (
    type in ('announcement', 'price', 'document', 'question_answer', 'question_message')
  );

-- ---------------------------------------------------------------------------
-- 10. Realtime publication for live chat
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.question_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
