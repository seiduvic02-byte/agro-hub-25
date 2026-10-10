import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { supabase } from "@/lib/supabase";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = async () => {
  if (!supabase) throw new Error("Google sign-in is not configured");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("provider is not enabled")) {
      throw new Error("Google sign-in is disabled for this Supabase project. Enable the Google provider to continue.");
    }
    throw error;
  }
};
