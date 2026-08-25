"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send, Undo2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type CoursePublishButtonProps = {
  courseId: string;
  status: string | null;
};

export function CoursePublishButton({
  courseId,
  status,
}: CoursePublishButtonProps) {
  const router = useRouter();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const isPublished = status === "published";

  async function handleStatusChange() {
    const newStatus = isPublished
      ? "draft"
      : "published";

    setIsUpdating(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase
      .from("courses")
      .update({
        status: newStatus,
      })
      .eq("id", courseId);

    if (error) {
      setError(error.message);
      setIsUpdating(false);
      return;
    }

    router.refresh();
    setIsUpdating(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleStatusChange}
        disabled={isUpdating}
        className={
          isPublished
            ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isUpdating ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            Updating...
          </>
        ) : isPublished ? (
          <>
            <Undo2 size={18} />
            Unpublish Course
          </>
        ) : (
          <>
            <Send size={18} />
            Publish Course
          </>
        )}
      </button>

      {isPublished && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
          <CheckCircle2 size={14} />
          Course is live
        </span>
      )}

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}