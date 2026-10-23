import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

export function supabaseSetupError(): string | null {
  return supabase ? null : "Supabase is not configured yet. Copy .env.example to .env.local and add your project URL and publishable key.";
}
