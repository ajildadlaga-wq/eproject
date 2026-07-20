-- =====================================================================
-- 0004_features.sql
--   * Task priority (for weighted progress)
--   * Audit trail of progress updates (task_updates) + update_task_progress() RPC
--   * Per-project membership (project_members) and a per-project RLS model
-- =====================================================================

-- ---------- Task priority --------------------------------------------
alter table tasks add column if not exists priority priority_level not null default 'MEDIUM';

-- ---------- Audit trail ----------------------------------------------
create table if not exists task_updates (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references tasks(id) on delete cascade,
  project_id       uuid not null references projects(id) on delete cascade,
  user_id          uuid references profiles(id) on delete set null,
  user_name        text,
  progress_before  int,
  progress_after   int,
  what_happened    text,
  why_changed      text,
  created_at       timestamptz not null default now()
);
create index if not exists task_updates_project_idx on task_updates (project_id, created_at desc);

-- ---------- Per-project membership -----------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum ('EDITOR', 'VIEWER');
  end if;
end $$;

create table if not exists project_members (
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  member_role  member_role not null default 'VIEWER',
  created_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ---------- Access helper functions (SECURITY DEFINER to avoid RLS recursion)
create or replace function is_project_manager(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = pid and manager_id = auth.uid());
$$;

create or replace function is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid());
$$;

create or replace function has_project_access(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or is_project_manager(pid) or is_project_member(pid);
$$;

create or replace function can_write_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
      or is_project_manager(pid)
      or exists (select 1 from project_members
                 where project_id = pid and user_id = auth.uid() and member_role = 'EDITOR');
$$;

-- ---------- Rewrite RLS: projects are now scoped by membership -------
drop policy if exists projects_select on projects;
drop policy if exists projects_update on projects;
drop policy if exists projects_delete on projects;

create policy projects_select on projects
  for select to authenticated using (has_project_access(id));
create policy projects_update on projects
  for update to authenticated
  using (is_admin() or is_project_manager(id))
  with check (is_admin() or is_project_manager(id));
create policy projects_delete on projects
  for delete to authenticated
  using (is_admin() or is_project_manager(id));
-- (projects_insert from 0003 stays: can_manage_projects() + own manager_id)

-- Child content scoped to project access / write.
do $$
declare tbl text;
begin
  foreach tbl in array array['requirements','risks','tasks']
  loop
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('drop policy if exists %1$s_insert on %1$s;', tbl);
    execute format('drop policy if exists %1$s_update on %1$s;', tbl);
    execute format('drop policy if exists %1$s_delete on %1$s;', tbl);

    execute format('create policy %1$s_select on %1$s for select to authenticated
      using (has_project_access(project_id));', tbl);
    execute format('create policy %1$s_insert on %1$s for insert to authenticated
      with check (can_write_project(project_id));', tbl);
    execute format('create policy %1$s_update on %1$s for update to authenticated
      using (can_write_project(project_id)) with check (can_write_project(project_id));', tbl);
    execute format('create policy %1$s_delete on %1$s for delete to authenticated
      using (is_admin() or is_project_manager(project_id));', tbl);
  end loop;
end $$;

-- ---------- RLS for new tables ---------------------------------------
alter table task_updates    enable row level security;
alter table project_members enable row level security;

drop policy if exists task_updates_select on task_updates;
drop policy if exists task_updates_insert on task_updates;
create policy task_updates_select on task_updates
  for select to authenticated using (has_project_access(project_id));
create policy task_updates_insert on task_updates
  for insert to authenticated with check (can_write_project(project_id));

drop policy if exists members_select on project_members;
drop policy if exists members_manage on project_members;
create policy members_select on project_members
  for select to authenticated using (has_project_access(project_id));
create policy members_manage on project_members
  for all to authenticated
  using (is_admin() or is_project_manager(project_id))
  with check (is_admin() or is_project_manager(project_id));

-- ---------- Atomic progress update + audit entry ---------------------
-- SECURITY INVOKER: the UPDATE/INSERT are governed by the caller's RLS,
-- so only users with write access to the project can record an update.
create or replace function update_task_progress(
  p_task_id uuid,
  p_progress int,
  p_status task_status default null,
  p_what text default null,
  p_why text default null
) returns void
language plpgsql
as $$
declare
  v_before int;
  v_pid uuid;
  v_name text;
  v_count int;
begin
  select percent_complete, project_id into v_before, v_pid from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found or access denied'; end if;

  update tasks
     set percent_complete = greatest(0, least(100, p_progress)),
         status = coalesce(p_status, status)
   where id = p_task_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'You do not have permission to update this task'; end if;

  select full_name into v_name from profiles where id = auth.uid();

  insert into task_updates (task_id, project_id, user_id, user_name, progress_before, progress_after, what_happened, why_changed)
  values (p_task_id, v_pid, auth.uid(), v_name, v_before, greatest(0, least(100, p_progress)), p_what, p_why);
end;
$$;

-- ---------- Backfill: keep existing editors/viewers able to see current projects
insert into project_members (project_id, user_id, member_role)
select p.id, pr.id,
       case when pr.role = 'VIEWER' then 'VIEWER'::member_role else 'EDITOR'::member_role end
from projects p
cross join profiles pr
where pr.role in ('EDITOR', 'VIEWER')
on conflict (project_id, user_id) do nothing;
