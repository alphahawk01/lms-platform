import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourseViewer } from "@/components/course-viewer";

type CourseViewerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseViewerPage({
  params,
}: CourseViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load the course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, status")
    .eq("id", id)
    .single();

  if (!course) {
    notFound();
  }

  // Confirm the user is assigned to this course
  const { data: assignment } = await supabase
    .from("course_assignments")
    .select("id, status")
    .eq("course_id", id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  // Only allow viewing published courses that are assigned to the user
  if (course.status !== "published" || !assignment) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/courses"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to My Courses
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            {course.status !== "published"
              ? "This course isn't available yet"
              : "You don't have access to this course"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {course.status !== "published"
              ? "The course hasn't been published. Please check back later."
              : "This course hasn't been assigned to you. Contact your administrator if you think this is a mistake."}
          </p>
        </div>
      </div>
    );
  }

  // Load the full course tree
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, position")
    .eq("course_id", id)
    .order("position", { ascending: true });

  const moduleIds = (modules ?? []).map((m) => m.id);

  const { data: lessons } =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id, module_id, title, lesson_type, position")
          .in("module_id", moduleIds)
          .order("position", { ascending: true })
      : { data: [] };

  const lessonIds = (lessons ?? []).map((l) => l.id);

  const { data: pages } =
    lessonIds.length > 0
      ? await supabase
          .from("lesson_pages")
          .select("id, lesson_id, title, position")
          .in("lesson_id", lessonIds)
          .order("position", { ascending: true })
      : { data: [] };

  const pageIds = (pages ?? []).map((p) => p.id);

  const { data: blocks } =
    pageIds.length > 0
      ? await supabase
          .from("lesson_blocks")
          .select("id, page_id, block_type, content, position")
          .in("page_id", pageIds)
          .order("position", { ascending: true })
      : { data: [] };

  return (
    <CourseViewer
      course={course}
      assignmentId={assignment.id}
      assignmentStatus={assignment.status ?? "not_started"}
      modules={modules ?? []}
      lessons={lessons ?? []}
      pages={pages ?? []}
      blocks={blocks ?? []}
    />
  );
}
