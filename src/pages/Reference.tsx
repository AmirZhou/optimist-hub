import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ActiveBadge, Empty, pushToast, Loading, Modal, Select, SortTh, cleanError, useTableSort } from "../ui";
import {
  DrawingPicker,
  DrawingsSection,
  ThreadDrawingsSection,
  useAttachDrawings,
  type StagedDrawing,
} from "../components/DrawingsSection";
import { PartThreadsSection } from "../components/PartThreads";
import { ThreadDraftFields, useCreateThread, useThreadDraft } from "../components/ThreadForm";
import { InspectionTable } from "../tables";

export function Reference({
  route,
  navigate,
}: {
  route: string;
  navigate: (to: string) => void;
}) {
  const tab = route.split("/")[2] ?? "customers";

  return (
    <>
      <div className="tabs">
        {(["customers", "parts", "workorders", "inspectors", "threads"] as const).map((t) => (
          <button
            key={t}
            className={`tab${tab === t ? " active" : ""}`}
            onClick={() => navigate(`#/ref/${t}`)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "parts" ? <PartsTab /> :
       tab === "workorders" ? <WorkordersTab /> :
       tab === "inspectors" ? <InspectorsTab /> :
       tab === "threads" ? <ThreadsTab /> :
       <CustomersTab />}
    </>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────

function ToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button className="btn btn-sm" onClick={onToggle}>
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}

// ── Customers ───────────────────────────────────────────────────────

function CustomersTab() {
  const customers = useQuery(api.customers.list, {});
  const create = useMutation(api.customers.create);
  const update = useMutation(api.customers.update);
  const setActive = useMutation(api.customers.setActive);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"customers"> | null>(null);
  const { sort, toggle: sortToggle, sortRows } = useTableSort<Doc<"customers">>({ key: "code", dir: "asc" });
  const get = (c: Doc<"customers">, key: string) => (key === "code" ? c.code : c.name);

  if (customers === undefined) return <Loading />;

  return (
    <div className="card">
      <button className="btn btn-primary btn-add" onClick={() => setShowCreate(true)}>
        Add customer
      </button>

      {showCreate && (
        <CustomerCreateModal
          onCreate={async (code, name) => {
            await create({ code, name });
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {customers.length === 0 ? (
        <Empty title="No customers yet" hint="Add one before creating parts." />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <SortTh label="Code" sortKey="code" sort={sort} onToggle={sortToggle} />
                <SortTh label="Name" sortKey="name" sort={sort} onToggle={sortToggle} />
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortRows(customers, get).map((c) => (
                <CustomerRow
                  key={c._id}
                  customer={c}
                  update={update}
                  setActive={setActive}
                  expanded={expandedId === c._id}
                  onToggleExpand={() => setExpandedId(expandedId === c._id ? null : c._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerCreateModal({
  onCreate,
  onClose,
}: {
  onCreate: (code: string, name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (code.trim() === "" || name.trim() === "") {
            pushToast("Customer code and name are required.");
            return;
          }
          try {
            await onCreate(code, name);
            onClose();
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label>Code *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code, e.g. PHX"
              autoCapitalize="characters"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Legal name"
            />
          </div>
        </div>
        <button className="btn btn-primary btn-add">Add customer</button>
      </form>
    </Modal>
  );
}

function CustomerRow({
  customer,
  update,
  setActive,
  expanded,
  onToggleExpand,
}: {
  customer: Doc<"customers">;
  update: ReturnType<typeof useMutation<typeof api.customers.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.customers.setActive>>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={`expandable-row${expanded ? " expanded" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, a")) return;
          onToggleExpand();
        }}
      >
        <td><strong>{customer.code}</strong></td>
        <td>{customer.name}</td>
        <td>
          <ToggleButton
            active={customer.active}
            onToggle={() => void setActive({ id: customer._id, active: !customer.active })}
          />
        </td>
        <td className="status-col">
          <ActiveBadge active={customer.active} />
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={4} style={{ padding: 0 }}>
            <CustomerDetail customer={customer} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function CustomerDetail({
  customer,
  update,
}: {
  customer: Doc<"customers">;
  update: ReturnType<typeof useMutation<typeof api.customers.update>>;
}) {
  const [code, setCode] = useState(customer.code);
  const [name, setName] = useState(customer.name);
  const dirty = code !== customer.code || name !== customer.name;

  return (
    <div className="inline-detail">
      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label>Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <button
            className="btn btn-sm btn-primary"
            disabled={!dirty}
            onClick={async () => {
              if (code.trim() === "" || name.trim() === "") {
                pushToast("Customer code and name are required.");
                return;
              }
              try {
                await update({ id: customer._id, code, name });
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Save
          </button>
          {dirty && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setCode(customer.code);
                setName(customer.name);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Parts ───────────────────────────────────────────────────────────

function PartsTab() {
  const parts = useQuery(api.parts.list, {});
  const customers = useQuery(api.customers.list, {});
  const create = useMutation(api.parts.create);
  const update = useMutation(api.parts.update);
  const setActive = useMutation(api.parts.setActive);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"parts"> | null>(null);
  const { sort, toggle, sortRows } = useTableSort<Doc<"parts">>({ key: "partNumber", dir: "asc" });
  const get = (p: Doc<"parts">, key: string) => {
    switch (key) {
      case "partNumber": return p.partNumber;
      case "partName": return p.partName;
      case "customer": return customerById.get(p.customerId)?.code ?? "";
      case "customerPartNumber": return p.customerPartNumber;
      default: return "";
    }
  };

  if (parts === undefined || customers === undefined) return <Loading />;

  const customerById = new Map(customers.map((c) => [c._id, c]));

  return (
    <div className="card">
      <button className="btn btn-primary btn-add" onClick={() => setShowCreate(true)}>
        Add part
      </button>

      {showCreate && (
        <PartCreateModal
          customers={customers}
          onCreate={(args) => create(args)}
          onClose={() => setShowCreate(false)}
        />
      )}

      {parts.length === 0 ? (
        <Empty title="No parts yet" hint="A part must exist before it can be inspected." />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <SortTh label="Part number" sortKey="partNumber" sort={sort} onToggle={toggle} />
                <SortTh label="Name" sortKey="partName" sort={sort} onToggle={toggle} />
                <SortTh label="Customer" sortKey="customer" sort={sort} onToggle={toggle} />
                <SortTh label="Their part number" sortKey="customerPartNumber" sort={sort} onToggle={toggle} />
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortRows(parts, get).map((p) => (
                <PartRow
                  key={p._id}
                  part={p}
                  customerLabel={customerById.get(p.customerId)?.code ?? "—"}
                  update={update}
                  setActive={setActive}
                  expanded={expandedId === p._id}
                  onToggleExpand={() => setExpandedId(expandedId === p._id ? null : p._id)}
                  colSpan={6}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PartCreateModal({
  customers,
  onCreate,
  onClose,
}: {
  customers: Doc<"customers">[];
  onCreate: (args: {
    partNumber: string;
    customerId: Id<"customers">;
    partName: string | null;
    drawingVersion: null;
    customerPartNumber: null;
    customerPartName: null;
    customerDrawingVersion: null;
    notes: string | null;
  }) => Promise<Id<"parts">>;
  onClose: () => void;
}) {
  const attachDrawings = useAttachDrawings();
  const [customerId, setCustomerId] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [notes, setNotes] = useState("");
  const [drawings, setDrawings] = useState<StagedDrawing[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <Modal title="Add part" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (customerId === "") {
            pushToast("Select a customer.");
            return;
          }
          if (partNumber.trim() === "") {
            pushToast("Part number is required.");
            return;
          }
          setBusy(true);
          let partId: Id<"parts">;
          try {
            partId = await onCreate({
              partNumber,
              customerId: customerId as Id<"customers">,
              partName: partName.trim() === "" ? null : partName,
              drawingVersion: null,
              customerPartNumber: null,
              customerPartName: null,
              customerDrawingVersion: null,
              notes: notes.trim() === "" ? null : notes,
            });
          } catch (err) {
            pushToast(cleanError(err));
            setBusy(false);
            return;
          }
          // The part exists now, so a failed upload must not re-run creation —
          // report it and close rather than leaving a form that can't resubmit.
          try {
            await attachDrawings(drawings, { partId });
          } catch (err) {
            pushToast(`Part created, but a drawing failed: ${cleanError(err)}`);
          }
          setBusy(false);
          onClose();
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label>Customer *</label>
            <Select
              value={customerId}
              onChange={setCustomerId}
              placeholder="Select customer…"
              options={customers
                .filter((c) => c.active)
                .map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
            />
          </div>
          <div className="field">
            <label>Part number *</label>
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <div className="field">
            <label>Part name</label>
            <input value={partName} onChange={(e) => setPartName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <DrawingPicker staged={drawings} onChange={setDrawings} />
        <button className="btn btn-primary btn-add" disabled={busy}>
          {busy ? "Saving…" : "Add part"}
        </button>
      </form>
    </Modal>
  );
}

function PartRow({
  part,
  customerLabel,
  update,
  setActive,
  expanded,
  onToggleExpand,
  colSpan,
}: {
  part: Doc<"parts">;
  customerLabel: string;
  update: ReturnType<typeof useMutation<typeof api.parts.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.parts.setActive>>;
  expanded: boolean;
  onToggleExpand: () => void;
  colSpan: number;
}) {
  return (
    <>
      <tr
        className={`expandable-row${expanded ? " expanded" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, a")) return;
          onToggleExpand();
        }}
      >
        <td><strong>{part.partNumber}</strong></td>
        <td>{part.partName ?? <span className="muted">—</span>}</td>
        <td>{customerLabel}</td>
        <td>{part.customerPartNumber ?? <span className="muted">—</span>}</td>
        <td>
          <ToggleButton
            active={part.active}
            onToggle={() => void setActive({ id: part._id, active: !part.active })}
          />
        </td>
        <td className="status-col">
          <ActiveBadge active={part.active} />
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={colSpan} style={{ padding: 0 }}>
            <PartDetail partId={part._id} part={part} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function PartDetail({
  partId,
  part,
  update,
}: {
  partId: Id<"parts">;
  part: Doc<"parts">;
  update: ReturnType<typeof useMutation<typeof api.parts.update>>;
}) {
  const history = useQuery(api.reports.partHistory, { partId });

  const [partNumber, setPartNumber] = useState(part.partNumber);
  const [partName, setPartName] = useState(part.partName ?? "");
  const [customerPartNumber, setCustomerPartNumber] = useState(part.customerPartNumber ?? "");
  const [notes, setNotes] = useState(part.notes ?? "");
  const dirty =
    partNumber !== part.partNumber ||
    (partName || "") !== (part.partName ?? "") ||
    (customerPartNumber || "") !== (part.customerPartNumber ?? "") ||
    notes !== (part.notes ?? "");

  return (
    <div className="inline-detail">
      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label>Part number</label>
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <div className="field">
            <label>Part name</label>
            <input value={partName} onChange={(e) => setPartName(e.target.value)} />
          </div>
          <div className="field">
            <label>Customer part number</label>
            <input
              value={customerPartNumber}
              onChange={(e) => setCustomerPartNumber(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="row">
          <button
            className="btn btn-sm btn-primary"
            disabled={!dirty}
            onClick={async () => {
              if (partNumber.trim() === "") {
                pushToast("Part number is required.");
                return;
              }
              try {
                await update({
                  id: part._id,
                  partNumber,
                  partName: partName.trim() === "" ? null : partName,
                  customerPartNumber: customerPartNumber.trim() === "" ? null : customerPartNumber,
                  notes: notes.trim() === "" ? null : notes,
                });
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Save
          </button>
          {dirty && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setPartNumber(part.partNumber);
                setPartName(part.partName ?? "");
                setCustomerPartNumber(part.customerPartNumber ?? "");
                setNotes(part.notes ?? "");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <PartThreadsSection partId={partId} />

      <DrawingsSection partId={partId} />

      <div className="card">
        <h2 className="section-title">Inspection history</h2>
        {history === undefined ? (
          <Loading />
        ) : history.length === 0 ? (
          <Empty title="No inspections recorded for this part" />
        ) : (
          <InspectionTable
            inspections={history}
            defaultSort={{ key: "startedAt", dir: "asc" }}
          />
        )}
      </div>
    </div>
  );
}

// ── Work orders ─────────────────────────────────────────────────────

function WorkordersTab() {
  const workorders = useQuery(api.workorders.list, {});
  const parts = useQuery(api.parts.list, {});
  const customers = useQuery(api.customers.list, {});
  const create = useMutation(api.workorders.create);
  const update = useMutation(api.workorders.update);
  const setActive = useMutation(api.workorders.setActive);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"workorders"> | null>(null);
  const { sort, toggle, sortRows } = useTableSort<Doc<"workorders">>({ key: "woNumber", dir: "asc" });
  const get = (w: Doc<"workorders">, key: string) =>
    key === "woNumber" ? w.woNumber : ((parts ?? []).find((pp) => pp._id === w.partId)?.partNumber ?? "");

  if (workorders === undefined || parts === undefined || customers === undefined) {
    return <Loading />;
  }

  const customerById = new Map(customers.map((c) => [c._id, c]));
  const partLabel = (p: Doc<"parts">) =>
    `${p.partNumber} (${customerById.get(p.customerId)?.code ?? "?"})`;

  return (
    <div className="card">
      <button className="btn btn-primary btn-add" onClick={() => setShowCreate(true)}>
        Add work order
      </button>

      {showCreate && (
        <WorkorderCreateModal
          parts={parts}
          partLabel={partLabel}
          onCreate={async (woNumber, partId) => {
            await create({ woNumber, partId: partId as Id<"parts"> });
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {workorders.length === 0 ? (
        <Empty title="No work orders yet" />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <SortTh label="WO number" sortKey="woNumber" sort={sort} onToggle={toggle} />
                <SortTh label="Part" sortKey="part" sort={sort} onToggle={toggle} />
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortRows(workorders, get).map((w) => {
                const part = parts.find((p) => p._id === w.partId);
                return (
                  <WorkorderRow
                    key={w._id}
                    workorder={w}
                    partLabelStr={part ? partLabel(part) : "—"}
                    update={update}
                    setActive={setActive}
                    expanded={expandedId === w._id}
                    onToggleExpand={() => setExpandedId(expandedId === w._id ? null : w._id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WorkorderCreateModal({
  parts,
  partLabel,
  onCreate,
  onClose,
}: {
  parts: Doc<"parts">[];
  partLabel: (p: Doc<"parts">) => string;
  onCreate: (woNumber: string, partId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [woNumber, setWoNumber] = useState("");
  const [partId, setPartId] = useState("");

  return (
    <Modal title="Add work order" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (woNumber.trim() === "") {
            pushToast("WO number is required.");
            return;
          }
          if (partId === "") {
            pushToast("Select a part.");
            return;
          }
          try {
            await onCreate(woNumber, partId);
            onClose();
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label>WO number *</label>
            <input
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              placeholder="WO number"
              autoCapitalize="characters"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Part *</label>
            <Select
              value={partId}
              onChange={setPartId}
              placeholder="Select part…"
              options={parts
                .filter((p) => p.active)
                .map((p) => ({ value: p._id, label: partLabel(p) }))}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-add">Add work order</button>
      </form>
    </Modal>
  );
}

function WorkorderRow({
  workorder,
  partLabelStr,
  update,
  setActive,
  expanded,
  onToggleExpand,
}: {
  workorder: Doc<"workorders">;
  partLabelStr: string;
  update: ReturnType<typeof useMutation<typeof api.workorders.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.workorders.setActive>>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={`expandable-row${expanded ? " expanded" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, a")) return;
          onToggleExpand();
        }}
      >
        <td><strong>{workorder.woNumber}</strong></td>
        <td>{partLabelStr}</td>
        <td>
          <ToggleButton
            active={workorder.active}
            onToggle={() => void setActive({ id: workorder._id, active: !workorder.active })}
          />
        </td>
        <td className="status-col">
          <ActiveBadge active={workorder.active} />
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={4} style={{ padding: 0 }}>
            <WorkorderDetail workorder={workorder} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function WorkorderDetail({
  workorder,
  update,
}: {
  workorder: Doc<"workorders">;
  update: ReturnType<typeof useMutation<typeof api.workorders.update>>;
}) {
  const [woNumber, setWoNumber] = useState(workorder.woNumber);
  const dirty = woNumber !== workorder.woNumber;

  return (
    <div className="inline-detail">
      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label>WO number</label>
            <input
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
        </div>
        <div className="row">
          <button
            className="btn btn-sm btn-primary"
            disabled={!dirty}
            onClick={async () => {
              if (woNumber.trim() === "") {
                pushToast("WO number is required.");
                return;
              }
              try {
                await update({ id: workorder._id, woNumber });
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Save
          </button>
          {dirty && (
            <button
              className="btn btn-sm"
              onClick={() => setWoNumber(workorder.woNumber)}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inspectors ──────────────────────────────────────────────────────

function InspectorsTab() {
  const inspectors = useQuery(api.inspectors.list, {});
  const create = useMutation(api.inspectors.create);
  const update = useMutation(api.inspectors.update);
  const setActive = useMutation(api.inspectors.setActive);
  const { sort, toggle, sortRows } = useTableSort<Doc<"inspectors">>({ key: "name", dir: "asc" });

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"inspectors"> | null>(null);

  if (inspectors === undefined) return <Loading />;

  return (
    <div className="card">
      <button className="btn btn-primary btn-add" onClick={() => setShowCreate(true)}>
        Add inspector
      </button>

      {showCreate && (
        <InspectorCreateModal
          onCreate={async (name) => {
            await create({ name });
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {inspectors.length === 0 ? (
        <Empty title="No inspectors yet" />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" sortKey="name" sort={sort} onToggle={toggle} />
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortRows(inspectors, (i2) => i2.name).map((i) => (
                <InspectorRow
                  key={i._id}
                  inspector={i}
                  update={update}
                  setActive={setActive}
                  expanded={expandedId === i._id}
                  onToggleExpand={() => setExpandedId(expandedId === i._id ? null : i._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InspectorCreateModal({
  onCreate,
  onClose,
}: {
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <Modal title="Add inspector" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() === "") {
            pushToast("Inspector name is required.");
            return;
          }
          try {
            await onCreate(name);
            onClose();
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <div className="field">
          <label>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Inspector name"
            autoFocus
          />
        </div>
        <button className="btn btn-primary btn-add">Add inspector</button>
      </form>
    </Modal>
  );
}

function InspectorRow({
  inspector,
  update,
  setActive,
  expanded,
  onToggleExpand,
}: {
  inspector: Doc<"inspectors">;
  update: ReturnType<typeof useMutation<typeof api.inspectors.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.inspectors.setActive>>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={`expandable-row${expanded ? " expanded" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, a")) return;
          onToggleExpand();
        }}
      >
        <td>{inspector.name}</td>
        <td>
          <ToggleButton
            active={inspector.active}
            onToggle={() => void setActive({ id: inspector._id, active: !inspector.active })}
          />
        </td>
        <td className="status-col">
          <ActiveBadge active={inspector.active} />
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={3} style={{ padding: 0 }}>
            <InspectorDetail inspector={inspector} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function InspectorDetail({
  inspector,
  update,
}: {
  inspector: Doc<"inspectors">;
  update: ReturnType<typeof useMutation<typeof api.inspectors.update>>;
}) {
  const [name, setName] = useState(inspector.name);
  const dirty = name !== inspector.name;

  return (
    <div className="inline-detail">
      <div className="card">
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row">
          <button
            className="btn btn-sm btn-primary"
            disabled={!dirty}
            onClick={async () => {
              if (name.trim() === "") {
                pushToast("Inspector name is required.");
                return;
              }
              try {
                await update({ id: inspector._id, name });
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Save
          </button>
          {dirty && (
            <button
              className="btn btn-sm"
              onClick={() => setName(inspector.name)}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Threads ─────────────────────────────────────────────────────────

function ThreadsTab() {
  const threads = useQuery(api.threads.list, {});
  const update = useMutation(api.threads.update);
  const setActive = useMutation(api.threads.setActive);
  const { sort, toggle, sortRows } = useTableSort<Doc<"threads">>({ key: "name", dir: "asc" });

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"threads"> | null>(null);

  if (threads === undefined) return <Loading />;

  return (
    <div className="card">
      <button className="btn btn-primary btn-add" onClick={() => setShowCreate(true)}>
        Add thread
      </button>

      {showCreate && <ThreadCreateModal onClose={() => setShowCreate(false)} />}

      {threads.length === 0 ? (
        <Empty title="No threads yet" />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" sortKey="name" sort={sort} onToggle={toggle} />
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortRows(threads, (t) => t.name).map((t) => (
                <ThreadRow
                  key={t._id}
                  thread={t}
                  update={update}
                  setActive={setActive}
                  expanded={expandedId === t._id}
                  onToggleExpand={() => setExpandedId(expandedId === t._id ? null : t._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ThreadCreateModal({ onClose }: { onClose: () => void }) {
  const createThread = useCreateThread();
  const { draft, setDraft, busy, setBusy } = useThreadDraft();

  return (
    <Modal title="Add thread" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const threadId = await createThread(draft);
          setBusy(false);
          if (threadId !== null) onClose();
        }}
      >
        <ThreadDraftFields draft={draft} onChange={setDraft} autoFocus />
        <button className="btn btn-primary btn-add" disabled={busy}>
          {busy ? "Saving…" : "Add thread"}
        </button>
      </form>
    </Modal>
  );
}

function ThreadRow({
  thread,
  update,
  setActive,
  expanded,
  onToggleExpand,
}: {
  thread: Doc<"threads">;
  update: ReturnType<typeof useMutation<typeof api.threads.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.threads.setActive>>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={`expandable-row${expanded ? " expanded" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, a")) return;
          onToggleExpand();
        }}
      >
        <td>{thread.name}</td>
        <td>
          <ToggleButton
            active={thread.active}
            onToggle={() => void setActive({ id: thread._id, active: !thread.active })}
          />
        </td>
        <td className="status-col">
          <ActiveBadge active={thread.active} />
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={3} style={{ padding: 0 }}>
            <ThreadDetail threadId={thread._id} thread={thread} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function ThreadDetail({
  threadId,
  thread,
  update,
}: {
  threadId: Id<"threads">;
  thread: Doc<"threads">;
  update: ReturnType<typeof useMutation<typeof api.threads.update>>;
}) {
  const linkedParts = useQuery(api.partThreads.listByThread, { threadId });
  const [name, setName] = useState(thread.name);
  const [notes, setNotes] = useState(thread.notes ?? "");
  const dirty = name !== thread.name || notes !== (thread.notes ?? "");

  return (
    <div className="inline-detail">
      <div className="card">
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="row">
          <button
            className="btn btn-sm btn-primary"
            disabled={!dirty}
            onClick={async () => {
              if (name.trim() === "") {
                pushToast("Thread name is required.");
                return;
              }
              try {
                await update({
                  id: thread._id,
                  name,
                  notes: notes.trim() === "" ? null : notes,
                });
              } catch (err) {
                pushToast(cleanError(err));
              }
            }}
          >
            Save
          </button>
          {dirty && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setName(thread.name);
                setNotes(thread.notes ?? "");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Linked parts</h2>
        {linkedParts === undefined ? (
          <Loading />
        ) : linkedParts.length === 0 ? (
          <p className="meta">No parts linked to this thread.</p>
        ) : (
          <ul className="thread-links">
            {linkedParts.map((lp) => (
              <li key={lp._id} className="thread-link">
                <a className="link-btn" href={`#/part/${lp.partId}`}>
                  {lp.partNumber ?? "—"}
                  {lp.partName ? ` — ${lp.partName}` : ""}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ThreadDrawingsSection threadId={threadId} />
    </div>
  );
}
