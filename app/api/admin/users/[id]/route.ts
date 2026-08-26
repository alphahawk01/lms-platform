import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return roles?.some(
    (r) => r.role === "admin" || r.role === "super_admin"
  ) ?? false;
}

// PATCH /api/admin/users/[id] — update a user's profile (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { full_name, role } = body;

  const admin = createAdminClient();

  // Update profile name if provided
  if (full_name !== undefined) {
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ id, full_name: full_name.trim() }, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // Also update auth user metadata so it stays in sync
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: full_name.trim() },
    });
  }

  // Update role if provided
  if (role !== undefined) {
    // Delete existing role(s) for this user, then insert the new one.
    // This avoids needing a unique constraint on user_id.
    await admin.from("user_roles").delete().eq("user_id", id);

    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: id, role });

    if (roleError) {
      return NextResponse.json(
        { error: roleError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — delete a user (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Delete from auth (cascades to profiles if you have ON DELETE CASCADE,
  // otherwise we clean up manually)
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up profile and roles in case there's no cascade
  await admin.from("profiles").delete().eq("id", id);
  await admin.from("user_roles").delete().eq("user_id", id);

  return NextResponse.json({ success: true });
}
