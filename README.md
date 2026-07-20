# PMS — Project Management System

PMP-aligned project management with **Supabase** (Postgres + Auth + Row-Level Security + Edge
Functions) and a **React + Vite + TypeScript** frontend. Supports Agile / Waterfall / Hybrid
methodologies, two governance baselines (business requirements + risk register), role-based
access control, and a Gantt dashboard that auto-flags schedule bottlenecks.

> Design docs live in [`docs/`](docs/): requirements, project plan, risk register, RBAC matrix.

## Architecture

| Layer | Tech |
|-------|------|
| Database / Auth | Supabase Postgres, Supabase Auth |
| RBAC | Row-Level Security policies (`auth_role()` reads `profiles.role`) |
| Custom logic | Edge Functions: `detect-bottlenecks`, `risk-priority`, `admin-create-user` |
| Frontend | React, React Router, TanStack Query, Tailwind, `gantt-task-react`, Recharts |

```
em/
├─ docs/                 # PMP documentation
├─ supabase/
│  ├─ migrations/        # 0001 schema · 0002 functions/views · 0003 RLS
│  ├─ functions/         # Edge Functions (Deno)
│  ├─ seed.sql           # demo users + project data
│  └─ config.toml
└─ client/               # React app
```

## Roles (RBAC)

| Role | Capability |
|------|-----------|
| SUPER_ADMIN | Manage users & roles; full access |
| PROJECT_MANAGER | Create/own projects; full CRUD on own projects |
| EDITOR | Create/edit requirements, risks, tasks |
| VIEWER | Read-only (no writes anywhere) |

Enforced authoritatively by RLS in the database — see [`docs/04-rbac-matrix.md`](docs/04-rbac-matrix.md).

---

## Run locally (Supabase CLI + Docker)

Requires [Docker](https://docs.docker.com/get-docker/) and the
[Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# 1. Start the local Supabase stack (Postgres, Auth, Studio, Functions).
supabase start

# 2. Apply migrations + seed (demo users & data).
supabase db reset

# 3. Serve Edge Functions.
supabase functions serve

# 4. Frontend
cd client
cp .env.example .env          # fill VITE_SUPABASE_URL + anon key from `supabase start` output
npm install
npm run dev                   # http://localhost:5173
```

**Demo accounts** (password `Password123!`): `admin@pms.local` (Super Admin),
`pm@pms.local` (PM), `editor@pms.local` (Editor), `viewer@pms.local` (Viewer).

## Run against a hosted project

1. Create a project at [supabase.com](https://supabase.com).
2. `supabase link --project-ref <ref>`
3. `supabase db push` (applies migrations) — optionally run `supabase/seed.sql` in the SQL editor.
4. `supabase functions deploy detect-bottlenecks risk-priority admin-create-user`
5. In `client/.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
   **Project Settings → API**. Then `npm install && npm run dev` in `client/`.

> Note: the Edge Functions use `SUPABASE_SERVICE_ROLE_KEY`, which Supabase injects automatically
> in the Functions runtime. Never put the service-role key in the frontend.

## Verify

- **RBAC:** log in as each demo user — Viewer cannot write (RLS denies); Editor can add content
  but not create/delete projects; PM manages own projects; Super Admin manages users (Admin page).
- **Baselines:** add/baseline a requirement; add a risk and watch priority derive from
  probability × impact.
- **Dashboard:** the seeded project has an overdue task (“Payment gateway integration”) and a
  blocked task (“UAT preparation”) that appear in the **Bottlenecks** panel and turn red on the Gantt.
- **Build check:** `cd client && npm run build` (or `npm run typecheck`).
