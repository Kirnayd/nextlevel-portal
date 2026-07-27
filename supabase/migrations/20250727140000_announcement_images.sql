-- Announcement images
create table if not exists public.announcement_images (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index announcement_images_announcement_id_sort_order_idx
  on public.announcement_images (announcement_id, sort_order);

alter table public.announcement_images enable row level security;

create policy "Users can read announcement images"
  on public.announcement_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.announcements
      where announcements.id = announcement_images.announcement_id
        and (
          announcements.is_published = true
          or exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "Admins can insert announcement images"
  on public.announcement_images
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

create policy "Admins can update announcement images"
  on public.announcement_images
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

create policy "Admins can delete announcement images"
  on public.announcement_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Extend portal-files bucket MIME types for announcement images
-- Keeps all document MIME types from documents migration; adds image types.
update storage.buckets
set
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
where id = 'portal-files';

-- Storage policies scoped to announcements/ prefix
create policy "Authenticated users can read announcements storage"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'announcements'
  );

create policy "Admins can upload announcements storage"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'announcements'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update announcements storage"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'announcements'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can delete announcements storage"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'announcements'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
