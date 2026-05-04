-- Digital Curator Supabase schema and row-level security policies.
-- Run this in the Supabase SQL Editor for a new project, or compare it with
-- your existing schema before applying changes.

create extension if not exists pgcrypto;

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references public.folders(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean not null default false,
  is_archived boolean not null default false,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  duration_total integer not null default 0,
  duration_progress integer not null default 0,
  due_date timestamptz,
  sub_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  folder_name text not null,
  period_date date not null,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly')),
  completed_count integer not null default 0,
  total_count integer not null default 0,
  tasks_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, folder_id, period_date, period_type)
);

alter table public.folders enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.task_history enable row level security;

drop policy if exists "folders_select_own" on public.folders;
drop policy if exists "folders_insert_own" on public.folders;
drop policy if exists "folders_update_own" on public.folders;
drop policy if exists "folders_delete_own" on public.folders;

create policy "folders_select_own"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "folders_insert_own"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "folders_update_own"
  on public.folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "folders_delete_own"
  on public.folders for delete
  using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.folders
      where folders.id = tasks.folder_id
        and folders.user_id = auth.uid()
    )
  );

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.folders
      where folders.id = tasks.folder_id
        and folders.user_id = auth.uid()
    )
  );

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes for delete
  using (auth.uid() = user_id);

drop policy if exists "task_history_select_own" on public.task_history;
drop policy if exists "task_history_insert_own" on public.task_history;
drop policy if exists "task_history_update_own" on public.task_history;
drop policy if exists "task_history_delete_own" on public.task_history;

create policy "task_history_select_own"
  on public.task_history for select
  using (auth.uid() = user_id);

create policy "task_history_insert_own"
  on public.task_history for insert
  with check (auth.uid() = user_id);

create policy "task_history_update_own"
  on public.task_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_history_delete_own"
  on public.task_history for delete
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'folders'
  ) then
    alter publication supabase_realtime add table public.folders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_history'
  ) then
    alter publication supabase_realtime add table public.task_history;
  end if;
end $$;
