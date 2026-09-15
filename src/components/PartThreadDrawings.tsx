import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Loading } from "../ui";
import { DrawingCard } from "./DrawingsSection";

/**
 * Read-only part details for the inspection page: the drawings reachable from
 * this part through its linked threads, grouped by thread. Read-only on
 * purpose — an inspection is a place to consult drawings, not to edit them.
 */
export function PartThreadDrawingsSection({ partId }: { partId: Id<"parts"> }) {
  const groups = useQuery(api.drawings.listByPartThreads, { partId });

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

      {groups.length === 0 ? (
        <p className="meta">No threads linked to this part.</p>
      ) : withDrawings.length === 0 ? (
        <p className="meta">
          {groups.length === 1 ? "The linked thread has" : "Linked threads have"} no
          drawings uploaded.
        </p>
      ) : (
        withDrawings.map((g) => (
          <div key={g.threadId} className="thread-drawings">
            <h3 className="subsection-title">
              <a className="link-btn" href={`#/thread/${g.threadId}`}>
                {g.threadName ?? "—"}
              </a>
            </h3>
            {g.threadNotes ? (
              <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{g.threadNotes}</p>
            ) : null}
            {g.drawings.map((d) => (
              <DrawingCard key={d._id} drawing={d} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
