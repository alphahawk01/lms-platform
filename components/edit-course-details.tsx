"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Pencil, X, Check } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";

type Category = { id: string; name: string };

type EditCourseDetailsProps = {
  courseId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
};

export function EditCourseDetails({
  courseId,
  title,
  description,
  thumbnailUrl,
}: EditCourseDetailsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editThumbnail, setEditThumbnail] = useState(thumbnailUrl ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [categoriesAvailable, setCategoriesAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEditTitle(title);
    setEditDescription(description ?? "");
    setEditThumbnail(thumbnailUrl ?? "");
    setError("");

    // Load all categories
    fetch("/api/admin/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);
          setCategoriesAvailable(true);
        }
      })
      .catch(() => {});

    // Load this course's current category links
    fetch(`/api/admin/course-categories?course_id=${courseId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.category_ids) {
          setSelectedCategories(new Set(data.category_ids));
        }
      })
      .catch(() => {});
  }, [open, title, description, courseId]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!editTitle.trim()) {
      setError("Please enter a course title.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: updErr } = await supabase
      .from("courses")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        thumbnail_url: editThumbnail.trim() || null,
      })
      .eq("id", courseId);

    if (updErr) {
      setError(updErr.message);
      setSaving(false);
      return;
    }

    // Replace category links
    if (categoriesAvailable) {
      await fetch("/api/admin/course-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          category_ids: Array.from(selectedCategories),
        }),
      });
    }

    setSaving(false);
    setOpen(false);

    // Unpublish course on edit
    fetch("/api/admin/unpublish-on-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId }),
    });

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

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Course thumbnail
                </label>
                <div className="mt-2">
                  <ImageUpload
                    value={editThumbnail}
                    onChange={(url) => setEditThumbnail(url)}
                  />
                </div>
              </div>

              {categoriesAvailable && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Categories
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const selected = selectedCategories.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            selected
                              ? "border-pd-red bg-pd-red/10 text-pd-red"
                              : "border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {selected && <Check size={14} />}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
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
