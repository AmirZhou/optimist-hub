import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  Badge,
  Empty,
  Loading,
  ReasonBadge,
  cleanError,
  ResultBadge,
  Select,
  SourceBadge,
  StageBadge,
  pushToast,
} from "../ui";
import { fmtDateTime } from "../domain";

export function InspectionDetail({ id }: { id: string }) {
  const inspection = useQuery(api.inspections.get, { id: id as Id<"inspections"> });
  const part = useQuery(api.parts.get, inspection ? { id: inspection.partId } : "skip");
  const customer = useQuery(api.customers.get, part ? { id: part.customerId } : "skip");
  const inspector = useQuery(
    api.inspectors.get,
    inspection ? { id: inspection.inspectorId } : "skip",
  );
  const workorder = useQuery(
    api.workorders.get,
    inspection?.workorderId != null ? { id: inspection.workorderId } : "skip",
  );
  const files = useQuery(api.files.listByInspection, { inspectionId: id as Id<"inspections"> });

  if (
    inspection === undefined ||
    part === undefined ||
    customer === undefined ||
    inspector === undefined ||
    files === undefined
  ) {
    return <Loading />;
  }

  if (inspection === null || part === null) {
    return <Empty title="Inspection not found" />;
  }

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {part.partNumber}
          </h1>
          <div className="row">
            <ResultBadge result={inspection.result} />
            <StageBadge stage={inspection.stage} />
            <SourceBadge source={inspection.source} />
            <ReasonBadge reason={inspection.reason} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <h2 className="section-title" style={{ margin: 0 }}>Details</h2>
          {inspection.finishedAt !== null && <ReopenButton id={inspection._id} />}
        </div>
        <dl className="kv mt">
          <dt>Customer</dt>
          <dd>{customer ? `${customer.code} — ${customer.name}` : "—"}</dd>
          <dt>Part</dt>
          <dd>
            {part.partNumber}
            {part.partName ? ` — ${part.partName}` : ""}
            {part.drawingVersion ? ` (rev ${part.drawingVersion})` : ""}
          </dd>
          {part.customerPartNumber && (
            <>
              <dt>Their part number</dt>
              <dd>
                {part.customerPartNumber}
                {part.customerDrawingVersion ? ` (rev ${part.customerDrawingVersion})` : ""}
              </dd>
            </>
          )}
          <dt>Customer PO</dt>
          <dd>{inspection.customerPo}</dd>
          {inspection.vendorPo !== null && (
            <>
              <dt>Vendor PO</dt>
              <dd>{inspection.vendorPo}</dd>
            </>
          )}
          {workorder !== null && workorder !== undefined && (
            <>
              <dt>Work order</dt>
              <dd>{workorder.woNumber}</dd>
            </>
          )}
          <dt>Inspector</dt>
          <dd>{inspector?.name ?? "—"}</dd>
          <dt>Started</dt>
          <dd>{fmtDateTime(inspection.startedAt)}</dd>
          <dt>Finished</dt>
          <dd>
            {inspection.finishedAt === null
              ? <Badge kind="warning">Open</Badge>
              : fmtDateTime(inspection.finishedAt)}
          </dd>
          {inspection.serials.length > 0 && (
            <>
              <dt>Serials</dt>
              <dd>{inspection.serials.join(", ")}</dd>
            </>
          )}
          {inspection.notes !== null && (
            <>
              <dt>Notes</dt>
              <dd>{inspection.notes}</dd>
            </>
          )}
        </dl>
      </div>

      {inspection.finishedAt === null ? (
        <FinishForm id={inspection._id} />
      ) : null}

      <FilesSection inspectionId={inspection._id} files={files} />
    </>
  );
}

// ── Finish ──────────────────────────────────────────────────────────

type Inspection = Doc<"inspections">;

/** Small reopen affordance for a finished inspection — lives in the Details
 *  card header since there is no separate Result card. */
function ReopenButton({ id }: { id: Id<"inspections"> }) {
  const reopen = useMutation(api.inspections.reopen);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      {confirming ? (
        <div className="row">
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              try {
                await reopen({ id });
                setConfirming(false);
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Yes, reopen it
          </button>
          <button className="btn btn-sm" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-sm" onClick={() => setConfirming(true)}>
          Reopen
        </button>
      )}
    </>
  );
}

function FinishForm({ id }: { id: Id<"inspections"> }) {
  const finish = useMutation(api.inspections.finish);
  const [qtyInspected, setQtyInspected] = useState("");
  const [qtyRejected, setQtyRejected] = useState("");
  const [result, setResult] = useState<"pass" | "fail" | "">("");
  const [activeMinutes, setActiveMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Quantity invariants, surfaced inline before submission.
  function validate(): string | null {
    const insp = Number(qtyInspected);
    const rej = Number(qtyRejected);
    if (!Number.isInteger(insp) || insp < 1) return "Quantity inspected must be at least 1.";
    if (!Number.isInteger(rej) || rej < 0) return "Quantity rejected can't be negative.";
    if (rej > insp) return "Quantity rejected can't exceed quantity inspected.";
    if (result === "") return "Record a result — pass or fail.";
    if (result === "pass" && rej > 0) return "A pass can't have rejects.";
    if (result === "fail" && rej < 1) return "A fail needs at least one reject.";
    if (activeMinutes !== "" && (Number.isNaN(Number(activeMinutes)) || Number(activeMinutes) < 0)) {
      return "Active minutes must be a non-negative number.";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v !== null) {
      pushToast(v);
      return;
    }
    setSaving(true);
    try {
      await finish({
        id,
        qtyInspected: Number(qtyInspected),
        qtyRejected: Number(qtyRejected),
        result: result as "pass" | "fail",
        activeMinutes: activeMinutes === "" ? null : Number(activeMinutes),
        notes: notes.trim() === "" ? null : notes,
      });
    } catch (err) {
      pushToast(cleanError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 className="section-title">Finish inspection</h2>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>Quantity inspected *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={qtyInspected}
              onChange={(e) => setQtyInspected(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Quantity rejected *</label>
            <input
              type="number"
              min={0}
              step={1}
              value={qtyRejected}
              onChange={(e) => setQtyRejected(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Result *</label>
            <Select
              value={result}
              onChange={(v) => setResult(v as "pass" | "fail" | "")}
              options={[
                { value: "", label: "Not yet judged" },
                { value: "pass", label: "Pass" },
                { value: "fail", label: "Fail" },
              ]}
            />
          </div>
          <div className="field">
            <label>Active minutes</label>
            <input
              type="number"
              min={0}
              value={activeMinutes}
              onChange={(e) => setActiveMinutes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Finishing…" : "Finish inspection"}
        </button>
      </form>
    </div>
  );
}

// ── Files ───────────────────────────────────────────────────────────

type FileRow = Doc<"files"> & { url: string | null };

/** Convert any image to a JPEG blob suitable for upload.
 *  HEIC files are decoded via libheif WASM (heic-converter);
 *  standard formats are passed through as-is. */
async function toJpeg(file: File): Promise<Blob> {
  const { isHeic, heicToJpeg } = await import("heic-converter");
  if (await isHeic(file)) {
    const result = await heicToJpeg(file, { quality: 0.85 });
    return Array.isArray(result) ? result[0] : result;
  }
  return file;
}

function FilesSection({
  inspectionId,
  files,
}: {
  inspectionId: Id<"inspections">;
  files: FileRow[];
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const attach = useMutation(api.files.attach);
  const detach = useMutation(api.files.detach);

  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const items = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/"),
    );
    if (items.length === 0) return;
    setBusy(true);
    const cap = caption.trim() === "" ? null : caption;
    let done = 0;
    try {
      for (const file of items) {
        setProgress(`${done + 1} / ${items.length}`);
        const blob = await toJpeg(file);
        const postUrl = await generateUploadUrl({});
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await attach({
          inspectionId,
          fileKind: "photo",
          storageId,
          caption: cap,
          page: null,
        });
        done++;
      }
      setCaption("");
      if (fileInput.current !== null) fileInput.current.value = "";
    } catch (err) {
      pushToast(cleanError(err));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="card">
      <h2 className="section-title">Images</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 260px", maxWidth: 420 }}>
          <label>Caption</label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional — applies to all" />
        </div>
        <button
          type="button"
          className="btn"
          disabled={busy}
          style={{ marginTop: 25 }}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? `Uploading ${progress}` : "Choose images"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) void uploadFiles(e.target.files);
          }}
        />
      </div>

      <div
        ref={dropRef}
        className={`drop-zone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {busy ? (
          <span>Uploading {progress}...</span>
        ) : files.length === 0 ? (
          <span>Drop images here or click "Choose images"</span>
        ) : null}

        {files.length > 0 && (
          <div className="files-grid">
            {files.map((f) => (
              <div key={f._id} className="file-card">
                <a
                  className="file-preview"
                  href={f.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.url !== null ? (
                    <img src={f.url} alt={f.caption ?? "Photo"} />
                  ) : (
                    <span className="file-fallback">Image</span>
                  )}
                </a>
                <div className="file-meta">
                  <div className="meta">
                    {f.caption ?? "Photo"}
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => void detach({ id: f._id })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
