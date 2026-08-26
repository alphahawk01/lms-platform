"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";

type Category = { id: string; name: string };

export function CreateCourseForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New category inline creation
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.trim()) return;
    setCreatingCategory(true);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim() }),
    });

    const data = await res.json();
    setCreatingCategory(false);

    if (!res.ok) {
      setError(data.error || "Failed to create category.");
      return;
    }

    // Add to list, select it, and reset the inline form
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === data.category.id);
      return exists ? prev : [...prev, data.category];
    });
    setCategoryId(data.category.id);
    setNewCategory("");
    setAddingCategory(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a course title.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not signed in.");
      setSaving(false);
      return;
    }

    const baseInsert = {
      title: title.trim(),
      description: description.trim() || null,
      status: "draft",
      created_by: user.id,
    };

    // Try inserting with category_id; if the column doesn't exist yet,
    // fall back to creating the course without it.
    let created = await supabase
      .from("courses")
      .insert({ ...baseInsert, category_id: categoryId || null })
      .select()
      .single();

    if (created.error && /category_id/.test(created.error.message)) {
      created = await supabase
        .from("courses")
        .insert(baseInsert)
        .select()
        .single();
    }

    const { data, error } = created;

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push(`/admin/courses/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-slate-700"
        >
          Course title
        </label>

        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Football Coding Fundamentals"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-slate-700"
          >
            Category
          </label>

          {!addingCategory && (
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-pd-red hover:text-pd-red-hover"
            >
              <Plus size={14} />
              New category
            </button>
          )}
        </div>

        {addingCategory ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Aussie Rules"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={creatingCategory || !newCategory.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-pd-red px-4 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
            >
              {creatingCategory ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Add"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingCategory(false);
                setNewCategory("");
              }}
              className="rounded-xl border border-slate-300 px-3 text-slate-500 transition hover:bg-slate-50"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700"
        >
          Description
        </label>

        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What will learners gain from this course?"
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-3 text-sm font-medium text-white transition hover:bg-pd-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}

          {saving ? "Creating..." : "Create Course"}
        </button>
      </div>
    </form>
  );
}
