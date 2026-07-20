-- =====================================================================
-- 0003_rls.sql — Row-Level Security = the RBAC permission matrix
-- =====================================================================
-- Roles: SUPER_ADMIN, PROJECT_MANAGER, EDITOR, VIEWER (from profiles.role).
-- Helpers (0002): auth_role(), is_admin(), can_write(), can_manage_projects().

alter table profiles     enable row level security;
alter table projects     enable row level security;
alter table requirements enable row level security;
alter table risks        enable row level security;
alter table tasks        enable row level security;
alter table templates    enable row level security;

-- ---------- profiles -------------------------------------------------
-- All authenticated users can read profiles (to show manager/assignee names).
create policy profiles_select on profiles
  for select to authenticated using (true);

-- A user may update their own display name; Super Admin manages everyone (incl. roles).
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- projects -------------------------------------------------
create policy projects_select on projects
  for select to authenticated using (true);

-- Only Super Admin or Project Manager may create; a PM must own what they create.
create policy projects_insert on projects
  for insert to authenticated
  with check (can_manage_projects() and (is_admin() or manager_id = auth.uid()));

-- Admin edits any project; a PM edits only their own.
create policy projects_update on projects
  for update to authenticated
  using (is_admin() or (auth_role() = 'PROJECT_MANAGER' and manager_id = auth.uid()))
  with check (is_admin() or (auth_role() = 'PROJECT_MANAGER' and manager_id = auth.uid()));

create policy projects_delete on projects
  for delete to authenticated
  using (is_admin() or (auth_role() = 'PROJECT_MANAGER' and manager_id = auth.uid()));

-- ---------- child content (requirements, risks, tasks) ---------------
-- Pattern applied per table: everyone reads; editors-and-up write.
do $$
declare tbl text;
begin
  foreach tbl in array array['requirements','risks','tasks']
  loop
    execute format('create policy %1$s_select on %1$s
      for select to authenticated using (true);', tbl);

    execute format('create policy %1$s_insert on %1$s
      for insert to authenticated with check (can_write());', tbl);

    execute format('create policy %1$s_update on %1$s
      for update to authenticated using (can_write()) with check (can_write());', tbl);

    -- Deletion of project content is restricted to managers (PM/Admin).
    execute format('create policy %1$s_delete on %1$s
      for delete to authenticated using (can_manage_projects());', tbl);
  end loop;
end $$;

-- ---------- templates (read-only reference; admin maintains) ----------
create policy templates_select on templates
  for select to authenticated using (true);
create policy templates_admin_write on templates
  for all to authenticated using (is_admin()) with check (is_admin());
