import { defineSchema, defineTable } from "convex/server";
import { v, type Infer } from "convex/values";

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
export type InspectionResult = Infer<typeof InspectionResultValidator>;

export const inspectionStageValidator = v.union(
  v.literal("blank"),
  v.literal("infiltration"),
  v.literal("heatTreat"),
  v.literal("finishing"),
  v.literal("rework"),
);
export type InspectionStage = Infer<typeof InspectionStageValidator>;

export default defineSchema({
  customers: defineTable({
    code: v.string(), // name, shorthand like PHX
    name: v.string(), // legal name
    active: v.boolean(), // soft delete, in QMS we never delete a customer
  }).index("by_code", ["code"]),

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
    result: InspectionResultValidator,

    stage: InspectionStageValidator,
    source: sourceValidator,
    reason: reasonValidator,

    ncrNumber: v.nullable(v.string()),

    notes: v.nullable(v.string()),
  })
    .index("by_partId_startedAt", ["partId", "startedAt"]) // articulate this
    .index("by_startedAt", ["startedAt"]) // if I set as finishedAt, one inspection may not be finished at the end of the day or week, and got missed. I want in my report that I clearly know what I started and finished
    .index("by_finishedAt", ["finishedAt"]),

  files: defineTable({
    inspectionId: v.id("inspections"),
    fileKind: fileKindValidator,
    storage: v.id("_storage"),
    caption: v.nullable(v.string()),
    page: v.nullable(v.number()),
  }).index("by_inspectionId", ["inspectionId"]),

  inspectors: defineTable({
    name: v.string(),
    active: v.boolean(),
  }),

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
    .index("by_partNumber", ["partNumber"])
    .index("by_customerId", ["customerId"]),

  workorders: defineTable({
    woNumber: v.string(),
    partId: v.id("parts"),
    active: v.boolean(),
  })
    .index("by_woNumber", ["woNumber"])
    .index("by_partId", ["partId"]),
});

// the \customer PO is the origin, actually one line in the customer PO (but sometimes we may buy blanks for a future PO just because we know (from verbal, or somekind of arrangement). PO leads to Part order from blank vendor, or inhouse manufacture. then Heat report of SGS will be supllied by either blank vendor or ourselves. we have spec for the head treat for each material. and Heat number to part is a many to many relationship.
// The customer PO will be placed with drawing, customer drawing, it will have what ever drawing number nad drawing name, aka the part name. then our engineer will reproduce our version of it and the step file using a different number and different name. Tho similar, different
// if it's from blank vendor, the part will have stickers replecting the vendor order (to blank vendor let's say Tycoon) we placed, it will look like OPT5267-260328-2A, OPT5267-260328-2B, and fixed by number reflecting the amout of the blanks. so it will look like OPT5267-260328-2A-1, thru the last index of the parts like 45. 5267 in this case can be anything. then the date
// now we send the parts to Job Shops locally to get machined. there's no restriction if send part from one line of cutomer PO to one shop or many shop.
// the shops do the finishing machining. or we do them in-house. or both.
// during the finishing machine the part will be engraved the actual serial number allocated and specified in the line of the PO. creating the link betwen the little stickers on blanks to one of the parts in one line of PO from customer that has a S/N number.
// for parts, job shop will provide their inspection sheet, i will double check
// for parts made inhouse. i will provide the inspection sheet, at leat 20%, full checking. this is where we use the drawings
