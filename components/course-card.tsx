"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  MoreHorizontal,
  Pencil,
  Type,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CourseCardProps = {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string | null;
  description: string | null;
  categoryNames: string[];
};

export function CourseCard({
  id,
  title,
  status,
  thumbnailUrl,
  description,
  categoryNames,
}: CourseCardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking] = useState(false);

  const isArchived = status === "archived";

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleRename() {
    if (!newTitle.trim()) return;
    setWorking(true);
    await supabase
      .from("courses")
      .update({ title: newTitle.trim() })
      .eq("id", id);
    setWorking(false);
    setRenaming(false);
    router.refresh();
  }

  async function handleArchiveToggle() {
    setWorking(true);
    setMenuOpen(false);
    await supabase
      .from("courses")
      .update({ status: isArchived ? "draft" : "archived" })
      .eq("id", id);
    setWorking(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("courses").delete().eq("id", id);
    setDeleting(false);
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg ${
        isArchived ? "opacity-60" : ""
      }`}
    >
      {/* Card body — clicking navigates to editor */}
      <a href={`/admin/courses/${id}`} className="block">
        <div className="flex h-36 items-center justify-center bg-slate-100">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen size={36} className="text-slate-400" />
          )}
        </div>

        <div className="p-5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                status === "published"
                  ? "bg-green-100 text-green-700"
                  : status === "archived"
                    ? "bg-slate-200 text-slate-500"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {status === "published"
                ? "Published"
                : status === "archived"
                  ? "Archived"
                  : "Draft"}
            </span>

            {categoryNames.map((name) => (
              <span
                key={name}
                className="inline-flex rounded-full bg-pd-red/10 px-2.5 py-1 text-xs font-medium text-pd-red"
              >
                {name}
              </span>
            ))}
          </div>

          <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>

          {description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      </a>

      {/* Three-dot menu button */}
      <div ref={menuRef} className="absolute right-4 top-[152px] z-10">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          className="rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
        >
          {working ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <MoreHorizontal size={18} />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <a
              href={`/admin/courses/${id}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={15} />
              Edit
            </a>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setNewTitle(title);
                setRenaming(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Type size={15} />
              Rename
            </button>
            <button
              type="button"
              onClick={handleArchiveToggle}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              {isArchived ? (
                <>
                  <ArchiveRestore size={15} />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive size={15} />
                  Archive
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Rename course
              </h2>
              <button
                onClick={() => setRenaming(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-pd-red"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRenaming(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={working || !newTitle.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-pd-red-hover disabled:opacity-50"
              >
                {working && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete course?
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              This permanently deletes{" "}
              <span className="font-medium text-slate-700">{title}</span> and
              all its modules, lessons, and quizzes. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
