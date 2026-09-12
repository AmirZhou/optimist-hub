import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  reasonValidator,
  sourceValidator,
  inspectionResultValidator,
  inspectionStageValidator,
} from "./schema";
import { normalizeCode, requireNonEmpty, assertQuantitiesValid } from "./lib/validation";
import { requireDoc } from "./lib/db";

// ── Lifecycle mutations ─────────────────────────────────────────────

export const start = mutation({
  args: {
    partId: v.id("parts"),
    customerPo: v.string(),
    inspectorId: v.id("inspectors"),
    stage: inspectionStageValidator,
    source: sourceValidator,
    reason: reasonValidator,
    vendorPo: v.nullable(v.string()),
    workorderId: v.nullable(v.id("workorders")),
    serials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const customerPo = normalizeCode(requireNonEmpty(args.customerPo, "Customer PO"));

    const part = await requireDoc(ctx, "parts", args.partId);
    if (!part.active) {
      throw new Error("Part is inactive");
    }

    const inspector = await requireDoc(ctx, "inspectors", args.inspectorId);
    if (!inspector.active) {
      throw new Error("Inspector is inactive");
    }

    if (args.workorderId !== null) {
      await requireDoc(ctx, "workorders", args.workorderId);
    }

    // Enforce source/vendorPo pairing
    let vendorPo: string | null = null;
    if (args.source === "vendor") {
      if (args.vendorPo === null) {
        throw new Error("Vendor source requires a vendor PO");
      }
      vendorPo = normalizeCode(requireNonEmpty(args.vendorPo, "Vendor PO"));
    } else {
      if (args.vendorPo !== null) {
        throw new Error("In-house source must not have a vendor PO");
      }
    }

    return await ctx.db.insert("inspections", {
      partId: args.partId,
      customerPo,
      vendorPo,
      workorderId: args.workorderId,
      serials: args.serials ?? [],
      startedAt: Date.now(),
      finishedAt: null,
      activeMinutes: null,
      inspectorId: args.inspectorId,
      qtyInspected: 0,
      qtyRejected: 0,
      result: null,
      stage: args.stage,
      source: args.source,
      reason: args.reason,
      notes: null,
    });
  },
});

export const finish = mutation({
  args: {
    id: v.id("inspections"),
    qtyInspected: v.number(),
    qtyRejected: v.number(),
    result: inspectionResultValidator,
    activeMinutes: v.nullable(v.number()),
    notes: v.nullable(v.string()),
  },
  handler: async (ctx, args) => {
    const inspection = await requireDoc(ctx, "inspections", args.id);

    if (inspection.finishedAt !== null) {
      throw new Error("Inspection is already finished");
    }
    assertQuantitiesValid(args.qtyInspected, args.qtyRejected, args.result);

    await ctx.db.patch("inspections", args.id, {
      qtyInspected: args.qtyInspected,
      qtyRejected: args.qtyRejected,
      result: args.result,
      activeMinutes: args.activeMinutes,
      notes: args.notes,
      finishedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inspections"),
    customerPo: v.optional(v.string()),
    vendorPo: v.optional(v.nullable(v.string())),
    workorderId: v.optional(v.nullable(v.id("workorders"))),
    serials: v.optional(v.array(v.string())),
    partId: v.optional(v.id("parts")),
    inspectorId: v.optional(v.id("inspectors")),
    stage: v.optional(inspectionStageValidator),
    source: v.optional(sourceValidator),
    reason: v.optional(reasonValidator),
    qtyInspected: v.optional(v.number()),
    qtyRejected: v.optional(v.number()),
    activeMinutes: v.optional(v.nullable(v.number())),
    notes: v.optional(v.nullable(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const inspection = await requireDoc(ctx, "inspections", id);
    const patch: Partial<Doc<"inspections">> = {};

    if (updates.customerPo !== undefined) {
      patch.customerPo = normalizeCode(requireNonEmpty(updates.customerPo, "Customer PO"));
    }

    if (updates.partId !== undefined) {
      const part = await requireDoc(ctx, "parts", updates.partId);
      if (!part.active) throw new Error("Part is inactive");
      patch.partId = updates.partId;
    }

    if (updates.inspectorId !== undefined) {
      const inspector = await requireDoc(ctx, "inspectors", updates.inspectorId);
      if (!inspector.active) throw new Error("Inspector is inactive");
      patch.inspectorId = updates.inspectorId;
    }

    if (updates.workorderId !== undefined) {
      if (updates.workorderId !== null) {
        await requireDoc(ctx, "workorders", updates.workorderId);
      }
      patch.workorderId = updates.workorderId;
    }

    // Re-validate source/vendorPo pairing if either changes.
    // vendorPo is assigned inside this block (not via a separate `if` below)
    // because its normalized value depends on the pairing check — changing
    // source from vendor to inhouse requires passing vendorPo: null in the
    // same call, and vice versa.
    const effectiveSource = updates.source ?? inspection.source;
    const effectiveVendorPo =
      updates.vendorPo !== undefined ? updates.vendorPo : inspection.vendorPo;
    if (updates.source !== undefined || updates.vendorPo !== undefined) {
      if (effectiveSource === "vendor") {
        if (effectiveVendorPo === null) {
          throw new Error("Vendor source requires a vendor PO");
        }
        patch.vendorPo = normalizeCode(requireNonEmpty(effectiveVendorPo, "Vendor PO"));
      } else {
        if (effectiveVendorPo !== null) {
          throw new Error("In-house source must not have a vendor PO");
        }
        patch.vendorPo = null;
      }
    }

    if (updates.source !== undefined) patch.source = updates.source;
    if (updates.serials !== undefined) patch.serials = updates.serials;
    if (updates.stage !== undefined) patch.stage = updates.stage;
    if (updates.reason !== undefined) patch.reason = updates.reason;
    if (updates.qtyInspected !== undefined) patch.qtyInspected = updates.qtyInspected;
    if (updates.qtyRejected !== undefined) patch.qtyRejected = updates.qtyRejected;
    if (updates.activeMinutes !== undefined) patch.activeMinutes = updates.activeMinutes;
    if (updates.notes !== undefined) patch.notes = updates.notes;

    // Re-validate quantity invariants if either quantity changes
    if (updates.qtyInspected !== undefined || updates.qtyRejected !== undefined) {
      const effectiveQtyInspected = updates.qtyInspected ?? inspection.qtyInspected;
      const effectiveQtyRejected = updates.qtyRejected ?? inspection.qtyRejected;
      const effectiveResult = inspection.result;
      assertQuantitiesValid(effectiveQtyInspected, effectiveQtyRejected, effectiveResult);
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("inspections", id, patch);
    }
  },
});

/** MVP-only: reopen an inspection finished by mistake. In production this
 *  would require a reason code and audit record. */
export const reopen = mutation({
  args: { id: v.id("inspections") },
  handler: async (ctx, args) => {
    const inspection = await requireDoc(ctx, "inspections", args.id);
    if (inspection.finishedAt === null) {
      throw new Error("Inspection is not finished");
    }
    await ctx.db.patch("inspections", args.id, {
      finishedAt: null,
      result: null,
    });
  },
});

// ── Queries ─────────────────────────────────────────────────────────

export const get = query({
  args: { id: v.id("inspections") },
  handler: async (ctx, args) => {
    return await ctx.db.get("inspections", args.id);
  },
});
