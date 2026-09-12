import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { normalizeName, requireNonEmpty } from "./lib/validation";
import { requireDoc } from "./lib/db";

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(requireNonEmpty(args.name, "Inspector name"));
    return await ctx.db.insert("inspectors", { name, active: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("inspectors"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireDoc(ctx, "inspectors", id);
    const patch: Partial<Doc<"inspectors">> = {};

    if (updates.name !== undefined) {
      const name = normalizeName(requireNonEmpty(updates.name, "Inspector name"));
      patch.name = name;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("inspectors", id, patch);
    }
  },
});

export const setActive = mutation({
  args: {
    id: v.id("inspectors"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "inspectors", args.id);
    await ctx.db.patch("inspectors", args.id, { active: args.active });
  },
});

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("inspectors")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db.query("inspectors").withIndex("by_active").collect();
  },
});

export const get = query({
  args: { id: v.id("inspectors") },
  handler: async (ctx, args) => {
    return await ctx.db.get("inspectors", args.id);
  },
});
