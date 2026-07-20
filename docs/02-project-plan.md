# Project Plan — Project Management System (PMS)

**Document status:** Baseline v1.0 · PMP-aligned

---

## 1. Methodology Selection Guidance

| Methodology | When to use | How the PMS models it |
|-------------|-------------|------------------------|
| **Agile** | Evolving requirements, iterative delivery | Tasks grouped into **Sprints**; backlog + % complete |
| **Waterfall** | Fixed scope, sequential phases | Tasks grouped into **Phases** aligned to SDLC |
| **Hybrid** | Stable core + iterative add-ons | Tasks may belong to either a Sprint *or* a Phase |

The methodology is a property of each **Project** (`AGILE | WATERFALL | HYBRID`).

## 2. SDLC Phase Definitions

Projects advance through standard SDLC phases (the `sdlcPhase` field):

1. **Requirement Definition & Analysis** (`REQUIREMENTS`) — elicit, document, baseline requirements.
2. **System Development / Coding** (`DEVELOPMENT`) — build features.
3. **User Acceptance Testing** (`UAT`) — business validates against requirements.
4. **System Testing** (`SYSTEM_TESTING`) — integration/system-level QA.
5. **Environment Separation / Staging** (`STAGING`) — release candidate in a staging environment.
6. **Deployment** (`DEPLOYMENT`) — production release.

## 3. Work Breakdown Structure (WBS) — Build of the PMS itself

```
1. Foundations
   1.1 Repo scaffold (server + client)
   1.2 Database + Prisma schema
   1.3 PMP documentation
2. Auth & RBAC
   2.1 User model + JWT auth
   2.2 requireRole middleware
   2.3 Admin user-management UI
3. Projects & Baselines
   3.1 Project CRUD (+ methodology, SDLC phase)
   3.2 Requirements baseline
   3.3 Risk register
4. Dashboard & Gantt
   4.1 Tasks + dependencies
   4.2 Gantt (planned vs actual)
   4.3 Bottleneck detection + KPIs
5. Hardening
   5.1 Tests   5.2 Validation   5.3 Docs polish
```

## 4. Milestones

| Milestone | Exit criteria |
|-----------|---------------|
| M1 Foundations done | App scaffolds run; DB migrates; docs published |
| M2 Auth/RBAC done | All four roles enforce boundaries |
| M3 Baselines done | Requirements/stakeholders/risks CRUD live with priority calc |
| M4 Dashboard done | Gantt renders; bottlenecks flagged |
| M5 Release | Tests green; README complete |

## 5. Team Definition — RACI Template

| Activity | Super Admin | Project Manager | Editor | Viewer |
|----------|:----:|:----:|:----:|:----:|
| User & role management | **R/A** | I | – | – |
| Project setup | A | **R** | C | I |
| Requirements baseline | I | **A** | R | I |
| Risk management | I | **A** | R | I |
| Schedule / tasks | I | **A** | R | I |
| Reporting / dashboard | I | A | C | **I (view-only)** |

R = Responsible · A = Accountable · C = Consulted · I = Informed
