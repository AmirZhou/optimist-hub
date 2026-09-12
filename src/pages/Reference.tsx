import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ActiveBadge, Empty, pushToast, Loading, Select, cleanError } from "../ui";

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
        {(["customers", "parts", "workorders", "inspectors"] as const).map((t) => (
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
       <CustomersTab />}
    </>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────

function useToggle(
  setActive: ReturnType<typeof useMutation<typeof api.customers.setActive>>,
) {
  return async (id: Id<"customers">, active: boolean) => {
    await setActive({ id, active });
  };
}

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
  const toggle = useToggle(setActive);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  if (customers === undefined) return <Loading />;

  return (
    <div className="card">
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (code.trim() === "" || name.trim() === "") {
            pushToast("Customer code and name are required.");
            return;
          }
          try {
            await create({ code, name });
            setCode("");
            setName("");
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code, e.g. PHX"
          autoCapitalize="characters"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Legal name"
        />
        <button className="btn btn-primary btn-add">Add customer</button>
      </form>

      {customers.length === 0 ? (
        <Empty title="No customers yet" hint="Add one before creating parts." />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th></th>
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <CustomerRow key={c._id} customer={c} update={update} toggle={toggle} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer,
  update,
  toggle,
}: {
  customer: Doc<"customers">;
  update: ReturnType<typeof useMutation<typeof api.customers.update>>;
  toggle: (id: Id<"customers">, active: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(customer.code);
  const [name, setName] = useState(customer.name);

  return (
    <tr>
      <td>
        {editing ? (
          <input
            style={{ width: 90 }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
          />
        ) : (
          <strong>{customer.code}</strong>
        )}
      </td>
      <td>
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          customer.name
        )}
      </td>
      <td>
        {editing ? (
          <div className="row">
            <button
              className="btn btn-sm btn-primary"
              onClick={async () => {
                if (code.trim() === "" || name.trim() === "") {
                  pushToast("Customer code and name are required.");
                  return;
                }
                try {
                  await update({ id: customer._id, code, name });
                  setEditing(false);
                } catch (err) {
                  pushToast(cleanError(err));
                }
              }}
            >
              Save
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setCode(customer.code);
                setName(customer.name);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
      <td>
        <ToggleButton
          active={customer.active}
          onToggle={() => void toggle(customer._id, !customer.active)}
        />
      </td>
      <td className="status-col">
        <ActiveBadge active={customer.active} />
      </td>
    </tr>
  );
}

// ── Parts ───────────────────────────────────────────────────────────

function PartsTab() {
  const parts = useQuery(api.parts.list, {});
  const customers = useQuery(api.customers.list, {});
  const create = useMutation(api.parts.create);
  const update = useMutation(api.parts.update);
  const setActive = useMutation(api.parts.setActive);

  const [customerId, setCustomerId] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");

  if (parts === undefined || customers === undefined) return <Loading />;

  const customerById = new Map(customers.map((c) => [c._id, c]));

  return (
    <div className="card">
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
          try {
            await create({
              partNumber,
              customerId: customerId as Id<"customers">,
              partName: partName.trim() === "" ? null : partName,
              drawingVersion: null,
              customerPartNumber: null,
              customerPartName: null,
              customerDrawingVersion: null,
            });
            setPartNumber("");
            setPartName("");
          } catch (err) {
            pushToast(cleanError(err));
          }
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
        <button className="btn btn-primary btn-add">Add part</button>
      </form>

      {parts.length === 0 ? (
        <Empty title="No parts yet" hint="A part must exist before it can be inspected." />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>Part number</th>
                <th>Name</th>
                <th>Customer</th>
                <th>Their part number</th>
                <th></th>
                <th></th>
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <PartRow
                  key={p._id}
                  part={p}
                  customerLabel={
                    customerById.get(p.customerId)?.code ?? "—"
                  }
                  update={update}
                  setActive={setActive}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PartRow({
  part,
  customerLabel,
  update,
  setActive,
}: {
  part: Doc<"parts">;
  customerLabel: string;
  update: ReturnType<typeof useMutation<typeof api.parts.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.parts.setActive>>;
}) {
  const [editing, setEditing] = useState(false);
  const [partNumber, setPartNumber] = useState(part.partNumber);
  const [partName, setPartName] = useState(part.partName ?? "");
  const [customerPartNumber, setCustomerPartNumber] = useState(
    part.customerPartNumber ?? "",
  );

  return (
    <tr>
      <td>
        {editing ? (
          <input
            style={{ width: 110 }}
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            autoCapitalize="characters"
          />
        ) : (
          <strong>{part.partNumber}</strong>
        )}
      </td>
      <td>
        {editing ? (
          <input value={partName} onChange={(e) => setPartName(e.target.value)} />
        ) : (
          part.partName ?? <span className="muted">—</span>
        )}
      </td>
      <td>{customerLabel}</td>
      <td>
        {editing ? (
          <input
            style={{ width: 110 }}
            value={customerPartNumber}
            onChange={(e) => setCustomerPartNumber(e.target.value)}
            autoCapitalize="characters"
          />
        ) : (
          part.customerPartNumber ?? <span className="muted">—</span>
        )}
      </td>
      <td>
        <a href={`#/part/${part._id}`}>History</a>
      </td>
      <td>
        {editing ? (
          <div className="row">
            <button
              className="btn btn-sm btn-primary"
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
                    customerPartNumber:
                      customerPartNumber.trim() === "" ? null : customerPartNumber,
                  });
                  setEditing(false);
                } catch (err) {
                  pushToast(cleanError(err));
                }
              }}
            >
              Save
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setPartNumber(part.partNumber);
                setPartName(part.partName ?? "");
                setCustomerPartNumber(part.customerPartNumber ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
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
  );
}

// ── Work orders ─────────────────────────────────────────────────────

function WorkordersTab() {
  const workorders = useQuery(api.workorders.list, {});
  const parts = useQuery(api.parts.list, {});
  const customers = useQuery(api.customers.list, {});
  const create = useMutation(api.workorders.create);
  const setActive = useMutation(api.workorders.setActive);

  const [woNumber, setWoNumber] = useState("");
  const [partId, setPartId] = useState("");

  if (workorders === undefined || parts === undefined || customers === undefined) {
    return <Loading />;
  }

  const customerById = new Map(customers.map((c) => [c._id, c]));
  const partLabel = (p: Doc<"parts">) =>
    `${p.partNumber} (${customerById.get(p.customerId)?.code ?? "?"})`;

  return (
    <div className="card">
      <form
        className="row"
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
            await create({ woNumber, partId: partId as Id<"parts"> });
            setWoNumber("");
            setPartId("");
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <input
          value={woNumber}
          onChange={(e) => setWoNumber(e.target.value)}
          placeholder="WO number"
          autoCapitalize="characters"
        />
        <Select
          value={partId}
          onChange={setPartId}
          placeholder="Select part…"
          options={parts
            .filter((p) => p.active)
            .map((p) => ({ value: p._id, label: partLabel(p) }))}
        />
        <button className="btn btn-primary btn-add">Add work order</button>
      </form>

      {workorders.length === 0 ? (
        <Empty title="No work orders yet" />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>WO number</th>
                <th>Part</th>
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {workorders.map((w) => {
                const part = parts.find((p) => p._id === w.partId);
                return (
                  <tr key={w._id}>
                    <td>
                      <strong>{w.woNumber}</strong>
                    </td>
                    <td>{part ? partLabel(part) : "—"}</td>
                    <td>
                      <ToggleButton
                        active={w.active}
                        onToggle={() =>
                          void setActive({ id: w._id, active: !w.active })
                        }
                      />
                    </td>
                    <td className="status-col">
                      <ActiveBadge active={w.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Inspectors ──────────────────────────────────────────────────────

function InspectorsTab() {
  const inspectors = useQuery(api.inspectors.list, {});
  const create = useMutation(api.inspectors.create);
  const update = useMutation(api.inspectors.update);
  const setActive = useMutation(api.inspectors.setActive);

  const [name, setName] = useState("");

  if (inspectors === undefined) return <Loading />;

  return (
    <div className="card">
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() === "") {
            pushToast("Inspector name is required.");
            return;
          }
          try {
            await create({ name });
            setName("");
          } catch (err) {
            pushToast(cleanError(err));
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Inspector name"
        />
        <button className="btn btn-primary btn-add">Add inspector</button>
      </form>

      {inspectors.length === 0 ? (
        <Empty title="No inspectors yet" />
      ) : (
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
                <th></th>
                <th className="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              {inspectors.map((i) => (
                <InspectorRow
                  key={i._id}
                  inspector={i}
                  update={update}
                  setActive={setActive}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InspectorRow({
  inspector,
  update,
  setActive,
}: {
  inspector: Doc<"inspectors">;
  update: ReturnType<typeof useMutation<typeof api.inspectors.update>>;
  setActive: ReturnType<typeof useMutation<typeof api.inspectors.setActive>>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(inspector.name);

  return (
    <tr>
      <td>
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          inspector.name
        )}
      </td>
      <td>
        {editing ? (
          <div className="row">
            <button
              className="btn btn-sm btn-primary"
              onClick={async () => {
                if (name.trim() === "") {
                  pushToast("Inspector name is required.");
                  return;
                }
                try {
                  await update({ id: inspector._id, name });
                  setEditing(false);
                } catch (err) {
                  pushToast(cleanError(err));
                }
              }}
            >
              Save
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setName(inspector.name);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
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
  );
}
