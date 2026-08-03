// Notifications, derived rather than stored.
//
// Everything worth telling someone about is already in the tasks table: work
// waiting on a manager, work sent back, deadlines closing in. Reading it back
// costs one query the app already makes, and there is no second copy of the
// truth to fall out of step with the first.
//
// Read state lives in localStorage. A notice you have seen is a fact about
// this browser, not about the project, so the database has no business
// knowing it.

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { isOpen } from "./types";
import type { Project, Task } from "./types";

export type NoticeKind = "review" | "rejected" | "overdue" | "due";

export interface Notice {
  id: string;
  kind: NoticeKind;
  taskId: string;
  projectId: string;
  taskName: string;
  projectName: string;
  detail?: string;
  /** Sorts the list; the date the notice is *about*, not when it was made. */
  at: string;
}

/** A deadline this many days out is close enough to mention. */
const DUE_SOON_DAYS = 3;

const READ_KEY = "notices.read";

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  // Keep the list from growing without limit as tasks come and go.
  localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-300)));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function build(tasks: Task[], projects: Project[], userId: string | undefined): Notice[] {
  if (!userId) return [];

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const managed = new Set(projects.filter((p) => p.manager_id === userId).map((p) => p.id));

  const today = iso(new Date());
  const horizon = iso(new Date(Date.now() + DUE_SOON_DAYS * 86_400_000));

  const out: Notice[] = [];
  const add = (t: Task, kind: NoticeKind, at: string, detail?: string) =>
    out.push({
      id: `${kind}:${t.id}:${at}`,
      kind,
      taskId: t.id,
      projectId: t.project_id,
      taskName: t.name,
      projectName: projectName.get(t.project_id) ?? "",
      detail,
      at,
    });

  for (const t of tasks) {
    const mine = t.assignee_id === userId;

    // Waiting on me as the manager of this project.
    if (t.status === "UNDER_REVIEW" && managed.has(t.project_id)) {
      add(t, "review", t.submitted_at ?? t.planned_end ?? today);
      continue;
    }

    // Sent back to me, with the reason the manager gave.
    if (t.status === "REJECTED" && mine) {
      add(t, "rejected", t.reviewed_at ?? today, t.review_note ?? undefined);
      continue;
    }

    // My own deadlines. Approved work is finished and never nags.
    if (mine && isOpen(t) && t.planned_end) {
      if (t.planned_end < today) add(t, "overdue", t.planned_end);
      else if (t.planned_end <= horizon) add(t, "due", t.planned_end);
    }
  }

  // Most pressing first: the manager's queue, then rework, then deadlines.
  const rank: Record<NoticeKind, number> = { review: 0, rejected: 1, overdue: 2, due: 3 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.at.localeCompare(b.at));
}

export function useNotifications(userId: string | undefined) {
  const { data: tasks } = useQuery({ queryKey: ["all_tasks"], queryFn: api.listAllTasks });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const [read, setRead] = useState<Set<string>>(loadRead);

  const notices = build(tasks ?? [], projects ?? [], userId);
  const unread = notices.filter((n) => !read.has(n.id));

  // Drop read ids whose notice has gone, so the store does not accumulate
  // entries for tasks that were approved months ago.
  useEffect(() => {
    if (!tasks || !projects) return;
    const live = new Set(notices.map((n) => n.id));
    const kept = [...read].filter((id) => live.has(id));
    if (kept.length !== read.size) {
      const next = new Set(kept);
      setRead(next);
      saveRead(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects]);

  const markAllRead = useCallback(() => {
    const next = new Set(notices.map((n) => n.id));
    setRead(next);
    saveRead(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects]);

  const markRead = useCallback((id: string) => {
    setRead((cur) => {
      const next = new Set(cur).add(id);
      saveRead(next);
      return next;
    });
  }, []);

  return { notices, unread, unreadCount: unread.length, markAllRead, markRead, isRead: (id: string) => read.has(id) };
}
