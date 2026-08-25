import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/users — lists all users (admin only)
export async function GET() {
  // Verify the caller is an admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = roles?.some(
    (r) => r.role === "admin" || r.role === "super_admin"
  );

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use admin client to list all auth users
  const admin = createAdminClient();
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all profiles and roles in bulk to enrich
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name");

  const { data: allRoles } = await admin
    .from("user_roles")
    .select("user_id, role");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  const roleMap = new Map(
    (allRoles ?? []).map((r) => [r.user_id, r.role])
  );

  // Build user list with status
  const userList = users.map((u) => {
    let status: "active" | "invited" = "active";

    // If the user hasn't confirmed their email (invited via admin),
    // or has no confirmed_at, they're still in "invited" state
    if (!u.email_confirmed_at) {
      status = "invited";
    }

    return {
      id: u.id,
      email: u.email ?? "",
      full_name:
        profileMap.get(u.id) ??
        u.user_metadata?.full_name ??
        "",
      role: roleMap.get(u.id) ?? "learner",
      status,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    };
  });

  return NextResponse.json({ users: userList });
}
