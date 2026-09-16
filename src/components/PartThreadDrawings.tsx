import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Loading } from "../ui";
import { DrawingCard } from "./DrawingsSection";

/**
 * Read-only part details for the inspection page: the part's own drawings plus
 * those from every linked thread. Read-only on purpose — an inspection is a
 * place to consult drawings, not to edit them.
 */
export function PartThreadDrawingsSection({ partId }: { partId: Id<"parts"> }) {
  const groups = useQuery(api.drawings.listForPartDetails, { partId });

  if (groups === undefined) {
    return (
      <div className="card">
        <h2 className="section-title">Part details</h2>
        <Loading />
      </div>
    );
  }

  const withDrawings = groups.filter((g) => g.drawings.length > 0);

  return (
    <div className="card">
      <h2 className="section-title">Part details</h2>

      {withDrawings.length === 0 ? (
        <p className="meta">No drawings on this part or its linked threads.</p>
      ) : (
        withDrawings.map((g) => (
          <section key={g.key} className="drawing-group">
            <h3 className="drawing-group-title">
              <a className="link-btn" href={g.href}>
                {g.title}
              </a>
              <span className="drawing-group-source">
                {g.source === "part" ? "Part" : "Thread"}
              </span>
            </h3>
            {g.notes ? <p className="drawing-group-notes">{g.notes}</p> : null}
            {g.drawings.map((d) => (
              <DrawingCard key={d._id} drawing={d} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
