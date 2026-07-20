// admin-create-user — Edge Function
// Lets a SUPER_ADMIN provision a new user with a role. Uses the service-role
// key (never exposed to the browser) and authorizes the caller by checking
// their own profile role first.
//
// POST { email, password, full_name, role }  ->  { id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const ROLES = ["SUPER_ADMIN", "PROJECT_MANAGER", "EDITOR", "VIEWER"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Identify the caller and confirm they are a SUPER_ADMIN.
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) return json({ error: "Invalid session" }, 401);

    const { data: profile } = await caller
      .from("profiles").select("role").eq("id", userData.user.id).single();
    if (profile?.role !== "SUPER_ADMIN") {
      return json({ error: "Forbidden: requires SUPER_ADMIN" }, 403);
    }

    // 2) Create the user with the service role.
    const { email, password, full_name, role } = await req.json();
    if (!email || !password || !ROLES.includes(role)) {
      return json({ error: "email, password and a valid role are required" }, 400);
    }

    const admin = createClient(url, serviceKey);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ id: data.user?.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
