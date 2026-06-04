import { useMemo, useState, Fragment } from "react";
import { ChevronDown, ChevronRight, ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";
import { useDashboard, type Employee } from "@/lib/dashboard-store";
import { buildWeeks, groupByMonth, weekOverlapFraction, fmtDate, type WeekCol } from "@/lib/week-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKS = 26; // ~6 months

function bookingColor(p: number) {
  if (p >= 90) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  if (p >= 50) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}
function oppColor(p: number) {
  if (p >= 100) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  if (p >= 50) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}

export function AvailabilityTab() {
  const { employees, bookings, opportunities } = useDashboard();
  const weeks = useMemo(() => buildWeeks(new Date(), WEEKS), []);
  const months = useMemo(() => groupByMonth(weeks), [weeks]);

  // expanded month keys
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const toggleMonth = (k: string) => {
    setExpandedMonths((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const toggleEmployee = (id: string) => {
    setExpandedEmployees((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const allExpanded = expandedMonths.size === months.length;
  const toggleAll = () => {
    setExpandedMonths(allExpanded ? new Set() : new Set(months.map((m) => m.key)));
  };

  // visible week cols based on month expansion
  const visibleCols: Array<
    | { kind: "month"; key: string; label: string; weeks: WeekCol[] }
    | { kind: "week"; key: string; week: WeekCol; monthKey: string }
  > = [];
  for (const m of months) {
    if (expandedMonths.has(m.key)) {
      for (const w of m.weeks) {
        visibleCols.push({ kind: "week", key: `${m.key}-${w.isoWeek}`, week: w, monthKey: m.key });
      }
    } else {
      visibleCols.push({ kind: "month", key: m.key, label: m.label, weeks: m.weeks });
    }
  }

  // compute weekly booking % and opportunity weighted % per employee
  function bookingForWeek(empId: string, w: WeekCol) {
    let total = 0;
    for (const b of bookings) {
      if (b.employeeId !== empId) continue;
      const frac = weekOverlapFraction(w, b.start, b.end);
      if (frac > 0) total += b.workload * frac;
    }
    return total;
  }
  function oppForWeek(empId: string, w: WeekCol) {
    let total = 0;
    for (const o of opportunities) {
      if (o.employeeId !== empId) continue;
      const frac = weekOverlapFraction(w, o.start, o.end);
      if (frac > 0) total += (o.workload * o.probability / 100) * frac;
    }
    return total;
  }
  function aggregate(empId: string, weeks: WeekCol[], fn: (id: string, w: WeekCol) => number) {
    if (weeks.length === 0) return 0;
    const sum = weeks.reduce((acc, w) => acc + fn(empId, w), 0);
    return sum / weeks.length;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team availability</h2>
          <p className="text-sm text-muted-foreground">
            6-month forward view. Click a month to expand into ISO weeks. Click an employee to see project details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allExpanded ? <ChevronsRightLeft className="size-4 mr-1" /> : <ChevronsLeftRight className="size-4 mr-1" />}
          {allExpanded ? "Collapse all" : "Expand all weeks"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b">
              <th className="text-left px-3 py-2 w-[240px] sticky left-0 bg-card z-20">Employee</th>
              {visibleCols.map((c) => {
                if (c.kind === "month") {
                  return (
                    <th key={c.key} className="px-2 py-2 text-center border-l min-w-[88px]">
                      <button
                        onClick={() => toggleMonth(c.key)}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        <ChevronRight className="size-3" />
                        {c.label}
                      </button>
                    </th>
                  );
                }
                return (
                  <th key={c.key} className="px-2 py-2 text-center border-l min-w-[56px] bg-muted/30">
                    <button
                      onClick={() => toggleMonth(c.monthKey)}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary"
                      title="Collapse month"
                    >
                      <ChevronDown className="size-3" />
                      {c.week.label}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const open = expandedEmployees.has(emp.id);
              return (
                <Fragment key={emp.id}>
                  {/* Booking row */}
                  <tr className="border-b hover:bg-muted/30">
                    <td
                      rowSpan={2}
                      className="px-3 py-2 align-top sticky left-0 bg-card z-10 border-r cursor-pointer"
                      onClick={() => toggleEmployee(emp.id)}
                    >
                      <div className="flex items-start gap-2">
                        {open ? <ChevronDown className="size-4 mt-0.5" /> : <ChevronRight className="size-4 mt-0.5" />}
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.role}</div>
                        </div>
                      </div>
                    </td>
                    {visibleCols.map((c) => {
                      const val = c.kind === "week"
                        ? bookingForWeek(emp.id, c.week)
                        : aggregate(emp.id, c.weeks, bookingForWeek);
                      return (
                        <td key={`b-${c.key}`} className="border-l p-1">
                          <div className={cn("rounded px-1 py-1 text-center text-xs font-medium", bookingColor(val))}>
                            {Math.round(val)}%
                          </div>
                          {c.kind === "week" ? null : (
                            <div className="text-[10px] text-muted-foreground text-center mt-0.5">Booking</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Opportunity row */}
                  <tr className="border-b hover:bg-muted/30">
                    {visibleCols.map((c) => {
                      const val = c.kind === "week"
                        ? oppForWeek(emp.id, c.week)
                        : aggregate(emp.id, c.weeks, oppForWeek);
                      return (
                        <td key={`o-${c.key}`} className="border-l p-1">
                          <div className={cn("rounded px-1 py-1 text-center text-xs font-medium", oppColor(val))}>
                            {Math.round(val)}%
                          </div>
                          {c.kind === "week" ? null : (
                            <div className="text-[10px] text-muted-foreground text-center mt-0.5">Opportunity</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {open && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={visibleCols.length + 1} className="px-4 py-3">
                        <EmployeeDetails employee={emp} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Legend />
    </div>
  );
}

function EmployeeDetails({ employee }: { employee: Employee }) {
  const { bookings, opportunities } = useDashboard();
  const empB = bookings.filter((b) => b.employeeId === employee.id);
  const empO = opportunities.filter((o) => o.employeeId === employee.id);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Confirmed bookings
        </div>
        {empB.length === 0 ? (
          <div className="text-sm text-muted-foreground">No bookings.</div>
        ) : (
          <ul className="space-y-1">
            {empB.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded bg-background border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{b.project}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.customer} · {fmtDate(b.start)} → {fmtDate(b.end)}
                  </div>
                </div>
                <div className="text-sm font-semibold">{b.workload}%</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Opportunities
        </div>
        {empO.length === 0 ? (
          <div className="text-sm text-muted-foreground">No opportunities.</div>
        ) : (
          <ul className="space-y-1">
            {empO.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded bg-background border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{o.project}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.customer} · {fmtDate(o.start)} → {fmtDate(o.end)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{o.workload}%</div>
                  <div className="text-xs text-muted-foreground">{o.probability}% likely</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">Bookings:</span>
        <Swatch className="bg-red-500/30" /> &lt;50%
        <Swatch className="bg-amber-500/30" /> 50–90%
        <Swatch className="bg-emerald-500/30" /> ≥90%
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">Opportunities (Σ workload × probability):</span>
        <Swatch className="bg-red-500/30" /> &lt;50%
        <Swatch className="bg-amber-500/30" /> 50–100%
        <Swatch className="bg-emerald-500/30" /> &gt;100%
      </div>
    </div>
  );
}
function Swatch({ className }: { className: string }) {
  return <span className={cn("inline-block size-3 rounded", className)} />;
}
