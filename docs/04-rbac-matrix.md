# RBAC Permission Matrix

Roles are managed by the **Super Admin**. Each role inherits a strict permission boundary,
enforced in the database by **Row-Level Security** policies and reflected in role-aware navigation.

## Roles

- **SUPER_ADMIN** — platform owner; manages users/roles and everything else.
- **PROJECT_MANAGER** — owns projects; full control over their projects' content.
- **EDITOR** — contributes content (requirements, tasks, risks) but cannot administer.
- **VIEWER** — strictly read-only; cannot write anywhere.

## Matrix

| Capability | Super Admin | Project Manager | Editor | Viewer |
|------------|:-----------:|:---------------:|:------:|:------:|
| Create/manage users & roles | ✅ | ❌ | ❌ | ❌ |
| Create project | ✅ | ✅ | ❌ | ❌ |
| Edit / delete project | ✅ | ✅ (own) | ❌ | ❌ |
| Set methodology & SDLC phase | ✅ | ✅ (own) | ❌ | ❌ |
| Create/edit requirements | ✅ | ✅ | ✅ | ❌ |
| Baseline requirements | ✅ | ✅ | ❌ | ❌ |
| Create/edit risks | ✅ | ✅ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ✅ | ❌ |
| View dashboard & data | ✅ | ✅ | ✅ | ✅ |

## Enforcement

- **Database (authoritative):** Row-Level Security policies use the `auth_role()` helper
  (reads `profiles.role`). Write policies are granted only to the roles above; PMs are further
  restricted to projects where `manager_id = auth.uid()`. Viewers get `SELECT`-only policies.
- **Client (convenience):** `ProtectedRoute` blocks unauthenticated access; navigation and action
  buttons are conditionally rendered from `useAuth().role`. The UI never grants access RLS denies.
