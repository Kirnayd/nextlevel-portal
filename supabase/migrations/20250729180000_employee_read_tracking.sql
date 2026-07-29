-- Employee read tracking for dashboard badges

create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint announcement_reads_user_announcement_unique unique (user_id, announcement_id)
);

create index if not exists announcement_reads_user_announcement_idx
  on public.announcement_reads (user_id, announcement_id);

create table if not exists public.question_answer_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint question_answer_reads_user_question_unique unique (user_id, question_id)
);

create index if not exists question_answer_reads_user_question_idx
  on public.question_answer_reads (user_id, question_id);

create table if not exists public.price_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint price_reads_user_file_unique unique (user_id, file_id)
);

create index if not exists price_reads_user_file_idx
  on public.price_reads (user_id, file_id);

alter table public.announcement_reads enable row level security;
alter table public.question_answer_reads enable row level security;
alter table public.price_reads enable row level security;

drop policy if exists "Users can read own announcement reads" on public.announcement_reads;
drop policy if exists "Users can insert own announcement reads" on public.announcement_reads;
drop policy if exists "Users can update own announcement reads" on public.announcement_reads;

create policy "Users can read own announcement reads"
  on public.announcement_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own announcement reads"
  on public.announcement_reads
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_id
        and a.is_published = true
    )
  );

create policy "Users can update own announcement reads"
  on public.announcement_reads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_id
        and a.is_published = true
    )
  );

drop policy if exists "Users can read own question answer reads" on public.question_answer_reads;
drop policy if exists "Users can insert own question answer reads" on public.question_answer_reads;
drop policy if exists "Users can update own question answer reads" on public.question_answer_reads;

create policy "Users can read own question answer reads"
  on public.question_answer_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own question answer reads"
  on public.question_answer_reads
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.user_id = auth.uid()
        and q.status = 'answered'
    )
  );

create policy "Users can update own question answer reads"
  on public.question_answer_reads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.user_id = auth.uid()
        and q.status = 'answered'
    )
  );

drop policy if exists "Users can read own price reads" on public.price_reads;
drop policy if exists "Users can insert own price reads" on public.price_reads;
drop policy if exists "Users can update own price reads" on public.price_reads;

create policy "Users can read own price reads"
  on public.price_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own price reads"
  on public.price_reads
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.files f
      where f.id = file_id
        and f.category = 'price'
    )
  );

create policy "Users can update own price reads"
  on public.price_reads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.files f
      where f.id = file_id
        and f.category = 'price'
    )
  );

create or replace function public.count_unread_announcements()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.announcements a
  where a.is_published = true
    and not exists (
      select 1
      from public.announcement_reads r
      where r.user_id = auth.uid()
        and r.announcement_id = a.id
    );
$$;

create or replace function public.count_unread_question_answers()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.questions q
  where q.user_id = auth.uid()
    and q.status = 'answered'
    and not exists (
      select 1
      from public.question_answer_reads r
      where r.user_id = auth.uid()
        and r.question_id = q.id
    );
$$;

create or replace function public.count_unread_price()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.files f
      where f.category = 'price'
        and not exists (
          select 1
          from public.price_reads r
          where r.user_id = auth.uid()
            and r.file_id = f.id
        )
    ) then 1
    else 0
  end;
$$;

grant execute on function public.count_unread_announcements() to authenticated;
grant execute on function public.count_unread_question_answers() to authenticated;
grant execute on function public.count_unread_price() to authenticated;

-- Baseline: treat existing published content as already read for all users.
insert into public.announcement_reads (user_id, announcement_id)
select p.id, a.id
from public.profiles p
cross join public.announcements a
where a.is_published = true
on conflict (user_id, announcement_id) do nothing;

insert into public.question_answer_reads (user_id, question_id)
select q.user_id, q.id
from public.questions q
where q.status = 'answered'
on conflict (user_id, question_id) do nothing;

insert into public.price_reads (user_id, file_id)
select p.id, f.id
from public.profiles p
cross join public.files f
where f.category = 'price'
on conflict (user_id, file_id) do nothing;
