import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const UOM = v.union(
  v.literal("in"),
  v.literal("mm"),
  v.literal("deg"),
  v.literal("hrc"),
  v.literal("ra"),
);

const TRAVELER_STATUS = v.union(
    v.literal("planned")
    v.literal("in_process") // this naming lives forever in the database without a migration
    v.literal("at_vendor") // prosphating, machining
    v.literal("inspection")
    v.literal("hold")
    v.literal("shipped")
    v.literal("closed")
);

export default defineSchema({

    // the first table, named customer, we query by ctx.db.query("customers"), renaming means migration
    customer: defineTable({
        code: v.string(), // name, shorthand like PHX
        name: v.string(), // legal name
        active: v.boolean(), // soft delete, in QMS we never delete a customer
    }).index("by_code", ["code"]),
})

// the \customer PO is the origin, actually one line in the customer PO (but sometimes we may buy blanks for a future PO just because we know (from verbal, or somekind of arrangement). PO leads to Part order from blank vendor, or inhouse manufacture. then Heat report of SGS will be supllied by either blank vendor or ourselves. we have spec for the head treat for each material. and Heat number to part is a many to many relationship.
// The customer PO will be placed with drawing, customer drawing, it will have what ever drawing number nad drawing name, aka the part name. then our engineer will reproduce our version of it and the step file using a different number and different name. Tho similar, different
// if it's from blank vendor, the part will have stickers replecting the vendor order (to blank vendor let's say Tycoon) we placed, it will look like OPT5267-260328-2A, OPT5267-260328-2B, and fixed by number reflecting the amout of the blanks. so it will look like OPT5267-260328-2A-1, thru the last index of the parts like 45. 5267 in this case can be anything. then the date
// now we send the parts to Job Shops locally to get machined. there's no restriction if send part from one line of cutomer PO to one shop or many shop.
// the shops do the finishing machining. or we do them in-house. or both.
// during the finishing machine the part will be engraved the actual serial number allocated and specified in the line of the PO. creating the link betwen the little stickers on blanks to one of the parts in one line of PO from customer that has a S/N number.
// for parts, job shop will provide their inspection sheet, i will double check
// for parts made inhouse. i will provide the inspection sheet, at leat 20%, full checking. this is where we use the drawings
