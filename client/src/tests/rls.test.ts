/**
 * RLS permission tests — the security layer, tested against the real
 * (hosted or local) Supabase project using the seeded demo accounts.
 *
 * Skipped automatically when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * absent, so CI without secrets still passes.
 *
 * PostgREST semantics under RLS:
 *   - denied INSERT  -> error (42501)
 *   - denied UPDATE/DELETE -> succeeds but affects 0 rows (empty .select())
 *   - trigger rejection    -> error
 */
import { describe, it, expect } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const APOLLO = "11111111-1111-1111-1111-111111111111";
const PASSWORD = "Password123!";
const T = { timeout: 20_000 };

async function loginAs(email: string): Promise<SupabaseClient> {
  const c = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

describe.skipIf(!url || !anon)("RLS: VIEWER is strictly read-only", () => {
  it("can read projects", T, async () => {
    const c = await loginAs("viewer@pms.local");
    const { data, error } = await c.from("projects").select("id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("cannot insert a risk", T, async () => {
    const c = await loginAs("viewer@pms.local");
    const { error } = await c.from("risks").insert({
      project_id: APOLLO, title: "rls-test viewer risk", probability: 1, impact: 1,
    });
    expect(error).not.toBeNull();
  });

  it("cannot update a task (0 rows affected)", T, async () => {
    const c = await loginAs("viewer@pms.local");
    const { data, error } = await c.from("tasks")
      .update({ percent_complete: 99 }).eq("project_id", APOLLO).select();
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot escalate their own role (guard trigger)", T, async () => {
    const c = await loginAs("viewer@pms.local");
    const uid = (await c.auth.getUser()).data.user!.id;
    const { error } = await c.from("profiles").update({ role: "ADMIN" }).eq("id", uid);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Super Admin/i);
  });
});

describe.skipIf(!url || !anon)("RLS: TEAM_MEMBER can write content but not delete", () => {
  it("can insert a risk, cannot delete it; PM can (cleanup)", T, async () => {
    const editor = await loginAs("editor@pms.local");
    const { data: created, error: insErr } = await editor.from("risks").insert({
      project_id: APOLLO, title: "rls-test editor risk", probability: 1, impact: 1,
    }).select().single();
    expect(insErr).toBeNull();
    expect(created).not.toBeNull();

    // Editor delete is denied -> 0 rows.
    const { data: delByEditor } = await editor.from("risks").delete().eq("id", created!.id).select();
    expect(delByEditor ?? []).toHaveLength(0);

    // The project's PM may delete it (also cleans up the test row).
    const pm = await loginAs("pm@pms.local");
    const { data: delByPm, error: pmErr } = await pm.from("risks").delete().eq("id", created!.id).select();
    expect(pmErr).toBeNull();
    expect(delByPm ?? []).toHaveLength(1);
  });

  it("cannot delete a project (0 rows affected)", T, async () => {
    const c = await loginAs("editor@pms.local");
    const { data, error } = await c.from("projects").delete().eq("id", APOLLO).select();
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot manage project members", T, async () => {
    const c = await loginAs("editor@pms.local");
    const uid = (await c.auth.getUser()).data.user!.id;
    const { error } = await c.from("project_members")
      .upsert({ project_id: APOLLO, user_id: uid, member_role: "TEAM_MEMBER" });
    expect(error).not.toBeNull();
  });
});
