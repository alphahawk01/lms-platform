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

  return (
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false
  );
}

// GET /api/admin/categories — list all categories (admin only)
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

// POST /api/admin/categories — create a new category (admin only)
export async function POST(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Category name is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Avoid duplicates (case-insensitive)
  const { data: existing } = await admin
    .from("course_categories")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ category: existing });
  }

  const { data, error } = await admin
    .from("course_categories")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
