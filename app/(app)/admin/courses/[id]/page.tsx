import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  ClipboardCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AddModuleForm } from "@/components/add-module-form";
import { AddLessonForm } from "@/components/add-lesson-form";
import { CoursePublishButton } from "@/components/course-publish-button";
import { EditCourseDetails } from "@/components/edit-course-details";

type CourseEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  lesson_type: string;
  position: number;
};

export default async function CourseEditorPage({
  params,
}: CourseEditorPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // Get course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // Get modules
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  if (modulesError) {
    console.error("MODULES ERROR:", modulesError);
  }

  // Get lessons for all modules
  const moduleIds = modules?.map((module) => module.id) ?? [];

  const { data: lessons, error: lessonsError } =
    moduleIds.length > 0
      ? await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("position", { ascending: true })
      : { data: [], error: null };

  if (lessonsError) {
    console.error("LESSONS ERROR:", lessonsError);
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Back */}
      <Link
        href="/admin/courses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Back to Course Builder
      </Link>

      {/* Course Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${course.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
                }`}
            >
              {course.status === "published"
                ? "Published"
                : "Draft"}
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              {course.title}
            </h1>

            {course.description && (
              <p className="mt-3 max-w-3xl text-slate-500">
                {course.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <CoursePublishButton
              courseId={course.id}
              status={course.status}
            />

            <EditCourseDetails
              courseId={course.id}
              title={course.title}
              description={course.description}
              categoryId={course.category_id ?? null}
            />
          </div>
        </div>
      </div>

      {/* Content Header */}
      <div className="mt-8 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Course Content
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Organise your training into modules and lessons.
          </p>
        </div>

        <AddModuleForm courseId={course.id} />
      </div>

      {/* Empty State */}
      {!modules || modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BookOpen size={30} className="text-slate-500" />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            Start building your course
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Add your first module, then organise it with lessons,
            videos, images, quizzes and assessments.
          </p>

          <div className="mt-6">
            <AddModuleForm courseId={course.id} />
          </div>
        </div>
      ) : (
        /* Modules */
        <div className="space-y-5">
          {modules.map((module, moduleIndex) => {
            const moduleLessons =
              lessons?.filter(
                (lesson: Lesson) =>
                  lesson.module_id === module.id
              ) ?? [];

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {/* Module Header */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                      {moduleIndex + 1}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {module.title}
                      </h3>

                      {module.description && (
                        <p className="mt-1 text-sm text-slate-500">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <AddLessonForm moduleId={module.id} />
                </div>

                {/* Lessons */}
                <div className="border-t border-slate-200 bg-slate-50">
                  {moduleLessons.length === 0 ? (
                    <div className="px-6 py-5 text-sm text-slate-400">
                      No lessons yet. Add your first lesson.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {moduleLessons.map((lesson: Lesson) => (
                        <Link
                          key={lesson.id}
                          href={`/admin/courses/${id}/lessons/${lesson.id}`}
                          className="flex items-center gap-4 px-6 py-4 transition hover:bg-white"
                        >
                          <LessonIcon
                            type={lesson.lesson_type}
                          />

                          <span className="font-medium text-slate-700">
                            {lesson.title}
                          </span>

                          <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs capitalize text-slate-400">
                            {lesson.lesson_type}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LessonIcon({
  type,
}: {
  type: string;
}) {
  const className = "text-slate-400";

  if (type === "video") {
    return <Video size={19} className={className} />;
  }

  if (type === "quiz") {
    return <HelpCircle size={19} className={className} />;
  }

  if (type === "assessment") {
    return (
      <ClipboardCheck
        size={19}
        className={className}
      />
    );
  }

  return <FileText size={19} className={className} />;
}