# UI brief — Optimist Hub

Hand this to the UI agent along with your design tokens. It covers the business problem, the domain vocabulary, the jobs to be done, and the exact backend that already exists. It deliberately contains no visual direction — that's what your tokens are for.

---

## The business

A small precision manufacturer makes tungsten carbide components for the directional-drilling industry — mud motor bearings, radial bearings, sintered carbide parts. Customers send purchase orders for parts. Parts move through production stages, and at several of those stages someone inspects a batch and records what they found. When parts fail, a non-conformance report gets raised and has to be dispositioned and closed.

Today this is tracked on paper and in spreadsheets. The app replaces that. It is the quality record for the company: if a customer asks "what did you find when you inspected this batch in March," the answer comes from here.

## Who uses it, and under what conditions

**Primary user: one quality technician.** Not a desk worker. Moves between a measurement bench, the shop floor, and a desk. Often has parts in hand, sometimes gloves on. Frequently interrupted.

**The single most important consequence:** an inspection is *started* at one time and *finished* at another, sometimes hours or a day later. Work gets interrupted constantly. So the app's core loop is not "fill in a form and submit." It's:

1. Start an inspection with what you know now (part, PO, stage, why)
2. Go do the physical inspection
3. Come back, possibly much later, and record the results

Anything that forces all the data to be entered in one sitting will not get used.

**Secondary readers:** the two owners and, eventually, external auditors. They don't enter data. They ask questions: what's open, what failed, what happened to this part, what did we do about this NCR.

## Domain glossary

The agent needs these to write sensible labels. Do not invent synonyms — these words are what people say out loud on the floor.

| Term | Meaning |
|---|---|
| **Customer** | Who ordered the part. Has a short code (PHX) and a legal name. |
| **Part** | A part *number*, not a physical object. One record per part number per customer. Has our drawing version and, separately, the customer's own part number and drawing version, which often differ from ours. |
| **Work order** | A production job for a part. Optional on an inspection — not everything inspected has one. |
| **Inspection** | One inspection *event*: someone looked at a quantity of a part at a given stage, on a given day. The central record. |
| **Stage** | Where in production: `blank`, `infiltration`, `heat_treat`, `finishing`, `rework`. |
| **Source** | `inhouse` (we made it) or `vendor` (a supplier made it and we're checking incoming). Vendor inspections carry a vendor PO; in-house ones must not. |
| **Reason** | Why this inspection happened: `routine`, `first_article` (first piece of a new job — highest scrutiny), `problem` (something went wrong), `reinspect` (checking after rework). |
| **Result** | `pass`, `fail`, or **not yet judged**. An in-progress inspection has no result. This distinction matters and must be visible. |
| **Serials** | Serialized parts carry individual serial numbers. A list, often empty. |
| **NCR** | Non-conformance report. Raised against an inspection when parts don't conform. Has its own number, a quantity affected, a description, and a lifecycle. |
| **Disposition** | What we decided to do with non-conforming parts: `use_as_is`, `rework`, `repair`, `scrap`, `return_to_vendor`. An NCR has no disposition until someone decides. |

## Jobs to be done, in priority order

**1. See what's open.** The technician's home screen. Which inspections have been started but not finished? This is the thing that gets looked at twenty times a day, and the thing that currently gets lost on paper. Oldest first — an inspection open for three days is a problem.

**2. Start an inspection.** Fast. The technician is standing at a bench with parts. Fields: part, customer PO, stage, source, reason, inspector, optionally work order / vendor PO / serials.

**3. Finish an inspection.** Record quantity inspected, quantity rejected, pass/fail, optional active minutes and notes. Then, if it failed, raise an NCR from there without navigating away.

**4. Answer a question about history.** "What's happened to part D1211A?" "Show me everything under PO 4471." "What's still open on NCRs?" Read-only lookups, often while on the phone with a customer.

**5. Weekly reporting.** What did we inspect this week, and what was the reject rate by stage.

**6. Maintain the reference data.** Customers, parts, work orders, inspectors. Low frequency, but needed before anything else works — a part has to exist before it can be inspected.

## Hard rules the UI must respect

These come from the domain, not from taste. Getting them wrong makes the app wrong, not just ugly.

- **Nothing is ever deleted.** Deactivating is the only removal. Inactive records stay visible in history but must not appear in pickers for new work. Never show a "Delete" affordance for a customer, part, work order, inspector, or NCR.
- **"Not yet judged" is not the same as "passed."** An open inspection has `result: null`. It must not render as a neutral-looking blank that a tired person reads as fine.
- **Vendor PO is conditional on source.** When source is `vendor`, vendor PO is required. When `inhouse`, it must be absent. The form should reflect this rather than letting the server reject the submission.
- **Inspector is attribution, not a preference.** Every inspection names who did it. Until there's login, it's an explicit selection, and it must not be silently defaulted or remembered in a way that puts the wrong name on a record.
- **Quantities have invariants.** Rejected can't exceed inspected; inspected must be at least 1; you can't pass with rejects or fail with none. Surface these as inline validation, not as server error toasts.
- **Errors carry meaning.** The backend throws descriptive messages ("Vendor source requires a vendor PO"). Show them. Do not swallow them into a generic failure state.

## The backend that already exists

Convex. All functions are already built, validated, and index-backed. **Do not add backend functions; if something is missing, say so rather than working around it.**

Enum literal values are exactly as listed in the glossary above — snake_case, no exceptions.

**Reference data** — each of `customers`, `parts`, `workorders`, `inspectors` has:
`create`, `update` (all fields optional), `setActive({id, active})`, `list({activeOnly?})`, `get({id})`

Plus: `customers.getByCode({code})` · `parts.getByCustomerAndPartNumber({customerId, partNumber})` · `parts.listByCustomer({customerId, activeOnly?})` · `workorders.getByWoNumber({woNumber})` · `workorders.listByPart({partId})`

**Inspections** — a lifecycle, not CRUD:
- `inspections.start({ partId, customerPo, inspectorId, stage, source, reason, vendorPo, workorderId, serials? })`
- `inspections.finish({ id, qtyInspected, qtyRejected, result, activeMinutes, notes })`
- `inspections.update({ id, ...most fields optional })` — corrections after the fact. Cannot set `result` or `finishedAt`.
- `inspections.reopen({ id })` — undo an accidental finish
- `inspections.get({ id })`

**NCRs:**
`ncrs.create({ inspectionId, ncrNumber, qtyAffected, description })` · `ncrs.disposition({ id, disposition, dispositionNotes })` · `ncrs.close({ id })` · `ncrs.setActive` · `ncrs.listByInspection({ inspectionId })` · `ncrs.listOpen()` · `ncrs.get({ id })`

An NCR cannot be closed before it has a disposition. The UI should sequence these two steps rather than offering close as a peer action.

**Files:**
`files.generateUploadUrl()` → POST the file to the returned URL → `files.attach({ inspectionId, fileKind, storageId, caption, page })`
`files.listByInspection({ inspectionId })` returns rows with a signed `url`. `files.detach({ id })` removes one.
File kinds: `vendor_sheet`, `inhouse_sheet`, `photo`, `ncr`.

**Reports** — these return inspections already joined with `partNumber`, `customerCode`, `inspectorName`:
`reports.openInspections()` · `reports.inspectionsStartedBetween({ from, to })` · `reports.partHistory({ partId })` · `reports.byCustomerPo({ customerPo })` · `reports.rejectSummary({ from, to })`

Timestamps are epoch milliseconds throughout.

## Gaps you will hit — flag them, don't route around them

1. **There is no `inspections.list`.** Every inspection list must come from a `reports.*` query. For "all inspections," use `inspectionsStartedBetween` with a wide range.
2. **No auth.** Inspector is selected, not derived from a session. Build the selection so it can be replaced by a logged-in identity later without reworking every form.
3. **No pagination anywhere.** Every list query returns everything matching. Fine at current volume; don't build infinite scroll against it.
4. **No search.** Lookups are by exact code, PO, or part number, all normalized to uppercase before matching. There is no fuzzy or partial-match query.
5. **No customer-scoped inspection query.** "All inspections for customer X" requires fetching their parts first, then each part's history. If this screen matters, say so — it needs a backend change, not a client-side workaround.

## Non-goals for this pass

No auth or roles. No audit trail or edit history. No CSV or PDF export. No charts beyond what `rejectSummary` returns as numbers. No offline mode. No print layouts. No email or notifications.

## What good looks like

The technician can start an inspection in under thirty seconds without a keyboard, walk away, come back an hour later, find it immediately in a list of what's open, and finish it. Everything else on this list is secondary to that loop working well.
