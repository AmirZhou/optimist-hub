import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { pushToast, Select, cleanError } from "../ui";
import { REASONS, SOURCES, STAGES, reasonLabel, sourceLabel, stageLabel } from "../domain";

const emptyForm = {
  customerId: "",
  partId: "",
  customerPo: "",
  stage: "",
  source: "",
  reason: "",
  inspectorId: "",
  vendorPo: "",
  woNumber: "",
  serials: "",
};

export function StartInspection({ onStarted }: { onStarted?: (id: string) => void }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const customers = useQuery(api.customers.list, { activeOnly: true });
  const parts = useQuery(api.parts.list, { activeOnly: true });
  const inspectors = useQuery(api.inspectors.list, { activeOnly: true });
  const workorders = useQuery(
    api.workorders.listByPart,
    form.partId !== "" ? { partId: form.partId as Id<"parts"> } : "skip",
  );

  const start = useMutation(api.inspections.start);

  const customerParts = useMemo(
    () => (parts ?? []).filter((p) => p.customerId === form.customerId),
    [parts, form.customerId],
  );

  const set = (k: keyof typeof emptyForm, v: string) => {
    setForm((f) => ({
      ...f,
      [k]: v,
      // changing customer invalidates the part; changing part invalidates the WO
      ...(k === "customerId" ? { partId: "", woNumber: "" } : {}),
      ...(k === "partId" ? { woNumber: "" } : {}),
    }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Inline validation so the form reflects the rules rather than the server.
    if (form.partId === "") return pushToast("Select a part.");
    if (form.customerPo.trim() === "") return pushToast("Customer PO is required.");
    if (form.stage === "") return pushToast("Select a stage.");
    if (form.source === "") return pushToast("Select a source.");
    if (form.reason === "") return pushToast("Select a reason.");
    if (form.inspectorId === "") return pushToast("Select who is doing this inspection.");
    if (form.source === "vendor" && form.vendorPo.trim() === "") {
      return pushToast("Vendor source requires a vendor PO.");
    }
    if (form.source === "inhouse" && form.vendorPo.trim() !== "") {
      return pushToast("In-house source must not have a vendor PO.");
    }

    const serials = form.serials
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const wo = workorders?.find((w) => w.woNumber === form.woNumber.trim().toUpperCase());

    setSaving(true);
    try {
      const id = await start({
        partId: form.partId as Id<"parts">,
        customerPo: form.customerPo,
        inspectorId: form.inspectorId as Id<"inspectors">,
        stage: form.stage as (typeof STAGES)[number],
        source: form.source as (typeof SOURCES)[number],
        reason: form.reason as (typeof REASONS)[number],
        vendorPo: form.source === "vendor" ? form.vendorPo : null,
        workorderId: wo ? wo._id : null,
        serials,
      });
      setForm({ ...emptyForm });
      if (onStarted !== undefined) onStarted(id);
      else window.location.hash = `#/inspection/${id}`;
    } catch (err) {
      pushToast(cleanError(err));
    } finally {
      setSaving(false);
    }
  }

  const d = customers === undefined || parts === undefined || inspectors === undefined;

  return (
    <>
      <h1 className="page-title">Start inspection</h1>
      <p className="page-subtitle">
        Record what you know now. Results get entered later, when the inspection
        is finished.
      </p>

      <div className="card">
        <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>Customer *</label>
            <Select
              value={form.customerId}
              onChange={(v) => set("customerId", v)}
              placeholder="Select customer…"
              options={(customers ?? []).map((c) => ({
                value: c._id,
                label: `${c.code} — ${c.name}`,
              }))}
            />
          </div>

          <div className="field">
            <label>Part *</label>
            <Select
              value={form.partId}
              onChange={(v) => set("partId", v)}
              disabled={form.customerId === ""}
              placeholder={form.customerId === "" ? "Select customer first…" : "Select part…"}
              options={customerParts.map((p) => ({
                value: p._id,
                label: p.partNumber + (p.partName ? ` — ${p.partName}` : ""),
              }))}
            />
          </div>

          <div className="field">
            <label>Customer PO *</label>
            <input
              value={form.customerPo}
              onChange={(e) => set("customerPo", e.target.value)}
              placeholder="e.g. 4471"
              autoCapitalize="characters"
            />
          </div>

          <div className="field">
            <label>Stage *</label>
            <Select
              value={form.stage}
              onChange={(v) => set("stage", v)}
              placeholder="Select stage…"
              options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))}
            />
          </div>

          <div className="field">
            <label>Source *</label>
            <Select
              value={form.source}
              onChange={(v) => set("source", v)}
              placeholder="Select source…"
              options={SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }))}
            />
          </div>

          {form.source === "vendor" && (
            <div className="field">
              <label>Vendor PO *</label>
              <input
                value={form.vendorPo}
                onChange={(e) => set("vendorPo", e.target.value)}
                placeholder="Required for vendor source"
                autoCapitalize="characters"
              />
            </div>
          )}

          <div className="field">
            <label>Reason *</label>
            <Select
              value={form.reason}
              onChange={(v) => set("reason", v)}
              placeholder="Select reason…"
              options={REASONS.map((r) => ({ value: r, label: reasonLabel(r) }))}
            />
          </div>

          <div className="field">
            <label>Inspector *</label>
            <Select
              value={form.inspectorId}
              onChange={(v) => set("inspectorId", v)}
              placeholder="Who is inspecting?"
              options={(inspectors ?? []).map((i) => ({
                value: i._id,
                label: i.name,
              }))}
            />
            <span className="meta">Attribution — never defaulted.</span>
          </div>

          <div className="field">
            <label>Work order</label>
            <Select
              value={form.woNumber}
              onChange={(v) => set("woNumber", v)}
              disabled={form.partId === "" || (workorders ?? []).length === 0}
              placeholder={
                form.partId === ""
                  ? "Select part first…"
                  : (workorders ?? []).length === 0
                    ? "None for this part"
                    : "None"
              }
              options={(workorders ?? [])
                .filter((w) => w.active)
                .map((w) => ({ value: w.woNumber, label: w.woNumber }))}
            />
          </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Serials</label>
              <textarea
                value={form.serials}
                onChange={(e) => set("serials", e.target.value)}
                placeholder={"One serial per line (leave empty if not serialized)"}
              />
            </div>
          </div>

          <div className="row">
            <button className="btn btn-primary" disabled={d || saving}>
              {saving ? "Starting…" : "Start inspection"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
