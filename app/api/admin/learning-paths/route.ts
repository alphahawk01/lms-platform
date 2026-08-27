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

// GET /api/admin/learning-paths — list all paths with courses and assignment counts
export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: paths } = await admin
    .from("learning_paths")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: pathCourses } = await admin
    .from("learning_path_courses")
    .select("id, path_id, course_id, position, courses ( id, title, status )")
    .order("position", { ascending: true });

  const { data: assignments } = await admin
    .from("learning_path_assignments")
    .select("id, path_id, user_id, assigned_at, completed_at");

  // Enrich paths
  const enriched = (paths ?? []).map((p) => ({
    ...p,
    courses: (pathCourses ?? [])
      .filter((pc) => pc.path_id === p.id)
      .sort((a, b) => a.position - b.position),
    assignment_count: (assignments ?? []).filter((a) => a.path_id === p.id)
      .length,
  }));

  return NextResponse.json({ paths: enriched });
}

// POST /api/admin/learning-paths — create a new path
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, course_ids } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: path, error } = await admin
    .from("learning_paths")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add courses in order
  if (Array.isArray(course_ids) && course_ids.length > 0) {
    const rows = course_ids.map((courseId: string, idx: number) => ({
      path_id: path.id,
      course_id: courseId,
      position: idx,
    }));

    await admin.from("learning_path_courses").insert(rows);
  }

  return NextResponse.json({ path });
}

// PUT /api/admin/learning-paths — update a path (title, description, course order)
export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, title, description, course_ids } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update path metadata
  if (title !== undefined || description !== undefined) {
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined)
      updates.description = description?.trim() || null;

    await admin.from("learning_paths").update(updates).eq("id", id);
  }

  // Replace course order if provided
  if (Array.isArray(course_ids)) {
    await admin.from("learning_path_courses").delete().eq("path_id", id);

    if (course_ids.length > 0) {
      const rows = course_ids.map((courseId: string, idx: number) => ({
        path_id: id,
        course_id: courseId,
        position: idx,
      }));

      await admin.from("learning_path_courses").insert(rows);
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/learning-paths?id=...
export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("learning_paths").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
