import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Empty, Loading, Select } from "../ui";
import { InspectionTable } from "../tables";
import { STAGES, SOURCES } from "../domain";

const DAY = 86_400_000;

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "30d", label: "Last 30 days" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const RESULTS = [
  { value: "all", label: "All results" },
  { value: "open", label: "Not yet judged" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
] as const;
type ResultFilter = (typeof RESULTS)[number]["value"];

export function Home() {
  const [period, setPeriod] = useState<Period>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [stage, setStage] = useState<string>("all");
  const [source, setSource] = useState<string>("all");

  const range = useMemo(() => {
    const to = Date.now() + DAY;
    if (period === "week") return { from: to - 8 * DAY, to };
    if (period === "30d") return { from: to - 31 * DAY, to };
    return { from: 0, to };
  }, [period]);

  const inspections = useQuery(api.reports.inspectionsStartedBetween, range);

  if (inspections === undefined) {
    return <Loading />;
  }

  const filtered = inspections.filter((i) => {
    if (result === "open" && i.finishedAt !== null) return false;
    if (result === "pass" && i.result !== "pass") return false;
    if (result === "fail" && i.result !== "fail") return false;
    if (stage !== "all" && i.stage !== stage) return false;
    if (source !== "all" && i.source !== source) return false;
    return true;
  });
  // Open-only view reads oldest-first (an open inspection is a problem);
  // everything else reads newest-first.
  filtered.sort((a, b) =>
    result === "open"
      ? a.startedAt - b.startedAt
      : b.startedAt - a.startedAt,
  );

  return (
    <>
      <div className="filter-bar page-filters">
            <Select
              ariaLabel="Result"
              value={result}
              onChange={(v) => setResult(v as ResultFilter)}
              options={RESULTS.map((r) => ({ value: r.value, label: r.label }))}
            />
            <Select
              ariaLabel="Stage"
              value={stage}
              onChange={setStage}
              options={[
                { value: "all", label: "All stages" },
                ...STAGES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
              ]}
            />
            <Select
              ariaLabel="Source"
              value={source}
              onChange={setSource}
              options={[
                { value: "all", label: "All sources" },
                ...SOURCES.map((s) => ({
                  value: s,
                  label: s === "inhouse" ? "In-house" : "Vendor",
                })),
              ]}
            />
            <Select
              ariaLabel="Period"
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            />
</div>
        {filtered.length === 0 ? (
          <Empty title="No inspections match" hint="Loosen a filter, or start one from the bench." />
        ) : (
          <InspectionTable inspections={filtered} />
        )}
    </>
  );
}
