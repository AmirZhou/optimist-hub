import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { normalizeCode, normalizeName, requireNonEmpty } from "./lib/validation";
import { requireDoc, requireUniqueCode } from "./lib/db";

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeCode(requireNonEmpty(args.code, "Customer code"));
    const name = normalizeName(requireNonEmpty(args.name, "Customer name"));

    await requireUniqueCode(ctx, "customers", "by_code", "code", code);

    return await ctx.db.insert("customers", { code, name, active: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const customer = await requireDoc(ctx, "customers", id);
    const patch: Partial<Doc<"customers">> = {};

    if (updates.code !== undefined) {
      const code = normalizeCode(requireNonEmpty(updates.code, "Customer code"));
      if (code !== customer.code) {
        await requireUniqueCode(ctx, "customers", "by_code", "code", code, id);
        patch.code = code;
      }
    }

    if (updates.name !== undefined) {
      const name = normalizeName(requireNonEmpty(updates.name, "Customer name"));
      patch.name = name;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("customers", id, patch);
    }
  },
});

export const setActive = mutation({
  args: {
    id: v.id("customers"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "customers", args.id);
    await ctx.db.patch("customers", args.id, { active: args.active });
  },
});

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("customers")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db
      .query("customers")
      .withIndex("by_active")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get("customers", args.id);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    return await ctx.db
      .query("customers")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
  },
});
