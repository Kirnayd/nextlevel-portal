-- In-app notification center per user

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  url text not null,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  event_key text,
  constraint user_notifications_type_check check (
    type in ('announcement', 'price', 'document', 'question_answer')
  ),
  constraint user_notifications_url_check check (url like '/%'),
  constraint user_notifications_user_event_key_unique unique (user_id, event_key)
);

create index if not exists user_notifications_user_read_created_idx
  on public.user_notifications (user_id, is_read, created_at desc);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_entity_id_idx
  on public.user_notifications (entity_id);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.user_notifications;
drop policy if exists "Users can update own notifications" on public.user_notifications;

create policy "Users can read own notifications"
  on public.user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.user_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.prevent_user_notification_content_change()
returns trigger
language plpgsql
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.type is distinct from new.type
    or old.title is distinct from new.title
    or old.body is distinct from new.body
    or old.url is distinct from new.url
    or old.entity_id is distinct from new.entity_id
    or old.event_key is distinct from new.event_key
    or old.created_at is distinct from new.created_at
  then
    raise exception 'Cannot modify notification content';
  end if;

  return new;
end;
$$;

drop trigger if exists user_notifications_prevent_content_change on public.user_notifications;

create trigger user_notifications_prevent_content_change
  before update on public.user_notifications
  for each row
  execute function public.prevent_user_notification_content_change();
