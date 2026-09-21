"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  Trash2,
  FileText,
  Video as VideoIcon,
  ImageIcon,
  HardDrive,
  X,
  AlertTriangle,
  Download,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) +
    " " +
    d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
}

type SortKey = "name" | "type" | "date" | "size";

export default function GalleryPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(2147483648);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "document">(
    "all"
  );

  // Explorer view controls
  const [view, setView] = useState<"gallery" | "list">("list");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "size" ? "desc" : "asc");
    }
  }

  // Preview flow
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);

  // Delete flow
  const [deleteFile, setDeleteFile] = useState<FileRow | null>(null);
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Storage-limit edit flow
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitGb, setLimitGb] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState("");

  function openLimitEditor() {
    setLimitGb((limitBytes / 1073741824).toString());
    setLimitError("");
    setEditingLimit(true);
  }

  async function saveLimit() {
    const gb = parseFloat(limitGb);
    if (!Number.isFinite(gb) || gb <= 0) {
      setLimitError("Enter a valid size in GB.");
      return;
    }
    setSavingLimit(true);
    setLimitError("");
    const res = await fetch("/api/admin/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit_bytes: Math.round(gb * 1073741824) }),
    });
    if (res.ok) {
      const data = await res.json();
      setLimitBytes(data.limitBytes ?? Math.round(gb * 1073741824));
      setEditingLimit(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setLimitError(data.error || "Could not update the limit.");
    }
    setSavingLimit(false);
  }

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

  const filtered = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return files
      .filter((f) => (filter === "all" ? true : f.file_type === filter))
      .sort((a, b) => {
        switch (sortKey) {
          case "name":
            return a.file_name.localeCompare(b.file_name) * dir;
          case "type":
            return a.file_type.localeCompare(b.file_type) * dir;
          case "size":
            return (a.size_bytes - b.size_bytes) * dir;
          case "date":
          default:
            return (
              (new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()) *
              dir
            );
        }
      });
  }, [files, filter, sortKey, sortDir]);

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
            </span>
            {!editingLimit && (
              <button
                onClick={openLimitEditor}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Edit limit
              </button>
            )}
          </div>
        </div>

        {editingLimit && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="text-sm font-medium text-slate-700">
              Storage limit
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={limitGb}
              onChange={(e) => setLimitGb(e.target.value)}
              className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-pd-red"
              autoFocus
            />
            <span className="text-sm text-slate-500">GB</span>
            <button
              onClick={saveLimit}
              disabled={savingLimit}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-pd-red px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
            >
              {savingLimit && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
            <button
              onClick={() => setEditingLimit(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            {limitError && (
              <span className="text-xs text-red-600">{limitError}</span>
            )}
          </div>
        )}

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

      {/* Explorer toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="flex gap-1.5">
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

        <div className="ml-auto flex items-center gap-3">
          {/* Sort (used mainly in gallery view; list view sorts via headers) */}
          <select
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":");
              setSortKey(k as SortKey);
              setSortDir(d as "asc" | "desc");
            }}
            className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-pd-red"
            title="Sort"
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="name:asc">Name (A–Z)</option>
            <option value="name:desc">Name (Z–A)</option>
            <option value="size:desc">Size (large→small)</option>
            <option value="size:asc">Size (small→large)</option>
            <option value="type:asc">Type</option>
          </select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${
                view === "list"
                  ? "bg-pd-red text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="List view"
            >
              <ListIcon size={16} />
              List
            </button>
            <button
              onClick={() => setView("gallery")}
              className={`flex items-center gap-1.5 border-l border-slate-300 px-3 py-1.5 text-sm font-medium transition ${
                view === "gallery"
                  ? "bg-pd-red text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Gallery view"
            >
              <LayoutGrid size={16} />
              Gallery
            </button>
          </div>
        </div>
      </div>

      {/* Files */}
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
      ) : view === "list" ? (
        /* LIST (Details) VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                <tr>
                  <SortHeader
                    label="Name"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                  <SortHeader
                    label="Type"
                    active={sortKey === "type"}
                    dir={sortDir}
                    onClick={() => toggleSort("type")}
                  />
                  <SortHeader
                    label="Date uploaded"
                    active={sortKey === "date"}
                    dir={sortDir}
                    onClick={() => toggleSort("date")}
                  />
                  <SortHeader
                    label="Size"
                    active={sortKey === "size"}
                    dir={sortDir}
                    onClick={() => toggleSort("size")}
                  />
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer hover:bg-slate-50/60"
                    onClick={() => setPreviewFile(f)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileTypeThumb file={f} />
                        <span className="truncate font-medium text-slate-900">
                          {f.file_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-500">
                      {f.file_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {formatDate(f.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {formatBytes(f.size_bytes)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDelete(f);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GALLERY (icon) VIEW */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <button
                onClick={() => setPreviewFile(f)}
                className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-slate-100"
                title="View file"
              >
                {f.file_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.file_url}
                    alt={f.file_name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : f.file_type === "video" ? (
                  <VideoIcon size={32} className="text-slate-400" />
                ) : (
                  <FileText size={32} className="text-slate-400" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/40 group-hover:text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                    <ExternalLink size={13} />
                    View
                  </span>
                </span>
              </button>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-900">
                  {f.file_name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDate(f.created_at)}
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

      {/* Preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <p className="truncate text-sm font-semibold text-slate-900">
                {previewFile.file_name}
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                </a>
                <a
                  href={previewFile.file_url}
                  download={previewFile.file_name}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Download"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-900/95 p-4">
              {previewFile.file_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              ) : previewFile.file_type === "video" ? (
                <video
                  src={previewFile.file_url}
                  controls
                  autoPlay
                  className="max-h-[70vh] max-w-full rounded-lg"
                >
                  Your browser does not support video playback.
                </video>
              ) : previewFile.file_url
                  .toLowerCase()
                  .split("?")[0]
                  .endsWith(".pdf") ? (
                <iframe
                  src={previewFile.file_url}
                  title={previewFile.file_name}
                  className="h-[70vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                    <FileText size={32} className="text-white/70" />
                  </div>
                  <p className="max-w-sm text-sm text-white/70">
                    This file type can&apos;t be previewed here. Open it in a
                    new tab or download it to view.
                  </p>
                  <a
                    href={previewFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <ExternalLink size={16} />
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
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

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-2.5 font-semibold text-slate-700">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 transition hover:text-pd-red"
      >
        {label}
        <span className="text-xs text-slate-400">
          {active ? (dir === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}

function FileTypeThumb({ file }: { file: FileRow }) {
  if (file.file_type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.file_url}
        alt={file.file_name}
        className="h-8 w-8 shrink-0 rounded object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100">
      {file.file_type === "video" ? (
        <VideoIcon size={16} className="text-slate-400" />
      ) : (
        <FileText size={16} className="text-slate-400" />
      )}
    </span>
  );
}
