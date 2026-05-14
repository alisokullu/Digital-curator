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

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  english text not null,
  turkish text not null,
  meaning text,
  example text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  checked_table_count integer := 6;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'folders', (select count(*) from public.folders),
      'tasks', (select count(*) from public.tasks),
      'notes', (select count(*) from public.notes),
      'words', (select count(*) from public.vocabulary)
    ),
    'recent_records', (
      select coalesce(jsonb_agg(to_jsonb(records)), '[]'::jsonb)
      from (
        select 'task' as type, id, user_id, title, null::text as english, created_at
        from public.tasks
        union all
        select 'note' as type, id, user_id, coalesce(title, 'Untitled note') as title, null::text as english, created_at
        from public.notes
        union all
        select 'word' as type, id, user_id, null::text as title, english, created_at
        from public.vocabulary
        order by created_at desc
        limit 10
      ) records
    ),
    'health', jsonb_build_object(
      'checked_tables', checked_table_count,
      'rls_enabled_tables', (
        select count(*)
        from pg_tables
        where schemaname = 'public'
          and tablename in ('folders', 'tasks', 'notes', 'task_history', 'vocabulary', 'user_roles')
          and rowsecurity = true
      ),
      'rows_missing_user_id', (
        select sum(missing_count)
        from (
          select count(*) filter (where user_id is null) as missing_count from public.folders
          union all select count(*) filter (where user_id is null) from public.tasks
          union all select count(*) filter (where user_id is null) from public.notes
          union all select count(*) filter (where user_id is null) from public.task_history
          union all select count(*) filter (where user_id is null) from public.vocabulary
        ) missing
      ),
      'users_without_role', (
        select count(*)
        from auth.users users
        left join public.user_roles roles on roles.user_id = users.id
        where roles.user_id is null
      ),
      'admin_roles', (
        select count(*)
        from public.user_roles
        where role = 'admin'
      )
    )
  );
end;
$$;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.folders to authenticated, service_role;
grant select, insert, update, delete on public.tasks to authenticated, service_role;
grant select, insert, update, delete on public.notes to authenticated, service_role;
grant select, insert, update, delete on public.task_history to authenticated, service_role;
grant select, insert, update, delete on public.vocabulary to authenticated, service_role;
grant select on public.user_roles to authenticated, service_role;
grant insert, update, delete on public.user_roles to service_role;
revoke execute on function public.is_admin() from public;
revoke execute on function public.get_admin_overview() from public;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.get_admin_overview() to authenticated, service_role;

alter table public.folders enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.task_history enable row level security;
alter table public.vocabulary enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_self_or_admin" on public.user_roles;

create policy "user_roles_select_self_or_admin"
  on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin());

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

drop policy if exists "vocabulary_select_own" on public.vocabulary;
drop policy if exists "vocabulary_insert_own" on public.vocabulary;
drop policy if exists "vocabulary_update_own" on public.vocabulary;
drop policy if exists "vocabulary_delete_own" on public.vocabulary;

create policy "vocabulary_select_own"
  on public.vocabulary for select
  using (auth.uid() = user_id);

create policy "vocabulary_insert_own"
  on public.vocabulary for insert
  with check (auth.uid() = user_id);

create policy "vocabulary_update_own"
  on public.vocabulary for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vocabulary_delete_own"
  on public.vocabulary for delete
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

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vocabulary'
  ) then
    alter publication supabase_realtime add table public.vocabulary;
  end if;
end $$;
