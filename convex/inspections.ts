import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import {
  reasonValidator,
  sourceValidator,
  inspectionResultValidator,
  inspectionStageValidator,
} from "./schema";

// Return this weeks inspectipons, order by date (asc, des)
export const getInspectionsInRange = query({
  args: { start: v.number(), end: v.number() },
  handler: async (ctx, args) => {
    const inspections = await ctx.db
      .query("inspections")
      // withIndex, got two parameters, the index name, and the slice builder, it will call the builder internally, learn this pattern
      .withIndex("by_startedAt", (q) =>
        q.gte("startedAt", args.start).lt("startedAt", args.end),
      )
      .order("desc")
      .collect();

    return inspections;
  },
});

// what is const? why it's not var, what happened internally
export const startInspection = mutation({
  args: {
    partId: v.id("parts"), // E.g.: D1211A, I didn't use Id because I don't want to prepopulate the parts table before a inspection. or should I?
    reason: reasonValidator,
    source: sourceValidator,
    stage: stageValidator,
    inspectorId: v.optional(v.id("inspectors")), // I want ID rather than inspertor name is the inspector must already or very likely loggin in or authenticated. and when starting an inspection the id is available.
    workorderId: v.optional(v.id("workorders")),
  },
  handler: async (ctx, args) => {
    const inspectionId = await ctx.db.insert("inspections", {
      ...args,
      startedAt: Date.now(),
      result: "pending",
    });
    return inspectionId;
  },
});
