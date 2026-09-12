import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { dispositionValidator } from "./schema";
import { normalizeCode, requireNonEmpty } from "./lib/validation";
import { requireDoc, requireUniqueCode } from "./lib/db";

export const create = mutation({
  args: {
    inspectionId: v.id("inspections"),
    ncrNumber: v.string(),
    qtyAffected: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "inspections", args.inspectionId);

    const ncrNumber = normalizeCode(requireNonEmpty(args.ncrNumber, "NCR number"));
    const description = requireNonEmpty(args.description, "Description");

    await requireUniqueCode(ctx, "ncrs", "by_ncrNumber", "ncrNumber", ncrNumber);

    if (args.qtyAffected < 1) {
      throw new Error("qtyAffected must be at least 1");
    }

    return await ctx.db.insert("ncrs", {
      ncrNumber,
      inspectionId: args.inspectionId,
      qtyAffected: args.qtyAffected,
      description,
      disposition: null,
      dispositionNotes: null,
      raisedAt: Date.now(),
      closedAt: null,
      active: true,
    });
  },
});

export const disposition = mutation({
  args: {
    id: v.id("ncrs"),
    disposition: dispositionValidator,
    dispositionNotes: v.nullable(v.string()),
  },
  handler: async (ctx, args) => {
    const ncr = await requireDoc(ctx, "ncrs", args.id);
    if (ncr.closedAt !== null) {
      throw new Error("NCR is already closed");
    }
    await ctx.db.patch("ncrs", args.id, {
      disposition: args.disposition,
      dispositionNotes: args.dispositionNotes,
    });
  },
});

export const close = mutation({
  args: { id: v.id("ncrs") },
  handler: async (ctx, args) => {
    const ncr = await requireDoc(ctx, "ncrs", args.id);
    if (ncr.disposition === null) {
      throw new Error("Cannot close an NCR without a disposition");
    }
    if (ncr.closedAt !== null) {
      throw new Error("NCR is already closed");
    }
    await ctx.db.patch("ncrs", args.id, { closedAt: Date.now() });
  },
});

export const setActive = mutation({
  args: {
    id: v.id("ncrs"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "ncrs", args.id);
    await ctx.db.patch("ncrs", args.id, { active: args.active });
  },
});

export const listByInspection = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ncrs")
      .withIndex("by_inspectionId", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();
  },
});

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ncrs")
      .withIndex("by_closedAt", (q) => q.eq("closedAt", null))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("ncrs") },
  handler: async (ctx, args) => {
    return await ctx.db.get("ncrs", args.id);
  },
});
