import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/invite — invite a user by email (admin only)
export async function POST(request: Request) {
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

  const body = await request.json();
  const { email, full_name, role } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Validate the role against the allowed set.
  const allowedRoles = ["learner", "admin", "super_admin"];
  const assignedRole =
    typeof role === "string" && allowedRoles.includes(role)
      ? role
      : "learner";

  const admin = createAdminClient();

  // inviteUserByEmail sends a magic-link invite. The user appears in auth
  // with email_confirmed_at = null until they click the link.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: full_name?.trim() || "",
    },
    // Invited users have no password yet, so route them to the set-password
    // screen after the invite token is verified.
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://training.premierdata-technology.com"}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Assign the role immediately so access is set from the moment of invite.
  // Delete-then-insert avoids relying on a unique constraint on user_id.
  if (data.user) {
    await admin.from("user_roles").delete().eq("user_id", data.user.id);
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: data.user.id, role: assignedRole });

    if (roleError) {
      // The invite succeeded; surface the role issue but don't fail the whole
      // request, since the user was created.
      return NextResponse.json({
        user: data.user,
        warning: `User invited, but role could not be set: ${roleError.message}`,
      });
    }
  }

  return NextResponse.json({ user: data.user });
}
