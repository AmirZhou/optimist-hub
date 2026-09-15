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
import { fmtDateTime, STAGES, SOURCES, REASONS, stageLabel, sourceLabel, reasonLabel } from "../domain";
import { PartThreadDrawingsSection } from "../components/PartThreadDrawings";

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

  // Reference data for edit mode
  const inspectors = useQuery(api.inspectors.list, { activeOnly: true });
  const workorders = useQuery(
    api.workorders.listByPart,
    inspection ? { partId: inspection.partId } : "skip",
  );

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

      <DetailsCard
        inspection={inspection}
        part={part}
        customer={customer}
        inspector={inspector}
        workorder={workorder ?? null}
        inspectors={inspectors ?? []}
        workorders={workorders ?? []}
      />

      {inspection.finishedAt === null ? (
        <FinishForm id={inspection._id} />
      ) : null}

      <FilesSection inspectionId={inspection._id} files={files} />

      <PartThreadDrawingsSection partId={inspection.partId} />
    </>
  );
}

// ── Details card with inline editing ────────────────────────────────

function DetailsCard({
  inspection,
  part,
  customer,
  inspector,
  workorder,
  inspectors,
  workorders,
}: {
  inspection: Doc<"inspections">;
  part: Doc<"parts">;
  customer: Doc<"customers"> | null;
  inspector: Doc<"inspectors"> | null;
  workorder: Doc<"workorders"> | null;
  inspectors: Doc<"inspectors">[];
  workorders: Doc<"workorders">[];
}) {
  const [editing, setEditing] = useState(false);
  const update = useMutation(api.inspections.update);
  const [saving, setSaving] = useState(false);

  // Edit form state — initialized from current inspection
  const [customerPo, setCustomerPo] = useState(inspection.customerPo);
  const [vendorPo, setVendorPo] = useState(inspection.vendorPo ?? "");
  const [stage, setStage] = useState(inspection.stage);
  const [source, setSource] = useState(inspection.source);
  const [reason, setReason] = useState(inspection.reason);
  const [inspectorId, setInspectorId] = useState(inspection.inspectorId as string);
  const [woNumber, setWoNumber] = useState(workorder?.woNumber ?? "");
  const [serials, setSerials] = useState(inspection.serials.join(", "));
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [qtyInspected, setQtyInspected] = useState(String(inspection.qtyInspected));
  const [qtyRejected, setQtyRejected] = useState(String(inspection.qtyRejected));
  const [result, setResult] = useState(inspection.result ?? "");

  function resetForm() {
    setCustomerPo(inspection.customerPo);
    setVendorPo(inspection.vendorPo ?? "");
    setStage(inspection.stage);
    setSource(inspection.source);
    setReason(inspection.reason);
    setInspectorId(inspection.inspectorId as string);
    setWoNumber(workorder?.woNumber ?? "");
    setSerials(inspection.serials.join(", "));
    setNotes(inspection.notes ?? "");
    setQtyInspected(String(inspection.qtyInspected));
    setQtyRejected(String(inspection.qtyRejected));
    setResult(inspection.result ?? "");
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const wo = workorders.find((w) => w.woNumber === woNumber.trim().toUpperCase());
      const serialsArray = serials
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s !== "");

      await update({
        id: inspection._id,
        customerPo,
        vendorPo: source === "vendor" ? vendorPo : null,
        stage,
        source,
        reason,
        inspectorId: inspectorId as Id<"inspectors">,
        workorderId: wo ? wo._id : null,
        serials: serialsArray,
        notes: notes.trim() === "" ? null : notes,
        qtyInspected: Number(qtyInspected),
        qtyRejected: Number(qtyRejected),
        result: result !== "" ? (result as "pass" | "fail") : null,
      });
      setEditing(false);
    } catch (err) {
      pushToast(cleanError(err));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="card">
        <div className="row-between">
          <h2 className="section-title" style={{ margin: 0 }}>Edit details</h2>
          <div className="row">
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void saveEdits()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn btn-sm" onClick={() => { resetForm(); setEditing(false); }}>
              Cancel
            </button>
          </div>
        </div>
        <div className="form-grid mt">
          <div className="field">
            <label>Customer PO</label>
            <input value={customerPo} onChange={(e) => setCustomerPo(e.target.value)} />
          </div>
          <div className="field">
            <label>Stage</label>
            <Select
              value={stage}
              onChange={(v) => setStage(v as typeof stage)}
              options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))}
            />
          </div>
          <div className="field">
            <label>Source</label>
            <Select
              value={source}
              onChange={(v) => setSource(v as typeof source)}
              options={SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }))}
            />
          </div>
          {source === "vendor" && (
            <div className="field">
              <label>Vendor PO</label>
              <input value={vendorPo} onChange={(e) => setVendorPo(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Reason</label>
            <Select
              value={reason}
              onChange={(v) => setReason(v as typeof reason)}
              options={REASONS.map((r) => ({ value: r, label: reasonLabel(r) }))}
            />
          </div>
          <div className="field">
            <label>Inspector</label>
            <Select
              value={inspectorId}
              onChange={setInspectorId}
              options={inspectors.map((i) => ({ value: i._id, label: i.name }))}
            />
          </div>
          <div className="field">
            <label>Work order</label>
            <Select
              value={woNumber}
              onChange={setWoNumber}
              placeholder="None"
              options={workorders
                .filter((w) => w.active)
                .map((w) => ({ value: w.woNumber, label: w.woNumber }))}
            />
          </div>
          {inspection.finishedAt !== null && (
            <>
              <div className="field">
                <label>Qty inspected</label>
                <input type="number" min={0} value={qtyInspected} onChange={(e) => setQtyInspected(e.target.value)} />
              </div>
              <div className="field">
                <label>Qty rejected</label>
                <input type="number" min={0} value={qtyRejected} onChange={(e) => setQtyRejected(e.target.value)} />
              </div>
              <div className="field">
                <label>Result</label>
                <Select
                  value={result}
                  onChange={(v) => setResult(v)}
                  options={[
                    { value: "", label: "Not yet judged" },
                    { value: "pass", label: "Pass" },
                    { value: "fail", label: "Fail" },
                  ]}
                />
              </div>
            </>
          )}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Serials</label>
            <textarea value={serials} onChange={(e) => setSerials(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2 className="section-title" style={{ margin: 0 }}>Details</h2>
        <button className="btn btn-sm" onClick={() => { resetForm(); setEditing(true); }}>
          Edit
        </button>
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
        <dt>Source</dt>
        <dd><SourceBadge source={inspection.source} /></dd>
        <dt>Reason</dt>
        <dd><ReasonBadge reason={inspection.reason} /></dd>
        <dt>Started</dt>
        <dd>{fmtDateTime(inspection.startedAt)}</dd>
        <dt>Finished</dt>
        <dd>
          {inspection.finishedAt === null
            ? <Badge kind="warning">Open</Badge>
            : fmtDateTime(inspection.finishedAt)}
        </dd>
        {inspection.finishedAt !== null && (
          <>
            <dt>Qty inspected</dt>
            <dd>{inspection.qtyInspected}</dd>
            <dt>Qty rejected</dt>
            <dd>{inspection.qtyRejected}</dd>
          </>
        )}
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
  );
}

// ── Finish ──────────────────────────────────────────────────────────

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
      <div className="upload-row">
        <div className="field">
          <label>Caption</label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional — applies to all" />
        </div>
        <button
          type="button"
          className="btn"
          disabled={busy}
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
