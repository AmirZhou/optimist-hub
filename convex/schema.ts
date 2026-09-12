import { defineSchema, defineTable } from "convex/server";
import { v, type Infer } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// ── Validators ──────────────────────────────────────────────────────

export const fileKindValidator = v.union(
  v.literal("vendor_sheet"),
  v.literal("inhouse_sheet"),
  v.literal("photo"),
  v.literal("ncr"),
);
export type FileKind = Infer<typeof fileKindValidator>;

export const reasonValidator = v.union(
  v.literal("routine"),
  v.literal("first_article"),
  v.literal("problem"),
  v.literal("reinspect"),
);
export type Reason = Infer<typeof reasonValidator>;

export const sourceValidator = v.union(
  v.literal("inhouse"),
  v.literal("vendor"),
);
export type Source = Infer<typeof sourceValidator>;

export const inspectionResultValidator = v.union(
  v.literal("pass"),
  v.literal("fail"),
);
export type InspectionResult = Infer<typeof inspectionResultValidator>;

export const inspectionStageValidator = v.union(
  v.literal("blank"),
  v.literal("infiltration"),
  v.literal("heat_treat"),
  v.literal("finishing"),
  v.literal("rework"),
);
export type InspectionStage = Infer<typeof inspectionStageValidator>;

export const dispositionValidator = v.union(
  v.literal("use_as_is"),
  v.literal("rework"),
  v.literal("repair"),
  v.literal("scrap"),
  v.literal("return_to_vendor"),
);
export type Disposition = Infer<typeof dispositionValidator>;

// ── Schema ──────────────────────────────────────────────────────────

export default defineSchema({
  ...authTables,

  customers: defineTable({
    code: v.string(),
    name: v.string(),
    active: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["active"]),

  inspections: defineTable({
    partId: v.id("parts"),
    customerPo: v.string(),
    vendorPo: v.nullable(v.string()),
    workorderId: v.nullable(v.id("workorders")),

    serials: v.array(v.string()),

    startedAt: v.number(),
    finishedAt: v.nullable(v.number()),
    activeMinutes: v.nullable(v.number()),

    inspectorId: v.id("inspectors"),

    qtyInspected: v.number(),
    qtyRejected: v.number(),
    result: v.nullable(inspectionResultValidator),

    stage: inspectionStageValidator,
    source: sourceValidator,
    reason: reasonValidator,

    notes: v.nullable(v.string()),
  })
    .index("by_partId_startedAt", ["partId", "startedAt"])
    .index("by_startedAt", ["startedAt"])
    .index("by_finishedAt", ["finishedAt"])
    .index("by_customerPo", ["customerPo"]),

  files: defineTable({
    inspectionId: v.id("inspections"),
    fileKind: fileKindValidator,
    storageId: v.id("_storage"),
    caption: v.nullable(v.string()),
    page: v.nullable(v.number()),
  }).index("by_inspectionId", ["inspectionId"]),

  inspectors: defineTable({
    name: v.string(),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  parts: defineTable({
    partNumber: v.string(),
    partName: v.nullable(v.string()),
    drawingVersion: v.nullable(v.string()),

    customerId: v.id("customers"),
    customerPartNumber: v.nullable(v.string()),
    customerPartName: v.nullable(v.string()),
    customerDrawingVersion: v.nullable(v.string()),

    active: v.boolean(),
  })
    .index("by_customer_partNumber", ["customerId", "partNumber"])
    .index("by_active", ["active"]),

  workorders: defineTable({
    woNumber: v.string(),
    partId: v.id("parts"),
    active: v.boolean(),
  })
    .index("by_woNumber", ["woNumber"])
    .index("by_partId", ["partId"])
    .index("by_active", ["active"]),

  ncrs: defineTable({
    ncrNumber: v.string(),
    inspectionId: v.id("inspections"),
    qtyAffected: v.number(),
    description: v.string(),
    disposition: v.nullable(dispositionValidator),
    dispositionNotes: v.nullable(v.string()),
    raisedAt: v.number(),
    closedAt: v.nullable(v.number()),
    active: v.boolean(),
  })
    .index("by_ncrNumber", ["ncrNumber"])
    .index("by_inspectionId", ["inspectionId"])
    .index("by_closedAt", ["closedAt"]),
});
