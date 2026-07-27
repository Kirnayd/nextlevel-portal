-- Extend profiles for display in admin question views
alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text;

-- Question status enum and tables
do $$
begin
  create type public.question_status as enum ('new', 'progress', 'answered');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(trim(subject)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  status public.question_status not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  admin_id uuid not null references auth.users (id),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists questions_user_id_idx on public.questions (user_id);
create index if not exists questions_status_idx on public.questions (status);
create index if not exists questions_created_at_idx on public.questions (created_at desc);

alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- Profiles: allow admins to read employee profiles for question management
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  );

-- Questions policies
drop policy if exists "Employees can read own questions" on public.questions;
drop policy if exists "Admins can read all questions" on public.questions;
drop policy if exists "Employees can create own questions" on public.questions;
drop policy if exists "Admins can update questions" on public.questions;

create policy "Employees can read own questions"
  on public.questions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read all questions"
  on public.questions
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

create policy "Employees can create own questions"
  on public.questions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can update questions"
  on public.questions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Answers policies
drop policy if exists "Users can read answers for visible questions" on public.answers;
drop policy if exists "Admins can insert answers" on public.answers;

create policy "Users can read answers for visible questions"
  on public.answers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.questions
      where questions.id = answers.question_id
        and (
          questions.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "Admins can insert answers"
  on public.answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
