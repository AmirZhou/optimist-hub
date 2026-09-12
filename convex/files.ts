import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fileKindValidator } from "./schema";
import { requireDoc } from "./lib/db";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attach = mutation({
  args: {
    inspectionId: v.id("inspections"),
    fileKind: fileKindValidator,
    storageId: v.id("_storage"),
    caption: v.nullable(v.string()),
    page: v.nullable(v.number()),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "inspections", args.inspectionId);

    return await ctx.db.insert("files", {
      inspectionId: args.inspectionId,
      fileKind: args.fileKind,
      storageId: args.storageId,
      caption: args.caption,
      page: args.page,
    });
  },
});

export const listByInspection = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_inspectionId", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      })),
    );
  },
});

/** Hard delete — a detached file has no record to belong to. */
export const detach = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const file = await requireDoc(ctx, "files", args.id);
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete("files", args.id);
  },
});
