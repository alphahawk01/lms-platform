import { createClient } from "@supabase/supabase-js";

// Admin client using the service role key. Server-side only — never expose
// this to the browser. Used for auth.admin operations (listUsers, inviteUserByEmail,
// deleteUser, updateUserById).
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
