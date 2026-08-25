import { BookOpen, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateCourseButton } from "@/components/create-course-button";

export default async function CourseBuilderPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

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
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-36 items-center justify-center bg-slate-100">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen size={36} className="text-slate-400" />
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        course.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {course.status === "published"
                        ? "Published"
                        : "Draft"}
                    </span>

                    <h2 className="mt-3 font-semibold text-slate-900">
                      {course.title}
                    </h2>
                  </div>

                  <MoreHorizontal
                    size={20}
                    className="text-slate-400"
                  />
                </div>

                {course.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                    {course.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}