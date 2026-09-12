import { internalMutation } from "./_generated/server";
import type { InspectionStage, Source, Reason, InspectionResult } from "./schema";

const DAY = 86_400_000;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency: bail if any customer already exists
    const existing = await ctx.db.query("customers").take(1);
    if (existing.length > 0) {
      console.log("Seed data already exists — skipping.");
      return;
    }

    const now = Date.now();

    // ── Customers ─────────────────────────────────────────────────
    const phx = await ctx.db.insert("customers", { code: "PHX", name: "Phoenix Industries", active: true });
    const acm = await ctx.db.insert("customers", { code: "ACM", name: "Acme Manufacturing", active: true });
    const nts = await ctx.db.insert("customers", { code: "NTS", name: "Northstar Precision", active: true });

    // ── Parts (6 across 3 customers) ──────────────────────────────
    const p1 = await ctx.db.insert("parts", {
      partNumber: "D1211A", partName: "Rotor Housing", drawingVersion: "R3",
      customerId: phx, customerPartNumber: "PHX-5500", customerPartName: "Housing Assy", customerDrawingVersion: "A", active: true,
    });
    const p2 = await ctx.db.insert("parts", {
      partNumber: "D1212B", partName: "Shaft Collar", drawingVersion: "R1",
      customerId: phx, customerPartNumber: "PHX-5501", customerPartName: "Collar Sub-Assy", customerDrawingVersion: "B", active: true,
    });
    const p3 = await ctx.db.insert("parts", {
      partNumber: "A3001", partName: "Valve Body", drawingVersion: "R2",
      customerId: acm, customerPartNumber: "ACM-100", customerPartName: "Valve Body", customerDrawingVersion: "C", active: true,
    });
    const p4 = await ctx.db.insert("parts", {
      partNumber: "A3002", partName: "Piston Ring", drawingVersion: "R1",
      customerId: acm, customerPartNumber: null, customerPartName: null, customerDrawingVersion: null, active: true,
    });
    const p5 = await ctx.db.insert("parts", {
      partNumber: "N7010", partName: "Bearing Sleeve", drawingVersion: "R4",
      customerId: nts, customerPartNumber: "NS-200", customerPartName: "Sleeve", customerDrawingVersion: "A", active: true,
    });
    const p6 = await ctx.db.insert("parts", {
      partNumber: "N7011", partName: "End Cap", drawingVersion: "R1",
      customerId: nts, customerPartNumber: "NS-201", customerPartName: "Cap", customerDrawingVersion: "A", active: true,
    });

    // ── Workorders ────────────────────────────────────────────────
    const wo1 = await ctx.db.insert("workorders", { woNumber: "WO-2026-001", partId: p1, active: true });
    const wo2 = await ctx.db.insert("workorders", { woNumber: "WO-2026-002", partId: p3, active: true });
    const wo3 = await ctx.db.insert("workorders", { woNumber: "WO-2026-003", partId: p5, active: true });

    // ── Inspectors ────────────────────────────────────────────────
    const ins1 = await ctx.db.insert("inspectors", { name: "Yue Zhou", active: true });
    const ins2 = await ctx.db.insert("inspectors", { name: "Mike Chen", active: true });
    const ins3 = await ctx.db.insert("inspectors", { name: "Sarah Lin", active: true });

    // ── Helper to create an inspection ────────────────────────────
    type InspRow = {
      partId: typeof p1;
      customerPo: string;
      vendorPo: string | null;
      workorderId: typeof wo1 | null;
      serials: string[];
      startedAt: number;
      finishedAt: number | null;
      activeMinutes: number | null;
      inspectorId: typeof ins1;
      qtyInspected: number;
      qtyRejected: number;
      result: InspectionResult | null;
      stage: InspectionStage;
      source: Source;
      reason: Reason;
      notes: string | null;
    };

    const insp = (row: InspRow) => ctx.db.insert("inspections", row);

    // ── Inspections (~20, spread over last 30 days) ───────────────
    const ids = [];

    // Finished, pass — various stages
    ids.push(await insp({ partId: p1, customerPo: "PO-PHX-001", vendorPo: "OPT5267-260328-2A", workorderId: wo1, serials: ["SN-001","SN-002"], startedAt: now - 28*DAY, finishedAt: now - 27*DAY, activeMinutes: 45, inspectorId: ins1, qtyInspected: 10, qtyRejected: 0, result: "pass", stage: "blank", source: "vendor", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p1, customerPo: "PO-PHX-001", vendorPo: null, workorderId: wo1, serials: ["SN-001","SN-002"], startedAt: now - 25*DAY, finishedAt: now - 25*DAY, activeMinutes: 60, inspectorId: ins1, qtyInspected: 10, qtyRejected: 0, result: "pass", stage: "heat_treat", source: "inhouse", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p1, customerPo: "PO-PHX-001", vendorPo: null, workorderId: wo1, serials: ["SN-001","SN-002"], startedAt: now - 22*DAY, finishedAt: now - 22*DAY, activeMinutes: 90, inspectorId: ins2, qtyInspected: 10, qtyRejected: 0, result: "pass", stage: "finishing", source: "inhouse", reason: "routine", notes: null }));

    // Finished, fail
    ids.push(await insp({ partId: p2, customerPo: "PO-PHX-001", vendorPo: "OPT5267-260328-2B", workorderId: null, serials: [], startedAt: now - 26*DAY, finishedAt: now - 26*DAY, activeMinutes: 30, inspectorId: ins1, qtyInspected: 20, qtyRejected: 3, result: "fail", stage: "blank", source: "vendor", reason: "routine", notes: "3 blanks out of tolerance" }));
    ids.push(await insp({ partId: p3, customerPo: "PO-ACM-010", vendorPo: "VPO-100", workorderId: wo2, serials: ["ACM-SN-1"], startedAt: now - 20*DAY, finishedAt: now - 20*DAY, activeMinutes: 40, inspectorId: ins2, qtyInspected: 5, qtyRejected: 1, result: "fail", stage: "infiltration", source: "vendor", reason: "first_article", notes: "Surface defect on 1 piece" }));

    // Rework inspection
    ids.push(await insp({ partId: p2, customerPo: "PO-PHX-001", vendorPo: null, workorderId: null, serials: [], startedAt: now - 24*DAY, finishedAt: now - 24*DAY, activeMinutes: 35, inspectorId: ins1, qtyInspected: 3, qtyRejected: 0, result: "pass", stage: "rework", source: "inhouse", reason: "reinspect", notes: "Reworked blanks re-inspected" }));

    // More finished inspections across different parts
    ids.push(await insp({ partId: p3, customerPo: "PO-ACM-010", vendorPo: null, workorderId: wo2, serials: ["ACM-SN-1"], startedAt: now - 18*DAY, finishedAt: now - 18*DAY, activeMinutes: 55, inspectorId: ins2, qtyInspected: 5, qtyRejected: 0, result: "pass", stage: "finishing", source: "inhouse", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p4, customerPo: "PO-ACM-011", vendorPo: "VPO-101", workorderId: null, serials: [], startedAt: now - 16*DAY, finishedAt: now - 16*DAY, activeMinutes: 25, inspectorId: ins3, qtyInspected: 50, qtyRejected: 0, result: "pass", stage: "blank", source: "vendor", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p4, customerPo: "PO-ACM-011", vendorPo: null, workorderId: null, serials: [], startedAt: now - 14*DAY, finishedAt: now - 14*DAY, activeMinutes: 70, inspectorId: ins3, qtyInspected: 50, qtyRejected: 2, result: "fail", stage: "heat_treat", source: "inhouse", reason: "routine", notes: "2 parts didn't meet hardness spec" }));
    ids.push(await insp({ partId: p5, customerPo: "PO-NTS-020", vendorPo: "VPO-200", workorderId: wo3, serials: ["NS-1","NS-2","NS-3"], startedAt: now - 12*DAY, finishedAt: now - 12*DAY, activeMinutes: 40, inspectorId: ins1, qtyInspected: 15, qtyRejected: 0, result: "pass", stage: "blank", source: "vendor", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p5, customerPo: "PO-NTS-020", vendorPo: null, workorderId: wo3, serials: ["NS-1","NS-2","NS-3"], startedAt: now - 10*DAY, finishedAt: now - 10*DAY, activeMinutes: 80, inspectorId: ins2, qtyInspected: 15, qtyRejected: 0, result: "pass", stage: "finishing", source: "inhouse", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p6, customerPo: "PO-NTS-021", vendorPo: null, workorderId: null, serials: [], startedAt: now - 8*DAY, finishedAt: now - 8*DAY, activeMinutes: 20, inspectorId: ins3, qtyInspected: 30, qtyRejected: 0, result: "pass", stage: "finishing", source: "inhouse", reason: "routine", notes: null }));

    // First article
    ids.push(await insp({ partId: p6, customerPo: "PO-NTS-021", vendorPo: "VPO-201", workorderId: null, serials: ["NS-FA-1"], startedAt: now - 6*DAY, finishedAt: now - 6*DAY, activeMinutes: 120, inspectorId: ins1, qtyInspected: 1, qtyRejected: 0, result: "pass", stage: "blank", source: "vendor", reason: "first_article", notes: "First article approved" }));

    // Problem investigation
    ids.push(await insp({ partId: p1, customerPo: "PO-PHX-002", vendorPo: null, workorderId: wo1, serials: ["SN-100"], startedAt: now - 5*DAY, finishedAt: now - 5*DAY, activeMinutes: 45, inspectorId: ins2, qtyInspected: 5, qtyRejected: 5, result: "fail", stage: "finishing", source: "inhouse", reason: "problem", notes: "Customer complaint — full reinspection" }));

    // Still open inspections (finishedAt: null, result: null)
    ids.push(await insp({ partId: p1, customerPo: "PO-PHX-002", vendorPo: null, workorderId: wo1, serials: [], startedAt: now - 3*DAY, finishedAt: null, activeMinutes: null, inspectorId: ins1, qtyInspected: 0, qtyRejected: 0, result: null, stage: "finishing", source: "inhouse", reason: "reinspect", notes: null }));
    ids.push(await insp({ partId: p3, customerPo: "PO-ACM-012", vendorPo: "VPO-102", workorderId: wo2, serials: [], startedAt: now - 2*DAY, finishedAt: null, activeMinutes: null, inspectorId: ins3, qtyInspected: 0, qtyRejected: 0, result: null, stage: "blank", source: "vendor", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p5, customerPo: "PO-NTS-022", vendorPo: null, workorderId: wo3, serials: [], startedAt: now - 1*DAY, finishedAt: null, activeMinutes: null, inspectorId: ins2, qtyInspected: 0, qtyRejected: 0, result: null, stage: "infiltration", source: "inhouse", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p4, customerPo: "PO-ACM-011", vendorPo: null, workorderId: null, serials: [], startedAt: now - 4*DAY, finishedAt: null, activeMinutes: null, inspectorId: ins1, qtyInspected: 0, qtyRejected: 0, result: null, stage: "finishing", source: "inhouse", reason: "routine", notes: null }));
    ids.push(await insp({ partId: p2, customerPo: "PO-PHX-001", vendorPo: null, workorderId: null, serials: ["SN-050"], startedAt: now - 7*DAY, finishedAt: null, activeMinutes: null, inspectorId: ins3, qtyInspected: 0, qtyRejected: 0, result: null, stage: "heat_treat", source: "inhouse", reason: "routine", notes: null }));

    // ── NCRs ───────────────────────────────────────────────────────
    // NCR 1: open, no disposition (linked to failed blank inspection ids[3])
    await ctx.db.insert("ncrs", {
      ncrNumber: "NCR-2026-001", inspectionId: ids[3],
      qtyAffected: 3, description: "3 blanks out of dimensional tolerance on OD",
      disposition: null, dispositionNotes: null,
      raisedAt: now - 26*DAY, closedAt: null, active: true,
    });

    // NCR 2: dispositioned but still open (linked to failed infiltration ids[4])
    await ctx.db.insert("ncrs", {
      ncrNumber: "NCR-2026-002", inspectionId: ids[4],
      qtyAffected: 1, description: "Surface defect on valve body — pitting after infiltration",
      disposition: "rework", dispositionNotes: "Re-machine affected surface per engineering review",
      raisedAt: now - 20*DAY, closedAt: null, active: true,
    });

    // NCR 3: closed (linked to failed finishing ids[14])
    await ctx.db.insert("ncrs", {
      ncrNumber: "NCR-2026-003", inspectionId: ids[14],
      qtyAffected: 5, description: "All 5 parts failed finishing dimensions — customer complaint",
      disposition: "scrap", dispositionNotes: "Parts cannot be reworked per customer spec",
      raisedAt: now - 5*DAY, closedAt: now - 3*DAY, active: true,
    });

    console.log(`Seeded: 3 customers, 6 parts, 3 WOs, 3 inspectors, ${ids.length} inspections, 3 NCRs`);
  },
});
