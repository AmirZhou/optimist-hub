import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cleanError, pushToast } from "../ui";
import { DrawingPicker, useAttachDrawings, type StagedDrawing } from "./DrawingsSection";

/** Everything needed to create a thread, before it exists. */
export type ThreadDraft = {
  name: string;
  notes: string;
  drawings: StagedDrawing[];
};

export function emptyThreadDraft(): ThreadDraft {
  return { name: "", notes: "", drawings: [] };
}

/** The thread create form, shared by the Threads tab and the link-to-part modal. */
export function ThreadDraftFields({
  draft,
  onChange,
  autoFocus,
}: {
  draft: ThreadDraft;
  onChange: (next: ThreadDraft) => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <div className="field">
        <label>Name *</label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Thread name, e.g. Stub ACME"
          autoFocus={autoFocus}
        />
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <DrawingPicker
        staged={draft.drawings}
        onChange={(drawings) => onChange({ ...draft, drawings })}
      />
    </>
  );
}

/**
 * Creates a thread, then uploads its staged drawings. Returns the new id, or
 * null when creation failed — the reason is already shown as a toast, so
 * callers only need to check for null before continuing.
 *
 * A drawing that fails to upload does NOT fail the whole call: the thread
 * already exists by then, and re-running creation would collide on the name.
 */
export function useCreateThread() {
  const create = useMutation(api.threads.create);
  const attachDrawings = useAttachDrawings();

  return useCallback(
    async (draft: ThreadDraft): Promise<Id<"threads"> | null> => {
      if (draft.name.trim() === "") {
        pushToast("Thread name is required.");
        return null;
      }

      let threadId: Id<"threads">;
      try {
        threadId = await create({
          name: draft.name,
          notes: draft.notes.trim() === "" ? null : draft.notes,
        });
      } catch (err) {
        pushToast(cleanError(err));
        return null;
      }

      try {
        await attachDrawings(draft.drawings, { threadId });
      } catch (err) {
        pushToast(`Thread created, but a drawing failed: ${cleanError(err)}`);
      }
      return threadId;
    },
    [create, attachDrawings],
  );
}

/** Draft state plus a busy flag, since every caller needs the same pair. */
export function useThreadDraft() {
  const [draft, setDraft] = useState<ThreadDraft>(emptyThreadDraft);
  const [busy, setBusy] = useState(false);
  return { draft, setDraft, busy, setBusy };
}
