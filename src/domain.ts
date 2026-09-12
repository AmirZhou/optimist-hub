// Domain labels — single source of truth. Literal values match the backend
// enums exactly (snake_case); only display labels differ.

export const STAGES = ["blank", "infiltration", "heat_treat", "finishing", "rework"] as const;
export type Stage = (typeof STAGES)[number];

export const SOURCES = ["inhouse", "vendor"] as const;
export type Source = (typeof SOURCES)[number];

export const REASONS = ["routine", "first_article", "problem", "reinspect"] as const;
export type Reason = (typeof REASONS)[number];

export const FILE_KINDS = ["vendor_sheet", "inhouse_sheet", "photo", "ncr"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

function humanize(v: string): string {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const stageLabel = humanize;
export const reasonLabel = (r: string) =>
  r === "first_article" ? "First article" : humanize(r);
export const sourceLabel = (s: string) =>
  s === "inhouse" ? "In-house" : humanize(s);
export const fileKindLabel = (k: string) =>
  k === "vendor_sheet" ? "Vendor sheet" :
  k === "inhouse_sheet" ? "In-house sheet" :
  k === "ncr" ? "NCR" : humanize(k);

// ── Formatting ──────────────────────────────────────────────────────

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Age of an open inspection, e.g. "3d 4h". Highlight thresholds drive the
 *  "oldest first is a problem" requirement on the dashboard. */
export function ageSince(ms: number, now: number): string {
  const mins = Math.max(0, Math.floor((now - ms) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ageClass(ms: number, now: number): string {
  const hours = (now - ms) / 3600000;
  if (hours >= 48) return "age-very-old";
  if (hours >= 24) return "age-old";
  return "";
}
