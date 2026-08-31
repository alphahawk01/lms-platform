import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorageUsage } from "@/lib/storage";

// GET /api/admin/files/usage — storage usage for the sidebar bar (admin only)
export async function GET() {
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
  const isAdmin =
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false;

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usage = await getStorageUsage();
  return NextResponse.json(usage);
}
