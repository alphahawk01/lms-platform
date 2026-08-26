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

// GET /api/admin/course-categories?course_id=... — list a course's category ids
export async function GET(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");

  if (!courseId) {
    return NextResponse.json(
      { error: "course_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_category_links")
    .select("category_id")
    .eq("course_id", courseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    category_ids: (data ?? []).map((r) => r.category_id),
  });
}

// PUT /api/admin/course-categories — replace a course's category links
// body: { course_id: string, category_ids: string[] }
export async function PUT(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const courseId = body.course_id as string | undefined;
  const categoryIds = Array.isArray(body.category_ids)
    ? (body.category_ids as string[])
    : [];

  if (!courseId) {
    return NextResponse.json(
      { error: "course_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Replace: clear existing links, then insert the new set.
  const { error: delError } = await admin
    .from("course_category_links")
    .delete()
    .eq("course_id", courseId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (categoryIds.length > 0) {
    const rows = categoryIds.map((category_id) => ({
      course_id: courseId,
      category_id,
    }));

    const { error: insError } = await admin
      .from("course_category_links")
      .insert(rows);

    if (insError) {
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: categoryIds.length });
}
