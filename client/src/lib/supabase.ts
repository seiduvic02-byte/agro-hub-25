import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function syncSupabaseSession(accessToken?: string) {
  const token = accessToken ?? (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!token) return false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/auth/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessToken: token }),
      });
      if (response.ok) return true;
      const details = await response.json().catch(() => null);
      console.warn("[v0] Workspace session sync rejected", response.status, details?.error ?? "unknown error");
    } catch (error) {
      console.warn("[v0] Workspace session sync failed", error);
    }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}
