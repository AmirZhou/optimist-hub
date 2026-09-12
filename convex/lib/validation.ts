/**
 * Shared validation and normalization helpers.
 *
 * normalizeCode and normalizeName are used both when storing and when
 * looking up values so that the same transformation is applied in both
 * places — preventing silent misses from inconsistent casing or whitespace.
 */

/** Trim and uppercase. For customer codes, part numbers, WO numbers, NCR numbers. */
export function normalizeCode(s: string): string {
  return s.trim().toUpperCase();
}

/** Trim and collapse runs of whitespace to single spaces. Preserves user capitalization. */
export function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Throws if value is empty after trimming; returns the trimmed value. */
export function requireNonEmpty(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error(`${fieldLabel} can't be empty`);
  }
  return trimmed;
}
