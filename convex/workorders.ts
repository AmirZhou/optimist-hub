import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createWorkorder = mutation({
  args: {
    woNumber: v.string(),
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workorders")
      .withIndex("by_woNumber", (q) => q.eq("woNumber", args.woNumber))
      .unique();

    if (existing !== null) {
      throw new Error(`Work Order ${existing.woNumber} exists`);
    }

    const workorderId = await ctx.db.insert("workorders", {
      ...args,
      active: true,
    });
  },
});
