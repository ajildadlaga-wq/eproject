-- =====================================================================
-- 0009_create_project_rpc.sql
--
-- A project manager could not create a project. The insert came back with
-- "new row violates row-level security policy for table projects" — a
-- sentence that names the table and nothing else. It does not say which
-- half of the test failed, so there was no way to act on it.
--
-- Two things are wrong underneath it.
--
-- First, three policies on `projects` still called auth_role(), which
-- 0007 removed. A policy whose function is missing does not refuse
-- loudly; the expression yields NULL, and Postgres reads NULL as no.
-- Creating, editing and deleting a project all ran through that.
--
-- Second, a rule this important should not live in a policy expression
-- at all. "Only a project manager, and only under their own name" is a
-- business rule. Written as a function it can be read, and it can answer
-- with a reason.
--
-- So: the policies are rewritten inline with no helper calls, and
-- creation moves to create_project(), which checks the rule itself and
-- says what it found.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Policies on projects, written out in full.
--
-- Every helper call is gone. What you read is what the database checks.

drop policy if exists projects_insert on projects;
drop policy if exists projects_update on projects;
drop policy if exists projects_delete on projects;

-- Direct inserts stay possible, under the same rule the function applies.
create policy projects_insert on projects
  for insert to authenticated
  with check (
    manager_id = auth.uid()
    and exists (select 1 from profiles
                where id = auth.uid() and role = 'PROJECT_MANAGER')
  );

-- A manager edits their own project. The admin does not: they administer
-- the system, not its contents. Reassigning ownership is theirs, and it
-- has its own function.
create policy projects_update on projects
  for update to authenticated
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());

create policy projects_delete on projects
  for delete to authenticated
  using (manager_id = auth.uid());

-- Nothing depends on it any more.
drop function if exists auth_role();

-- ---------------------------------------------------------------------
-- 2. Creating a project.
--
-- The rule is stated once, in words, and a refusal arrives as a sentence
-- the interface can show the person who tried.

create or replace function create_project(
  p_name        text,
  p_description text default null,
  p_start_date  date default null,
  p_end_date    date default null
) returns projects
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_row  projects;
begin
  select role::text into v_role from profiles where id = auth.uid();

  if v_role is null then
    raise exception 'Signed-in account has no profile row'
      using errcode = '42501';
  end if;

  if v_role <> 'PROJECT_MANAGER' then
    raise exception 'Only a project manager can create a project. Your role is %.', v_role
      using errcode = '42501';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A project needs a name' using errcode = '22023';
  end if;

  if p_start_date is not null and p_end_date is not null
     and p_end_date < p_start_date then
    raise exception 'The end date falls before the start date'
      using errcode = '22023';
  end if;

  -- manager_id is taken from the session, never from the caller. A person
  -- cannot create a project in somebody else's name because there is no
  -- parameter with which to try.
  insert into projects (name, description, start_date, end_date, manager_id)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_start_date,
    p_end_date,
    auth.uid()
  )
  returning * into v_row;

  -- The audit log arrived in 0007. On a database that has not reached it
  -- yet the project is still created; only the log line is missing.
  begin
    perform write_audit(
      'PROJECT_CREATED', 'project', v_row.id, v_row.id,
      'Created project ' || v_row.name, null
    );
  exception when undefined_function then null;
  end;

  return v_row;
end;
$$;

revoke all on function create_project(text, text, date, date) from public;
grant execute on function create_project(text, text, date, date) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Asking the database what it thinks you are.
--
--   select * from whoami();
--
-- If `role` is not what the header shows, the profile row is the problem
-- and no amount of reading policies will reveal it.

create or replace function whoami()
returns table (user_id uuid, full_name text, role text, can_create_project boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text, (p.role = 'PROJECT_MANAGER')
    from profiles p where p.id = auth.uid();
$$;

grant execute on function whoami() to authenticated;
