-- =====================================================================
-- 0001_schema.sql — Enums, helper, and tables for the PMS
-- =====================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- Enums ----------------------------------------------------
create type app_role        as enum ('SUPER_ADMIN', 'PROJECT_MANAGER', 'EDITOR', 'VIEWER');
create type sdlc_phase       as enum ('REQUIREMENTS', 'DEVELOPMENT', 'UAT', 'SYSTEM_TESTING', 'STAGING', 'DEPLOYMENT');
create type requirement_type as enum ('BUSINESS', 'FUNCTIONAL', 'NON_FUNCTIONAL');
create type requirement_status as enum ('DRAFT', 'BASELINED', 'APPROVED', 'IMPLEMENTED', 'VERIFIED');
create type priority_level   as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type risk_category    as enum ('TECHNICAL', 'SCHEDULE', 'COST', 'RESOURCE', 'SCOPE', 'EXTERNAL');
create type risk_status      as enum ('OPEN', 'MITIGATING', 'CLOSED');
create type task_status      as enum ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');
create type template_kind    as enum ('CHARTER', 'WBS', 'RACI');

-- ---------- Immutable helper: risk priority banding ------------------
-- Probability (1-5) x Impact (1-5) = 1..25, mapped to a 4-band priority.
create or replace function risk_band(probability int, impact int)
returns priority_level
language sql immutable
as $$
  select case
    when (probability * impact) >= 16 then 'CRITICAL'::priority_level
    when (probability * impact) >= 10 then 'HIGH'::priority_level
    when (probability * impact) >= 5  then 'MEDIUM'::priority_level
    else 'LOW'::priority_level
  end;
$$;

-- ---------- profiles (mirrors auth.users + role) ---------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        app_role not null default 'VIEWER',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- projects -------------------------------------------------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sdlc_phase  sdlc_phase  not null default 'REQUIREMENTS',
  start_date  date,
  end_date    date,
  manager_id  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on projects (manager_id);

-- ---------- requirements (business-requirements baseline) ------------
create table requirements (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  title            text not null,
  description      text,
  type             requirement_type not null default 'FUNCTIONAL',
  priority         priority_level not null default 'MEDIUM',
  status           requirement_status not null default 'DRAFT',
  baseline_version int,                    -- set when baselined (snapshot marker)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on requirements (project_id);

-- ---------- risks (priority generated from probability x impact) -----
create table risks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  title        text not null,
  description  text,
  category     risk_category not null default 'TECHNICAL',
  probability  int not null default 1 check (probability between 1 and 5),
  impact       int not null default 1 check (impact between 1 and 5),
  priority     priority_level generated always as (risk_band(probability, impact)) stored,
  owner        text,
  mitigation   text,
  status       risk_status not null default 'OPEN',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on risks (project_id);

-- ---------- tasks (schedule; planned vs actual; dependencies) --------
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  name             text not null,
  planned_start    date,
  planned_end      date,
  actual_start     date,
  actual_end       date,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  status           task_status not null default 'NOT_STARTED',
  depends_on       uuid[] not null default '{}',
  assignee_id      uuid references profiles(id) on delete set null,
  sprint_name      text,   -- Agile grouping
  phase            sdlc_phase,  -- Waterfall grouping; either/both => Hybrid
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on tasks (project_id);

-- ---------- templates (PMP seed templates) ---------------------------
create table templates (
  id          uuid primary key default gen_random_uuid(),
  kind        template_kind not null,
  name        text not null,
  body        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
