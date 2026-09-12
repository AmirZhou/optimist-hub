import { useEffect } from "react";
import type { Doc } from "../convex/_generated/dataModel";
import {
  ReasonBadge,
  ResultBadge,
  SortTh,
  SourceBadge,
  StageBadge,
  useTableSort,
  type SortSpec,
} from "./ui";
import { fmtDateTime } from "./domain";

/** An inspections row joined with part/customer/inspector display fields,
 *  as returned by every reports.* query. */
export type Enriched = Doc<"inspections"> & {
  partNumber: string | null;
  customerCode: string | null;
  inspectorName: string | null;
};

function sortValue(i: Enriched, key: string): unknown {
  switch (key) {
    case "startedAt": return i.startedAt;
    case "finishedAt": return i.finishedAt;
    case "partNumber": return i.partNumber;
    case "customerCode": return i.customerCode;
    case "customerPo": return i.customerPo;
    case "stage": return i.stage;
    case "source": return i.source;
    case "reason": return i.reason;
    case "qtyInspected": return i.qtyInspected;
    case "qtyRejected": return i.qtyRejected;
    case "inspectorName": return i.inspectorName;
    case "result": return i.result;
    default: return "";
  }
}

export function InspectionTable({
  inspections,
  defaultSort = { key: "startedAt", dir: "desc" },
}: {
  inspections: Enriched[];
  defaultSort?: SortSpec;
}) {
  const { sort, toggle, setSort, sortRows } = useTableSort<Enriched>(defaultSort);

  // A new default (e.g. the home filter switching to "Not yet judged",
  // which reads best oldest-first) resets the sort. A user's header click
  // always wins until the next default change.
  useEffect(() => {
    setSort(defaultSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSort.key, defaultSort.dir]);

  const rows = sortRows(inspections, sortValue);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortTh label="Started" sortKey="startedAt" sort={sort} onToggle={toggle} />
            <SortTh label="Finished" sortKey="finishedAt" sort={sort} onToggle={toggle} />
            <SortTh label="Part" sortKey="partNumber" sort={sort} onToggle={toggle} />
            <SortTh label="Cust." sortKey="customerCode" sort={sort} onToggle={toggle} />
            <SortTh label="PO" sortKey="customerPo" sort={sort} onToggle={toggle} />
            <SortTh label="Stage" sortKey="stage" sort={sort} onToggle={toggle} />
            <SortTh label="Source" sortKey="source" sort={sort} onToggle={toggle} />
            <SortTh label="Reason" sortKey="reason" sort={sort} onToggle={toggle} />
            <SortTh label="Insp." sortKey="qtyInspected" sort={sort} onToggle={toggle} numeric />
            <SortTh label="Rej." sortKey="qtyRejected" sort={sort} onToggle={toggle} numeric />
            <SortTh label="Inspector" sortKey="inspectorName" sort={sort} onToggle={toggle} />
            <SortTh label="Result" sortKey="result" sort={sort} onToggle={toggle} />
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr
              key={i._id}
              className="clickable-row"
              onClick={() => {
                window.location.hash = `#/inspection/${i._id}`;
              }}
            >
              <td>{fmtDateTime(i.startedAt)}</td>
              <td>{i.finishedAt === null ? "—" : fmtDateTime(i.finishedAt)}</td>
              <td>
                <a href={`#/inspection/${i._id}`} onClick={(e) => e.stopPropagation()}>
                  {i.partNumber}
                </a>
              </td>
              <td>{i.customerCode}</td>
              <td>{i.customerPo}</td>
              <td>
                <StageBadge stage={i.stage} />
              </td>
              <td>
                <SourceBadge source={i.source} />
              </td>
              <td>
                <ReasonBadge reason={i.reason} />
              </td>
              <td className="num">{i.finishedAt === null ? "—" : i.qtyInspected}</td>
              <td className="num">{i.finishedAt === null ? "—" : i.qtyRejected}</td>
              <td>{i.inspectorName}</td>
              <td>
                <ResultBadge result={i.result} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
