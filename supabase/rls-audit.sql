-- Digital Curator production safety audit.
-- This file only reads metadata. It does not change tables, policies, or data.

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('folders', 'tasks', 'notes', 'task_history', 'vocabulary')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('folders', 'tasks', 'notes', 'task_history', 'vocabulary')
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('folders', 'tasks', 'notes', 'task_history', 'vocabulary')
  and grantee in ('authenticated', 'service_role')
group by table_schema, table_name, grantee
order by table_name, grantee;

select
  'folders' as table_name,
  count(*) as total_rows,
  count(user_id) as rows_with_user_id,
  count(*) - count(user_id) as rows_missing_user_id
from public.folders
union all
select
  'tasks' as table_name,
  count(*) as total_rows,
  count(user_id) as rows_with_user_id,
  count(*) - count(user_id) as rows_missing_user_id
from public.tasks
union all
select
  'notes' as table_name,
  count(*) as total_rows,
  count(user_id) as rows_with_user_id,
  count(*) - count(user_id) as rows_missing_user_id
from public.notes
union all
select
  'task_history' as table_name,
  count(*) as total_rows,
  count(user_id) as rows_with_user_id,
  count(*) - count(user_id) as rows_missing_user_id
from public.task_history
union all
select
  'vocabulary' as table_name,
  count(*) as total_rows,
  count(user_id) as rows_with_user_id,
  count(*) - count(user_id) as rows_missing_user_id
from public.vocabulary;
