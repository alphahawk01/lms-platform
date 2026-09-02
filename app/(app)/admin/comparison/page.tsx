"use client";

import { useMemo, useState } from "react";
import {
  Upload,
  FileText,
  X,
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRightLeft,
  Clock,
  Download,
} from "lucide-react";
import {
  parseInstances,
  compareInstances,
  formatTime,
  parseTime,
  type Instance,
  type ComparisonRow,
  type MatchStatus,
  type TeamBreakdown,
  type StatBreakdown,
} from "@/lib/comparison/xml-compare";
import {
  generateInsights,
  generateRecommendations,
} from "@/lib/comparison/insights";

type LoadedFile = { name: string; instances: Instance[] };

const STATUS_META: Record<
  MatchStatus,
  { label: string; badge: string; dot: string }
> = {
  exact: {
    label: "Exact",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  wrong_stat: {
    label: "Wrong stat",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  wrong_player: {
    label: "Wrong player",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  wrong_team: {
    label: "Wrong team",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  missed: {
    label: "Missed",
    badge: "bg-slate-200 text-slate-700",
    dot: "bg-slate-400",
  },
  extra: {
    label: "Extra",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
};

const TONE_META = {
  positive: {
    icon: CheckCircle2,
    ring: "border-emerald-200 bg-emerald-50",
    ic1: "text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-200 bg-amber-50",
    ic1: "text-amber-600",
  },
  critical: {
    icon: AlertTriangle,
    ring: "border-red-200 bg-red-50",
    ic1: "text-red-600",
  },
  neutral: {
    icon: Sparkles,
    ring: "border-slate-200 bg-slate-50",
    ic1: "text-slate-500",
  },
};

function Dropzone({
  title,
  subtitle,
  file,
  onLoad,
  onClear,
}: {
  title: string;
  subtitle: string;
  file: LoadedFile | null;
  onLoad: (f: LoadedFile) => void;
  onClear: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    setError(null);
    const f = fileList?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const instances = parseInstances(text);
      if (instances.length === 0) {
        setError("No <instance> entries found in this file.");
        return;
      }
      onLoad({ name: f.name, instances });
    } catch {
      setError("Could not read that file.");
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
          file
            ? "border-emerald-300 bg-emerald-50/50"
            : "border-slate-300 bg-slate-50 hover:border-pd-red hover:bg-red-50/40"
        }`}
      >
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <>
            <FileText className="mb-2 text-emerald-600" size={28} />
            <p className="text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">
              {file.instances.length} instances parsed
            </p>
          </>
        ) : (
          <>
            <Upload className="mb-2 text-slate-400" size={28} />
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </>
        )}
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {file && (
        <button
          onClick={onClear}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
        >
          <X size={13} /> Remove
        </button>
      )}
    </div>
  );
}

function exportStatCsv(stats: StatBreakdown[]) {
  const header = "Statistic Type,Master,Exact,Accuracy %";
  const lines = stats.map(
    (s) =>
      `${JSON.stringify(s.stat)},${s.total},${s.exact},${(
        s.accuracy * 100
      ).toFixed(1)}`
  );
  const totalMaster = stats.reduce((a, s) => a + s.total, 0);
  const totalExact = stats.reduce((a, s) => a + s.exact, 0);
  const totalAcc = totalMaster > 0 ? (totalExact / totalMaster) * 100 : 0;
  lines.push(`Totals,${totalMaster},${totalExact},${totalAcc.toFixed(1)}`);
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stat-breakdown.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function TeamCard({ team }: { team: TeamBreakdown }) {
  const accColor =
    team.accuracy >= 0.9
      ? "text-emerald-600"
      : team.accuracy >= 0.75
        ? "text-amber-600"
        : "text-red-600";
  const barColor =
    team.accuracy >= 0.9
      ? "bg-emerald-500"
      : team.accuracy >= 0.75
        ? "bg-amber-500"
        : "bg-red-500";

  const chips: { label: string; value: number; cls: string }[] = [
    { label: "Exact", value: team.exact, cls: "text-emerald-600" },
    { label: "Wrong stat", value: team.wrongStat, cls: "text-amber-600" },
    { label: "Wrong player", value: team.wrongPlayer, cls: "text-orange-600" },
    { label: "Wrong team", value: team.wrongTeam, cls: "text-red-600" },
    { label: "Missed", value: team.missed, cls: "text-slate-600" },
    { label: "Extra", value: team.extra, cls: "text-purple-600" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-bold text-slate-900">
          {team.team}
        </h3>
        <span className={`text-lg font-bold ${accColor}`}>
          {(team.accuracy * 100).toFixed(1)}%
        </span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${team.accuracy * 100}%` }}
        />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {team.exact}/{team.masterTotal} master instances exact · avg drift{" "}
        {team.avgTimeDrift.toFixed(1)}s
      </p>
      <div className="grid grid-cols-3 gap-2">
        {chips.map((c) => (
          <div
            key={c.label}
            className="rounded-lg bg-slate-50 px-2 py-1.5 text-center"
          >
            <p className={`text-base font-bold ${c.cls}`}>{c.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              {c.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function ComparisonPage() {
  const [master, setMaster] = useState<LoadedFile | null>(null);
  const [analyst, setAnalyst] = useState<LoadedFile | null>(null);
  const [tolerance, setTolerance] = useState(3);
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  // Time range. In "auto" mode we restrict the comparison to the section the
  // analyst actually covered (their first→last timestamp), so a partial
  // analyst file isn't graded against the whole master game.
  const [rangeMode, setRangeMode] = useState<"auto" | "full" | "manual">(
    "auto"
  );
  const [manualStart, setManualStart] = useState(""); // mm:ss
  const [manualEnd, setManualEnd] = useState(""); // mm:ss

  // Auto window: use the covered span of whichever file has fewer instances
  // (the partial-coverage file), regardless of whether that's master or
  // analyst. This restricts the comparison to the section both should cover.
  const analystWindow = useMemo(() => {
    const files = [master, analyst].filter(
      (f): f is LoadedFile => !!f && f.instances.length > 0
    );
    if (files.length === 0) return null;
    // Pick the smaller file (fewest instances).
    const smaller = files.reduce((a, b) =>
      b.instances.length < a.instances.length ? b : a
    );
    const starts = smaller.instances.map((i) => i.start);
    const ends = smaller.instances.map((i) => i.end);
    return {
      start: Math.min(...starts),
      end: Math.max(...ends),
      source: smaller.name,
    };
  }, [master, analyst]);

  // The effective [start, end] window used for the comparison.
  const effectiveRange = useMemo(() => {
    if (rangeMode === "full") return { start: -Infinity, end: Infinity };
    if (rangeMode === "manual") {
      const s = parseTime(manualStart);
      const e = parseTime(manualEnd);
      return {
        start: s ?? -Infinity,
        end: e ?? Infinity,
      };
    }
    // auto
    if (analystWindow)
      return { start: analystWindow.start, end: analystWindow.end };
    return { start: -Infinity, end: Infinity };
  }, [rangeMode, manualStart, manualEnd, analystWindow]);

  const inRange = (i: Instance) =>
    i.start >= effectiveRange.start && i.start <= effectiveRange.end;

  const result = useMemo(() => {
    if (!master || !analyst) return null;
    const m = master.instances.filter(inRange);
    const a = analyst.instances.filter(inRange);
    return compareInstances(m, a, tolerance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, analyst, tolerance, effectiveRange]);

  // A comparison result scoped to the active team + category filters, so the
  // insights/recommendations describe exactly what the user is looking at.
  // When "Both teams" and "all categories" are selected this equals `result`.
  const scopedResult = useMemo(() => {
    if (!master || !analyst) return null;
    const matchTeam = (i: Instance) =>
      teamFilter === "all" || i.team === teamFilter;
    const matchCat = (i: Instance) =>
      categoryFilter === "all" || i.category === categoryFilter;
    const m = master.instances.filter(
      (i) => inRange(i) && matchTeam(i) && matchCat(i)
    );
    const a = analyst.instances.filter(
      (i) => inRange(i) && matchTeam(i) && matchCat(i)
    );
    return compareInstances(m, a, tolerance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, analyst, tolerance, effectiveRange, teamFilter, categoryFilter]);

  const insights = useMemo(
    () => (scopedResult ? generateInsights(scopedResult) : []),
    [scopedResult]
  );
  const recommendations = useMemo(
    () => (scopedResult ? generateRecommendations(scopedResult) : []),
    [scopedResult]
  );

  const rowTeam = (r: ComparisonRow) =>
    r.master?.team ?? r.analyst?.team ?? "Unknown";
  const rowCategory = (r: ComparisonRow) =>
    r.master?.category ?? r.analyst?.category ?? "Uncategorised";

  // Rows scoped to the selected team + category (used for status-filter counts,
  // the timeline, and the stat breakdown table).
  const teamScopedRows: ComparisonRow[] = useMemo(() => {
    if (!result) return [];
    return result.rows.filter(
      (r) =>
        (teamFilter === "all" || rowTeam(r) === teamFilter) &&
        (categoryFilter === "all" || rowCategory(r) === categoryFilter)
    );
  }, [result, teamFilter, categoryFilter]);

  const filteredRows: ComparisonRow[] = useMemo(() => {
    if (statusFilter === "all") return teamScopedRows;
    return teamScopedRows.filter((r) => r.status === statusFilter);
  }, [teamScopedRows, statusFilter]);

  // Stat breakdown derived from the team+category-scoped rows so the table
  // reflects the active filters.
  const scopedStatBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; exact: number }>();
    for (const r of teamScopedRows) {
      if (!r.master) continue;
      const stat = r.master.stat || "Uncategorised";
      const e = map.get(stat) ?? { total: 0, exact: 0 };
      e.total += 1;
      if (r.status === "exact") e.exact += 1;
      map.set(stat, e);
    }
    return Array.from(map.entries())
      .map(([stat, v]) => ({
        stat,
        total: v.total,
        exact: v.exact,
        accuracy: v.total > 0 ? v.exact / v.total : 0,
      }))
      .sort((a, b) => a.stat.localeCompare(b.stat));
  }, [teamScopedRows]);

  const scopedTotals = useMemo(() => {
    const total = scopedStatBreakdown.reduce((a, s) => a + s.total, 0);
    const exact = scopedStatBreakdown.reduce((a, s) => a + s.exact, 0);
    return { total, exact, accuracy: total > 0 ? exact / total : 0 };
  }, [scopedStatBreakdown]);

  function swap() {
    const m = master;
    setMaster(analyst);
    setAnalyst(m);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Comparison
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Upload a master XML and an analyst XML to grade accuracy. Instances are
          matched by timestamp (within the tolerance), then compared on team,
          player number and stat.
        </p>
      </div>

      {/* Upload row */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Master{" "}
            <span className="font-normal text-slate-400">
              (correct reference)
            </span>
          </p>
          <Dropzone
            title="Upload master XML"
            subtitle="Drag & drop or click"
            file={master}
            onLoad={setMaster}
            onClear={() => setMaster(null)}
          />
        </div>

        <div className="flex items-end justify-center pb-6">
          <button
            onClick={swap}
            disabled={!master && !analyst}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            title="Swap master and analyst"
          >
            <ArrowRightLeft size={14} /> Swap
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Analyst{" "}
            <span className="font-normal text-slate-400">(being graded)</span>
          </p>
          <Dropzone
            title="Upload analyst XML"
            subtitle="Drag & drop or click"
            file={analyst}
            onLoad={setAnalyst}
            onClear={() => setAnalyst(null)}
          />
        </div>
      </div>

      {/* Tolerance control */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">
          Timestamp tolerance
        </span>
        <div className="flex gap-1">
          {[2, 3, 5].map((t) => (
            <button
              key={t}
              onClick={() => setTolerance(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tolerance === t
                  ? "bg-pd-red text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ±{t}s
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Events within this window are matched; the stat still has to agree to
          count as exact.
        </span>
      </div>

      {/* Time range control */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Clock size={15} /> Time range
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setRangeMode("auto")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                rangeMode === "auto"
                  ? "bg-pd-red text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Overlapping section
            </button>
            <button
              onClick={() => setRangeMode("manual")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                rangeMode === "manual"
                  ? "bg-pd-red text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => setRangeMode("full")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                rangeMode === "full"
                  ? "bg-pd-red text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Full game
            </button>
          </div>

          {rangeMode === "manual" && (
            <div className="flex items-center gap-2">
              <input
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                placeholder={
                  analystWindow ? analystWindow.start.toFixed(2) : "e.g. 2082"
                }
                className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-pd-red"
              />
              <span className="text-slate-400">to</span>
              <input
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                placeholder={
                  analystWindow ? analystWindow.end.toFixed(2) : "e.g. 3976"
                }
                className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-pd-red"
              />
              <span className="text-xs text-slate-400">seconds</span>
            </div>
          )}
        </div>

        <p className="mt-2.5 text-xs text-slate-500">
          {rangeMode === "auto" && analystWindow && (
            <>
              Comparing only the section covered by the smaller file
              {analystWindow.source ? ` (${analystWindow.source})` : ""}:{" "}
              <span className="font-semibold text-slate-700">
                {analystWindow.start.toFixed(2)} –{" "}
                {analystWindow.end.toFixed(2)}s
              </span>{" "}
              ({formatTime(analystWindow.start)} –{" "}
              {formatTime(analystWindow.end)}). Instances outside this window
              are ignored so a partial file isn&apos;t penalised.
            </>
          )}
          {rangeMode === "full" &&
            "Comparing the entire game. A partial analyst file will show many missed events."}
          {rangeMode === "manual" &&
            "Enter start and end in seconds (matching the XML, e.g. 2082 – 3976). Leave a box blank for open-ended."}
        </p>

        {result && master && analyst && (
          <p className="mt-1 text-xs text-slate-500">
            In window:{" "}
            <span className="font-semibold text-slate-700">
              {master.instances.filter(inRange).length}
            </span>{" "}
            master ·{" "}
            <span className="font-semibold text-slate-700">
              {analyst.instances.filter(inRange).length}
            </span>{" "}
            analyst instances
            {rangeMode !== "full" && (
              <>
                {" "}
                (of {master.instances.length} / {analyst.instances.length}{" "}
                total)
              </>
            )}
          </p>
        )}
      </div>

      {!result && (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <Target className="mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-500">
            Upload both files to see the comparison.
          </p>
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <StatCard
              label="Accuracy"
              value={`${(result.summary.accuracy * 100).toFixed(1)}%`}
              accent={
                result.summary.accuracy >= 0.9
                  ? "text-emerald-600"
                  : result.summary.accuracy >= 0.75
                    ? "text-amber-600"
                    : "text-red-600"
              }
              sub={`${result.summary.exact}/${result.summary.masterTotal} exact`}
            />
            <StatCard label="Exact" value={`${result.summary.exact}`} accent="text-emerald-600" />
            <StatCard label="Wrong stat" value={`${result.summary.wrongStat}`} accent="text-amber-600" />
            <StatCard label="Wrong player" value={`${result.summary.wrongPlayer}`} accent="text-orange-600" />
            <StatCard label="Wrong team" value={`${result.summary.wrongTeam}`} accent="text-red-600" />
            <StatCard label="Missed" value={`${result.summary.missed}`} accent="text-slate-600" />
            <StatCard label="Extra" value={`${result.summary.extra}`} accent="text-purple-600" />
          </div>

          {/* Category breakdown */}
          {result.byCategory.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Accuracy by stat category
                </h2>
                {categoryFilter !== "all" && (
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    <X size={12} /> Clear filter
                  </button>
                )}
              </div>
              <p className="mb-3 text-xs text-slate-400">
                Click a category to filter the breakdown table and timeline.
              </p>
              <div className="space-y-1">
                {result.byCategory.map((c) => {
                  const active = categoryFilter === c.category;
                  return (
                    <button
                      key={c.category}
                      onClick={() =>
                        setCategoryFilter(active ? "all" : c.category)
                      }
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                        active
                          ? "bg-pd-red/10 ring-1 ring-pd-red/30"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-32 shrink-0 truncate text-sm ${
                          active
                            ? "font-semibold text-pd-red"
                            : "text-slate-600"
                        }`}
                      >
                        {c.category}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            c.accuracy >= 0.9
                              ? "bg-emerald-500"
                              : c.accuracy >= 0.75
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${c.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-xs text-slate-500">
                        {(c.accuracy * 100).toFixed(0)}% ({c.exact}/{c.total})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-stat breakdown table */}
          {result.byStat.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-700">
                  Statistic breakdown
                  {categoryFilter !== "all" && (
                    <span className="ml-2 rounded-md bg-pd-red/10 px-2 py-0.5 text-xs font-semibold text-pd-red">
                      {categoryFilter}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => exportStatCsv(scopedStatBreakdown)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2.5">Statistic Type</th>
                      <th className="px-4 py-2.5 text-right">Master</th>
                      <th className="px-4 py-2.5 text-right">Exact</th>
                      <th className="px-4 py-2.5 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedStatBreakdown.map((s) => (
                      <tr
                        key={s.stat}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {s.stat}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                          {s.total}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                          {s.exact}
                        </td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums font-semibold ${
                            s.accuracy >= 0.9
                              ? "text-emerald-600"
                              : s.accuracy >= 0.75
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {(s.accuracy * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                    {scopedStatBreakdown.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-sm text-slate-400"
                        >
                          No stats for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="sticky bottom-0">
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <td className="px-4 py-2.5">Totals</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {scopedTotals.total}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {scopedTotals.exact}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {(scopedTotals.accuracy * 100).toFixed(0)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Per-team breakdown */}
          {result.byTeam.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Accuracy by team
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {result.byTeam.map((t) => (
                  <TeamCard key={t.team} team={t} />
                ))}
              </div>
            </div>
          )}

          {/* AI insights */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Sparkles size={18} className="text-pd-red" />
                <h2 className="text-sm font-semibold text-slate-700">
                  AI insights
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {teamFilter === "all" ? "Both teams" : teamFilter}
                  {categoryFilter !== "all" ? ` · ${categoryFilter}` : ""}
                </span>
              </div>
              <div className="space-y-2.5">
                {insights.map((ins, i) => {
                  const meta = TONE_META[ins.tone];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 rounded-xl border p-3 ${meta.ring}`}
                    >
                      <Icon size={18} className={`mt-0.5 shrink-0 ${meta.ic1}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {ins.title}
                        </p>
                        <p className="text-xs text-slate-600">{ins.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-pd-red" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Recommendations
                </h2>
              </div>
              <ul className="space-y-2">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pd-red" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Team filter */}
          {result.byTeam.length > 1 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Team
              </span>
              <button
                onClick={() => setTeamFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  teamFilter === "all"
                    ? "bg-pd-navy text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Both teams
              </button>
              {result.byTeam.map((t) => (
                <button
                  key={t.team}
                  onClick={() => setTeamFilter(t.team)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    teamFilter === t.team
                      ? "bg-pd-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.team}
                </button>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({teamScopedRows.length})
            </button>
            {(Object.keys(STATUS_META) as MatchStatus[]).map((s) => {
              const n = teamScopedRows.filter((r) => r.status === s).length;
              if (n === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`}
                  />
                  {STATUS_META[s].label} ({n})
                </button>
              );
            })}
          </div>

          {/* Synced side-by-side timeline */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[110px_1fr_1fr] border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div className="p-3">Status</div>
              <div className="border-l border-slate-200 p-3">
                Master {master ? `· ${master.name}` : ""}
              </div>
              <div className="border-l border-slate-200 p-3">
                Analyst {analyst ? `· ${analyst.name}` : ""}
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredRows.map((row, i) => {
                const meta = STATUS_META[row.status];
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[110px_1fr_1fr] border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/60"
                  >
                    <div className="flex items-center p-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <TimelineCell instance={row.master} side="master" />
                    <TimelineCell
                      instance={row.analyst}
                      side="analyst"
                      delta={row.timeDelta}
                    />
                  </div>
                );
              })}
              {filteredRows.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  No rows for this filter.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimelineCell({
  instance,
  side,
  delta,
}: {
  instance: Instance | null;
  side: "master" | "analyst";
  delta?: number | null;
}) {
  const borderClass = side === "master" ? "border-l border-slate-200" : "border-l border-slate-200";
  if (!instance) {
    return (
      <div className={`p-3 ${borderClass}`}>
        <span className="text-xs italic text-slate-300">— no entry —</span>
      </div>
    );
  }
  return (
    <div className={`p-3 ${borderClass}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-xs font-semibold text-slate-500">
          {formatTime(instance.start)}
        </span>
        {delta != null && delta > 0 && (
          <span className="text-[10px] text-slate-400">(+{delta.toFixed(1)}s)</span>
        )}
        <span className="text-sm font-semibold text-slate-900">
          {instance.stat || instance.category || "—"}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {instance.team}
        {instance.playerNumber != null && (
          <span className="font-medium text-slate-700"> · #{instance.playerNumber}</span>
        )}
      </p>
    </div>
  );
}
