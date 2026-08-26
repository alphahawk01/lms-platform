import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Calendar } from "lucide-react";

type CourseInfo = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  course_category_links?: {
    course_categories: { name: string } | { name: string }[] | null;
  }[];
};

function extractCategoryNames(course: CourseInfo | null): string[] {
  const links = course?.course_category_links;
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      const cc = link.course_categories;
      if (Array.isArray(cc)) return cc[0]?.name;
      return cc?.name;
    })
    .filter((n): n is string => Boolean(n));
}

type Assignment = {
  id: string;
  status: string | null;
  due_date: string | null;
  courses: CourseInfo | CourseInfo[] | null;
};

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  not_started: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

export default async function CoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assignments } = await supabase
    .from("course_assignments")
    .select(
      `
      id,
      status,
      due_date,
      courses (
        id,
        title,
        description,
        thumbnail_url,
        course_category_links (
          course_categories ( name )
        )
      )
    `
    )
    .eq("user_id", user?.id ?? "");

  const list = (assignments ?? []) as Assignment[];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My Courses
        </h1>

        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />

        <p className="mt-4 text-slate-500">
          Courses that have been assigned to you.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pd-red/10">
            <BookOpen size={28} className="text-pd-red" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-900">
            No courses assigned yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            When courses are allocated to you, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((assignment) => {
            const course = Array.isArray(assignment.courses)
              ? assignment.courses[0]
              : assignment.courses;

            if (!course) return null;

            const status = assignment.status ?? "not_started";

            return (
              <Link
                key={assignment.id}
                href={`/courses/${course.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-pd-navy to-pd-navy-surface">
                  {course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen size={36} className="text-white/70" />
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusStyles[status] ?? statusStyles.not_started
                      }`}
                    >
                      {statusLabels[status] ?? "Not Started"}
                    </span>

                    {extractCategoryNames(course).map((name) => (
                      <span
                        key={name}
                        className="inline-flex rounded-full bg-pd-red/10 px-2.5 py-1 text-xs font-medium text-pd-red"
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-3 font-semibold text-slate-900">
                    {course.title}
                  </h2>

                  {course.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {course.description}
                    </p>
                  )}

                  {assignment.due_date && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={14} />
                      Due{" "}
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
