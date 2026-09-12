import type { QueryCtx } from "../_generated/server";
import type { Doc, Id, TableNames } from "../_generated/dataModel";

/**
 * Get a document or throw. Callers don't need to null-check after this.
 */
export async function requireDoc<T extends TableNames>(
  ctx: QueryCtx,
  tableName: T,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(tableName, id);
  if (doc === null) {
    const label = (tableName as string).charAt(0).toUpperCase() + (tableName as string).slice(1);
    throw new Error(`${label} not found`);
  }
  return doc;
}

/**
 * Assert that no other document in `tableName` already holds `value` at the
 * given index. `excludeId` lets an update skip its own row.
 */
export async function requireUniqueCode<T extends TableNames>(
  ctx: QueryCtx,
  tableName: T,
  indexName: string,
  field: string,
  value: string,
  excludeId?: Id<T>,
): Promise<void> {
  const existing = await ctx.db
    .query(tableName)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex(indexName as any, (q: any) => q.eq(field, value))
    .unique();

  if (existing !== null && existing._id !== excludeId) {
    const label = (tableName as string).charAt(0).toUpperCase() + (tableName as string).slice(1);
    throw new Error(`${label} with that ${field} already exists`);
  }
}
