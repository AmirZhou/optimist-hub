import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Empty, Loading } from "../ui";
import { ThreadDrawingsSection } from "../components/DrawingsSection";

export function ThreadPage({ id }: { id: string }) {
  const threadId = id as Id<"threads">;
  const thread = useQuery(api.threads.get, { id: threadId });
  const linkedParts = useQuery(api.partThreads.listByThread, { threadId });

  if (thread === undefined || linkedParts === undefined) {
    return <Loading />;
  }
  if (thread === null) {
    return <Empty title="Thread not found" />;
  }

  return (
    <>
      <h1 className="page-title">{thread.name}</h1>
      <p className="page-subtitle">
        Thread{!thread.active ? " · inactive" : ""}
      </p>

      <div className="card">
        <h2 className="section-title">Notes</h2>
        {thread.notes ? (
          <p style={{ whiteSpace: "pre-wrap" }}>{thread.notes}</p>
        ) : (
          <p className="meta">No notes.</p>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Linked parts</h2>
        {linkedParts.length === 0 ? (
          <p className="meta">No parts linked to this thread.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Part number</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {linkedParts.map((lp) => (
                  <tr key={lp._id}>
                    <td>
                      <a href={`#/part/${lp.partId}`}>{lp.partNumber ?? "—"}</a>
                    </td>
                    <td>{lp.partName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ThreadDrawingsSection threadId={threadId} />
    </>
  );
}
