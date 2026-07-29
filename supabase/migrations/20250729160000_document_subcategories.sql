-- Document subcategories
create table if not exists public.document_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.document_categories (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint document_subcategories_category_name_unique unique (category_id, name)
);

create index if not exists document_subcategories_category_id_idx
  on public.document_subcategories (category_id);

alter table public.document_subcategories enable row level security;

drop policy if exists "Authenticated users can read document subcategories" on public.document_subcategories;
drop policy if exists "Admins can insert document subcategories" on public.document_subcategories;
drop policy if exists "Admins can update document subcategories" on public.document_subcategories;
drop policy if exists "Admins can delete document subcategories" on public.document_subcategories;

create policy "Authenticated users can read document subcategories"
  on public.document_subcategories
  for select
  to authenticated
  using (true);

create policy "Admins can insert document subcategories"
  on public.document_subcategories
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

create policy "Admins can update document subcategories"
  on public.document_subcategories
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

create policy "Admins can delete document subcategories"
  on public.document_subcategories
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

-- Optional subcategory on documents
alter table public.documents
  add column if not exists subcategory_id uuid null references public.document_subcategories (id) on delete set null;

create index if not exists documents_subcategory_id_idx
  on public.documents (subcategory_id);
