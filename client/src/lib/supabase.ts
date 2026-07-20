import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Surface a clear message instead of a cryptic runtime error.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy client/.env.example to client/.env");
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
