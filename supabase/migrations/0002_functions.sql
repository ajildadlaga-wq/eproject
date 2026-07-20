-- =====================================================================
-- 0002_functions.sql — Auth helpers, triggers, and dashboard views
-- =====================================================================

-- Returns the role of the current authenticated user. SECURITY DEFINER so
-- it can read profiles regardless of RLS (avoids recursive policy lookups).
create or replace function auth_role()
returns app_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Convenience predicates used inside RLS policies.
create or replace function is_admin() returns boolean
language sql stable as $$ select auth_role() = 'SUPER_ADMIN'; $$;

create or replace function can_write() returns boolean  -- editors and up
language sql stable as $$ select auth_role() in ('SUPER_ADMIN','PROJECT_MANAGER','EDITOR'); $$;

create or replace function can_manage_projects() returns boolean
language sql stable as $$ select auth_role() in ('SUPER_ADMIN','PROJECT_MANAGER'); $$;

-- ---------- keep updated_at fresh ------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','projects','requirements','risks','tasks']
  loop
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ---------- auto-create a profile when a user signs up ---------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'VIEWER')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- (A project_progress dashboard view previously lived here; removed as unused —
--  the client computes portfolio stats itself. See 0006_cleanup.sql.)
