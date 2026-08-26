"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Pencil, X } from "lucide-react";

type Category = { id: string; name: string };

type EditCourseDetailsProps = {
  courseId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
};

export function EditCourseDetails({
  courseId,
  title,
  description,
  categoryId,
}: EditCourseDetailsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editCategoryId, setEditCategoryId] = useState(categoryId ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesAvailable, setCategoriesAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    // Reset fields to current values each time it opens
    setEditTitle(title);
    setEditDescription(description ?? "");
    setEditCategoryId(categoryId ?? "");
    setError("");

    // Load categories (if the feature is set up)
    fetch("/api/admin/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);
          setCategoriesAvailable(true);
        }
      })
      .catch(() => {});
  }, [open, title, description, categoryId]);

  async function handleSave() {
    if (!editTitle.trim()) {
      setError("Please enter a course title.");
      return;
    }

    setSaving(true);
    setError("");

    const baseUpdate = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    };

    // Try updating with category; fall back if the column isn't set up.
    let result = await supabase
      .from("courses")
      .update({ ...baseUpdate, category_id: editCategoryId || null })
      .eq("id", courseId);

    if (result.error && /category_id/.test(result.error.message)) {
      result = await supabase
        .from("courses")
        .update(baseUpdate)
        .eq("id", courseId);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil size={18} />
        Edit details
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit course details
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Course title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                />
              </div>

              {categoriesAvailable && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
