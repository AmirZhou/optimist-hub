import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  normalizeCode,
  normalizeName,
  normalizeNotes,
  requireNonEmpty,
} from "./lib/validation";
import { requireDoc } from "./lib/db";

export const create = mutation({
  args: {
    partNumber: v.string(),
    customerId: v.id("customers"),
    partName: v.nullable(v.string()),
    drawingVersion: v.nullable(v.string()),
    customerPartNumber: v.nullable(v.string()),
    customerPartName: v.nullable(v.string()),
    customerDrawingVersion: v.nullable(v.string()),
    notes: v.optional(v.nullable(v.string())),
  },
  handler: async (ctx, args) => {
    const partNumber = normalizeCode(requireNonEmpty(args.partNumber, "Part number"));
    await requireDoc(ctx, "customers", args.customerId);

    const existing = await ctx.db
      .query("parts")
      .withIndex("by_customer_partNumber", (q) =>
        q.eq("customerId", args.customerId).eq("partNumber", partNumber),
      )
      .unique();
    if (existing !== null) {
      throw new Error(`Part ${partNumber} already exists for this customer`);
    }

    return await ctx.db.insert("parts", {
      partNumber,
      customerId: args.customerId,
      partName: args.partName ? normalizeName(args.partName) : null,
      drawingVersion: args.drawingVersion,
      customerPartNumber: args.customerPartNumber
        ? normalizeCode(args.customerPartNumber)
        : null,
      customerPartName: args.customerPartName
        ? normalizeName(args.customerPartName)
        : null,
      customerDrawingVersion: args.customerDrawingVersion,
      notes: normalizeNotes(args.notes ?? null),
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("parts"),
    partNumber: v.optional(v.string()),
    partName: v.optional(v.nullable(v.string())),
    drawingVersion: v.optional(v.nullable(v.string())),
    customerId: v.optional(v.id("customers")),
    customerPartNumber: v.optional(v.nullable(v.string())),
    customerPartName: v.optional(v.nullable(v.string())),
    customerDrawingVersion: v.optional(v.nullable(v.string())),
    notes: v.optional(v.nullable(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const part = await requireDoc(ctx, "parts", id);
    const patch: Partial<Doc<"parts">> = {};

    const effectiveCustomerId = updates.customerId ?? part.customerId;

    if (updates.customerId !== undefined) {
      await requireDoc(ctx, "customers", updates.customerId);
      patch.customerId = updates.customerId;
    }

    if (updates.partNumber !== undefined) {
      patch.partNumber = normalizeCode(requireNonEmpty(updates.partNumber, "Part number"));
    }

    // Re-check uniqueness whenever the (customerId, partNumber) pair changes
    const effectivePartNumber = patch.partNumber ?? part.partNumber;
    if (effectiveCustomerId !== part.customerId || effectivePartNumber !== part.partNumber) {
      const existing = await ctx.db
        .query("parts")
        .withIndex("by_customer_partNumber", (q) =>
          q.eq("customerId", effectiveCustomerId).eq("partNumber", effectivePartNumber),
        )
        .unique();
      if (existing !== null && existing._id !== id) {
        throw new Error(`Part ${effectivePartNumber} already exists for this customer`);
      }
    }

    if (updates.partName !== undefined) {
      patch.partName = updates.partName ? normalizeName(updates.partName) : null;
    }
    if (updates.drawingVersion !== undefined) {
      patch.drawingVersion = updates.drawingVersion;
    }
    if (updates.customerPartNumber !== undefined) {
      patch.customerPartNumber = updates.customerPartNumber
        ? normalizeCode(updates.customerPartNumber)
        : null;
    }
    if (updates.customerPartName !== undefined) {
      patch.customerPartName = updates.customerPartName
        ? normalizeName(updates.customerPartName)
        : null;
    }
    if (updates.customerDrawingVersion !== undefined) {
      patch.customerDrawingVersion = updates.customerDrawingVersion;
    }
    if (updates.notes !== undefined) {
      patch.notes = normalizeNotes(updates.notes);
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("parts", id, patch);
    }
  },
});

export const setActive = mutation({
  args: {
    id: v.id("parts"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireDoc(ctx, "parts", args.id);
    await ctx.db.patch("parts", args.id, { active: args.active });
  },
});

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("parts")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    return await ctx.db.query("parts").withIndex("by_active").collect();
  },
});

export const get = query({
  args: { id: v.id("parts") },
  handler: async (ctx, args) => {
    return await ctx.db.get("parts", args.id);
  },
});

export const getByCustomerAndPartNumber = query({
  args: {
    customerId: v.id("customers"),
    partNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const partNumber = normalizeCode(args.partNumber);
    return await ctx.db
      .query("parts")
      .withIndex("by_customer_partNumber", (q) =>
        q.eq("customerId", args.customerId).eq("partNumber", partNumber),
      )
      .unique();
  },
});

export const listByCustomer = query({
  args: {
    customerId: v.id("customers"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_customer_partNumber", (q) =>
        q.eq("customerId", args.customerId),
      )
      .collect();
    if (args.activeOnly) {
      return parts.filter((p) => p.active);
    }
    return parts;
  },
});
