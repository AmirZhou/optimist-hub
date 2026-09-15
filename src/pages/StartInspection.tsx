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

/** Parse a range like "001-050" or "ABC-001 to ABC-050" into serial strings. */
function parseRange(input: string): string[] | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Try "PREFIX-NNN to PREFIX-MMM" or "PREFIX-NNN-PREFIX-MMM" patterns
  // Also handles simple "NNN-MMM" or "NNN to MMM"
  const toMatch = trimmed.match(/^(.+?)\s+to\s+(.+)$/i);
  const parts = toMatch ? [toMatch[1].trim(), toMatch[2].trim()] : null;

  // If no "to" separator, try dash separator but be smart about it
  let fromStr: string;
  let toStr: string;

  if (parts) {
    [fromStr, toStr] = parts;
  } else {
    // For dash separator, try to split intelligently
    // If the string looks like "001-050" (pure numeric on both sides), split on dash
    const simpleNumeric = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (simpleNumeric) {
      fromStr = simpleNumeric[1];
      toStr = simpleNumeric[2];
    } else {
      // Try splitting on the last dash: "ABC-001-ABC-050" → "ABC-001" and "ABC-050"
      // or "ABC-001-050" → prefix "ABC-", range 001-050
      const lastDash = trimmed.lastIndexOf("-");
      if (lastDash <= 0) return null;
      fromStr = trimmed.slice(0, lastDash).trim();
      toStr = trimmed.slice(lastDash + 1).trim();
    }
  }

  // Extract numeric suffix from both
  const fromMatch = fromStr.match(/^(.*?)(\d+)$/);
  const toMatch2 = toStr.match(/^(.*?)(\d+)$/);
  if (!fromMatch || !toMatch2) return null;

  const fromPrefix = fromMatch[1];
  const fromNum = parseInt(fromMatch[2], 10);
  const fromPad = fromMatch[2].length;

  const toPrefix = toMatch2[1];
  const toNum = parseInt(toMatch2[2], 10);
  const toPad = toMatch2[2].length;

  // Determine the prefix to use
  let prefix: string;
  let padLen: number;

  if (fromPrefix === toPrefix) {
    prefix = fromPrefix;
    padLen = Math.max(fromPad, toPad);
  } else if (toPrefix === "" && fromPrefix !== "") {
    // "ABC-001-050" pattern: toStr is just "050"
    prefix = fromPrefix;
    padLen = Math.max(fromPad, toPad);
  } else {
    return null; // prefixes don't match
  }

  if (fromNum > toNum || toNum - fromNum > 999) return null;

  const result: string[] = [];
  for (let i = fromNum; i <= toNum; i++) {
    result.push(prefix + String(i).padStart(padLen, "0"));
  }
  return result;
}

export function StartInspection({ onStarted }: { onStarted?: (id: string) => void }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // S/N mode: "manual" for textarea, "range" for range input + slots
  const [snMode, setSnMode] = useState<"manual" | "range">("manual");
  const [rangeInput, setRangeInput] = useState("");
  const [generatedSerials, setGeneratedSerials] = useState<string[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set());

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

  function handleGenerate() {
    const result = parseRange(rangeInput);
    if (result === null || result.length === 0) {
      pushToast("Could not parse range. Try formats like \"001-050\" or \"ABC-001 to ABC-050\".");
      return;
    }
    setGeneratedSerials(result);
    setSelectedSerials(new Set(result));
  }

  function toggleSerial(sn: string) {
    setSelectedSerials((prev) => {
      const next = new Set(prev);
      if (next.has(sn)) next.delete(sn);
      else next.add(sn);
      return next;
    });
  }

  function selectAll() {
    setSelectedSerials(new Set(generatedSerials));
  }

  function selectNone() {
    setSelectedSerials(new Set());
  }

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

    let serials: string[];
    if (snMode === "range") {
      serials = generatedSerials.filter((sn) => selectedSerials.has(sn));
    } else {
      serials = form.serials
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }

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
      setGeneratedSerials([]);
      setSelectedSerials(new Set());
      setRangeInput("");
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
              <div className="row-between" style={{ marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Serials</label>
                <div className="row">
                  <button
                    type="button"
                    className={`btn btn-sm${snMode === "manual" ? " btn-primary" : ""}`}
                    onClick={() => setSnMode("manual")}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm${snMode === "range" ? " btn-primary" : ""}`}
                    onClick={() => setSnMode("range")}
                  >
                    Range
                  </button>
                </div>
              </div>

              {snMode === "manual" ? (
                <textarea
                  value={form.serials}
                  onChange={(e) => set("serials", e.target.value)}
                  placeholder={"One serial per line (leave empty if not serialized)"}
                />
              ) : (
                <>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <input
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder='e.g. 001-050 or ABC-001 to ABC-050'
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn" onClick={handleGenerate}>
                      Generate
                    </button>
                  </div>
                  {generatedSerials.length > 0 && (
                    <>
                      <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                        <span className="meta">
                          {selectedSerials.size} of {generatedSerials.length} selected
                        </span>
                        <button type="button" className="btn btn-sm" onClick={selectAll}>All</button>
                        <button type="button" className="btn btn-sm" onClick={selectNone}>None</button>
                      </div>
                      <div className="sn-grid">
                        {generatedSerials.map((sn) => (
                          <button
                            key={sn}
                            type="button"
                            className={`sn-slot${selectedSerials.has(sn) ? " selected" : ""}`}
                            onClick={() => toggleSerial(sn)}
                          >
                            {sn}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="row">
            <button className="btn btn-primary" disabled={d || saving}>
              {saving ? "Starting…" : "Start inspection"}
            </button>
          </div>
        </form>
    </>
  );
}
