import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Source, Reason, Stage } from "./domain";
import { reasonLabel, sourceLabel, stageLabel } from "./domain";

// ── Column sorting ─────────────────────────────────────────────────

export type SortDir = "asc" | "desc";
export type SortSpec = { key: string; dir: SortDir };

/**
 * Shared sort state for a table. `sortRows` returns a sorted copy:
 * nulls/undefined/empty always sink to the bottom regardless of direction;
 * numbers compare numerically, everything else case-insensitively (numeric-aware).
 */
export function useTableSort<T>(defaults: SortSpec) {
  const [state, setState] = useState<SortSpec>(defaults);

  const toggle = useCallback((key: string) => {
    setState((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }, []);

  const sortRows = useCallback(
    (rows: T[], get: (row: T, key: string) => unknown) => {
      const copy = [...rows];
      copy.sort((a, b) => {
        const av = get(a, state.key);
        const bv = get(b, state.key);
        const aEmpty = av === null || av === undefined || av === "";
        const bEmpty = bv === null || bv === undefined || bv === "";
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        const r =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, {
                sensitivity: "base",
                numeric: true,
              });
        return state.dir === "asc" ? r : -r;
      });
      return copy;
    },
    [state],
  );

  return { sort: state, toggle, setSort: setState, sortRows };
}

/** A table header that owns the sort arrows. Click toggles asc/desc. */
export function SortTh({
  label,
  sortKey,
  sort,
  onToggle,
  numeric,
}: {
  label: string;
  sortKey: string;
  sort: SortSpec;
  onToggle: (key: string) => void;
  numeric?: boolean;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={numeric ? "num sortable" : "sortable"}
      onClick={() => onToggle(sortKey)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="th-sort">
        {label}
        <svg className="sort-arrows" width="8" height="12" viewBox="0 0 10 12" aria-hidden="true">
          <path
            d="M5 0.8 8.6 4.4H1.4Z"
            className={active && sort.dir === "asc" ? "on" : ""}
          />
          <path
            d="M5 11.2 1.4 7.6h7.2Z"
            className={active && sort.dir === "desc" ? "on" : ""}
          />
        </svg>
      </span>
    </th>
  );
}

/**
 * Custom dropdown — native <select> popups are OS-styled (rounded) and can't
 * be made to match a square design, so this replaces them everywhere.
 */
export function Select({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`select${open ? " open" : ""}`}>
      <button
        type="button"
        className="select-btn"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected === undefined ? "placeholder" : ""}>
          {selected?.label ?? placeholder ?? ""}
        </span>
        <svg
          className="chev"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="select-menu" role="listbox">
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={o.value === value ? "selected" : ""}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Badge({
  kind,
  children,
}: {
  kind:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "unjudged";
  children: ReactNode;
}) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

/** The result cell for an inspection. Never renders a blank for null. */
export function ResultBadge({ result }: { result: string | null }) {
  if (result === null) return <Badge kind="unjudged">Not yet judged</Badge>;
  if (result === "pass") return <Badge kind="success">Pass</Badge>;
  return <Badge kind="danger">Fail</Badge>;
}

export function StageBadge({ stage }: { stage: Stage | string }) {
  return <Badge kind="neutral">{stageLabel(stage)}</Badge>;
}

export function SourceBadge({ source }: { source: Source | string }) {
  return (
    <Badge kind={source === "vendor" ? "info" : "neutral"}>
      {sourceLabel(source)}
    </Badge>
  );
}

export function ReasonBadge({ reason }: { reason: Reason | string }) {
  const kind =
    reason === "first_article" ? "warning" :
    reason === "problem" ? "danger" :
    reason === "reinspect" ? "info" : "neutral";
  return <Badge kind={kind}>{reasonLabel(reason)}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active
    ? <Badge kind="success">Active</Badge>
    : <Badge kind="neutral">Inactive</Badge>;
}

export function Empty({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="empty">
      <div className="big">{title}</div>
      {hint ? <div>{hint}</div> : null}
    </div>
  );
}

export function Loading() {
  return <div className="loading">Loading…</div>;
}

// ── Toasts ─────────────────────────────────────────────────────────

type Toast = { id: number; message: string; leaving?: boolean };
let toasts: Toast[] = [];
let nextToastId = 1;
const toastListeners = new Set<() => void>();

function emitToasts() {
  for (const l of toastListeners) l();
}

export function pushToast(message: string) {
  const id = nextToastId++;
  toasts = [...toasts, { id, message }];
  emitToasts();
  setTimeout(() => dismissToast(id), 6000);
}

export function dismissToast(id: number) {
  // Animate out first; remove from the DOM once the exit has played.
  const existing = toasts.find((t) => t.id === id);
  if (existing === undefined || existing.leaving) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emitToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToasts();
  }, 220);
}

/** Bottom-right error notifications — slides up with a subtle shake. */
export function ToastHost() {
  const list = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => {
        toastListeners.delete(cb);
      };
    },
    () => toasts,
  );
  if (list.length === 0) return null;
  return (
    <div className="toast-host">
      {list.map((t) => (
        <div
          key={t.id}
          className={`toast${t.leaving ? " leaving" : ""}`}
          role="alert"
          onClick={() => dismissToast(t.id)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Extract a clean, user-facing message from a thrown error. Convex client
 * errors arrive wrapped ("Uncaught Error: …" or serialized payloads), so we
 * unwrap down to the server's own message when there is one.
 */
export function cleanError(err: unknown): string {
  if (err === null || err === undefined) return "Something went wrong.";
  let msg = "";
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === "string") {
    msg = err;
  } else if (typeof err === "object") {
    const e = err as { message?: unknown; errorMessage?: unknown };
    if (typeof e.message === "string") msg = e.message;
    else if (typeof e.errorMessage === "string") msg = e.errorMessage;
    else {
      try {
        msg = JSON.stringify(err);
      } catch {
        msg = String(err);
      }
    }
  } else {
    msg = String(err);
  }
  msg = msg.replace(/^Uncaught\s+(?:Error:\s*)?/i, "").trim();
  // Convex dev-mode failures arrive as:
  //   "[CONVEX M(fn)] [Request ID: x] Server Error\nUncaught Error: <real>\n    at ..."
  // — keep only the server's own message, dropping the wrapper and stack.
  const serverMsg = msg.match(/Server Error\s*\n\s*(?:Uncaught\s+)?(?:Error:\s*)?(.+)$/s);
  if (serverMsg !== null) msg = serverMsg[1];
  msg = msg.split("\n")[0].trim();
  return msg === "" ? "Something went wrong." : msg;
}

// ── Tiny hash router ────────────────────────────────────────────────

function currentHash(): string {
  const h = window.location.hash;
  return h === "" || h === "#" ? "#/" : h;
}

export function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(currentHash());
  useEffect(() => {
    const onChange = () => setHash(currentHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);
  return [hash, navigate];
}

export function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
