"use client";

import { useMemo, useState } from "react";

export type CoursePerformanceRow = {
  id: string;
  title: string;
  status: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  avgCompletionDays: number | null;
};

type SortKey =
  | "title"
  | "status"
  | "totalAssigned"
  | "completed"
  | "inProgress"
  | "completionRate"
  | "avgCompletionDays";

export function CoursePerformanceTable({
  rows,
}: {
  rows: CoursePerformanceRow[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const view = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return rows
      .filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) &&
          (statusFilter === "all" || r.status === statusFilter)
      )
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title) * dir;
        if (sortBy === "status") return a.status.localeCompare(b.status) * dir;
        const av = (a[sortBy] as number | null) ?? -1;
        const bv = (b[sortBy] as number | null) ?? -1;
        return (av - bv) * dir;
      });
  }, [rows, search, statusFilter, sortBy, sortDir]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses..."
          className="max-w-xs flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pd-red"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-pd-red"
          title="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-pd-red"
          title="Sort by"
        >
          <option value="title">Sort: Course</option>
          <option value="status">Sort: Status</option>
          <option value="totalAssigned">Sort: Assigned</option>
          <option value="completed">Sort: Completed</option>
          <option value="inProgress">Sort: In Progress</option>
          <option value="completionRate">Sort: Completion %</option>
          <option value="avgCompletionDays">Sort: Avg Days</option>
        </select>
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Course
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Assigned
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Completed
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  In Progress
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Completion %
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Avg Days to Complete
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {c.title}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "published"
                          ? "bg-green-100 text-green-700"
                          : c.status === "archived"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.status === "published"
                        ? "Published"
                        : c.status === "archived"
                          ? "Archived"
                          : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {c.totalAssigned}
                  </td>
                  <td className="px-5 py-3 text-green-700">{c.completed}</td>
                  <td className="px-5 py-3 text-amber-700">{c.inProgress}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-pd-red"
                          style={{ width: `${c.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">
                        {c.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {c.avgCompletionDays !== null
                      ? `${c.avgCompletionDays} days`
                      : "—"}
                  </td>
                </tr>
              ))}
              {view.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-right text-xs text-slate-400">
        Showing {view.length} of {rows.length} course
        {rows.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
