import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireDoc } from "./lib/db";
import { normalizeNotes } from "./lib/validation";

export const create = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.nullable(v.string())),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name === "") throw new Error("Thread name is required");

    const existing = await ctx.db
      .query("threads")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (existing !== null) {
      throw new Error(`Thread "${name}" already exists`);
    }

    return await ctx.db.insert("threads", {
      name,
      notes: normalizeNotes(args.notes ?? null),
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("threads"),
    name: v.string(),
    notes: v.optional(v.nullable(v.string())),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name === "") throw new Error("Thread name is required");
    await requireDoc(ctx, "threads", args.id);

    const existing = await ctx.db
      .query("threads")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (existing !== null && existing._id !== args.id) {
      throw new Error(`Thread "${name}" already exists`);
    }

    await ctx.db.patch("threads", args.id, {
      name,
      ...(args.notes !== undefined ? { notes: normalizeNotes(args.notes) } : {}),
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("threads"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "threads", args.id);
    await ctx.db.patch("threads", args.id, { active: args.active });
  },
});

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("threads")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db.query("threads").withIndex("by_active").collect();
  },
});

export const get = query({
  args: { id: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get("threads", args.id);
  },
});
