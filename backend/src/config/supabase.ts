import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

type SupabaseClient = ReturnType<typeof createClient>;

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
    );
  }

  if (
    env.supabaseServiceRoleKey === "your_service_role_key" ||
    env.supabaseServiceRoleKey === "your_service_role_key_here"
  ) {
    throw new Error(
      "Invalid Supabase service role key in backend/.env. Replace SUPABASE_SERVICE_ROLE_KEY with the real key from Supabase Dashboard > Project Settings > API > service_role."
    );
  }

  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return client;
}

export const supabase = {
  from: (table: string) => (getSupabaseClient() as any).from(table)
} as const;

export { getSupabaseClient };
