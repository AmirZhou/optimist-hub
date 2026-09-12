import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const createCustomer = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (existing !== null) {
      throw new Error(`Customer ${existing.name} exists`);
    }
    const customerId = await ctx.db.insert("customers", {
      ...args,
      active: true,
    });

    return customerId;
  },
});

export const updateCustomer = mutation({
  args: {
    id: v.id("customers"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const customer = await ctx.db.get("customers", id);
    if (customer === null) {
      throw new Error("Customer doesn't exist.");
    }
    const patch: Partial<Doc<"customers">> = {};

    if (updates.code !== undefined) {
      const code = updates.code.trim();
      if (code === "") {
        throw new Error("Customer Code Can't Be Empty");
      }
      const clash = await ctx.db
        .query("customers")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();

      if (clash !== null) {
        throw new Error("Customer Code Already Exists");
      }
      patch.code = code;
    }

    if (updates.name !== undefined) {
      const name = updates.name.trim().toUpperCase();
      if (name === "") {
        throw new Error("Customer Name Can't Be Empty");
      }
      patch.name = name;
    }

    await ctx.db.patch("customers", id, patch);
  },
});
