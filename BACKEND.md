# Backend API Reference

All functions are runnable via `npx convex run <module>:<function> '<json-args>'`.

---

## customers

| Function | Type | Args | Example |
|----------|------|------|---------|
| `create` | mutation | `{ code, name }` | `npx convex run customers:create '{"code":"PHX","name":"Phoenix Industries"}'` |
| `update` | mutation | `{ id, code?, name? }` | `npx convex run customers:update '{"id":"<id>","name":"Phoenix Corp"}'` |
| `setActive` | mutation | `{ id, active }` | `npx convex run customers:setActive '{"id":"<id>","active":false}'` |
| `list` | query | `{ activeOnly? }` | `npx convex run customers:list '{"activeOnly":true}'` |
| `get` | query | `{ id }` | `npx convex run customers:get '{"id":"<id>"}'` |
| `getByCode` | query | `{ code }` | `npx convex run customers:getByCode '{"code":"PHX"}'` |

## parts

| Function | Type | Args | Example |
|----------|------|------|---------|
| `create` | mutation | `{ partNumber, customerId, partName, drawingVersion, customerPartNumber, customerPartName, customerDrawingVersion }` | `npx convex run parts:create '{"partNumber":"D1211A","customerId":"<id>","partName":"Rotor","drawingVersion":"R1","customerPartNumber":null,"customerPartName":null,"customerDrawingVersion":null}'` |
| `update` | mutation | `{ id, partNumber?, partName?, drawingVersion?, customerId?, customerPartNumber?, customerPartName?, customerDrawingVersion? }` | `npx convex run parts:update '{"id":"<id>","partName":"Rotor Housing"}'` |
| `setActive` | mutation | `{ id, active }` | `npx convex run parts:setActive '{"id":"<id>","active":false}'` |
| `list` | query | `{ activeOnly? }` | `npx convex run parts:list '{}'` |
| `get` | query | `{ id }` | `npx convex run parts:get '{"id":"<id>"}'` |
| `getByCustomerAndPartNumber` | query | `{ customerId, partNumber }` | `npx convex run parts:getByCustomerAndPartNumber '{"customerId":"<id>","partNumber":"D1211A"}'` |
| `listByCustomer` | query | `{ customerId, activeOnly? }` | `npx convex run parts:listByCustomer '{"customerId":"<id>"}'` |

## workorders

| Function | Type | Args | Example |
|----------|------|------|---------|
| `create` | mutation | `{ woNumber, partId }` | `npx convex run workorders:create '{"woNumber":"WO-2026-001","partId":"<id>"}'` |
| `update` | mutation | `{ id, woNumber?, partId? }` | `npx convex run workorders:update '{"id":"<id>","woNumber":"WO-2026-002"}'` |
| `setActive` | mutation | `{ id, active }` | `npx convex run workorders:setActive '{"id":"<id>","active":false}'` |
| `list` | query | `{ activeOnly? }` | `npx convex run workorders:list '{"activeOnly":true}'` |
| `get` | query | `{ id }` | `npx convex run workorders:get '{"id":"<id>"}'` |
| `getByWoNumber` | query | `{ woNumber }` | `npx convex run workorders:getByWoNumber '{"woNumber":"WO-2026-001"}'` |
| `listByPart` | query | `{ partId }` | `npx convex run workorders:listByPart '{"partId":"<id>"}'` |

## inspectors

| Function | Type | Args | Example |
|----------|------|------|---------|
| `create` | mutation | `{ name }` | `npx convex run inspectors:create '{"name":"Yue Zhou"}'` |
| `update` | mutation | `{ id, name? }` | `npx convex run inspectors:update '{"id":"<id>","name":"Yue Z."}'` |
| `setActive` | mutation | `{ id, active }` | `npx convex run inspectors:setActive '{"id":"<id>","active":false}'` |
| `list` | query | `{ activeOnly? }` | `npx convex run inspectors:list '{"activeOnly":true}'` |
| `get` | query | `{ id }` | `npx convex run inspectors:get '{"id":"<id>"}'` |

## inspections

| Function | Type | Args | Example |
|----------|------|------|---------|
| `start` | mutation | `{ partId, customerPo, inspectorId, stage, source, reason, vendorPo, workorderId, serials? }` | `npx convex run inspections:start '{"partId":"<id>","customerPo":"PO-001","inspectorId":"<id>","stage":"blank","source":"vendor","reason":"routine","vendorPo":"VPO-100","workorderId":null}'` |
| `finish` | mutation | `{ id, qtyInspected, qtyRejected, result, activeMinutes, notes }` | `npx convex run inspections:finish '{"id":"<id>","qtyInspected":10,"qtyRejected":0,"result":"pass","activeMinutes":45,"notes":null}'` |
| `update` | mutation | `{ id, customerPo?, vendorPo?, workorderId?, serials?, partId?, inspectorId?, stage?, source?, reason?, qtyInspected?, qtyRejected?, activeMinutes?, notes? }` | `npx convex run inspections:update '{"id":"<id>","notes":"Corrected note"}'` |
| `reopen` | mutation | `{ id }` | `npx convex run inspections:reopen '{"id":"<id>"}'` |
| `get` | query | `{ id }` | `npx convex run inspections:get '{"id":"<id>"}'` |

## ncrs

| Function | Type | Args | Example |
|----------|------|------|---------|
| `create` | mutation | `{ inspectionId, ncrNumber, qtyAffected, description }` | `npx convex run ncrs:create '{"inspectionId":"<id>","ncrNumber":"NCR-2026-001","qtyAffected":3,"description":"OD out of tolerance"}'` |
| `disposition` | mutation | `{ id, disposition, dispositionNotes }` | `npx convex run ncrs:disposition '{"id":"<id>","disposition":"rework","dispositionNotes":"Re-machine surface"}'` |
| `close` | mutation | `{ id }` | `npx convex run ncrs:close '{"id":"<id>"}'` |
| `listByInspection` | query | `{ inspectionId }` | `npx convex run ncrs:listByInspection '{"inspectionId":"<id>"}'` |
| `listOpen` | query | `{}` | `npx convex run ncrs:listOpen '{}'` |
| `get` | query | `{ id }` | `npx convex run ncrs:get '{"id":"<id>"}'` |

## files

| Function | Type | Args | Example |
|----------|------|------|---------|
| `generateUploadUrl` | mutation | `{}` | `npx convex run files:generateUploadUrl '{}'` |
| `attach` | mutation | `{ inspectionId, fileKind, storageId, caption, page }` | `npx convex run files:attach '{"inspectionId":"<id>","fileKind":"photo","storageId":"<storage_id>","caption":"Front view","page":null}'` |
| `listByInspection` | query | `{ inspectionId }` | `npx convex run files:listByInspection '{"inspectionId":"<id>"}'` |
| `detach` | mutation | `{ id }` | `npx convex run files:detach '{"id":"<id>"}'` |

## reports

| Function | Type | Args | Example |
|----------|------|------|---------|
| `openInspections` | query | `{}` | `npx convex run reports:openInspections '{}'` |
| `inspectionsStartedBetween` | query | `{ from, to }` | `npx convex run reports:inspectionsStartedBetween '{"from":1725148800000,"to":1727740800000}'` |
| `partHistory` | query | `{ partId }` | `npx convex run reports:partHistory '{"partId":"<id>"}'` |
| `byCustomerPo` | query | `{ customerPo }` | `npx convex run reports:byCustomerPo '{"customerPo":"PO-PHX-001"}'` |
| `rejectSummary` | query | `{ from, to }` | `npx convex run reports:rejectSummary '{"from":1725148800000,"to":1727740800000}'` |

## seed

| Function | Type | Args | Example |
|----------|------|------|---------|
| `run` | internalMutation | `{}` | `npx convex run seed:run` |

> Idempotent — safe to run multiple times. Checks for existing data before inserting.

---

## Disposition values (NCRs)

`use_as_is` · `rework` · `repair` · `scrap` · `return_to_vendor`

## Inspection stages

`blank` · `infiltration` · `heat_treat` · `finishing` · `rework`

## Sources

`inhouse` · `vendor` (vendor requires `vendorPo`; inhouse requires `vendorPo: null`)

## Reasons

`routine` · `first_article` · `problem` · `reinspect`

## File kinds

`vendor_sheet` · `inhouse_sheet` · `photo` · `ncr`
