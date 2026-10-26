import { useEffect, useState } from "react";
import { supabase, supabaseSetupError } from "../lib/repo/supabaseClient";

export interface ConnectionHealth {
  supabaseConfigured: boolean;
  authenticated: boolean;
  tablesReachable: boolean;
  message: string;
}

export function useConnectionHealth() {
  const [health, setHealth] = useState<ConnectionHealth>({
    supabaseConfigured: Boolean(supabase),
    authenticated: false,
    tablesReachable: false,
    message: supabaseSetupError() ?? "Checking workspace…",
  });

  useEffect(() => {
    if (!supabase) {
      setHealth({
        supabaseConfigured: false,
        authenticated: false,
        tablesReachable: false,
        message: supabaseSetupError() ?? "Supabase is not configured.",
      });
      return;
    }

    const client = supabase;
    let mounted = true;
    const probe = async () => {
      const { data: sessionData } = await client.auth.getSession();
      const authenticated = Boolean(sessionData.session);
      if (!authenticated) {
        if (!mounted) return;
        setHealth({
          supabaseConfigured: true,
          authenticated: false,
          tablesReachable: false,
          message: "Sign in to load your workspace.",
        });
        return;
      }
      const { error } = await client.from("pull_requests").select("id", { head: true, count: "exact" }).limit(1);
      if (!mounted) return;
      setHealth({
        supabaseConfigured: true,
        authenticated: true,
        tablesReachable: !error,
        message: error ? "Database tables are not reachable for this account." : "Workspace connected.",
      });
    };

    void probe();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => void probe());
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return health;
}
