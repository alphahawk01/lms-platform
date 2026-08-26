"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Video,
  HelpCircle,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  description: string | null;
};

type Module = { id: string; title: string; position: number };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  lesson_type: string;
  position: number;
};
type Page = {
  id: string;
  lesson_id: string;
  title: string;
  position: number;
};
type Block = {
  id: string;
  page_id: string;
  block_type: string;
  content: string | null;
  position: number;
};

type CourseViewerProps = {
  course: Course;
  assignmentId: string;
  assignmentStatus: string;
  modules: Module[];
  lessons: Lesson[];
  pages: Page[];
  blocks: Block[];
};

export function CourseViewer({
  course,
  assignmentId,
  assignmentStatus,
  modules,
  lessons,
  pages,
  blocks,
}: CourseViewerProps) {
  const router = useRouter();
  const supabase = createClient();

  // Flatten lessons in module → lesson order for linear navigation.
  const orderedLessons = useMemo(() => {
    const result: Lesson[] = [];
    for (const m of modules) {
      const modLessons = lessons
        .filter((l) => l.module_id === m.id)
        .sort((a, b) => a.position - b.position);
      result.push(...modLessons);
    }
    return result;
  }, [modules, lessons]);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    orderedLessons[0]?.id ?? null
  );
  const [status, setStatus] = useState(assignmentStatus);
  const [marking, setMarking] = useState(false);

  // Mark as in_progress the first time the learner opens the course.
  useEffect(() => {
    if (status === "not_started") {
      supabase
        .from("course_assignments")
        .update({ status: "in_progress" })
        .eq("id", assignmentId)
        .then(() => {
          setStatus("in_progress");
          router.refresh();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLesson =
    orderedLessons.find((l) => l.id === activeLessonId) ?? null;

  const lessonPages = useMemo(
    () =>
      activeLesson
        ? pages
            .filter((p) => p.lesson_id === activeLesson.id)
            .sort((a, b) => a.position - b.position)
        : [],
    [activeLesson, pages]
  );

  const [pageIndex, setPageIndex] = useState(0);

  // Reset to first page whenever the lesson changes.
  useEffect(() => {
    setPageIndex(0);
  }, [activeLessonId]);

  const currentLessonIndex = orderedLessons.findIndex(
    (l) => l.id === activeLessonId
  );

  async function markComplete() {
    setMarking(true);
    await supabase
      .from("course_assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId);
    setStatus("completed");
    setMarking(false);
    router.refresh();
  }

  function goToLesson(index: number) {
    if (index < 0 || index >= orderedLessons.length) return;
    setActiveLessonId(orderedLessons[index].id);
  }

  const currentPage = lessonPages[pageIndex];
  const isLastLesson = currentLessonIndex === orderedLessons.length - 1;
  const isLastPage = pageIndex === lessonPages.length - 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to My Courses
        </Link>

        {status === "completed" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 size={16} />
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">
            In Progress
          </span>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {course.title}
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Lesson list sidebar */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          {modules.map((m, mi) => {
            const modLessons = lessons
              .filter((l) => l.module_id === m.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={m.id} className="mb-3 last:mb-0">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {mi + 1}. {m.title}
                </p>

                <div className="space-y-0.5">
                  {modLessons.map((lesson) => {
                    const active = lesson.id === activeLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-pd-red/10 font-medium text-pd-red"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <LessonIcon type={lesson.lesson_type} active={active} />
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                  {modLessons.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">
                      No lessons
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Content area */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          {!activeLesson ? (
            <div className="px-8 py-20 text-center text-slate-400">
              This course has no lessons yet.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-8 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  {activeLesson.title}
                </h2>
              </div>

              <div className="px-8 py-8">
                {currentPage ? (
                  <>
                    {currentPage.title && (
                      <h3 className="mb-6 text-2xl font-bold text-slate-900">
                        {currentPage.title}
                      </h3>
                    )}

                    <div className="space-y-6">
                      {blocks
                        .filter((b) => b.page_id === currentPage.id)
                        .sort((a, b) => a.position - b.position)
                        .map((block) => (
                          <ContentBlock key={block.id} block={block} />
                        ))}
                    </div>
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">
                    This lesson has no content yet.
                  </p>
                )}
              </div>

              {/* Page navigation within a lesson */}
              {lessonPages.length > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-8 py-4">
                  <button
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((i) => i - 1)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 disabled:opacity-30"
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>
                  <span className="text-xs text-slate-400">
                    Page {pageIndex + 1} of {lessonPages.length}
                  </span>
                  <button
                    disabled={isLastPage}
                    onClick={() => setPageIndex((i) => i + 1)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 disabled:opacity-30"
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}

              {/* Lesson navigation / complete */}
              <div className="flex items-center justify-between border-t border-slate-200 px-8 py-5">
                <button
                  disabled={currentLessonIndex <= 0}
                  onClick={() => goToLesson(currentLessonIndex - 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                  Previous lesson
                </button>

                {isLastLesson ? (
                  <button
                    onClick={markComplete}
                    disabled={marking || status === "completed"}
                    className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
                  >
                    {marking && <Loader2 size={16} className="animate-spin" />}
                    {status === "completed" ? (
                      <>
                        <CheckCircle2 size={16} />
                        Completed
                      </>
                    ) : (
                      "Mark course complete"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => goToLesson(currentLessonIndex + 1)}
                    className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover"
                  >
                    Next lesson
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonIcon({ type, active }: { type: string; active: boolean }) {
  const cls = active ? "text-pd-red" : "text-slate-400";
  if (type === "video") return <Video size={16} className={cls} />;
  if (type === "quiz") return <HelpCircle size={16} className={cls} />;
  if (type === "assessment")
    return <ClipboardCheck size={16} className={cls} />;
  return <FileText size={16} className={cls} />;
}

function ContentBlock({ block }: { block: Block }) {
  if (block.block_type === "heading") {
    return (
      <h3 className="text-xl font-bold text-slate-900">{block.content}</h3>
    );
  }

  if (block.block_type === "text") {
    return (
      <div
        className="text-base leading-7 text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mb-2 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_strong]:font-bold [&_u]:underline [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: block.content || "" }}
      />
    );
  }

  if (block.block_type === "image") {
    if (!block.content) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={block.content} alt="" className="h-auto w-full rounded-xl" />
    );
  }

  if (block.block_type === "video") {
    if (!block.content) return null;
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
        <video src={block.content} controls className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
      {block.content || ""}
    </div>
  );
}
