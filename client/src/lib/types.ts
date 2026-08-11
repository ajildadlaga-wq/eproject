export type Role = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
export type SdlcPhase =
  | "REQUIREMENTS" | "DEVELOPMENT" | "UAT" | "SYSTEM_TESTING" | "STAGING" | "DEPLOYMENT";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RequirementType = "BUSINESS" | "FUNCTIONAL" | "NON_FUNCTIONAL";
export type RequirementStatus = "DRAFT" | "BASELINED" | "APPROVED" | "IMPLEMENTED" | "VERIFIED";
export type RiskCategory = "TECHNICAL" | "SCHEDULE" | "COST" | "RESOURCE" | "SCOPE" | "EXTERNAL";
export type RiskStatus = "OPEN" | "MITIGATING" | "CLOSED";
/**
 * DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED → UNDER_REVIEW
 *                                        → APPROVED | REJECTED
 * BLOCKED sits outside the happy path — work can stall at any point.
 */
export type TaskStatus =
  | "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED"
  | "COMPLETED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export const TASK_STATUSES: TaskStatus[] = [
  "DRAFT", "ASSIGNED", "IN_PROGRESS", "BLOCKED",
  "COMPLETED", "UNDER_REVIEW", "APPROVED", "REJECTED",
];

/** Statuses a manager may set directly when creating or editing a task. */
export const ASSIGNABLE_STATUSES: TaskStatus[] = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "BLOCKED"];

/** Approved work is finished work; nothing else counts towards progress. */
export const isApproved = (t: { status: TaskStatus }) => t.status === "APPROVED";
/** Waiting on the manager. */
export const isAwaitingReview = (t: { status: TaskStatus }) => t.status === "UNDER_REVIEW";
/** Still open — used for the overdue check. */
export const isOpen = (t: { status: TaskStatus }) => t.status !== "APPROVED";

export const SDLC_PHASES: SdlcPhase[] = [
  "REQUIREMENTS", "DEVELOPMENT", "UAT", "SYSTEM_TESTING", "STAGING", "DEPLOYMENT",
];
export const SDLC_LABELS: Record<SdlcPhase, string> = {
  REQUIREMENTS: "Requirement Definition & Analysis",
  DEVELOPMENT: "System Development / Coding",
  UAT: "User Acceptance Testing",
  SYSTEM_TESTING: "System Testing",
  STAGING: "Environment Separation / Staging",
  DEPLOYMENT: "Deployment",
};

export interface Profile { id: string; full_name: string | null; role: Role; }

export interface Project {
  id: string; name: string; description: string | null;
  sdlc_phase: SdlcPhase;
  start_date: string | null; end_date: string | null; manager_id: string | null;
}

export interface Requirement {
  id: string; project_id: string; title: string; description: string | null;
  type: RequirementType; priority: Priority; status: RequirementStatus;
  baseline_version: number | null;
}

export interface Risk {
  id: string; project_id: string; title: string; description: string | null;
  category: RiskCategory; probability: number; impact: number; priority: Priority;
  owner: string | null; mitigation: string | null; status: RiskStatus;
}

export interface Task {
  id: string; project_id: string; name: string;
  planned_start: string | null; planned_end: string | null;
  actual_start: string | null; actual_end: string | null;
  percent_complete: number; status: TaskStatus; depends_on: string[];
  assignee_id: string | null; sprint_name: string | null; phase: SdlcPhase | null;
  priority: Priority;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;   // required when a task is sent back
  assignee?: { full_name: string | null } | null; // joined
}

export type MemberRole = "TEAM_MEMBER" | "VIEWER";

export interface TaskUpdate {
  id: string; task_id: string; project_id: string;
  user_id: string | null; user_name: string | null;
  progress_before: number | null; progress_after: number | null;
  what_happened: string | null; why_changed: string | null; created_at: string;
}

/** One line of the append-only audit trail. Written by the database, never
 *  by the client — the API grants no insert, update or delete on this table. */
export interface AuditEntry {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;          // TASK_APPROVED, ROLE_CHANGED, …
  entity: string;          // task, project, profile
  entity_id: string | null;
  project_id: string | null;
  summary: string | null;
  detail: Record<string, unknown> | null;
}

/** The actions the database records, in the order they matter to a reviewer. */
export const AUDIT_ACTIONS = [
  "TASK_SUBMITTED", "TASK_APPROVED", "TASK_REJECTED",
  "PROJECT_REASSIGNED", "ROLE_CHANGED",
] as const;

export interface ProjectMember {
  project_id: string; user_id: string; member_role: MemberRole; created_at: string;
  // joined profile (when selected with profiles)
  profile?: Profile;
}

// Weight a task's contribution to overall progress by priority.
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 3,
};

/**
 * Project progress counts approved work only.
 *
 * A task the assignee has marked finished but the manager has not signed off
 * contributes nothing. That is the rule the whole system exists to enforce, so
 * a task sitting at 100% in review still reads as 0% here — deliberately.
 */
export function weightedProgress(tasks: { status: TaskStatus; priority: Priority }[]): number {
  if (tasks.length === 0) return 0;
  const w = (p: Priority) => PRIORITY_WEIGHT[p] ?? 2; // default weight if priority missing
  const totalW = tasks.reduce((s, t) => s + w(t.priority), 0);
  if (totalW === 0) return 0;
  const approved = tasks.reduce((s, t) => s + (isApproved(t) ? w(t.priority) : 0), 0);
  return Math.round((100 * approved) / totalW);
}
