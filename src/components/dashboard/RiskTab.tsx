import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useDashboard } from "@/lib/dashboard-store";
import { computeRisk, teamRisk, ensureWeeklySnapshot, type EmployeeRisk, type Snapshot } from "@/lib/risk-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "overall" | "near" | "mid" | "far";

const TEAM_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea"];

function riskColor(v: number) {
  if (v >= 50) return "text-red-600 dark:text-red-400";
  if (v >= 25) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function RiskTab() {
  const { employees, bookings, opportunities, teams } = useDashboard();

  const risks = useMemo<EmployeeRisk[]>(
    () => computeRisk(employees.map((e) => e.id), bookings, opportunities),
    [employees, bookings, opportunities],
  );

  // Risk per team
  const teamRisksMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of teams) {
      const empIds = employees.filter((e) => e.teamId === t.id).map((e) => e.id);
      const tRisks = risks.filter((r) => empIds.includes(r.employeeId));
      map[t.id] = teamRisk(tRisks);
    }
    return map;
  }, [teams, employees, risks]);

  const departmentRisk = useMemo(() => teamRisk(risks), [risks]);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  useEffect(() => {
    if (employees.length > 0) {
      setSnaps(ensureWeeklySnapshot(departmentRisk, teamRisksMap));
    }
  }, [departmentRisk, teamRisksMap, employees.length]);

  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = risks.map((r) => ({
      ...r,
      name: employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId,
      role: employees.find((e) => e.id === r.employeeId)?.role ?? "",
      teamId: employees.find((e) => e.id === r.employeeId)?.teamId ?? "",
    }));
    rows.sort((a, b) => (sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
    return rows;
  }, [risks, employees, sortKey, sortDir]);

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const chartData = snaps.map((s) => {
    const point: Record<string, string | number> = {
      date: s.date.slice(5),
      Department: s.department,
    };
    for (const t of teams) {
      point[t.name] = s.teams[t.id] ?? 0;
    }
    return point;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Department Risk</div>
          <div className={cn("text-4xl font-semibold mt-2", riskColor(departmentRisk))}>
            {departmentRisk.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Average overall risk across {employees.length} employees. Higher = more idle capacity.
          </div>
          {teams.length > 0 && (
            <div className="mt-3 space-y-1">
              {teams.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full inline-block" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                    {t.name}
                  </span>
                  <span className={cn("font-medium", riskColor(teamRisksMap[t.id] ?? 0))}>
                    {(teamRisksMap[t.id] ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Risk over time</div>
            <div className="text-xs text-muted-foreground">weekly snapshot</div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No snapshot data yet — check back next week.
            </div>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Department" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: "#dc2626" }} />
                  {teams.map((t, i) => (
                    <Line
                      key={t.id}
                      type="monotone"
                      dataKey={t.name}
                      stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Employee risk</h2>
          <p className="text-sm text-muted-foreground">
            Weighted availability across the next 12 months. Weight per month = 0.9<sup>n</sup>.
          </p>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No employees yet.</div>
        ) : (
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
              {sorted.map((r) => {
                const teamName = teams.find((t) => t.id === r.teamId)?.name;
                return (
                  <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.role}{teamName ? ` · ${teamName}` : ""}
                      </div>
                    </td>
                    <td className={cn("px-4 py-2 text-right font-semibold", riskColor(r.overall))}>{r.overall.toFixed(1)}</td>
                    <td className={cn("px-4 py-2 text-right", riskColor(r.near))}>{r.near.toFixed(1)}</td>
                    <td className={cn("px-4 py-2 text-right", riskColor(r.mid))}>{r.mid.toFixed(1)}</td>
                    <td className={cn("px-4 py-2 text-right", riskColor(r.far))}>{r.far.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SortHeader({ label, k, sortKey, sortDir, onClick }: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onClick: (k: SortKey) => void;
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
