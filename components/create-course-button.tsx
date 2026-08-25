"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type CreateCourseButtonProps = {
  label?: string;
};

export function CreateCourseButton({
  label = "Create Course",
}: CreateCourseButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push("/admin/courses/new");
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      <Plus size={18} />
      {label}
    </button>
  );
}