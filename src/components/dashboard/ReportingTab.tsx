import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isAfter, isBefore, eachDayOfInterval, getDay, max as dmax, min as dmin } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDashboard, type Employee, type Booking } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Count working days (Mon–Fri) in a date range, inclusive. */
function workingDaysInRange(rs: Date, re: Date): number {
  if (re < rs) return 0;
  return eachDayOfInterval({ start: rs, end: re })
    .filter(d => { const day = getDay(d); return day !== 0 && day !== 6; })
    .length;
}


type Metric = 'billability' | 'utilization';

const RANGE_OPTIONS = [
  { label: 'Last 1 month', value: 1 },
  { label: 'Last 3 months', value: 3 },
  { label: 'Last 6 months', value: 6 },
  { label: 'Last 12 months', value: 12 },
];

function buildPastMonths(count: number) {
  const today = new Date();
  const result = [];
  for (let i = count; i >= 1; i--) {
    const d = subMonths(today, i);
    result.push({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM yyyy'),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }
  return result;
}

function calcForRange(
  empId: string,
  rs: Date,
  re: Date,
  bookings: Booking[],
  metric: Metric,
): number {
  const totalWd = workingDaysInRange(rs, re);
  if (totalWd === 0) return 0;

  // For utilisation: subtract vacation working days from denominator
  let denominator = totalWd;
  if (metric === 'utilization') {
    for (const b of bookings) {
      if (b.employeeId !== empId || b.type !== 'vacation') continue;
      const s = parseISO(b.start);
      const e = parseISO(b.end);
      const overlapStart = dmax([rs, s]);
      const overlapEnd = dmin([re, e]);
      if (overlapEnd >= overlapStart) {
        // subtract the vacation working days weighted by workload %
        denominator -= workingDaysInRange(overlapStart, overlapEnd) * (b.workload / 100);
      }
    }
    denominator = Math.max(denominator, 1);
  }

  let numerator = 0;
  for (const b of bookings) {
    if (b.employeeId !== empId) continue;
    if (metric === 'billability' && b.type !== 'billable') continue;
    if (metric === 'utilization' && b.type === 'vacation') continue;
    const s = parseISO(b.start);
    const e = parseISO(b.end);
    const overlapStart = dmax([rs, s]);
    const overlapEnd = dmin([re, e]);
    if (overlapEnd >= overlapStart) {
      numerator += workingDaysInRange(overlapStart, overlapEnd) * (b.workload / 100);
    }
  }

  return Math.round((numerator / denominator) * 100);
}

function isInWindow(emp: Employee, rs: Date, re: Date): boolean {
  if (emp.availableFrom && isBefore(re, parseISO(emp.availableFrom))) return false;
  if (emp.availableUntil && isAfter(rs, parseISO(emp.availableUntil))) return false;
  return true;
}

function metricColor(v: number) {
  if (v >= 80) return 'bg-emerald-500/20 text-emerald-700';
  if (v >= 60) return 'bg-amber-500/20 text-amber-700';
  return 'bg-red-500/20 text-red-700';
}

function avgOrNull(vals: (number | null)[]): number | null {
  const valid = vals.filter((v): v is number => v !== null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export function ReportingTab() {
  const { employees, bookings, teams } = useDashboard();
  const [rangeMonths, setRangeMonths] = useState(3);
  const [metric, setMetric] = useState<Metric>('billability');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const periods = useMemo(() => buildPastMonths(rangeMonths), [rangeMonths]);

  const toggleTeam = (id: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  function empVal(emp: Employee, period: typeof periods[0]): number | null {
    if (!isInWindow(emp, period.start, period.end)) return null;
    return calcForRange(emp.id, period.start, period.end, bookings, metric);
  }

  function teamVal(teamId: string, period: typeof periods[0]): number | null {
    const emps = employees.filter(e => e.teamId === teamId);
    return avgOrNull(emps.map(e => empVal(e, period)));
  }

  function deptVal(period: typeof periods[0]): number | null {
    return avgOrNull(employees.map(e => empVal(e, period)));
  }

  function Cell({ val }: { val: number | null }) {
    if (val === null) return (
      <td className="border-l p-1">
        <div className="rounded px-1 py-1.5 text-center text-xs font-medium bg-muted/40 text-muted-foreground">N/A</div>
      </td>
    );
    return (
      <td className="border-l p-1">
        <div className={cn("rounded px-1 py-1.5 text-center text-xs font-semibold", metricColor(val))}>
          {val}%
        </div>
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Reporting</h2>
          <p className="text-sm text-muted-foreground">Historical billability and utilisation by employee, team and department.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden text-sm">
            <button
              className={cn("px-3 py-1.5 transition-colors", metric === 'billability' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setMetric('billability')}
            >
              Billability
            </button>
            <button
              className={cn("px-3 py-1.5 border-l transition-colors", metric === 'utilization' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setMetric('utilization')}
            >
              Utilisation
            </button>
          </div>
          <Select value={String(rangeMonths)} onValueChange={v => setRangeMonths(Number(v))}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          No employees yet. Add employees and bookings to see reporting data.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b">
                <th className="text-left px-4 py-2 w-[220px] sticky left-0 bg-card z-20">
                  {metric === 'billability' ? 'Billability %' : 'Utilisation %'}
                </th>
                {periods.map(p => (
                  <th key={p.key} className="px-2 py-2 text-center border-l min-w-[88px] text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Department row */}
              <tr className="border-b bg-muted/20 font-semibold">
                <td className="px-4 py-2 sticky left-0 bg-muted/20 z-10">
                  <div className="text-sm font-semibold">Department</div>
                  <div className="text-xs text-muted-foreground font-normal">{employees.length} employees</div>
                </td>
                {periods.map(p => <Cell key={p.key} val={deptVal(p)} />)}
              </tr>

              {/* Teams */}
              {teams.map(team => {
                const teamEmps = employees.filter(e => e.teamId === team.id && e.active);
                const expanded = expandedTeams.has(team.id);
                return [
                  /* Team row */
                  <tr key={`team-${team.id}`} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => toggleTeam(team.id)}>
                    <td className="px-4 py-2 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-xs text-muted-foreground">{teamEmps.length} employees</div>
                        </div>
                      </div>
                    </td>
                    {periods.map(p => <Cell key={p.key} val={teamVal(team.id, p)} />)}
                  </tr>,

                  /* Employee rows */
                  ...(expanded ? teamEmps.map(emp => (
                    <tr key={`emp-${emp.id}`} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-2 sticky left-0 bg-card z-10">
                        <div className="pl-6">
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.role}</div>
                        </div>
                      </td>
                      {periods.map(p => <Cell key={p.key} val={empVal(emp, p)} />)}
                    </tr>
                  )) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded bg-emerald-500/30" /> &ge;80%
          <span className="inline-block size-3 rounded bg-amber-500/30 ml-1" /> 60&ndash;79%
          <span className="inline-block size-3 rounded bg-red-500/30 ml-1" /> &lt;60%
        </div>
        <div>
          {metric === 'billability'
            ? 'Billability: billable bookings only ÷ total capacity'
            : 'Utilisation: billable + internal bookings ÷ total capacity (vacation excluded)'}
        </div>
      </div>
    </div>
  );
}
