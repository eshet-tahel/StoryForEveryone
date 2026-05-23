import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/env";
import type { Database } from "@/lib/supabase/types";

export const createClient = () =>
  createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
