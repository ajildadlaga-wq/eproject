export type Role = "SUPER_ADMIN" | "PROJECT_MANAGER" | "EDITOR" | "VIEWER";
export type SdlcPhase =
  | "REQUIREMENTS" | "DEVELOPMENT" | "UAT" | "SYSTEM_TESTING" | "STAGING" | "DEPLOYMENT";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RequirementType = "BUSINESS" | "FUNCTIONAL" | "NON_FUNCTIONAL";
export type RequirementStatus = "DRAFT" | "BASELINED" | "APPROVED" | "IMPLEMENTED" | "VERIFIED";
export type RiskCategory = "TECHNICAL" | "SCHEDULE" | "COST" | "RESOURCE" | "SCOPE" | "EXTERNAL";
export type RiskStatus = "OPEN" | "MITIGATING" | "CLOSED";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

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
  assignee?: { full_name: string | null } | null; // joined
}

export type MemberRole = "EDITOR" | "VIEWER";

export interface TaskUpdate {
  id: string; task_id: string; project_id: string;
  user_id: string | null; user_name: string | null;
  progress_before: number | null; progress_after: number | null;
  what_happened: string | null; why_changed: string | null; created_at: string;
}

export interface ProjectMember {
  project_id: string; user_id: string; member_role: MemberRole; created_at: string;
  // joined profile (when selected with profiles)
  profile?: Profile;
}

// Weight a task's contribution to overall progress by priority.
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 3,
};

export function weightedProgress(tasks: { percent_complete: number; priority: Priority }[]): number {
  if (tasks.length === 0) return 0;
  const w = (p: Priority) => PRIORITY_WEIGHT[p] ?? 2; // default weight if priority missing
  const totalW = tasks.reduce((s, t) => s + w(t.priority), 0);
  if (totalW === 0) return 0;
  const done = tasks.reduce((s, t) => s + w(t.priority) * t.percent_complete, 0);
  return Math.round(done / totalW);
}
