import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { normalizeCode, requireNonEmpty } from "./lib/validation";
import { requireDoc, requireUniqueCode } from "./lib/db";

export const create = mutation({
  args: {
    woNumber: v.string(),
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    const woNumber = normalizeCode(requireNonEmpty(args.woNumber, "WO number"));
    await requireDoc(ctx, "parts", args.partId);
    await requireUniqueCode(ctx, "workorders", "by_woNumber", "woNumber", woNumber);

    return await ctx.db.insert("workorders", {
      woNumber,
      partId: args.partId,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("workorders"),
    woNumber: v.optional(v.string()),
    partId: v.optional(v.id("parts")),
  },
  handler: async (ctx, { id, ...updates }) => {
    const wo = await requireDoc(ctx, "workorders", id);
    const patch: Partial<Doc<"workorders">> = {};

    if (updates.woNumber !== undefined) {
      const woNumber = normalizeCode(requireNonEmpty(updates.woNumber, "WO number"));
      if (woNumber !== wo.woNumber) {
        await requireUniqueCode(ctx, "workorders", "by_woNumber", "woNumber", woNumber, id);
        patch.woNumber = woNumber;
      }
    }

    if (updates.partId !== undefined) {
      await requireDoc(ctx, "parts", updates.partId);
      patch.partId = updates.partId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("workorders", id, patch);
    }
  },
});

export const setActive = mutation({
  args: {
    id: v.id("workorders"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "workorders", args.id);
    await ctx.db.patch("workorders", args.id, { active: args.active });
  },
});

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("workorders")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db.query("workorders").withIndex("by_active").collect();
  },
});

export const get = query({
  args: { id: v.id("workorders") },
  handler: async (ctx, args) => {
    return await ctx.db.get("workorders", args.id);
  },
});

export const getByWoNumber = query({
  args: { woNumber: v.string() },
  handler: async (ctx, args) => {
    const woNumber = normalizeCode(args.woNumber);
    return await ctx.db
      .query("workorders")
      .withIndex("by_woNumber", (q) => q.eq("woNumber", woNumber))
      .unique();
  },
});

export const listByPart = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workorders")
      .withIndex("by_partId", (q) => q.eq("partId", args.partId))
      .collect();
  },
});
