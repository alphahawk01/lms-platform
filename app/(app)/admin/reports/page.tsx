import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Users,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Clock,
  Target,
  Award,
  AlertCircle,
} from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Fetch all data in parallel
  const [
    { data: allUsers },
    { data: allCourses },
    { data: allAssignments },
    { data: allAttempts },
    { data: allAnswers },
    { data: allQuestions },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("courses").select("id, title, status"),
    supabase
      .from("course_assignments")
      .select("id, course_id, user_id, status, assigned_at, completed_at"),
    supabase
      .from("quiz_attempts")
      .select(
        "id, lesson_id, user_id, score, max_score, percentage, passed, started_at, completed_at, time_spent_seconds"
      ),
    supabase
      .from("quiz_answers")
      .select("id, attempt_id, question_id, is_correct"),
    supabase
      .from("quiz_questions")
      .select("id, lesson_id, question_text, question_type"),
  ]);

  const users = allUsers?.users ?? [];
  const courses = allCourses ?? [];
  const assignments = allAssignments ?? [];
  const attempts = allAttempts ?? [];
  const answers = allAnswers ?? [];
  const questions = allQuestions ?? [];

  // --- Overview Metrics ---
  const totalUsers = users.length;
  const totalCourses = courses.length;
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  ).length;
  const inProgressAssignments = assignments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const overallCompletionRate =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;
  const avgQuizScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
            attempts.length
        )
      : 0;
  const quizPassRate =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((a) => a.passed).length / attempts.length) * 100
        )
      : 0;

  // --- User Progress ---
  const userProgress = users.map((u) => {
    const userAssignments = assignments.filter((a) => a.user_id === u.id);
    const completed = userAssignments.filter(
      (a) => a.status === "completed"
    ).length;
    const inProgress = userAssignments.filter(
      (a) => a.status === "in_progress"
    ).length;
    const userAttempts = attempts.filter((a) => a.user_id === u.id);
    const avgScore =
      userAttempts.length > 0
        ? Math.round(
            userAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) /
              userAttempts.length
          )
        : null;

    return {
      id: u.id,
      name: u.user_metadata?.full_name ?? u.email ?? "Unknown",
      email: u.email ?? "",
      assigned: userAssignments.length,
      completed,
      inProgress,
      notStarted: userAssignments.length - completed - inProgress,
      avgQuizScore: avgScore,
      totalAttempts: userAttempts.length,
    };
  });

  // --- Course Performance ---
  const coursePerformance = courses.map((c) => {
    const courseAssignments = assignments.filter((a) => a.course_id === c.id);
    const completed = courseAssignments.filter(
      (a) => a.status === "completed"
    );
    const avgCompletionDays =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, a) => {
              if (!a.completed_at || !a.assigned_at) return sum;
              const diff =
                new Date(a.completed_at).getTime() -
                new Date(a.assigned_at).getTime();
              return sum + diff / (1000 * 60 * 60 * 24);
            }, 0) / completed.length
          )
        : null;

    return {
      id: c.id,
      title: c.title,
      status: c.status,
      totalAssigned: courseAssignments.length,
      completed: completed.length,
      inProgress: courseAssignments.filter((a) => a.status === "in_progress")
        .length,
      completionRate:
        courseAssignments.length > 0
          ? Math.round((completed.length / courseAssignments.length) * 100)
          : 0,
      avgCompletionDays,
    };
  });

  // --- Quiz Analytics ---
  // Group attempts by lesson_id (each quiz is a lesson)
  const quizLessonIds = [...new Set(attempts.map((a) => a.lesson_id))];
  const quizAnalytics = quizLessonIds.map((lessonId) => {
    const quizAttempts = attempts.filter((a) => a.lesson_id === lessonId);
    const quizQuestions = questions.filter((q) => q.lesson_id === lessonId);
    const avgScore =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) /
              quizAttempts.length
          )
        : 0;
    const passRate =
      quizAttempts.length > 0
        ? Math.round(
            (quizAttempts.filter((a) => a.passed).length /
              quizAttempts.length) *
              100
          )
        : 0;
    const avgTime =
      quizAttempts.filter((a) => a.time_spent_seconds).length > 0
        ? Math.round(
            quizAttempts
              .filter((a) => a.time_spent_seconds)
              .reduce((s, a) => s + (a.time_spent_seconds ?? 0), 0) /
              quizAttempts.filter((a) => a.time_spent_seconds).length
          )
        : null;
    const uniqueUsers = new Set(quizAttempts.map((a) => a.user_id)).size;
    const avgAttemptsPerUser =
      uniqueUsers > 0
        ? Math.round((quizAttempts.length / uniqueUsers) * 10) / 10
        : 0;

    return {
      lessonId,
      totalAttempts: quizAttempts.length,
      uniqueUsers,
      avgAttemptsPerUser,
      avgScore,
      passRate,
      avgTimeSeconds: avgTime,
      questionCount: quizQuestions.length,
    };
  });

  // --- Question Accuracy ---
  const questionAccuracy = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.question_id === q.id);
    const total = qAnswers.length;
    const correct = qAnswers.filter((a) => a.is_correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

    return {
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      totalAnswers: total,
      correctAnswers: correct,
      incorrectAnswers: total - correct,
      accuracy,
    };
  });

  // Sort by accuracy (most incorrect first)
  const mostDifficult = [...questionAccuracy]
    .filter((q) => q.totalAnswers > 0)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100));

  const mostCorrect = [...questionAccuracy]
    .filter((q) => q.totalAnswers > 0)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Reports
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />
        <p className="mt-4 text-slate-500">
          Platform analytics and learner performance tracking.
        </p>
      </div>

      {/* Overview stats */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={totalUsers}
            icon={<Users size={20} />}
          />
          <StatCard
            title="Total Courses"
            value={totalCourses}
            icon={<BookOpen size={20} />}
          />
          <StatCard
            title="Completion Rate"
            value={`${overallCompletionRate}%`}
            icon={<CheckCircle2 size={20} />}
            highlight={overallCompletionRate === 100}
          />
          <StatCard
            title="Avg Quiz Score"
            value={`${avgQuizScore}%`}
            icon={<Target size={20} />}
          />
          <StatCard
            title="Assignments"
            value={totalAssignments}
            icon={<TrendingUp size={20} />}
          />
          <StatCard
            title="Completed"
            value={completedAssignments}
            icon={<Award size={20} />}
          />
          <StatCard
            title="In Progress"
            value={inProgressAssignments}
            icon={<Clock size={20} />}
          />
          <StatCard
            title="Quiz Pass Rate"
            value={`${quizPassRate}%`}
            icon={<Target size={20} />}
          />
        </div>
      </section>

      {/* User Progress */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          User Progress
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    User
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Assigned
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Completed
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    In Progress
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Not Started
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Avg Quiz %
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Quiz Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userProgress.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{u.assigned}</td>
                    <td className="px-5 py-3 text-green-700">{u.completed}</td>
                    <td className="px-5 py-3 text-amber-700">{u.inProgress}</td>
                    <td className="px-5 py-3 text-slate-500">{u.notStarted}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {u.avgQuizScore !== null ? `${u.avgQuizScore}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {u.totalAttempts}
                    </td>
                  </tr>
                ))}
                {userProgress.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Course Performance */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Course Performance
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Course
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Assigned
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Completed
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    In Progress
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Completion %
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-700">
                    Avg Days to Complete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coursePerformance.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {c.title}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {c.totalAssigned}
                    </td>
                    <td className="px-5 py-3 text-green-700">{c.completed}</td>
                    <td className="px-5 py-3 text-amber-700">{c.inProgress}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-pd-red"
                            style={{ width: `${c.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {c.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {c.avgCompletionDays !== null
                        ? `${c.avgCompletionDays} days`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {coursePerformance.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      No courses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quiz Analytics */}
      {quizAnalytics.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Quiz Analytics
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Quiz
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Questions
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Attempts
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Users
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Avg Attempts/User
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Avg Score
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Pass Rate
                    </th>
                    <th className="px-5 py-3 font-semibold text-slate-700">
                      Avg Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quizAnalytics.map((q) => (
                    <tr key={q.lessonId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        Quiz {q.lessonId.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.questionCount}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.totalAttempts}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.uniqueUsers}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.avgAttemptsPerUser}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.avgScore}%
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            q.passRate >= 80
                              ? "bg-green-100 text-green-700"
                              : q.passRate >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {q.passRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {q.avgTimeSeconds !== null
                          ? q.avgTimeSeconds >= 60
                            ? `${Math.round(q.avgTimeSeconds / 60)}m ${q.avgTimeSeconds % 60}s`
                            : `${q.avgTimeSeconds}s`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Question Accuracy — Most Difficult */}
      {mostDifficult.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <AlertCircle size={20} className="text-red-500" />
              Most Difficult Questions
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              {mostDifficult.slice(0, 10).map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {q.question_text || "Untitled question"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {q.incorrectAnswers} incorrect of {q.totalAnswers} answers
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {q.accuracy}% correct
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CheckCircle2 size={20} className="text-green-500" />
              Easiest Questions
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              {mostCorrect.slice(0, 10).map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {q.question_text || "Untitled question"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {q.correctAnswers} correct of {q.totalAnswers} answers
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    {q.accuracy}% correct
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              highlight ? "text-green-600" : "text-slate-900"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ${
            highlight
              ? "bg-green-100 text-green-600"
              : "bg-pd-red/10 text-pd-red"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
