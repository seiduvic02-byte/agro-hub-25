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
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") ?? params.get("error");
      if (oauthError) {
        if (!cancelled) navigate(`/?auth_error=${encodeURIComponent(oauthError)}`, { replace: true });
        return;
      }

      const code = params.get("code");
      let data: { session: { access_token: string } | null };
      let error: { message: string } | null = null;
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        data = result.data;
        error = result.error;
      } else {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessTokenFromHash = hashParams.get("access_token");
        const refreshTokenFromHash = hashParams.get("refresh_token");
        if (accessTokenFromHash && refreshTokenFromHash) {
          const result = await supabase.auth.setSession({ access_token: accessTokenFromHash, refresh_token: refreshTokenFromHash });
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase.auth.getSession();
          data = result.data;
          error = result.error;
        }
      }
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        if (!cancelled) navigate(`/?auth_error=${encodeURIComponent(error?.message ?? "sign_in_failed")}`, { replace: true });
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
