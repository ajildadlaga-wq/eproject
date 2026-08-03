import { supabase } from "./supabase";
import type {
  MemberRole, Profile, Project, ProjectMember, Requirement, Risk, SdlcPhase, Task, TaskStatus, TaskUpdate,
} from "./types";

/** Throw on a Postgrest error, otherwise return the data as T. */
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const api = {
  // ---- profiles / users ----
  async listProfiles(): Promise<Profile[]> {
    return check(await supabase.from("profiles").select("id, full_name, role").order("full_name"));
  },
  async updateRole(id: string, role: Profile["role"]): Promise<void> {
    check(await supabase.from("profiles").update({ role }).eq("id", id));
  },
  async createUser(body: { email: string; password: string; full_name: string; role: Profile["role"] }): Promise<{ id: string }> {
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body });
    if (error) throw new Error(error.message);
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as { id: string };
  },

  // ---- projects ----
  async listProjects(): Promise<Project[]> {
    return check(await supabase.from("projects").select("*").order("created_at", { ascending: false }));
  },
  async getProject(id: string): Promise<Project> {
    return check(await supabase.from("projects").select("*").eq("id", id).single());
  },
  async createProject(p: Partial<Project>): Promise<Project> {
    return check(await supabase.from("projects").insert(p).select().single());
  },
  async updateProject(id: string, p: Partial<Project>): Promise<Project> {
    return check(await supabase.from("projects").update(p).eq("id", id).select().single());
  },
  async deleteProject(id: string): Promise<void> {
    check(await supabase.from("projects").delete().eq("id", id));
  },

  // ---- requirements ----
  async listRequirements(projectId: string): Promise<Requirement[]> {
    return check(await supabase.from("requirements").select("*").eq("project_id", projectId).order("created_at"));
  },
  async createRequirement(r: Partial<Requirement>): Promise<Requirement> {
    return check(await supabase.from("requirements").insert(r).select().single());
  },
  async updateRequirement(id: string, r: Partial<Requirement>): Promise<Requirement> {
    return check(await supabase.from("requirements").update(r).eq("id", id).select().single());
  },

  // ---- risks ----
  async listRisks(projectId: string): Promise<Risk[]> {
    return check(await supabase.from("risks").select("*").eq("project_id", projectId).order("created_at"));
  },
  async createRisk(r: Partial<Risk>): Promise<Risk> {
    return check(await supabase.from("risks").insert(r).select().single());
  },
  async listAllRisks(): Promise<Risk[]> {
    return check(await supabase.from("risks").select("*"));
  },
  async updateRisk(id: string, r: Partial<Risk>): Promise<Risk> {
    return check(await supabase.from("risks").update(r).eq("id", id).select().single());
  },
  async deleteRisk(id: string): Promise<void> {
    check(await supabase.from("risks").delete().eq("id", id));
  },

  // ---- tasks ----
  async listTasks(projectId: string): Promise<Task[]> {
    const rows = check<(Task & { assignee: { full_name: string | null } | { full_name: string | null }[] | null })[]>(
      await supabase.from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(full_name)")
        .eq("project_id", projectId).order("planned_start"),
    );
    return rows.map((r) => ({ ...r, assignee: Array.isArray(r.assignee) ? r.assignee[0] : r.assignee }));
  },
  async listAllTasks(): Promise<Task[]> {
    return check(await supabase.from("tasks").select("*").order("planned_start"));
  },
  async createTask(t: Partial<Task>): Promise<Task> {
    return check(await supabase.from("tasks").insert(t).select().single());
  },
  async updateTask(id: string, t: Partial<Task>): Promise<Task> {
    return check(await supabase.from("tasks").update(t).eq("id", id).select().single());
  },
  async deleteTask(id: string): Promise<void> {
    check(await supabase.from("tasks").delete().eq("id", id));
  },
  // Atomic progress update that also records an audit-trail entry.
  async updateTaskProgress(args: {
    taskId: string; progress: number; status?: TaskStatus; what?: string; why?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc("update_task_progress", {
      p_task_id: args.taskId,
      p_progress: args.progress,
      p_status: args.status ?? null,
      p_what: args.what ?? null,
      p_why: args.why ?? null,
    });
    if (error) throw new Error(error.message);
  },

  // ---- approval workflow ----
  // Each transition is a database function, so the rules ("only the assignee
  // submits", "only the manager approves") hold even if someone calls the
  // REST API directly.
  async submitTask(taskId: string, note?: string): Promise<void> {
    const { error } = await supabase.rpc("submit_task", {
      p_task_id: taskId,
      p_note: note ?? null,
    });
    if (error) throw new Error(error.message);
  },
  async approveTask(taskId: string, note?: string): Promise<void> {
    const { error } = await supabase.rpc("approve_task", {
      p_task_id: taskId,
      p_note: note ?? null,
    });
    if (error) throw new Error(error.message);
  },
  async rejectTask(taskId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc("reject_task", {
      p_task_id: taskId,
      p_reason: reason,
    });
    if (error) throw new Error(error.message);
  },

  // ---- audit trail ----
  async listTaskUpdates(projectId: string): Promise<TaskUpdate[]> {
    return check(await supabase.from("task_updates").select("*").eq("project_id", projectId)
      .order("created_at", { ascending: false }));
  },

  // ---- project members ----
  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const rows = check<(Omit<ProjectMember, "profile"> & { profile: Profile | Profile[] | null })[]>(
      await supabase.from("project_members")
        .select("project_id, user_id, member_role, created_at, profile:profiles(id, full_name, role)")
        .eq("project_id", projectId),
    );
    return rows.map((r) => ({ ...r, profile: Array.isArray(r.profile) ? r.profile[0] : r.profile ?? undefined }));
  },
  async addMember(projectId: string, userId: string, role: MemberRole): Promise<void> {
    check(await supabase.from("project_members")
      .upsert({ project_id: projectId, user_id: userId, member_role: role }));
  },
  async removeMember(projectId: string, userId: string): Promise<void> {
    check(await supabase.from("project_members").delete()
      .eq("project_id", projectId).eq("user_id", userId));
  },

  // ---- SDLC phase ----
  async setSdlcPhase(projectId: string, phase: SdlcPhase): Promise<Project> {
    return check(await supabase.from("projects").update({ sdlc_phase: phase }).eq("id", projectId).select().single());
  },
};
