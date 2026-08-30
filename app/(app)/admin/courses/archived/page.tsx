import { ArrowLeft, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/course-card";

export default async function ArchivedCoursesPage() {
  const supabase = await createClient();

  type CourseRow = {
    id: string;
    title: string;
    status: string;
    thumbnail_url: string | null;
    description: string | null;
    course_category_links?: {
      course_categories: { name: string } | { name: string }[] | null;
    }[];
  };

  const withCategory = await supabase
    .from("courses")
    .select("*, course_category_links ( course_categories ( name ) )")
    .eq("status", "archived")
    .order("created_at", { ascending: false });

  const plain = withCategory.error
    ? await supabase
        .from("courses")
        .select("*")
        .eq("status", "archived")
        .order("created_at", { ascending: false })
    : null;

  const courses = ((withCategory.error
    ? plain?.data
    : withCategory.data) ?? []) as unknown as CourseRow[];

  return (
    <div className="mx-auto max-w-7xl">
      <a
        href="/admin/courses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Back to Course Builder
      </a>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Archived Courses
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />
        <p className="mt-4 text-slate-500">
          Courses that have been archived. Unarchive to make them editable and
          available again.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Archive size={28} className="text-slate-400" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-900">
            No archived courses
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            When you archive a course, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const categoryNames = (course.course_category_links ?? [])
              .map((link) => {
                const cc = link.course_categories;
                return Array.isArray(cc) ? cc[0]?.name : cc?.name;
              })
              .filter((n): n is string => Boolean(n));

            return (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                status={course.status}
                thumbnailUrl={course.thumbnail_url}
                description={course.description}
                categoryNames={categoryNames}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
