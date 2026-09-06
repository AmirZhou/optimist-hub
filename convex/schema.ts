import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

    customers: defineTable({
        code: v.string(), // name, shorthand like PHX
        name: v.string(), // legal name
        active: v.boolean(), // soft delete, in QMS we never delete a customer
    }).index("by_code", ["code"]),

    inspections: defineTable({
        customerId: v.optional(v.id("customers")),
        partNumber: v.string(), // this is the drawing partNumber
        serials: v.array(v.string()),
        drawingRev: v.string(),
        po: v.optional(v.string()),
        workorder: v.optional(v.string()),
        inspectedAt: v.number(),
        inspector: v.id("inspectors") ,
        qtyInspected: v.number(),
        qtyRejected: v.number(),
        result: v.union(
            v.literal("pass"),
            v.literal("fail"),
            v.literal("partial"),
        ),
        stage: v.union(
            v.literal("blank"),
            v.literal("infiltration"),// problem with this, we infiltrate several (0-8) parts for now. they blong to our workorder. later they will be send to heattreat together, or with other workorders, not restriction at all. and then they will come back. grind to finishing size or we grind inhouse. no restriction at all. what I care in terms of QC is: 1, is the infiltrate result success? like is there any leaks. 2, after the part been heat treated, is there any cracking. 3, if none of these happens, is the finishing grinded part in-size.
            v.literal("heatTreat"),
            v.literal("finishing"),
            v.literal("rework"),
        ),
        source: v.union(
            v.literal("inhouse"),
            v.literal("vendor"),
        ),
        reason: v.union(
            v.literal("routine"),
            v.literal("first_article"),
            v.literal("problem"),
            v.literal("reinspect"),
        ),
        minutes: v.number(),
        ncrNumber: v.optional(v.string()),
        notes: v.optional(v.string()),
    }).index("by_partNumber_workorder", ["partNumber", "workorder"]).index("by_inspectedAt", ["inspectedAt"]),

    files: defineTable({
        inspectionId: v.id("inspections"),
        kind: v.union(
            v.literal("vendor_sheet"),
            v.literal("inhouse_sheet"),
            v.literal("photo"),
            v.literal("ncr"),
        ),
        storage: v.id("_storage"),
        caption: v.optional(v.string()),
        page: v.optional(v.number()),
    }).index("by_inspectionId", ["inspectionId"]),

    inspectors: defineTable({
        name: v.string(),
        active: v.boolean(),
    })
})

// the \customer PO is the origin, actually one line in the customer PO (but sometimes we may buy blanks for a future PO just because we know (from verbal, or somekind of arrangement). PO leads to Part order from blank vendor, or inhouse manufacture. then Heat report of SGS will be supllied by either blank vendor or ourselves. we have spec for the head treat for each material. and Heat number to part is a many to many relationship.
// The customer PO will be placed with drawing, customer drawing, it will have what ever drawing number nad drawing name, aka the part name. then our engineer will reproduce our version of it and the step file using a different number and different name. Tho similar, different
// if it's from blank vendor, the part will have stickers replecting the vendor order (to blank vendor let's say Tycoon) we placed, it will look like OPT5267-260328-2A, OPT5267-260328-2B, and fixed by number reflecting the amout of the blanks. so it will look like OPT5267-260328-2A-1, thru the last index of the parts like 45. 5267 in this case can be anything. then the date
// now we send the parts to Job Shops locally to get machined. there's no restriction if send part from one line of cutomer PO to one shop or many shop.
// the shops do the finishing machining. or we do them in-house. or both.
// during the finishing machine the part will be engraved the actual serial number allocated and specified in the line of the PO. creating the link betwen the little stickers on blanks to one of the parts in one line of PO from customer that has a S/N number.
// for parts, job shop will provide their inspection sheet, i will double check
// for parts made inhouse. i will provide the inspection sheet, at leat 20%, full checking. this is where we use the drawings
