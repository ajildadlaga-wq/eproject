-- =====================================================================
-- 0011_admin_reads_everything.sql
--
-- The administrator must see every project. Not to run them — approval
-- stays with the manager who inspected the work — but because an
-- administrator who cannot see the system cannot administer it.
--
-- That was already the intent. The problem is how it was expressed: read
-- access everywhere goes through has_project_access(), which calls
-- is_admin(), and is_admin() has been redefined three times across the
-- migration history. The 0002 version asked auth_role(), which 0009
-- removed. Postgres records no dependency between two functions written
-- as strings, so dropping auth_role() succeeded quietly and left any
-- surviving copy of the old is_admin() to fail at runtime — and a policy
-- that fails shows the administrator an empty system rather than an
-- error.
--
-- So the whole chain is restated here, in its current and intended form.
-- Running this file twice changes nothing; running it once removes the
-- doubt.
-- =====================================================================

-- ------------------------------------------------------- the four tests
-- Each asks the tables directly. None calls a helper that a later
-- migration might have taken away.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role = 'ADMIN');
$$;

create or replace function is_project_manager(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects
                 where id = pid and manager_id = auth.uid());
$$;

create or replace function is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members
                 where project_id = pid and user_id = auth.uid());
$$;

-- Who may read a project: the administrator, its manager, and the people
-- working on it. Everyone else sees nothing of it at all.
create or replace function has_project_access(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
      or is_project_manager(pid)
      or is_project_member(pid);
$$;

-- Who may write inside a project: its manager and its team members. The
-- administrator is deliberately absent.
create or replace function can_write_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_project_manager(pid)
      or exists (select 1 from project_members
                 where project_id = pid and user_id = auth.uid()
                   and member_role = 'TEAM_MEMBER');
$$;

-- ------------------------------------------------------- reading rights
drop policy if exists projects_select on projects;
create policy projects_select on projects
  for select to authenticated
  using (has_project_access(id));

do $$
declare tbl text;
begin
  foreach tbl in array array['requirements', 'risks', 'tasks', 'task_updates']
  loop
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('create policy %1$s_select on %1$s for select to authenticated
      using (has_project_access(project_id));', tbl);
  end loop;
end $$;

drop policy if exists members_select on project_members;
create policy members_select on project_members
  for select to authenticated
  using (has_project_access(project_id));

-- Names are shown beside every task and every audit line, so everyone
-- signed in can read the roster. Roles are visible; nothing else is.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- What a given account can actually see, in one row per project.
--
--   select * from my_visible_projects();
--
-- Called by an administrator it returns every project. If it does not,
-- the profile row is wrong — not the policy.

create or replace function my_visible_projects()
returns table (id uuid, name text, manager_id uuid, visible_because text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.manager_id,
         case
           when is_admin()                 then 'administrator'
           when p.manager_id = auth.uid()  then 'manager'
           else 'team member'
         end
    from projects p
   where has_project_access(p.id)
   order by p.name;
$$;

grant execute on function my_visible_projects() to authenticated;
