import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateCourseButton } from "@/components/create-course-button";
import { CourseCard } from "@/components/course-card";

export default async function CourseBuilderPage() {
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

  // Try to include categories via the join table; if the category schema
  // isn't set up yet, fall back to a plain course query so the list still works.
  const withCategory = await supabase
    .from("courses")
    .select("*, course_category_links ( course_categories ( name ) )")
    .order("created_at", { ascending: false });

  const plain = withCategory.error
    ? await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
    : null;

  const courses = ((withCategory.error
    ? plain?.data
    : withCategory.data) ?? []) as unknown as CourseRow[];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Course Builder
          </h1>

          <p className="mt-2 text-slate-500">
            Create and manage your training courses.
          </p>
        </div>

        <CreateCourseButton />
      </div>

      {!courses || courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BookOpen size={30} className="text-slate-500" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            No courses yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Create your first course and start building training for your team.
          </p>

          <div className="mt-6">
            <CreateCourseButton label="Create your first course" />
          </div>
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