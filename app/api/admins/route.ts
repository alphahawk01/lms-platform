import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admins — returns the list of admins (for learners to start a
// direct conversation with). Any authenticated user can call this.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find admin user ids
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "super_admin"]);

  const adminIds = Array.from(
    new Set((roleRows ?? []).map((r) => r.user_id))
  );

  if (adminIds.length === 0) {
    return NextResponse.json({ admins: [] });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", adminIds);

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: authUsers } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const admins = adminIds
    .filter((id) => id !== user.id)
    .map((id) => ({
      id,
      full_name: nameMap.get(id) || "",
      email: emailMap.get(id) || "",
      role: "admin",
    }));

  return NextResponse.json({ admins });
}
