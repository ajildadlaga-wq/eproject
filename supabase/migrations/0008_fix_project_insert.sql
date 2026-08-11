-- =====================================================================
-- 0008_fix_project_insert.sql
--
-- A project manager could not create a project: the insert failed with
-- "new row violates row-level security policy for table projects".
--
-- The policy dated from 0003 and leaned on two helpers that later
-- migrations redefined. Reading it told you nothing about why it refused,
-- and a stale helper anywhere in the chain silently turned the whole
-- expression to NULL — which Postgres treats as a refusal.
--
-- It is now written out in full. One policy, no helper calls, plain to
-- read: you may create a project if you are a project manager and you are
-- putting your own name on it.
-- =====================================================================

drop policy if exists projects_insert on projects;

create policy projects_insert on projects
  for insert to authenticated
  with check (
    manager_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'PROJECT_MANAGER'
    )
  );

-- The helpers from 0002 still refer to roles that no longer exist
-- (SUPER_ADMIN, EDITOR) and to auth_role(), which 0007 dropped. Nothing
-- calls them any more, and leaving broken functions lying around invites
-- somebody to use one.
drop function if exists can_write();
drop function if exists can_manage_projects();

-- ---------------------------------------------------------------------
-- A way to ask the database what it thinks you are.
--
-- When a policy refuses an insert it does not say which half of the test
-- failed. Call this and you get the answer directly:
--
--   select * from whoami();
--
-- If `role` is not what the interface shows, the profile row is the
-- problem, not the policy.
create or replace function whoami()
returns table (user_id uuid, full_name text, role text, can_create_project boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text, (p.role = 'PROJECT_MANAGER')
    from profiles p where p.id = auth.uid();
$$;
