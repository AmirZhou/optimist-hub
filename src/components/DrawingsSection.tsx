import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Modal, Select, cleanError, pushToast } from "../ui";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type DrawingRow = Doc<"drawings"> & { url: string | null };

type DrawingKind = "our_drawing" | "customer_drawing";

/** Which record a drawing hangs off — a drawing belongs to exactly one. */
export type DrawingOwner =
  | { partId: Id<"parts"> }
  | { threadId: Id<"threads"> };

/** A PDF chosen in a create form, held in the browser until the owner exists. */
export type StagedDrawing = {
  /** Local-only React key; staged rows have no server id yet. */
  key: number;
  file: File;
  kind: DrawingKind;
  revision: string;
};

const KIND_OPTIONS = [
  { value: "our_drawing", label: "Our drawing" },
  { value: "customer_drawing", label: "Customer drawing" },
];

function kindLabelFor(kind: DrawingKind): string {
  return kind === "our_drawing" ? "Our drawing" : "Customer drawing";
}

/** Base render width in CSS px; the zoom factor multiplies it. */
const PDF_BASE_WIDTH = 600;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const FIT_ZOOM_INDEX = ZOOM_STEPS.indexOf(1);

export function DrawingsSection({ partId }: { partId: Id<"parts"> }) {
  return <DrawingsSectionInner ownerKey="partId" ownerId={partId} />;
}

/** `readOnly` drops upload and remove — for previewing a record you aren't editing. */
export function ThreadDrawingsSection({
  threadId,
  readOnly,
}: {
  threadId: Id<"threads">;
  readOnly?: boolean;
}) {
  return (
    <DrawingsSectionInner ownerKey="threadId" ownerId={threadId} readOnly={readOnly} />
  );
}

/**
 * Uploads staged PDFs and attaches them to an owner. Callers create the owner
 * record first, then hand the id here — `drawings.attach` requires one.
 * Throws on the first failure so the caller can surface it.
 */
export function useAttachDrawings() {
  const generateUploadUrl = useMutation(api.drawings.generateUploadUrl);
  const attach = useMutation(api.drawings.attach);

  return useCallback(
    async (staged: StagedDrawing[], owner: DrawingOwner) => {
      for (const d of staged) {
        const postUrl = await generateUploadUrl({});
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: d.file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await attach({
          storageId,
          ...owner,
          kind: d.kind,
          revision: d.revision.trim() === "" ? null : d.revision.trim(),
        });
      }
    },
    [generateUploadUrl, attach],
  );
}

/**
 * Drawing chooser for "add" forms. Nothing is uploaded here — the owner record
 * does not exist yet, so files are collected and handed back on submit.
 */
export function DrawingPicker({
  staged,
  onChange,
}: {
  staged: StagedDrawing[];
  onChange: (next: StagedDrawing[]) => void;
}) {
  const [kind, setKind] = useState<string>("our_drawing");
  const [revision, setRevision] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);

  return (
    <div className="field">
      <label>Drawings</label>

      <div className="upload-row">
        <div className="field">
          <Select value={kind} onChange={setKind} options={KIND_OPTIONS} ariaLabel="Drawing kind" />
        </div>
        <div className="field">
          <input
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            placeholder="Revision (optional)"
            aria-label="Drawing revision"
            style={{ width: 160 }}
          />
        </div>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Add PDF
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f === undefined) return;
            onChange([
              ...staged,
              { key: nextKey.current++, file: f, kind: kind as DrawingKind, revision },
            ]);
            setRevision("");
            e.target.value = "";
          }}
        />
      </div>

      {staged.length === 0 ? (
        <p className="meta">No drawings attached yet — they upload when you save.</p>
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {staged.map((d) => (
            <span
              key={d.key}
              className="badge badge-neutral"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {d.file.name} · {kindLabelFor(d.kind)}
              {d.revision.trim() === "" ? "" : ` · rev ${d.revision.trim()}`}
              <button
                type="button"
                className="btn-inline-x"
                title="Remove"
                onClick={() => onChange(staged.filter((s) => s.key !== d.key))}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DrawingsSectionInner({
  ownerKey,
  ownerId,
  readOnly,
}: {
  ownerKey: "partId" | "threadId";
  ownerId: Id<"parts"> | Id<"threads">;
  readOnly?: boolean;
}) {
  const drawingsByPart = useQuery(
    api.drawings.listByPart,
    ownerKey === "partId" ? { partId: ownerId as Id<"parts"> } : "skip",
  );
  const drawingsByThread = useQuery(
    api.drawings.listByThread,
    ownerKey === "threadId" ? { threadId: ownerId as Id<"threads"> } : "skip",
  );
  const drawings = ownerKey === "partId" ? drawingsByPart : drawingsByThread;

  const detach = useMutation(api.drawings.detach);
  const [showAdd, setShowAdd] = useState(false);

  const owner: DrawingOwner =
    ownerKey === "partId"
      ? { partId: ownerId as Id<"parts"> }
      : { threadId: ownerId as Id<"threads"> };

  return (
    <div className="card">
      <h2 className="section-title">Drawings</h2>

      {drawings === undefined ? null : drawings.length === 0 ? (
        <p className="meta" style={{ marginBottom: 16 }}>No drawings uploaded yet.</p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {drawings.map((d) => (
            <DrawingCard
              key={d._id}
              drawing={d}
              onDetach={readOnly === true ? undefined : () => void detach({ id: d._id })}
            />
          ))}
        </div>
      )}

      {readOnly !== true && (
        <button className="btn btn-sm" onClick={() => setShowAdd(true)}>
          Add drawings
        </button>
      )}

      {showAdd && (
        <AddDrawingModal owner={owner} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

/**
 * Uploads one or more PDFs to an existing part or thread. Drawings are added
 * rarely, so this lives behind a button instead of parking a kind/revision row
 * above every drawing list. Reuses DrawingPicker, so adding a drawing later
 * looks identical to adding one while creating the part or thread.
 */
function AddDrawingModal({
  owner,
  onClose,
}: {
  owner: DrawingOwner;
  onClose: () => void;
}) {
  const attachDrawings = useAttachDrawings();
  const [staged, setStaged] = useState<StagedDrawing[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <Modal title="Add drawings" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (staged.length === 0) {
            pushToast("Choose at least one PDF.");
            return;
          }
          setBusy(true);
          try {
            await attachDrawings(staged, owner);
            onClose();
          } catch (err) {
            pushToast(cleanError(err));
            setBusy(false);
          }
        }}
      >
        <DrawingPicker staged={staged} onChange={setStaged} />
        <button className="btn btn-primary btn-add" disabled={busy}>
          {busy
            ? "Uploading…"
            : staged.length > 1
              ? `Upload ${staged.length} drawings`
              : "Upload drawing"}
        </button>
      </form>
    </Modal>
  );
}

/** Exported so other views can show a drawing read-only (omit `onDetach`). */
export function DrawingCard({
  drawing,
  onDetach,
}: {
  drawing: DrawingRow;
  /** Omitted in read-only previews, which hides the Remove button. */
  onDetach?: () => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(FIT_ZOOM_INDEX);

  const kindLabel = kindLabelFor(drawing.kind);
  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="drawing-card">
      <div className="drawing-header">
        <div>
          <strong>{kindLabel}</strong>
          {drawing.revision && <span className="meta" style={{ marginLeft: 8 }}>rev {drawing.revision}</span>}
        </div>
        {onDetach !== undefined && (
          <button className="btn btn-sm btn-danger" onClick={onDetach}>
            Remove
          </button>
        )}
      </div>

      {drawing.url ? (
        <>
          {/* Zoomed pages overflow the card, so the viewer scrolls in both axes */}
          <div className={`pdf-viewer${zoom > 1 ? " zoomed" : ""}`}>
            <Document
              file={drawing.url}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={<p className="meta">Loading PDF…</p>}
              error={<p className="meta">Failed to load PDF.</p>}
            >
              <Page
                pageNumber={pageNumber}
                width={PDF_BASE_WIDTH}
                scale={zoom}
              />
            </Document>
          </div>

          <div className="pdf-controls">
            {numPages !== null && numPages > 1 && (
              <>
                <button
                  className="btn btn-sm"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => p - 1)}
                >
                  Prev
                </button>
                <span className="meta">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  className="btn btn-sm"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber((p) => p + 1)}
                >
                  Next
                </button>
                <span className="pdf-controls-sep" aria-hidden="true" />
              </>
            )}

            <button
              className="btn btn-sm"
              aria-label="Zoom out"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((i) => i - 1)}
            >
              &minus;
            </button>
            <span className="meta">{Math.round(zoom * 100)}%</span>
            <button
              className="btn btn-sm"
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() => setZoomIndex((i) => i + 1)}
            >
              +
            </button>
            <button
              className="btn btn-sm"
              disabled={zoomIndex === FIT_ZOOM_INDEX}
              onClick={() => setZoomIndex(FIT_ZOOM_INDEX)}
            >
              Reset
            </button>
            <a
              className="btn btn-sm"
              href={drawing.url}
              target="_blank"
              rel="noreferrer"
            >
              Open full size
            </a>
          </div>
        </>
      ) : (
        <p className="meta">PDF not available.</p>
      )}
    </div>
  );
}
