import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useDashboard } from "@/lib/dashboard-store";
import { computeRisk, teamRisk, ensureWeeklySnapshot, type EmployeeRisk, type Snapshot } from "@/lib/risk-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "overall" | "near" | "mid" | "far";

function riskColor(v: number) {
  if (v >= 50) return "text-red-600 dark:text-red-400";
  if (v >= 25) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function RiskTab() {
  const { employees, bookings, opportunities } = useDashboard();
  const risks = useMemo<EmployeeRisk[]>(
    () => computeRisk(employees.map((e) => e.id), bookings, opportunities),
    [employees, bookings, opportunities],
  );
  const team = useMemo(() => teamRisk(risks), [risks]);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  useEffect(() => {
    setSnaps(ensureWeeklySnapshot(team));
  }, [team]);

  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = risks.map((r) => ({
      ...r,
      name: employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId,
      role: employees.find((e) => e.id === r.employeeId)?.role ?? "",
    }));
    rows.sort((a, b) => (sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
    return rows;
  }, [risks, employees, sortKey, sortDir]);

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  // Deterministic pseudo-random for benchmark wobble
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return ((h % 1000) / 1000 + 1) % 1;
  };
  const chartData = snaps.map((s) => {
    const r1 = hash(s.date + "dept") - 0.5;
    const r2 = hash(s.date + "ctry") - 0.5;
    return {
      date: s.date.slice(5),
      teamRisk: s.teamRisk,
      department: Math.max(0, Math.min(100, 32 + r1 * 6)),
      country: Math.max(0, Math.min(100, 28 + r2 * 4)),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Team Risk</div>
          <div className={cn("text-4xl font-semibold mt-2", riskColor(team))}>{team.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Average Overall Risk across {employees.length} employees. Higher = more idle capacity.
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Team Risk over time</div>
            <div className="text-xs text-muted-foreground">weekly snapshot</div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Line type="monotone" dataKey="teamRisk" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: "#dc2626" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Employee risk</h2>
          <p className="text-sm text-muted-foreground">
            Weighted availability across the next 12 months. Weight per month = 0.9<sup>n</sup>. Partial risks are
            normalized by the number of months in the bucket.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Employee</th>
              <SortHeader label="Overall" k="overall" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
              <SortHeader label="Near (m 0–1)" k="near" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
              <SortHeader label="Mid (m 2–5)" k="mid" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
              <SortHeader label="Far (m 6–12)" k="far" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </td>
                <td className={cn("px-4 py-2 text-right font-semibold", riskColor(r.overall))}>{r.overall.toFixed(1)}</td>
                <td className={cn("px-4 py-2 text-right", riskColor(r.near))}>{r.near.toFixed(1)}</td>
                <td className={cn("px-4 py-2 text-right", riskColor(r.mid))}>{r.mid.toFixed(1)}</td>
                <td className={cn("px-4 py-2 text-right", riskColor(r.far))}>{r.far.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label, k, sortKey, sortDir, onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
}) {
  const active = k === sortKey;
  return (
    <th className="px-4 py-2 text-right">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => onClick(k)}
      >
        {label}
        <ArrowUpDown className={cn("ml-1 size-3", active && "text-foreground")} />
        {active && <span className="ml-1 text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </Button>
    </th>
  );
}
