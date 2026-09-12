import type { Doc } from "../convex/_generated/dataModel";
import { ReasonBadge, ResultBadge, SourceBadge, StageBadge } from "./ui";
import { fmtDateTime } from "./domain";

/** An inspections row joined with part/customer/inspector display fields,
 *  as returned by every reports.* query. */
export type Enriched = Doc<"inspections"> & {
  partNumber: string | null;
  customerCode: string | null;
  inspectorName: string | null;
};

export function InspectionTable({ inspections }: { inspections: Enriched[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Started</th>
            <th>Finished</th>
            <th>Part</th>
            <th>Cust.</th>
            <th>PO</th>
            <th>Stage</th>
            <th>Source</th>
            <th>Reason</th>
            <th className="num">Insp.</th>
            <th className="num">Rej.</th>
            <th>Inspector</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((i) => (
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
