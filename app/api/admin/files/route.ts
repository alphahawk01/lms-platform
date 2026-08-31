import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin =
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false;
  return isAdmin ? user : null;
}

// GET /api/admin/files — list all files + storage usage/limit
export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: files } = await admin
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: settings } = await admin
    .from("storage_settings")
    .select("limit_bytes")
    .eq("id", 1)
    .single();

  const usedBytes = (files ?? []).reduce(
    (sum, f) => sum + (f.size_bytes ?? 0),
    0
  );

  return NextResponse.json({
    files: files ?? [],
    usedBytes,
    limitBytes: settings?.limit_bytes ?? 2147483648,
  });
}

// POST /api/admin/files — record an uploaded file
// body: { file_name, file_url, r2_key, file_type, size_bytes }
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { file_name, file_url, r2_key, file_type, size_bytes } = body;

  if (!file_url || !r2_key) {
    return NextResponse.json(
      { error: "file_url and r2_key are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("files")
    .insert({
      file_name: file_name || "file",
      file_url,
      r2_key,
      file_type: file_type || "document",
      size_bytes: size_bytes || 0,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ file: data });
}
