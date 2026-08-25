import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assignments } = await supabase
    .from("course_assignments")
    .select(`
      id,
      status,
      due_date,
      courses (
        id,
        title,
        description,
        thumbnail_url
      )
    `)
    .eq("user_id", user?.id ?? "");

  const totalCourses = assignments?.length ?? 0;

  const completedCourses =
    assignments?.filter(
      (assignment) => assignment.status === "completed"
    ).length ?? 0;

  const inProgressCourses =
    assignments?.filter(
      (assignment) => assignment.status === "in_progress"
    ).length ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Training Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Track your learning and continue where you left off.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          title="Assigned"
          value={totalCourses}
          icon={<BookOpen size={22} />}
        />

        <DashboardStat
          title="In Progress"
          value={inProgressCourses}
          icon={<Clock3 size={22} />}
        />

        <DashboardStat
          title="Completed"
          value={completedCourses}
          icon={<CheckCircle2 size={22} />}
        />

        <DashboardStat
          title="Completion Rate"
          value={
            totalCourses > 0
              ? `${Math.round(
                  (completedCourses / totalCourses) * 100
                )}%`
              : "0%"
          }
          icon={<TrendingUp size={22} />}
        />
      </div>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            Continue Learning
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your assigned training courses will appear here.
          </p>
        </div>

        {!assignments || assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <BookOpen
                size={28}
                className="text-slate-500"
              />
            </div>

            <h3 className="mt-5 font-semibold text-slate-900">
              No training assigned yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              When training courses are assigned to you, they
              will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => {
              const course = Array.isArray(assignment.courses)
                ? assignment.courses[0]
                : assignment.courses;

              return (
                <div
                  key={assignment.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-32 bg-slate-100" />

                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900">
                      {course?.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {course?.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}