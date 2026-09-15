import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { drawingKindValidator } from "./schema";
import { requireDoc } from "./lib/db";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attach = mutation({
  args: {
    storageId: v.id("_storage"),
    partId: v.optional(v.id("parts")),
    threadId: v.optional(v.id("threads")),
    kind: drawingKindValidator,
    revision: v.nullable(v.string()),
  },
  handler: async (ctx, args) => {
    const partId = args.partId ?? null;
    const threadId = args.threadId ?? null;

    // Exactly one of partId or threadId must be set
    if ((partId === null) === (threadId === null)) {
      throw new Error("Exactly one of partId or threadId must be provided");
    }

    if (partId !== null) await requireDoc(ctx, "parts", partId);
    if (threadId !== null) await requireDoc(ctx, "threads", threadId);

    return await ctx.db.insert("drawings", {
      storageId: args.storageId,
      partId,
      threadId,
      kind: args.kind,
      revision: args.revision,
      uploadedAt: Date.now(),
    });
  },
});

export const listByPart = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    const drawings = await ctx.db
      .query("drawings")
      .withIndex("by_partId", (q) => q.eq("partId", args.partId))
      .collect();

    return await Promise.all(
      drawings.map(async (d) => ({
        ...d,
        url: await ctx.storage.getUrl(d.storageId),
      })),
    );
  },
});

export const listByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const drawings = await ctx.db
      .query("drawings")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .collect();

    return await Promise.all(
      drawings.map(async (d) => ({
        ...d,
        url: await ctx.storage.getUrl(d.storageId),
      })),
    );
  },
});

export const detach = mutation({
  args: { id: v.id("drawings") },
  handler: async (ctx, args) => {
    const drawing = await requireDoc(ctx, "drawings", args.id);
    await ctx.storage.delete(drawing.storageId);
    await ctx.db.delete("drawings", args.id);
  },
});
