import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Empty, Loading } from "../ui";
import { InspectionTable } from "../tables";

export function PartPage({ id }: { id: string }) {
  const part = useQuery(api.parts.get, { id: id as Id<"parts"> });
  const customer = useQuery(
    api.customers.get,
    part ? { id: part.customerId } : "skip",
  );
  const history = useQuery(api.reports.partHistory, { partId: id as Id<"parts"> });

  if (part === undefined || customer === undefined || history === undefined) {
    return <Loading />;
  }
  if (part === null) {
    return <Empty title="Part not found" />;
  }

  return (
    <>
      <h1 className="page-title">{part.partNumber}</h1>
      <p className="page-subtitle">
        {customer ? `${customer.code} — ${customer.name}` : ""}
        {part.partName ? ` · ${part.partName}` : ""}
        {part.drawingVersion ? ` · rev ${part.drawingVersion}` : ""}
        {part.customerPartNumber ? ` · their number ${part.customerPartNumber}` : ""}
        {!part.active ? " · inactive" : ""}
      </p>

      <div className="card">
        <h2 className="section-title">Inspection history</h2>
        {history.length === 0 ? (
          <Empty title="No inspections recorded for this part" />
        ) : (
          <InspectionTable inspections={history} />
        )}
      </div>
    </>
  );
}
