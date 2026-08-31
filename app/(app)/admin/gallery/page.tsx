"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Trash2,
  FileText,
  Video as VideoIcon,
  ImageIcon,
  HardDrive,
  X,
  AlertTriangle,
} from "lucide-react";

type FileRow = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
};

type Usage = { type: string; name: string };

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function GalleryPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(2147483648);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "document">(
    "all"
  );

  // Delete flow
  const [deleteFile, setDeleteFile] = useState<FileRow | null>(null);
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/files");
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files ?? []);
      setUsedBytes(data.usedBytes ?? 0);
      setLimitBytes(data.limitBytes ?? 2147483648);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openDelete(file: FileRow) {
    setDeleteFile(file);
    setUsage(null);
    setLoadingUsage(true);
    const res = await fetch(`/api/admin/files/${file.id}`);
    if (res.ok) {
      const data = await res.json();
      setUsage(data.usage ?? []);
    }
    setLoadingUsage(false);
  }

  async function confirmDelete() {
    if (!deleteFile) return;
    setDeleting(true);
    await fetch(`/api/admin/files/${deleteFile.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteFile(null);
    load();
  }

  const filtered = files.filter((f) =>
    filter === "all" ? true : f.file_type === filter
  );

  const pct = Math.min(100, (usedBytes / limitBytes) * 100);
  const isFull = usedBytes >= limitBytes;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Gallery
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />
        <p className="mt-4 text-slate-500">
          All files uploaded across your organisation.
        </p>
      </div>

      {/* Storage summary */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HardDrive size={18} className="text-pd-red" />
            Storage Usage
          </div>
          <span className="text-sm text-slate-500">
            {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              isFull
                ? "bg-red-500"
                : pct >= 85
                  ? "bg-amber-500"
                  : "bg-pd-red"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {isFull && (
          <p className="mt-2 text-sm font-medium text-red-600">
            Storage limit reached. Delete files to free up space or upgrade.
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-2">
        {(["all", "image", "video", "document"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              filter === t
                ? "bg-pd-red text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t}
            {t !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {files.filter((f) => f.file_type === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* File grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <ImageIcon size={28} className="text-slate-400" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-900">No files yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Files uploaded to courses, quizzes, and chats will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex h-32 items-center justify-center overflow-hidden bg-slate-100">
                {f.file_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.file_url}
                    alt={f.file_name}
                    className="h-full w-full object-cover"
                  />
                ) : f.file_type === "video" ? (
                  <VideoIcon size={32} className="text-slate-400" />
                ) : (
                  <FileText size={32} className="text-slate-400" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-900">
                  {f.file_name}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {formatBytes(f.size_bytes)}
                  </span>
                  <button
                    onClick={() => openDelete(f)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete modal with usage check */}
      {deleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Delete file?
              </h2>
              <button
                onClick={() => setDeleteFile(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">
                  {deleteFile.file_name}
                </span>{" "}
                ({formatBytes(deleteFile.size_bytes)})
              </p>

              {loadingUsage ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  Checking where this file is used...
                </div>
              ) : usage && usage.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle size={16} />
                    This file is currently in use
                  </div>
                  <p className="mt-1 text-xs text-amber-700">
                    Deleting it will remove it from these places, which may
                    break content:
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {usage.map((u, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {u.type}
                        </span>
                        <span className="truncate">{u.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  This file isn&apos;t used in any course, lesson, quiz, or
                  chat. Safe to delete.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={() => setDeleteFile(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || loadingUsage}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete file"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
