-- Document categories
create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.document_categories enable row level security;

create policy "Authenticated users can read document categories"
  on public.document_categories
  for select
  to authenticated
  using (true);

create policy "Admins can insert document categories"
  on public.document_categories
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

create policy "Admins can update document categories"
  on public.document_categories
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

create policy "Admins can delete document categories"
  on public.document_categories
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

-- Documents metadata
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.document_categories (id) on delete restrict,
  title text not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_category_id_idx on public.documents (category_id);

alter table public.documents enable row level security;

create policy "Authenticated users can read documents"
  on public.documents
  for select
  to authenticated
  using (true);

create policy "Admins can insert documents"
  on public.documents
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

create policy "Admins can update documents"
  on public.documents
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

create policy "Admins can delete documents"
  on public.documents
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

-- Keep updated_at in sync
create or replace function public.set_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_documents_updated_at();

-- Extend portal-files bucket MIME types for office documents
update storage.buckets
set
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
where id = 'portal-files';

-- Storage policies scoped to documents/ prefix
create policy "Authenticated users can read documents storage"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'documents'
  );

create policy "Admins can upload documents storage"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'documents'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update documents storage"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'documents'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can delete documents storage"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'documents'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
