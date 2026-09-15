import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireDoc } from "./lib/db";

export const link = mutation({
  args: { partId: v.id("parts"), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "parts", args.partId);
    await requireDoc(ctx, "threads", args.threadId);

    // Check for existing link
    const existing = await ctx.db
      .query("partThreads")
      .withIndex("by_partId", (q) => q.eq("partId", args.partId))
      .collect();
    if (existing.some((pt) => pt.threadId === args.threadId)) {
      throw new Error("Thread is already linked to this part");
    }

    return await ctx.db.insert("partThreads", {
      partId: args.partId,
      threadId: args.threadId,
    });
  },
});

export const unlink = mutation({
  args: { id: v.id("partThreads") },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "partThreads", args.id);
    await ctx.db.delete("partThreads", args.id);
  },
});

export const listByPart = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("partThreads")
      .withIndex("by_partId", (q) => q.eq("partId", args.partId))
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const thread = await ctx.db.get("threads", link.threadId);
        return { ...link, threadName: thread?.name ?? null };
      }),
    );
  },
});

export const listByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("partThreads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const part = await ctx.db.get("parts", link.partId);
        return {
          ...link,
          partNumber: part?.partNumber ?? null,
          partName: part?.partName ?? null,
        };
      }),
    );
  },
});
