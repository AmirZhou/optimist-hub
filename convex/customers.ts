import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
