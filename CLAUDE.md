# E-Project

A project-monitoring dashboard for a Mongolian government body (E-Mongolia),
built as an internship project. It does **not** plan projects — the plan
arrives already approved. It tracks whether that plan is actually being
carried out, and it makes the manager's sign-off the moment work counts.

Interface language is Mongolian, with English available. Code, comments and
commit messages are English.

---

## The one rule everything rests on

**Work is finished when the project manager who inspected it says so.**

The manager checks the actual deliverable outside the app, then confirms it
inside. Until that confirmation, the work counts for nothing:

- A team member can move progress to 99%, no further. Declaring the work done
  is a separate act (`submit_task`), and closing it out belongs to the manager.
- `weightedProgress()` and `project_progress()` count `APPROVED` tasks only. A
  task sitting at 100% in review reads as **0%** on the dashboard. That looks
  wrong at first glance and is deliberate — do not "fix" it.
- Rejecting work requires a written reason. Without one the assignee is left
  guessing, so both the database and the UI refuse an empty rejection.

If a change would let work count as done without a manager approving it, the
change is wrong.

---

## Roles — there are four, and that is on purpose

| Role | Scope | Can |
|---|---|---|
| `ADMIN` | every project, **read-only** | users, roles, password resets, project reassignment, logs |
| `PROJECT_MANAGER` | own projects | create projects, assign tasks, **approve / send back** |
| `TEAM_MEMBER` | projects they belong to | update progress, submit for review |
| `VIEWER` | projects opened to them | look, nothing else |

**The admin administers the system, not its contents.** `can_write_project()`
deliberately does not consult `is_admin()`. An administrator reads every
project and writes to none. Approval above all: an approval from someone who
never saw the work would make the audit log worthless.

The admin can reassign a project to a new manager — the only way to rescue an
orphaned project when a manager leaves.

### Roles that were considered and rejected

- **Project Sponsor** — budget arrives from the state, already allocated. Nobody
  in the building funds or cancels a project, so the role has no occupant.
- **Executive** (read-only across all projects) — the admin already sees
  everything. A director who needs to watch specific projects is added to those
  projects as a Viewer.
- **Auditor** — the audit log plus a temporary Viewer grant covers it.

Do not reintroduce these without asking.

---

## Task lifecycle

```
DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED → UNDER_REVIEW → APPROVED
                        ↑                          └────────→ REJECTED ─┐
                        └──────────────────────────────────────────────┘
BLOCKED sits off to one side — work can stall at any point.
```

Transitions live in database functions (`submit_task`, `approve_task`,
`reject_task`), not in the frontend. Calling the REST API directly cannot
bypass them. Add new rules there, not in React.

---

## Where the rules live

Business rules and access control belong in **PostgreSQL**, enforced by
Row-Level Security and `SECURITY DEFINER` functions. The React app hides
buttons the user cannot use; that is a courtesy, not the security boundary.
Every gate must hold with the UI bypassed.

`audit_log` is append-only: written by definer functions, readable but not
writable through the API. It records submissions, approvals, rejections,
project reassignment and role changes.

---

## Layout

```
client/            React + Vite + TypeScript + Tailwind + TanStack Query
  src/components/  Brand.tsx (logo), GanttChart, Badges, Modal, Layout
  src/pages/       Login, Dashboard, Projects, ProjectDetail, Admin
  src/pages/tabs/  Tasks (approval workflow lives here), Requirements, Risks, Reports, Team
  src/lib/types.ts role, status and progress definitions — start here
supabase/
  migrations/      0001–0006 original schema · 0007 roles + approval
  seed.sql         demo users and data; one task in review, one sent back
docs/
  spec/            generator for the Word specification (see below)
  *.md             older design notes, superseded by docs/spec
```

## Commands

```bash
supabase db reset            # apply migrations + seed (0007 rebuilds enums, so reset)
supabase functions serve
cd client && npm run dev
npm run typecheck            # tsc --noEmit
npm test                     # vitest
```

Demo accounts, password `Password123!`:
`admin@pms.local` · `pm@pms.local` · `editor@pms.local` (team member) · `viewer@pms.local`

---

## Brand

The palette follows the E-Mongolia portal: brand blue `#1268EB` (Tailwind
`brand`, ramp 50–900), approval green `#22A15C` (`accent`), sidebar `#0A2148`
(`ink`). No indigo or violet anywhere — it was swept out.

The logo is three Gantt bars forming an "E" with an approval check-mark badge:
schedule and sign-off, the two ideas the product is built on. Source lives in
`client/src/components/Brand.tsx` and `client/public/logo.svg`.

The UI must work on any screen. Data tables scroll sideways rather than squash
(`.sheet-scroll`), tab bars become horizontal strips on phones (`.scroll-x`),
and the Gantt narrows its name column below 640px.

---

## The specification document

`docs/spec/` generates a single Word file — the full project documentation in
Mongolian, following IEEE 29148, PMBOK, BPMN 2.0 and UML 2.5.

```bash
cd docs/spec
python3 fig/gen.py           # regenerate diagrams (needs graphviz)
node build.js E-Project_Documentation.docx
```

Chapters 1–3 are written (Project Charter, Vision & Scope, Stakeholder
Analysis). Planned: 4 BRD · 5 Business Rules · 6 Business Process (AS-IS /
TO-BE / BPMN) · 7 Feature List · 8 User Stories · 9 SRS · 10 UML · 11 Database
Design · 12 API Design · 13 UI/UX · 14 SDLC · 15 PMP · 16 Test Plan.

Write the document as a finished statement of how the system **is**. No change
logs, no "this was revised", no version history — the reader wants the design,
not its history. The same applies when a decision changes: rewrite the section,
do not annotate it.

The document and the code move together. When a chapter is settled, its
requirements become the backlog; when the code proves a requirement wrong, the
chapter gets rewritten.

---

## Conventions

- `.gitattributes` normalises line endings to LF. Without it a Windows checkout
  rewrites every file as CRLF and buries the real diff.
- Two remotes: **`myrepo`** is ours (`ajildadlaga-wq/eproject`). `origin` points
  at someone else's fork — do not push there.
- Comment the *why*, never the *what*. A comment explaining that progress stops
  at 99% earns its place; one saying "set the status" does not.
