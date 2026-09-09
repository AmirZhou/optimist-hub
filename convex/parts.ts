import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPart = mutation({
  args: { partNumber: v.string(), customerId: v.id("customers") }, // does this mean frontend need to know the customerId, rather than the name?
  handler: async (ctx, args) => {
    // the customer seems to be exist first, and it make sense that the custoer exist. the problem is it should change, if it should change, what kind of validation should be there?
    const partId = await ctx.db.insert("parts", { ...args });
    return partId;
  },
});
