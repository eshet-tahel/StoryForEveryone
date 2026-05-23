import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/env";
import type { Database } from "@/lib/supabase/types";

export const createClient = async () => {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // setAll was called from a Server Component — safe to ignore
        // when middleware refreshes the user session.
      }
    },
  };

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    { cookies: cookieMethods },
  );
};
