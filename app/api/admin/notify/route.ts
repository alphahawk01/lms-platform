import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendNotification,
  type NotificationTemplate,
} from "@/lib/notifications";

// POST /api/admin/notify — send notification emails to selected users.
// body: { user_ids: string[], template, course_id?, custom_subject?, custom_message? }
export async function POST(request: Request) {
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

  const body = await request.json();
  const {
    user_ids,
    template,
    course_id,
    custom_subject,
    custom_message,
  } = body as {
    user_ids?: string[];
    template?: NotificationTemplate;
    course_id?: string;
    custom_subject?: string;
    custom_message?: string;
  };

  if (!Array.isArray(user_ids) || user_ids.length === 0 || !template) {
    return NextResponse.json(
      { error: "user_ids and template are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Course title (for course-related templates)
  let courseTitle = "";
  if (course_id) {
    const { data: course } = await admin
      .from("courses")
      .select("title")
      .eq("id", course_id)
      .single();
    courseTitle = course?.title ?? "";
  }

  // Get the user records (email + name + optional due date for the course)
  const { data: allUsers } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  // Due dates per user for this course (for due_soon template)
  const dueDateMap = new Map<string, string | null>();
  if (course_id) {
    const { data: assignments } = await admin
      .from("course_assignments")
      .select("user_id, due_date")
      .eq("course_id", course_id)
      .in("user_id", user_ids);
    for (const a of assignments ?? []) {
      dueDateMap.set(a.user_id, a.due_date);
    }
  }

  const targets = (allUsers?.users ?? []).filter((u) =>
    user_ids.includes(u.id)
  );

  let sent = 0;
  let failed = 0;

  for (const u of targets) {
    if (!u.email) {
      failed++;
      continue;
    }

    try {
      await sendNotification(u.email, template, {
        fullName:
          profileMap.get(u.id) ??
          (u.user_metadata?.full_name as string) ??
          "",
        courseTitle,
        dueDate: dueDateMap.get(u.id) ?? null,
        customSubject: custom_subject,
        customMessage: custom_message,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
