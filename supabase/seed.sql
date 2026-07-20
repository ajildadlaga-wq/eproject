-- =====================================================================
-- seed.sql — PMP templates + demo users + demo project data
-- Applied by `supabase db reset`. LOCAL DEV credentials only.
-- All demo users share the password: Password123!
-- =====================================================================

-- ---------- Demo auth users (local only) -----------------------------
-- Inserting into auth.users fires handle_new_user(), which creates the
-- matching profiles row using full_name + role from raw_user_meta_data.
do $$
declare
  admin_id  uuid := '00000000-0000-0000-0000-0000000000a1';
  pm_id     uuid := '00000000-0000-0000-0000-0000000000b2';
  editor_id uuid := '00000000-0000-0000-0000-0000000000c3';
  viewer_id uuid := '00000000-0000-0000-0000-0000000000d4';
  u record;
begin
  for u in
    select * from (values
      (admin_id,  'admin@pms.local',  'Ada Admin',     'SUPER_ADMIN'),
      (pm_id,     'pm@pms.local',     'Pat Manager',   'PROJECT_MANAGER'),
      (editor_id, 'editor@pms.local', 'Eddie Editor',  'EDITOR'),
      (viewer_id, 'viewer@pms.local', 'Vic Viewer',    'VIEWER')
    ) as t(id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
      u.email, extensions.crypt('Password123!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      json_build_object('full_name', u.full_name, 'role', u.role),
      '', '', '', ''
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      u.id::text, u.id,
      json_build_object('sub', u.id::text, 'email', u.email),
      'email', now(), now(), now()
    )
    on conflict do nothing;
  end loop;
end $$;

-- ---------- PMP templates --------------------------------------------
insert into templates (kind, name, body) values
  ('CHARTER', 'PMP Project Charter', '{
      "sections": ["Purpose", "Objectives", "Scope", "Milestones", "Budget", "Sponsor", "Assumptions", "Constraints"]
   }'),
  ('WBS', 'Standard WBS (SDLC)', '{
      "levels": ["Requirements", "Design", "Development", "Testing", "Staging", "Deployment"]
   }'),
  ('RACI', 'Team RACI Matrix', '{
      "roles": ["Super Admin", "Project Manager", "Editor", "Viewer"],
      "legend": {"R": "Responsible", "A": "Accountable", "C": "Consulted", "I": "Informed"}
   }');

-- ---------- Demo project (owned by the PM) ---------------------------
insert into projects (id, name, description, sdlc_phase, start_date, end_date, manager_id)
values (
  '11111111-1111-1111-1111-111111111111',
  'Apollo Billing Platform',
  'Billing platform: invoicing, multi-currency, and reporting.',
  'DEVELOPMENT',
  current_date - 30, current_date + 30,
  '00000000-0000-0000-0000-0000000000b2'
);

-- Requirements (business-requirements baseline)
insert into requirements (project_id, title, description, type, priority, status, baseline_version) values
  ('11111111-1111-1111-1111-111111111111', 'Generate monthly invoices', 'System produces invoices on the 1st.', 'BUSINESS', 'HIGH', 'BASELINED', 1),
  ('11111111-1111-1111-1111-111111111111', 'Support multiple currencies', 'Invoices in USD, EUR, GBP.', 'FUNCTIONAL', 'MEDIUM', 'BASELINED', 1),
  ('11111111-1111-1111-1111-111111111111', 'Sub-second report loads', 'Dashboards load < 1s.', 'NON_FUNCTIONAL', 'MEDIUM', 'DRAFT', null);

-- Risks (priority is generated from probability x impact)
insert into risks (project_id, title, description, category, probability, impact, owner, mitigation, status) values
  ('11111111-1111-1111-1111-111111111111', 'Key developer may leave', 'Bus-factor on payments module.', 'RESOURCE', 2, 4, 'Pat Manager', 'Cross-train; document.', 'OPEN'),
  ('11111111-1111-1111-1111-111111111111', 'Third-party API deprecation', 'Payment gateway v1 sunset.', 'TECHNICAL', 3, 4, 'Tech Lead', 'Abstract integration layer.', 'MITIGATING'),
  ('11111111-1111-1111-1111-111111111111', 'Scope creep from stakeholders', 'Unbounded change requests.', 'SCOPE', 4, 4, 'Pat Manager', 'Change-control board.', 'OPEN');

-- Tasks (planned vs actual; T4 is overdue, T5 is blocked -> bottlenecks)
insert into tasks (id, project_id, name, planned_start, planned_end, actual_start, actual_end, percent_complete, status, depends_on, phase, sprint_name) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Requirements gathering', current_date - 30, current_date - 22, current_date - 30, current_date - 21, 100, 'DONE', '{}', 'REQUIREMENTS', null),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'System design',          current_date - 21, current_date - 12, current_date - 21, current_date - 11, 100, 'DONE', array['0a000000-0000-0000-0000-000000000001']::uuid[], 'DEVELOPMENT', null),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Core development',        current_date - 11, current_date + 5,  current_date - 11, null, 40, 'IN_PROGRESS', array['0a000000-0000-0000-0000-000000000002']::uuid[], 'DEVELOPMENT', 'Sprint 3'),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Payment gateway integration', current_date - 8, current_date - 2, current_date - 8, null, 30, 'IN_PROGRESS', array['0a000000-0000-0000-0000-000000000002']::uuid[], 'DEVELOPMENT', 'Sprint 3'),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'UAT preparation',        current_date + 3,  current_date + 10, null, null, 0, 'NOT_STARTED', array['0a000000-0000-0000-0000-000000000003','0a000000-0000-0000-0000-000000000004']::uuid[], 'UAT', null);

-- Task priorities (drive weighted progress)
update tasks set priority = 'HIGH'     where id = '0a000000-0000-0000-0000-000000000004'; -- Payment gateway integration
update tasks set priority = 'HIGH'     where id = '0a000000-0000-0000-0000-000000000003'; -- Core development
update tasks set priority = 'MEDIUM'   where id = '0a000000-0000-0000-0000-000000000005'; -- UAT preparation
update tasks set priority = 'LOW'      where id in ('0a000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000002');

-- Project membership for the demo project (editor + viewer).
insert into project_members (project_id, user_id, member_role) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000c3', 'EDITOR'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000d4', 'VIEWER')
on conflict (project_id, user_id) do nothing;

-- A couple of seeded audit-trail entries.
insert into task_updates (task_id, project_id, user_id, user_name, progress_before, progress_after, what_happened, why_changed)
values
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000c3', 'Eddie Editor', 25, 40, 'Implemented invoice batching service', 'Completed the core scheduler; integration tests pending'),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000c3', 'Eddie Editor', 10, 30, 'Wired up gateway sandbox credentials', 'Blocked on vendor API v2 docs, progress slowed');

-- ---------- Extra demo projects (portfolio view) ---------------------
insert into projects (id, name, description, sdlc_phase, start_date, end_date, manager_id) values
  ('22222222-2222-2222-2222-222222222222', 'Helios Mobile App',     'Customer-facing mobile app; currently in system testing.', 'SYSTEM_TESTING', current_date - 45, current_date + 15, '00000000-0000-0000-0000-0000000000b2'),
  ('33333333-3333-3333-3333-333333333333', 'Orion Data Warehouse',  'Analytics warehouse and ETL pipelines; in UAT.',           'UAT',            current_date - 60, current_date + 5,  '00000000-0000-0000-0000-0000000000b2'),
  ('44444444-4444-4444-4444-444444444444', 'Nova Marketing Site',   'Public marketing site refresh; staging before launch.',    'STAGING',        current_date - 20, current_date + 8,  '00000000-0000-0000-0000-0000000000b2')
on conflict (id) do nothing;

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

insert into tasks (id, project_id, name, planned_start, planned_end, percent_complete, status, priority, phase) values
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Build onboarding flow', current_date - 40, current_date - 25, 100, 'DONE', 'HIGH', 'DEVELOPMENT'),
  ('0b000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Device QA matrix',      current_date - 20, current_date + 2,  60,  'IN_PROGRESS', 'MEDIUM', 'SYSTEM_TESTING'),
  ('0b000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Crash-free hardening',  current_date - 10, current_date - 3,  30,  'IN_PROGRESS', 'HIGH', 'SYSTEM_TESTING'),
  ('0b000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'ETL pipeline v2',       current_date - 55, current_date - 30, 100, 'DONE', 'HIGH', 'DEVELOPMENT'),
  ('0b000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'UAT sign-off',          current_date - 6,  current_date + 4,  45,  'IN_PROGRESS', 'CRITICAL', 'UAT'),
  ('0b000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'CMS migration',         current_date - 18, current_date - 6,  100, 'DONE', 'MEDIUM', 'DEVELOPMENT'),
  ('0b000000-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', 'Staging smoke tests',   current_date - 4,  current_date + 3,  20,  'IN_PROGRESS', 'HIGH', 'STAGING')
on conflict (id) do nothing;
