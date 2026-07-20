# Project Requirements Document — Project Management System (PMS)

**Document status:** Baseline v1.1
**Prepared per:** PMP / PMBOK alignment (Scope, Schedule, Risk knowledge areas)

---

## 1. Purpose

Deliver a web-based Project Management System that supports **Agile, Waterfall, and Hybrid**
delivery, enforces **role-based access control**, and tracks two governance **baselines**
(business requirements and the risk register) with a **Gantt dashboard** that highlights schedule
bottlenecks across the standard **SDLC phases**.

## 2. Business Requirements Baseline

| ID | Requirement | Priority |
|----|-------------|----------|
| BR-01 | Support Agile, Waterfall, and Hybrid methodologies per project. | High |
| BR-02 | Maintain a versioned business-requirements baseline. | High |
| BR-03 | Maintain a risk register categorizing risks by priority. | High |
| BR-04 | Provide PMP-standard templates (charter, WBS, RACI) for new projects. | Medium |
| BR-05 | Visualize timeline vs. actual progress on a Gantt dashboard. | High |
| BR-06 | Automatically detect and highlight bottlenecks/delays. | High |
| BR-07 | Enforce RBAC (Super Admin, Project Manager, Editor, Viewer). | High |
| BR-08 | Align projects to SDLC phases (Requirements → Deployment). | High |

## 3. Functional Requirements

- **FR-01** Super Admin can create users and assign roles.
- **FR-02** Users authenticate with email + password (Supabase Auth session/JWT).
- **FR-03** Project Managers create/edit projects, set methodology and SDLC phase.
- **FR-04** Editors create/edit requirements, tasks, and risks.
- **FR-05** Viewers have strictly read-only access (no writes anywhere).
- **FR-06** Requirements can be "baselined" — snapshotted with a version number.
- **FR-07** Risks compute priority from probability × impact (5×5 matrix).
- **FR-08** Tasks carry planned vs. actual dates and % complete with dependencies.
- **FR-09** Dashboard renders a Gantt chart and a Bottlenecks panel.

## 4. Non-Functional Requirements

- **NFR-01 Security:** Supabase Auth (managed password hashing); **Row-Level Security** enforces
  least-privilege RBAC in the database, not just the UI.
- **NFR-02 Performance:** Dashboard queries return < 500 ms for ≤ 500 tasks.
- **NFR-03 Usability:** Responsive UI; role-aware navigation hides forbidden actions.
- **NFR-04 Maintainability:** Typed end-to-end (TypeScript); custom logic isolated in Edge Functions.
- **NFR-05 Portability:** Runs both locally (Supabase CLI / Docker) and against a hosted project.

## 5. Scope

**In scope:** RBAC, projects, requirements baseline, risk register, tasks/scheduling, Gantt
dashboard, bottleneck detection, PMP templates.

**Out of scope (first iteration):** SSO/SAML, multi-tenancy, billing, email notifications,
mobile native apps, time-tracking/timesheets, file attachments.

## 6. Success Criteria

- All four roles enforce their permission boundaries (verified by tests).
- A PM can create an Agile, a Waterfall, and a Hybrid project.
- An overdue task is flagged as a bottleneck on the dashboard.
- Risk priority is correctly derived from probability × impact.
