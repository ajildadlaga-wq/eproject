-- =====================================================================
-- 0005_refinements.sql
--   * Remove methodology (Agile/Waterfall/Hybrid) — no longer needed
--   * Security fix: non-admins may not change their own role
--   * New projects already default sdlc_phase = 'REQUIREMENTS' (0001)
--   * Extra demo projects (safe if the seeded users exist)
-- =====================================================================

-- ---------- Drop methodology -----------------------------------------
-- The project_progress view (0002-era) referenced methodology, so drop it
-- first, then remove the column. (The view itself was later removed as
-- unused — see 0006_cleanup.sql.)
drop view if exists project_progress;

alter table projects drop column if exists methodology;
drop type if exists methodology;

-- ---------- Security: prevent self role-escalation --------------------
-- The profiles_update_self policy (0003) allowed a user to update their own
-- row; without this guard they could set their own role. Block any role
-- change unless the caller is a Super Admin.
create or replace function guard_profile_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only a Super Admin can change a user role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_role on profiles;
create trigger trg_guard_role
  before update on profiles
  for each row execute function guard_profile_role_change();

-- ---------- Extra demo projects (idempotent) --------------------------
-- Managed by the seeded PM; only added when that user exists.
do $$
declare pm uuid := '00000000-0000-0000-0000-0000000000b2';
begin
  if exists (select 1 from profiles where id = pm) then
    insert into projects (id, name, description, sdlc_phase, start_date, end_date, manager_id) values
      ('22222222-2222-2222-2222-222222222222', 'Helios Mobile App',
       'Customer-facing mobile app; currently in system testing.', 'SYSTEM_TESTING',
       current_date - 45, current_date + 15, pm),
      ('33333333-3333-3333-3333-333333333333', 'Orion Data Warehouse',
       'Analytics warehouse and ETL pipelines; in UAT.', 'UAT',
       current_date - 60, current_date + 5, pm),
      ('44444444-4444-4444-4444-444444444444', 'Nova Marketing Site',
       'Public marketing site refresh; staging before launch.', 'STAGING',
       current_date - 20, current_date + 8, pm)
    on conflict (id) do nothing;

    -- Members: reuse the seeded editor/viewer.
    insert into project_members (project_id, user_id, member_role)
    select p.id, m.user_id, m.role
    from (values
      ('22222222-2222-2222-2222-222222222222'::uuid),
      ('33333333-3333-3333-3333-333333333333'::uuid),
      ('44444444-4444-4444-4444-444444444444'::uuid)
    ) as p(id)
    cross join (values
      ('00000000-0000-0000-0000-0000000000c3'::uuid, 'EDITOR'::member_role),
      ('00000000-0000-0000-0000-0000000000d4'::uuid, 'VIEWER'::member_role)
    ) as m(user_id, role)
    on conflict (project_id, user_id) do nothing;

    -- A few tasks per project so the Gantt has content (fixed ids => idempotent).
    insert into tasks (id, project_id, name, planned_start, planned_end, percent_complete, status, priority, phase) values
      ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Build onboarding flow', current_date - 40, current_date - 25, 100, 'DONE', 'HIGH', 'DEVELOPMENT'),
      ('0b000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Device QA matrix',      current_date - 20, current_date + 2,  60,  'IN_PROGRESS', 'MEDIUM', 'SYSTEM_TESTING'),
      ('0b000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Crash-free hardening',  current_date - 10, current_date - 3,  30,  'IN_PROGRESS', 'HIGH', 'SYSTEM_TESTING'),
      ('0b000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'ETL pipeline v2',       current_date - 55, current_date - 30, 100, 'DONE', 'HIGH', 'DEVELOPMENT'),
      ('0b000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'UAT sign-off',          current_date - 6,  current_date + 4,  45,  'IN_PROGRESS', 'CRITICAL', 'UAT'),
      ('0b000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'CMS migration',         current_date - 18, current_date - 6,  100, 'DONE', 'MEDIUM', 'DEVELOPMENT'),
      ('0b000000-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', 'Staging smoke tests',   current_date - 4,  current_date + 3,  20,  'IN_PROGRESS', 'HIGH', 'STAGING')
    on conflict (id) do nothing;
  end if;
end $$;
