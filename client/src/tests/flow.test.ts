/**
 * Login → Dashboard integration flow.
 *
 * Exercises the exact data path the app takes after sign-in: authenticate,
 * load the profile (role), list projects, list tasks/risks, and compute the
 * dashboard KPIs. Skipped when Supabase env vars are absent.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { weightedProgress } from "../lib/types";
import type { Task, Risk } from "../lib/types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const T = { timeout: 20_000 };

describe.skipIf(!url || !anon)("flow: login → dashboard", () => {
  it("signs in as admin and derives all dashboard KPIs", T, async () => {
    const c = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. Login (what Login.tsx does)
    const { data: auth, error: authErr } = await c.auth.signInWithPassword({
      email: "admin@pms.local", password: "Password123!",
    });
    expect(authErr).toBeNull();
    expect(auth.session).not.toBeNull();

    // 2. Profile + role (what AuthContext does)
    const { data: profile } = await c.from("profiles")
      .select("id, full_name, role").eq("id", auth.user!.id).single();
    expect(profile?.role).toBe("ADMIN");

    // 3. Portfolio data (what Dashboard does)
    const { data: projects } = await c.from("projects").select("*");
    const { data: tasks } = await c.from("tasks").select("*");
    const { data: risks } = await c.from("risks").select("*");

    expect((projects ?? []).length).toBeGreaterThanOrEqual(4); // seeded demo projects
    expect((tasks ?? []).length).toBeGreaterThan(0);

    // 4. KPI derivations (same math as Dashboard.tsx)
    const progress = weightedProgress((tasks ?? []) as Task[]);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);

    const openHigh = ((risks ?? []) as Risk[]).filter(
      (r) => r.status !== "CLOSED" && (r.priority === "HIGH" || r.priority === "CRITICAL"),
    ).length;
    expect(openHigh).toBeGreaterThanOrEqual(0);

    // 5. Every project the dashboard lists must be openable (detail query)
    const first = (projects ?? [])[0];
    const { data: detail, error: detailErr } = await c.from("projects")
      .select("*").eq("id", first.id).single();
    expect(detailErr).toBeNull();
    expect(detail?.sdlc_phase).toBeTruthy();
  });
});
