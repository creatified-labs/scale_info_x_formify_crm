// src/integrations/supabase/client.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;

  // Access env vars safely - Next.js replaces these at build time
  const SUPABASE_URL = typeof process !== 'undefined' && process.env ?
    process.env.NEXT_PUBLIC_SUPABASE_URL :
    (globalThis as any).NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = typeof process !== 'undefined' && process.env ?
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY :
    (globalThis as any).NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      storageKey: "formify-crm-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

if (typeof window !== "undefined") {
  const setAuthCookie = (token: string | null | undefined) => {
    const secure = window.location.protocol === "https:";
    const attrs = ["Path=/", "SameSite=Lax"];
    if (secure) attrs.push("Secure");
    if (token) {
      // Give access tokens a week-long cookie window; Supabase refresh events will keep it updated
      attrs.push("Max-Age=604800");
      document.cookie = `sb-access-token=${token}; ${attrs.join("; ")}`;
    } else {
      document.cookie = `sb-access-token=; ${attrs.join("; ")}; Max-Age=0`;
    }
  };

  // Defer initialization until after module load to ensure env vars are available
  setTimeout(() => {
    try {
      // Ensure cookie reflects current session immediately on load
      supabase.auth.getSession().then(({ data }) => {
        setAuthCookie(data.session?.access_token ?? null);
      });

      // Keep cookie in sync with any auth changes (login, refresh, logout)
      supabase.auth.onAuthStateChange((_event, session) => {
        setAuthCookie(session?.access_token ?? null);
      });

      // DEV ONLY: expose for console debugging
      if (!(window as any).supabase) {
        (window as any).supabase = supabase;
      }
    } catch (error) {
      console.error("Failed to initialize Supabase auth:", error);
    }
  }, 0);
}
