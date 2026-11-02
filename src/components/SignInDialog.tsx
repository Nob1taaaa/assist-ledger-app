import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase, supabaseSetupError } from "../lib/repo/supabaseClient";

const INPUT = "mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-300/40";

export function SignInDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) setError(authError.message);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
        className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Assist Ledger · private workspace</p>
        <h2 id="sign-in-title" className="mt-3 text-xl font-medium text-zinc-100">Sign in to your ledger</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Import a GitHub repository and see its real pull-request telemetry. Imported data is scoped to your account.
        </p>

        {supabase ? (
          <form className="mt-5 space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block text-[11px] text-zinc-400">Email
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT} />
            </label>
            <label className="block text-[11px] text-zinc-400">Password
              <input required type="password" minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={INPUT} />
            </label>
            {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-300 px-3 py-2 text-xs font-medium text-zinc-950 disabled:opacity-50">
              {busy ? "Please wait…" : "Sign in"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-rose-300">{supabaseSetupError()}</p>
        )}

        <button type="button" onClick={onClose} className="mt-4 text-xs text-zinc-500 hover:text-zinc-300">
          Keep exploring the demo
        </button>
      </section>
    </div>
  );
}
