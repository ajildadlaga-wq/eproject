-- =====================================================================
-- 0007_roles_and_approval.sql
--
-- Brings the database in line with the E-Project specification:
--
--   * Four roles: ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER.
--   * The full task lifecycle, ending in an explicit manager approval:
--       DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED → UNDER_REVIEW
--                                              → APPROVED | REJECTED
--   * Project progress counts APPROVED work only.
--   * The admin administers the system, not project content: read-only
--     everywhere except users, roles and project ownership.
--   * An append-only audit log for every consequential action.
-- =====================================================================

-- ---------------------------------------------------------------- roles
-- Postgres can add enum labels but not remove them, so the role enum is
-- rebuilt from scratch and every dependent object re-pointed at it.

alter type app_role rename to app_role_old;
create type app_role as enum ('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER');

alter table profiles
  alter column role drop default,
  alter column role type app_role using (
    case role::text
      when 'SUPER_ADMIN' then 'ADMIN'
      when 'EDITOR'      then 'TEAM_MEMBER'
      else role::text
    end
  )::app_role,
  alter column role set default 'VIEWER'::app_role;

drop type app_role_old;

-- Per-project membership uses the same vocabulary as the global roles.
alter type member_role rename to member_role_old;
create type member_role as enum ('TEAM_MEMBER', 'VIEWER');

alter table project_members
  alter column member_role drop default,
  alter column member_role type member_role using (
    case member_role::text
      when 'EDITOR' then 'TEAM_MEMBER'
      else member_role::text
    end
  )::member_role,
  alter column member_role set default 'VIEWER'::member_role;

drop type member_role_old;

-- ------------------------------------------------------------ lifecycle
-- Rebuilt rather than extended with ALTER TYPE ... ADD VALUE: a label added
-- that way is not visible to later statements in the same transaction, so the
-- data migration below could not use it.
--
--   DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED → UNDER_REVIEW
--                                          → APPROVED | REJECTED
--
-- BLOCKED sits outside the happy path; work can stall at any point.

alter type task_status rename to task_status_old;
create type task_status as enum (
  'DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED',
  'COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
);

alter table tasks
  alter column status drop default,
  alter column status type task_status using (
    case status::text
      when 'NOT_STARTED' then 'ASSIGNED'
      when 'DONE'        then 'APPROVED'
      else status::text
    end
  )::task_status,
  alter column status set default 'DRAFT'::task_status;

drop function if exists update_task_progress(uuid, int, task_status_old, text, text);
drop type task_status_old;

-- Review metadata. A rejection must carry a reason: that sentence is the
-- only record of *why* the work came back, and the team member needs it.
alter table tasks
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by  uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at  timestamptz,
  add column if not exists review_note  text;

-- ------------------------------------------------------------ audit log
create table if not exists audit_log (
  id          bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text,
  actor_role  text,
  action      text not null,          -- TASK_APPROVED, ROLE_CHANGED, …
  entity      text not null,          -- task, project, profile
  entity_id   uuid,
  project_id  uuid references projects(id) on delete cascade,
  summary     text,
  detail      jsonb
);
create index if not exists audit_log_project_idx on audit_log (project_id, occurred_at desc);
create index if not exists audit_log_entity_idx  on audit_log (entity, entity_id, occurred_at desc);

alter table audit_log enable row level security;

-- Readable by admins and by anyone with access to the project in question;
-- never writable, updatable or deletable through the API. Rows are inserted
-- only by SECURITY DEFINER functions, which bypass RLS.
drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log
  for select to authenticated
  using (is_admin() or (project_id is not null and has_project_access(project_id)));

revoke insert, update, delete on audit_log from authenticated;

create or replace function write_audit(
  p_action text, p_entity text, p_entity_id uuid,
  p_project_id uuid, p_summary text, p_detail jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text; v_role text;
begin
  select full_name, role::text into v_name, v_role from profiles where id = auth.uid();
  insert into audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, project_id, summary, detail)
  values (auth.uid(), v_name, v_role, p_action, p_entity, p_entity_id, p_project_id, p_summary, p_detail);
end;
$$;

-- --------------------------------------------------- access-control model
-- The admin runs the system; they do not run the projects. Read everything,
-- write nothing inside a project. Approval in particular is reserved for the
-- manager who actually inspected the work — an approval from someone who
-- never saw the work would make the audit log worthless.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN');
$$;

create or replace function has_project_access(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or is_project_manager(pid) or is_project_member(pid);
$$;

-- Note the absence of is_admin(): this is the whole point of the change.
create or replace function can_write_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_project_manager(pid)
      or exists (select 1 from project_members
                 where project_id = pid and user_id = auth.uid()
                   and member_role = 'TEAM_MEMBER');
$$;

-- Only a project manager may create projects, and only for themselves.
create or replace function can_manage_projects() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'PROJECT_MANAGER');
$$;

-- Deleting a project belongs to its manager; the admin can reassign it
-- (see reassign_project_manager) but not delete its contents.
do $$
declare tbl text;
begin
  foreach tbl in array array['requirements', 'risks', 'tasks']
  loop
    execute format('drop policy if exists %1$s_delete on %1$s;', tbl);
    execute format('create policy %1$s_delete on %1$s for delete to authenticated
      using (is_project_manager(project_id));', tbl);
  end loop;
end $$;

drop policy if exists projects_update on projects;
drop policy if exists projects_delete on projects;
create policy projects_update on projects
  for update to authenticated
  using (is_project_manager(id)) with check (is_project_manager(id));
create policy projects_delete on projects
  for delete to authenticated using (is_project_manager(id));

drop policy if exists members_manage on project_members;
create policy members_manage on project_members
  for all to authenticated
  using (is_project_manager(project_id)) with check (is_project_manager(project_id));

-- ------------------------------------------------- lifecycle transitions
-- Every transition below is a function rather than a bare UPDATE so that the
-- rules ("only the assignee may submit", "only the manager may approve") live
-- in one place and cannot be bypassed by calling the REST API directly.

create or replace function submit_task(p_task_id uuid, p_note text default null)
returns void language plpgsql security invoker set search_path = public as $$
declare v_pid uuid; v_status task_status; v_assignee uuid;
begin
  select project_id, status, assignee_id into v_pid, v_status, v_assignee
    from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found or access denied'; end if;

  if v_assignee is distinct from auth.uid() and not is_project_manager(v_pid) then
    raise exception 'Only the assignee can submit this task for review';
  end if;
  if v_status not in ('IN_PROGRESS', 'BLOCKED', 'REJECTED') then
    raise exception 'A task can only be submitted from In progress, Blocked or Rejected';
  end if;

  update tasks
     set status = 'UNDER_REVIEW', submitted_at = now(), percent_complete = 100,
         actual_end = coalesce(actual_end, current_date)
   where id = p_task_id;
  if not found then raise exception 'You do not have permission to update this task'; end if;

  perform write_audit('TASK_SUBMITTED', 'task', p_task_id, v_pid,
                      'Task submitted for review', jsonb_build_object('note', p_note));
end;
$$;

create or replace function approve_task(p_task_id uuid, p_note text default null)
returns void language plpgsql security invoker set search_path = public as $$
declare v_pid uuid; v_status task_status;
begin
  select project_id, status into v_pid, v_status from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found or access denied'; end if;

  if not is_project_manager(v_pid) then
    raise exception 'Only the project manager can approve work';
  end if;
  if v_status <> 'UNDER_REVIEW' then
    raise exception 'Only a task under review can be approved';
  end if;

  update tasks
     set status = 'APPROVED', percent_complete = 100,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
         actual_end = coalesce(actual_end, current_date)
   where id = p_task_id;

  perform write_audit('TASK_APPROVED', 'task', p_task_id, v_pid,
                      'Task approved', jsonb_build_object('note', p_note));
end;
$$;

create or replace function reject_task(p_task_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_pid uuid; v_status task_status;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required when sending work back';
  end if;

  select project_id, status into v_pid, v_status from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found or access denied'; end if;

  if not is_project_manager(v_pid) then
    raise exception 'Only the project manager can send work back';
  end if;
  if v_status <> 'UNDER_REVIEW' then
    raise exception 'Only a task under review can be sent back';
  end if;

  update tasks
     set status = 'REJECTED', reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = p_reason, actual_end = null
   where id = p_task_id;

  perform write_audit('TASK_REJECTED', 'task', p_task_id, v_pid,
                      'Task sent back for rework', jsonb_build_object('reason', p_reason));
end;
$$;

-- Progress updates stop at 99%: reaching "done" is submit_task's job, and
-- approval is the manager's. This keeps the two acts distinct.
create or replace function update_task_progress(
  p_task_id uuid, p_progress int, p_status task_status default null,
  p_what text default null, p_why text default null
) returns void language plpgsql set search_path = public as $$
declare v_before int; v_pid uuid; v_name text; v_count int; v_new int;
begin
  select percent_complete, project_id into v_before, v_pid from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found or access denied'; end if;

  v_new := greatest(0, least(99, p_progress));

  update tasks
     set percent_complete = v_new,
         status = coalesce(p_status, case when status in ('DRAFT', 'ASSIGNED', 'REJECTED')
                                          then 'IN_PROGRESS'::task_status else status end),
         actual_start = coalesce(actual_start, current_date)
   where id = p_task_id
     and status not in ('UNDER_REVIEW', 'APPROVED');
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This task is under review or already approved, or you cannot edit it';
  end if;

  select full_name into v_name from profiles where id = auth.uid();
  insert into task_updates (task_id, project_id, user_id, user_name,
                            progress_before, progress_after, what_happened, why_changed)
  values (p_task_id, v_pid, auth.uid(), v_name, v_before, v_new, p_what, p_why);
end;
$$;

-- ------------------------------------------------------ admin operations
create or replace function reassign_project_manager(p_project_id uuid, p_manager_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_old uuid;
begin
  if not is_admin() then raise exception 'Only an administrator can reassign a project'; end if;
  if not exists (select 1 from profiles where id = p_manager_id and role = 'PROJECT_MANAGER') then
    raise exception 'The new owner must be a project manager';
  end if;

  select manager_id into v_old from projects where id = p_project_id;
  update projects set manager_id = p_manager_id where id = p_project_id;

  perform write_audit('PROJECT_REASSIGNED', 'project', p_project_id, p_project_id,
                      'Project manager changed',
                      jsonb_build_object('from', v_old, 'to', p_manager_id));
end;
$$;

-- Record role changes: who was promoted, by whom, and when.
create or replace function audit_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    perform write_audit('ROLE_CHANGED', 'profile', new.id, null,
                        format('Role changed from %s to %s', old.role, new.role),
                        jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_role on profiles;
create trigger trg_audit_role after update on profiles
  for each row execute function audit_role_change();

-- ------------------------------------------------------------- progress
-- Approved work only. A task the assignee calls finished but the manager has
-- not signed off contributes nothing — that is the rule the whole system
-- exists to enforce, so it belongs in the database, not the frontend.
create or replace function project_progress(p_project_id uuid)
returns int language sql stable set search_path = public as $$
  with w as (
    select case priority when 'LOW' then 1 when 'MEDIUM' then 2 else 3 end as weight,
           (status = 'APPROVED')::int as approved
      from tasks where project_id = p_project_id
  )
  select coalesce(round(100.0 * sum(weight * approved) / nullif(sum(weight), 0))::int, 0) from w;
$$;
