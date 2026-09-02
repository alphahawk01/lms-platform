// XML comparison engine for SportsCode-style instance exports.
//
// Each XML has <ALL_INSTANCES><instance>... with:
//   <start>seconds</start> <end>seconds</end>
//   <code>Team - #N. N</code>
//   <label><group>Team</group><text>...</text></label>
//   <label><group>Player</group><text>...</text></label>
//   <label><group>{StatCategory}</group><text>{Stat}</text></label>
//
// Master = the correct reference (e.g. "Soccer Comp A").
// Analyst = the one being graded (e.g. "PD Accuracy").

export type Instance = {
  id: string;
  start: number;
  end: number;
  team: string;
  /** jersey number parsed from the code label, e.g. 10 */
  playerNumber: number | null;
  /** raw player label text */
  playerRaw: string;
  /** the stat text, e.g. "Tackles Successful" */
  stat: string;
  /** the stat group/category, e.g. "Tackles" */
  category: string;
  /** original code string */
  code: string;
};

export type MatchStatus =
  | "exact"
  | "wrong_stat" // correct team + player, wrong stat
  | "wrong_player" // correct team, wrong player
  | "wrong_team" // matched in window but different team
  | "missed" // master instance, no analyst instance in window
  | "extra"; // analyst instance with no master match

export type ComparisonRow = {
  status: MatchStatus;
  master: Instance | null;
  analyst: Instance | null;
  /** absolute time delta in seconds between matched instances */
  timeDelta: number | null;
};

export type CategoryBreakdown = {
  category: string;
  total: number;
  exact: number;
  accuracy: number;
};

export type TeamBreakdown = {
  team: string;
  /** number of master instances for this team */
  masterTotal: number;
  exact: number;
  wrongStat: number;
  wrongPlayer: number;
  /** analyst put this team's event on the other team (or vice versa) */
  wrongTeam: number;
  missed: number;
  /** analyst-only instances attributed to this team */
  extra: number;
  /** exact / masterTotal */
  accuracy: number;
  /** average absolute time delta of this team's exact matches */
  avgTimeDrift: number;
};

export type ComparisonResult = {
  rows: ComparisonRow[];
  tolerance: number;
  summary: {
    masterTotal: number;
    analystTotal: number;
    exact: number;
    wrongStat: number;
    wrongPlayer: number;
    wrongTeam: number;
    missed: number;
    extra: number;
    /** exact / masterTotal */
    accuracy: number;
    /** average absolute time delta of exact matches */
    avgTimeDrift: number;
  };
  byCategory: CategoryBreakdown[];
  byTeam: TeamBreakdown[];
};

/** Parse a jersey number out of strings like "St Josephs 10", "10 10", "02 2", "#10". */
function parseNumber(...candidates: string[]): number | null {
  for (const c of candidates) {
    if (!c) continue;
    // Prefer a number after a '#'
    const hash = c.match(/#\s*(\d+)/);
    if (hash) return parseInt(hash[1], 10);
    // Otherwise take the last standalone number in the string
    const all = c.match(/\d+/g);
    if (all && all.length) return parseInt(all[all.length - 1], 10);
  }
  return null;
}

const KNOWN_META_GROUPS = new Set(["team", "player"]);

/**
 * Parse a SportsCode XML string into instances.
 * Robust to leading junk, missing groups, and multiple stat labels
 * (first non Team/Player label wins as the stat).
 */
export function parseInstances(xml: string): Instance[] {
  const instances: Instance[] = [];
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // Should only run client-side; guard anyway.
    return instances;
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const nodes = Array.from(doc.getElementsByTagName("instance"));

  for (const node of nodes) {
    const get = (tag: string) =>
      node.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";

    const id = get("ID") || crypto.randomUUID();
    const start = parseFloat(get("start"));
    const end = parseFloat(get("end"));
    const code = get("code");

    let team = "";
    let playerRaw = "";
    let stat = "";
    let category = "";

    const labels = Array.from(node.getElementsByTagName("label"));
    for (const label of labels) {
      const group =
        label.getElementsByTagName("group")[0]?.textContent?.trim() ?? "";
      const text =
        label.getElementsByTagName("text")[0]?.textContent?.trim() ?? "";
      const g = group.toLowerCase();
      if (g === "team") team = text;
      else if (g === "player") playerRaw = text;
      else if (!stat) {
        // First non-meta label is treated as the stat + category.
        category = group;
        stat = text;
      }
    }

    // Fall back to team from code if the Team label was absent.
    if (!team && code.includes(" - #")) team = code.split(" - #")[0].trim();

    const playerNumber = parseNumber(playerRaw, code);

    if (Number.isNaN(start)) continue;

    instances.push({
      id,
      start,
      end: Number.isNaN(end) ? start : end,
      team: team.trim(),
      playerNumber,
      playerRaw,
      stat: stat.trim(),
      category: category.trim(),
      code,
    });
  }

  instances.sort((a, b) => a.start - b.start);
  return instances;
}

function normTeam(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}
function normStat(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Compare master vs analyst instances.
 * Matching: for each master instance, find the best analyst instance whose
 * start time is within `tolerance` seconds that hasn't been consumed yet.
 * "Best" = the one that agrees on the most fields, then closest in time.
 */
export function compareInstances(
  master: Instance[],
  analyst: Instance[],
  tolerance: number
): ComparisonResult {
  const rows: ComparisonRow[] = [];
  const usedAnalyst = new Set<number>();

  const scoreMatch = (m: Instance, a: Instance): number => {
    let s = 0;
    if (normTeam(m.team) === normTeam(a.team)) s += 4;
    if (
      m.playerNumber != null &&
      a.playerNumber != null &&
      m.playerNumber === a.playerNumber
    )
      s += 2;
    if (normStat(m.stat) === normStat(a.stat)) s += 1;
    return s;
  };

  for (const m of master) {
    let bestIdx = -1;
    let bestScore = -1;
    let bestDelta = Infinity;

    for (let i = 0; i < analyst.length; i++) {
      if (usedAnalyst.has(i)) continue;
      const a = analyst[i];
      const delta = Math.abs(a.start - m.start);
      if (delta > tolerance) continue;
      const score = scoreMatch(m, a);
      if (score > bestScore || (score === bestScore && delta < bestDelta)) {
        bestScore = score;
        bestDelta = delta;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      rows.push({ status: "missed", master: m, analyst: null, timeDelta: null });
      continue;
    }

    usedAnalyst.add(bestIdx);
    const a = analyst[bestIdx];
    const teamOk = normTeam(m.team) === normTeam(a.team);
    const playerOk =
      m.playerNumber != null &&
      a.playerNumber != null &&
      m.playerNumber === a.playerNumber;
    const statOk = normStat(m.stat) === normStat(a.stat);

    let status: MatchStatus;
    if (!teamOk) status = "wrong_team";
    else if (!playerOk) status = "wrong_player";
    else if (!statOk) status = "wrong_stat";
    else status = "exact";

    rows.push({ status, master: m, analyst: a, timeDelta: bestDelta });
  }

  // Any analyst instance never consumed is an "extra" (false positive).
  for (let i = 0; i < analyst.length; i++) {
    if (usedAnalyst.has(i)) continue;
    rows.push({
      status: "extra",
      master: null,
      analyst: analyst[i],
      timeDelta: null,
    });
  }

  // Sort rows by the timeline (use whichever instance is present).
  rows.sort((r1, r2) => {
    const t1 = r1.master?.start ?? r1.analyst?.start ?? 0;
    const t2 = r2.master?.start ?? r2.analyst?.start ?? 0;
    return t1 - t2;
  });

  // Summary
  const count = (s: MatchStatus) => rows.filter((r) => r.status === s).length;
  const exact = count("exact");
  const wrongStat = count("wrong_stat");
  const wrongPlayer = count("wrong_player");
  const wrongTeam = count("wrong_team");
  const missed = count("missed");
  const extra = count("extra");
  const masterTotal = master.length;
  const analystTotal = analyst.length;

  const exactDeltas = rows
    .filter((r) => r.status === "exact" && r.timeDelta != null)
    .map((r) => r.timeDelta as number);
  const avgTimeDrift =
    exactDeltas.length > 0
      ? exactDeltas.reduce((a, b) => a + b, 0) / exactDeltas.length
      : 0;

  // Per-category accuracy (based on master categories).
  const catMap = new Map<string, { total: number; exact: number }>();
  for (const r of rows) {
    if (!r.master) continue;
    const cat = r.master.category || "Uncategorised";
    const entry = catMap.get(cat) ?? { total: 0, exact: 0 };
    entry.total += 1;
    if (r.status === "exact") entry.exact += 1;
    catMap.set(cat, entry);
  }
  const byCategory: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      exact: v.exact,
      accuracy: v.total > 0 ? v.exact / v.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Per-team accuracy. A row is attributed to the master's team, or (for
  // analyst-only "extra" rows) to the analyst's team.
  type TeamAcc = {
    masterTotal: number;
    exact: number;
    wrongStat: number;
    wrongPlayer: number;
    wrongTeam: number;
    missed: number;
    extra: number;
    deltas: number[];
  };
  const teamMap = new Map<string, TeamAcc>();
  const ensureTeam = (name: string): TeamAcc => {
    const key = name || "Unknown";
    let t = teamMap.get(key);
    if (!t) {
      t = {
        masterTotal: 0,
        exact: 0,
        wrongStat: 0,
        wrongPlayer: 0,
        wrongTeam: 0,
        missed: 0,
        extra: 0,
        deltas: [],
      };
      teamMap.set(key, t);
    }
    return t;
  };

  for (const r of rows) {
    if (r.status === "extra") {
      const t = ensureTeam(r.analyst?.team ?? "Unknown");
      t.extra += 1;
      continue;
    }
    const team = r.master?.team ?? r.analyst?.team ?? "Unknown";
    const t = ensureTeam(team);
    t.masterTotal += 1;
    if (r.status === "exact") {
      t.exact += 1;
      if (r.timeDelta != null) t.deltas.push(r.timeDelta);
    } else if (r.status === "wrong_stat") t.wrongStat += 1;
    else if (r.status === "wrong_player") t.wrongPlayer += 1;
    else if (r.status === "wrong_team") t.wrongTeam += 1;
    else if (r.status === "missed") t.missed += 1;
  }

  const byTeam: TeamBreakdown[] = Array.from(teamMap.entries())
    .map(([team, v]) => ({
      team,
      masterTotal: v.masterTotal,
      exact: v.exact,
      wrongStat: v.wrongStat,
      wrongPlayer: v.wrongPlayer,
      wrongTeam: v.wrongTeam,
      missed: v.missed,
      extra: v.extra,
      accuracy: v.masterTotal > 0 ? v.exact / v.masterTotal : 0,
      avgTimeDrift:
        v.deltas.length > 0
          ? v.deltas.reduce((a, b) => a + b, 0) / v.deltas.length
          : 0,
    }))
    .sort((a, b) => b.masterTotal - a.masterTotal);

  return {
    rows,
    tolerance,
    summary: {
      masterTotal,
      analystTotal,
      exact,
      wrongStat,
      wrongPlayer,
      wrongTeam,
      missed,
      extra,
      accuracy: masterTotal > 0 ? exact / masterTotal : 0,
      avgTimeDrift,
    },
    byCategory,
    byTeam,
  };
}

/** Format seconds as mm:ss. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
