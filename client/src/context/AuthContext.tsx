import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile, Role } from "../lib/types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);

      // A reset link lands on "/" — the one path a static host is certain to
      // serve — and arrives as this event once the token in the fragment has
      // been read. Only now do we move to the form, and we move there from
      // inside the running app, where the route exists.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        window.history.replaceState(null, "", "/reset-password");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, role: profile?.role ?? null, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * The admin administers the system, not the projects: users, roles and
 * project ownership are theirs; everything inside a project is read-only.
 * These helpers gate the UI — the database enforces the same split via RLS,
 * so hiding a button is a courtesy, not the security boundary.
 */

/** Roles allowed to create or edit project content. */
export const canWrite = (role: Role | null) =>
  role === "PROJECT_MANAGER" || role === "TEAM_MEMBER";

/** Only project managers own projects. */
export const canManageProjects = (role: Role | null) => role === "PROJECT_MANAGER";

/** Approving work is reserved for the manager who inspected it. */
export const canApprove = (role: Role | null) => role === "PROJECT_MANAGER";

export const isAdmin = (role: Role | null) => role === "ADMIN";

/** Strictly read-only: viewers, and admins inside a project. */
export const isReadOnly = (role: Role | null) => role === "VIEWER" || role === "ADMIN";
