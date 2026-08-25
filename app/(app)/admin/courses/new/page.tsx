import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateCourseForm } from "@/components/create-course-form";

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/courses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Back to Course Builder
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Create a new course
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Start with the basics. You can add modules, lessons and assessments next.
        </p>

        <div className="mt-8">
          <CreateCourseForm />
        </div>
      </div>
    </div>
  );
}