import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/unpublish-on-edit
// Sets a course to "draft" if it's currently "published".
// Accepts either { course_id } or { lesson_id } (looks up the course via module).
// This ensures admins must re-publish after making changes.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  let courseId = body.course_id as string | undefined;

  // If lesson_id is provided, look up the course via lesson → module → course
  if (!courseId && body.lesson_id) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("module_id")
      .eq("id", body.lesson_id)
      .single();

    if (lesson) {
      const { data: mod } = await supabase
        .from("modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .single();

      if (mod) {
        courseId = mod.course_id;
      }
    }
  }

  // If module_id is provided, look up the course directly
  if (!courseId && body.module_id) {
    const { data: mod } = await supabase
      .from("modules")
      .select("course_id")
      .eq("id", body.module_id)
      .single();

    if (mod) {
      courseId = mod.course_id;
    }
  }

  if (!courseId) {
    return NextResponse.json({ error: "Could not determine course" }, { status: 400 });
  }

  // Only unpublish if currently published
  const { data: course } = await supabase
    .from("courses")
    .select("status")
    .eq("id", courseId)
    .single();

  if (course?.status === "published") {
    await supabase
      .from("courses")
      .update({ status: "draft" })
      .eq("id", courseId);

    return NextResponse.json({ unpublished: true });
  }

  return NextResponse.json({ unpublished: false });
}
