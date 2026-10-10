import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) {
        navigate("/?auth_error=not_configured", { replace: true });
        return;
      }
      const code = new URLSearchParams(window.location.search).get("code");
      const { data, error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        if (!cancelled) navigate("/?auth_error=sign_in_failed", { replace: true });
        return;
      }
      const response = await fetch("/api/auth/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      if (!cancelled) navigate(response.ok ? "/workspace" : "/?auth_error=sign_in_failed", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return <main className="route-loading" role="status">Completing Google sign-in…</main>;
}
