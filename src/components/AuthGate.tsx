import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/repo/supabaseClient";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <div className="grid min-h-screen place-items-center text-xs text-zinc-500">Checking Supabase session…</div>;

  const client = supabase;
  const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const authUsersUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/users`
    : "https://supabase.com/dashboard";
  const authSettingsUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers`
    : "https://supabase.com/dashboard";

  if (!client || !session) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <section className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.025] p-6 shadow-2xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Assist Ledger · private workspace</p>
          <h1 className="mt-3 text-xl font-medium text-zinc-100">Sign in to your ledger</h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Your imported repository data is scoped to your Supabase account. Create your first user in the Supabase dashboard to avoid the limited confirmation-email sender.</p>
          {!supabase ? <p className="mt-4 text-xs text-rose-300">Add your Supabase URL and publishable key to `.env.local`, then restart the app.</p> : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={authUsersUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-white/10 px-3 py-2 text-xs text-emerald-200 hover:bg-white/[0.04]">Add my user in Supabase</a>
                <a href={authSettingsUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">Auth settings</a>
              </div>
              <form className="mt-5 space-y-3" onSubmit={(event) => void authenticate(event)}>
              <label className="block text-[11px] text-zinc-400">Email
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-300/40" />
              </label>
              <label className="block text-[11px] text-zinc-400">Password
                <input required type="password" minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-300/40" />
              </label>
              {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
              {message ? <p role="status" className="text-xs text-emerald-300">{message}</p> : null}
              <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-300 px-3 py-2 text-xs font-medium text-zinc-950 disabled:opacity-50">{busy ? "Please wait…" : "Sign in"}</button>
              </form>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-end gap-2 border-b border-white/10 px-4 py-1.5 text-[10px] text-zinc-500">
        <span>Signed in as {session.user.email}</span>
        <button type="button" onClick={() => void client.auth.signOut()} className="text-zinc-300 hover:text-white">Sign out</button>
      </div>
      {children}
    </div>
  );
}
