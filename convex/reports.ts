import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Join display data onto an inspection row. */
async function enrichInspection(
  ctx: QueryCtx,
  inspection: Doc<"inspections">,
) {
  const [part, inspector] = await Promise.all([
    ctx.db.get("parts", inspection.partId),
    ctx.db.get("inspectors", inspection.inspectorId),
  ]);

  let customerCode: string | null = null;
  if (part) {
    const customer = await ctx.db.get("customers", part.customerId);
    customerCode = customer?.code ?? null;
  }

  return {
    ...inspection,
    partNumber: part?.partNumber ?? null,
    customerCode,
    inspectorName: inspector?.name ?? null,
  };
}

/** Open inspections (finishedAt === null), oldest first. */
export const openInspections = query({
  args: {},
  handler: async (ctx) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_finishedAt", (q) => q.eq("finishedAt", null))
      .order("asc")
      .collect();

    return await Promise.all(inspections.map((i) => enrichInspection(ctx, i)));
  },
});

/** Inspections started within [from, to). */
export const inspectionsStartedBetween = query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_startedAt", (q) =>
        q.gte("startedAt", args.from).lt("startedAt", args.to),
      )
      .order("asc")
      .collect();

    return await Promise.all(inspections.map((i) => enrichInspection(ctx, i)));
  },
});

/** All inspections for a given part, ordered by startedAt. */
export const partHistory = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_partId_startedAt", (q) => q.eq("partId", args.partId))
      .order("asc")
      .collect();

    return await Promise.all(inspections.map((i) => enrichInspection(ctx, i)));
  },
});

/** All inspections for a customer PO. */
export const byCustomerPo = query({
  args: { customerPo: v.string() },
  handler: async (ctx, args) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_customerPo", (q) => q.eq("customerPo", args.customerPo))
      .collect();

    return await Promise.all(inspections.map((i) => enrichInspection(ctx, i)));
  },
});

/**
 * Reject summary by stage for inspections started in [from, to).
 *
 * Aggregation is done in memory — acceptable at MVP volume.
 */
export const rejectSummary = query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_startedAt", (q) =>
        q.gte("startedAt", args.from).lt("startedAt", args.to),
      )
      .collect();

    const byStage: Record<string, { qtyInspected: number; qtyRejected: number }> = {};

    for (const insp of inspections) {
      const entry = byStage[insp.stage] ?? { qtyInspected: 0, qtyRejected: 0 };
      entry.qtyInspected += insp.qtyInspected;
      entry.qtyRejected += insp.qtyRejected;
      byStage[insp.stage] = entry;
    }

    return Object.entries(byStage).map(([stage, totals]) => ({
      stage,
      qtyInspected: totals.qtyInspected,
      qtyRejected: totals.qtyRejected,
      rejectRate:
        totals.qtyInspected > 0
          ? totals.qtyRejected / totals.qtyInspected
          : 0,
    }));
  },
});
