import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Empty, Loading, Modal, Select, cleanError, pushToast } from "../ui";
import { ThreadDrawingsSection } from "./DrawingsSection";
import { ThreadDraftFields, useCreateThread, useThreadDraft } from "./ThreadForm";

/**
 * The threads linked to a part. Used both in the Parts reference row and on the
 * standalone part page, so it owns its own queries rather than taking them as
 * props — the two call sites were otherwise identical and drifted easily.
 */
export function PartThreadsSection({ partId }: { partId: Id<"parts"> }) {
  const partThreads = useQuery(api.partThreads.listByPart, { partId });
  const unlink = useMutation(api.partThreads.unlink);

  const [showLink, setShowLink] = useState(false);
  const [previewId, setPreviewId] = useState<Id<"threads"> | null>(null);

  const linked = partThreads ?? [];

  return (
    <div className="card">
      <h2 className="section-title">Threads</h2>

      {partThreads === undefined ? (
        <Loading />
      ) : linked.length === 0 ? (
        <p className="meta" style={{ marginBottom: 16 }}>No threads linked.</p>
      ) : (
        <ul className="thread-links">
          {linked.map((pt) => (
            <li key={pt._id} className="thread-link">
              <button
                type="button"
                className="link-btn"
                onClick={() => setPreviewId(pt.threadId)}
              >
                {pt.threadName ?? "—"}
              </button>
              <button
                className="btn-inline-x"
                title="Unlink"
                aria-label={`Unlink ${pt.threadName ?? "thread"}`}
                onClick={() => void unlink({ id: pt._id })}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="btn btn-sm" onClick={() => setShowLink(true)}>
        Link a thread
      </button>

      {showLink && (
        <LinkThreadModal
          partId={partId}
          linkedIds={new Set(linked.map((pt) => pt.threadId))}
          onClose={() => setShowLink(false)}
        />
      )}

      {previewId !== null && (
        <ThreadPreviewModal threadId={previewId} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}

/**
 * Attaches a thread to a part, either by picking an existing one or by creating
 * it here. Threads change rarely, so this stays behind a button rather than
 * occupying the section with a permanently empty select.
 */
function LinkThreadModal({
  partId,
  linkedIds,
  onClose,
}: {
  partId: Id<"parts">;
  linkedIds: Set<Id<"threads">>;
  onClose: () => void;
}) {
  const allThreads = useQuery(api.threads.list, { activeOnly: true });
  const link = useMutation(api.partThreads.link);
  const createThread = useCreateThread();
  const { draft, setDraft, busy, setBusy } = useThreadDraft();

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedThread, setSelectedThread] = useState("");

  const available = (allThreads ?? []).filter((t) => !linkedIds.has(t._id));

  async function linkExisting() {
    setBusy(true);
    try {
      await link({ partId, threadId: selectedThread as Id<"threads"> });
      onClose();
    } catch (err) {
      pushToast(cleanError(err));
      setBusy(false);
    }
  }

  async function createAndLink() {
    setBusy(true);
    const threadId = await createThread(draft);
    if (threadId === null) {
      setBusy(false);
      return;
    }
    // The thread exists now, so a failed link must not re-run creation.
    try {
      await link({ partId, threadId });
    } catch (err) {
      pushToast(`Thread created, but linking failed: ${cleanError(err)}`);
    }
    setBusy(false);
    onClose();
  }

  return (
    <Modal title="Link a thread" onClose={onClose}>
      <div className="tabs">
        <button
          className={`tab${mode === "existing" ? " active" : ""}`}
          onClick={() => setMode("existing")}
        >
          Existing thread
        </button>
        <button
          className={`tab${mode === "new" ? " active" : ""}`}
          onClick={() => setMode("new")}
        >
          New thread
        </button>
      </div>

      {mode === "existing" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedThread === "") {
              pushToast("Select a thread.");
              return;
            }
            void linkExisting();
          }}
        >
          {allThreads === undefined ? (
            <Loading />
          ) : available.length === 0 ? (
            <p className="meta">
              Every active thread is already linked to this part. Use “New thread”
              to create another.
            </p>
          ) : (
            <div className="field">
              <label>Thread *</label>
              <Select
                value={selectedThread}
                onChange={setSelectedThread}
                placeholder="Select a thread…"
                options={available.map((t) => ({ value: t._id, label: t.name }))}
              />
            </div>
          )}
          <button
            className="btn btn-primary btn-add"
            disabled={busy || available.length === 0}
          >
            {busy ? "Linking…" : "Link thread"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createAndLink();
          }}
        >
          <ThreadDraftFields draft={draft} onChange={setDraft} autoFocus />
          <button className="btn btn-primary btn-add" disabled={busy}>
            {busy ? "Saving…" : "Create and link"}
          </button>
        </form>
      )}
    </Modal>
  );
}

/** Read-only look at a linked thread — its notes and drawings — without leaving the part. */
export function ThreadPreviewModal({
  threadId,
  onClose,
}: {
  threadId: Id<"threads">;
  onClose: () => void;
}) {
  const thread = useQuery(api.threads.get, { id: threadId });

  return (
    <Modal title={thread?.name ?? "Thread"} onClose={onClose} wide>
      {thread === undefined ? (
        <Loading />
      ) : thread === null ? (
        <Empty title="Thread not found" />
      ) : (
        <>
          <div className="card">
            <h2 className="section-title">Notes</h2>
            {thread.notes ? (
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{thread.notes}</p>
            ) : (
              <p className="meta">No notes.</p>
            )}
          </div>

          <ThreadDrawingsSection threadId={threadId} readOnly />

          <div className="row" style={{ marginTop: 16 }}>
            <a className="btn btn-sm" href={`#/thread/${threadId}`} onClick={onClose}>
              Open thread page
            </a>
          </div>
        </>
      )}
    </Modal>
  );
}
