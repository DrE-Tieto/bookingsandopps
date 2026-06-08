import { useMemo, useState, Fragment } from "react";
import { ChevronDown, ChevronRight, ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";
import { startOfMonth, endOfMonth, max as dmax, min as dmin, parseISO, format, isAfter, isBefore } from "date-fns";
import { useDashboard, type Employee } from "@/lib/dashboard-store";
import { buildWeeks, groupByMonth, weekMonthFraction, rangeOverlapFraction, fmtDate, type WeekCol } from "@/lib/week-utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MonthPart = {
  week: WeekCol;
  rangeStart: Date;
  rangeEnd: Date;
  weight: number;
};

const HORIZON_OPTIONS = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
  { label: "18 months", months: 18 },
  { label: "24 months", months: 24 },
];

function cellColor(p: number) {
  if (p > 100) return "bg-purple-500/20 text-purple-700 dark:text-purple-300"; // over-capacity
  if (p >= 89.5) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  if (p >= 49.5) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}

function isInWindow(emp: Employee, rangeStart: Date, rangeEnd: Date): boolean {
  if (emp.availableFrom && isBefore(rangeEnd, parseISO(emp.availableFrom))) return false;
  if (emp.availableUntil && isAfter(rangeStart, parseISO(emp.availableUntil))) return false;
  return true;
}

type ViewMode = 'both' | 'booking' | 'forecast';

export function AvailabilityTab() {
  const { employees: allEmployees, bookings, opportunities } = useDashboard();
  const employees = allEmployees.filter((e) => e.active);
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [viewMode, setViewMode] = useState<ViewMode>('booking');
  const weeks = useMemo(() => buildWeeks(new Date(), Math.ceil(horizonMonths * 4.345)), [horizonMonths]);
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

  // visible cols based on month expansion. Split weeks become two partial cols
  // (W{n}A in the earlier month, W{n}B in the later month) when their parent
  // month is expanded.
  const visibleCols: Array<
    | { kind: "month"; key: string; label: string; parts: MonthPart[] }
    | {
        kind: "week";
        key: string;
        week: WeekCol;
        monthKey: string;
        label: string;
        rangeStart: Date;
        rangeEnd: Date;
      }
  > = [];
  for (const m of months) {
    const mStart = startOfMonth(parseISO(`${m.key}-01`));
    const mEnd = endOfMonth(mStart);
    const parts = m.weeks
      .map((w) => {
        const weight = weekMonthFraction(w, m.key);
        return {
          week: w,
          rangeStart: dmax([w.start, mStart]),
          rangeEnd: dmin([w.end, mEnd]),
          weight,
        };
      })
      .filter((p) => p.weight > 0);

    if (expandedMonths.has(m.key)) {
      for (const part of parts) {
        const { week: w, rangeStart, rangeEnd, weight } = part;
        const isSplit = weight < 1;
        // Suffix A if this partial range is the earlier portion of a split week,
        // B if it's the later portion. The week's monthKey is its Monday's month.
        const suffix = !isSplit
          ? ""
          : format(startOfMonth(w.start), "yyyy-MM") === m.key
            ? "A"
            : "B";
        const label = `${w.label}${suffix}`;
        visibleCols.push({
          kind: "week",
          key: `${m.key}-${w.isoWeek}${suffix}`,
          week: w,
          monthKey: m.key,
          label,
          rangeStart,
          rangeEnd,
        });
      }
    } else {
      visibleCols.push({ kind: "month", key: m.key, label: m.label, parts });
    }
  }

  // partial-week (range) aggregates: normalize by range length so a booking
  // covering the whole partial range yields the booking's workload %.
  function bookingForRange(empId: string, rs: Date, re: Date) {
    let total = 0;
    for (const b of bookings) {
      if (b.employeeId !== empId) continue;
      const frac = rangeOverlapFraction(rs, re, b.start, b.end);
      if (frac > 0) total += b.workload * frac;
    }
    return total;
  }
  function oppForRange(empId: string, rs: Date, re: Date) {
    let total = 0;
    for (const o of opportunities) {
      const member = o.members.find(m => m.employeeId === empId);
      if (!member) continue;
      const frac = rangeOverlapFraction(rs, re, o.start, o.end);
      if (frac > 0) total += (member.workload * o.probability / 100) * frac;
    }
    return total;
  }

  function aggregateParts(empId: string, parts: MonthPart[], fn: (id: string, rs: Date, re: Date) => number) {
    const totalW = parts.reduce((acc, part) => acc + part.weight, 0);
    if (totalW === 0) return 0;
    const sum = parts.reduce((acc, part) => acc + fn(empId, part.rangeStart, part.rangeEnd) * part.weight, 0);
    return sum / totalW;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Team availability</h2>
          <p className="text-sm text-muted-foreground">
            Forward view. Click a month to expand into ISO weeks. Click an employee to see project details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden text-sm">
            {(['booking', 'forecast', 'both'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={cn("px-3 py-1.5 capitalize border-l first:border-l-0 transition-colors",
                  viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'both' ? 'Both' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <Select value={String(horizonMonths)} onValueChange={(v) => setHorizonMonths(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((o) => (
                <SelectItem key={o.months} value={String(o.months)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allExpanded ? <ChevronsRightLeft className="size-4 mr-1" /> : <ChevronsLeftRight className="size-4 mr-1" />}
            {allExpanded ? "Collapse all" : "Expand all weeks"}
          </Button>
        </div>
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
                      {c.label}
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
                  {/* Booking row — shown in 'booking' or 'both' mode */}
                  {(viewMode === 'booking' || viewMode === 'both') && (
                    <tr className="border-b hover:bg-muted/30">
                      <td
                        className="px-3 py-2 align-top sticky left-0 bg-card z-10 border-r cursor-pointer"
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <div className="flex items-start gap-2">
                          {open ? <ChevronDown className="size-4 mt-0.5" /> : <ChevronRight className="size-4 mt-0.5" />}
                          <div>
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.role}</div>
                            {viewMode === 'both' && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">Booking</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {visibleCols.map((c) => {
                        const rs = c.kind === "week" ? c.rangeStart : c.parts[0]?.rangeStart ?? new Date();
                        const re = c.kind === "week" ? c.rangeEnd : c.parts[c.parts.length - 1]?.rangeEnd ?? new Date();
                        const inWindow = isInWindow(emp, rs, re);
                        const val = inWindow
                          ? c.kind === "week"
                            ? bookingForRange(emp.id, c.rangeStart, c.rangeEnd)
                            : aggregateParts(emp.id, c.parts, bookingForRange)
                          : null;
                        return (
                          <td key={`b-${c.key}`} className="border-l p-1">
                            <div className={cn("rounded px-1 py-1.5 text-center text-xs font-semibold",
                              val === null ? "bg-muted/40 text-muted-foreground" : cellColor(val))}>
                              {val === null ? "N/A" : `${Math.round(val)}%`}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {/* Forecast row — shown in 'forecast' or 'both' mode */}
                  {(viewMode === 'forecast' || viewMode === 'both') && (
                    <tr className="border-b hover:bg-muted/30">
                      <td
                        className="px-3 py-2 align-top sticky left-0 bg-card z-10 border-r cursor-pointer"
                        onClick={() => viewMode === 'forecast' ? toggleEmployee(emp.id) : undefined}
                      >
                        {viewMode === 'forecast' ? (
                          <div className="flex items-start gap-2">
                            {open ? <ChevronDown className="size-4 mt-0.5" /> : <ChevronRight className="size-4 mt-0.5" />}
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-xs text-muted-foreground">{emp.role}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground pl-6">Forecast</div>
                        )}
                      </td>
                      {visibleCols.map((c) => {
                        const rs = c.kind === "week" ? c.rangeStart : c.parts[0]?.rangeStart ?? new Date();
                        const re = c.kind === "week" ? c.rangeEnd : c.parts[c.parts.length - 1]?.rangeEnd ?? new Date();
                        const inWindow = isInWindow(emp, rs, re);
                        const forecastFn = (id: string, rs: Date, re: Date) =>
                          bookingForRange(id, rs, re) + oppForRange(id, rs, re);
                        const val = inWindow
                          ? c.kind === "week"
                            ? bookingForRange(emp.id, c.rangeStart, c.rangeEnd) + oppForRange(emp.id, c.rangeStart, c.rangeEnd)
                            : aggregateParts(emp.id, c.parts, forecastFn)
                          : null;
                        return (
                          <td key={`f-${c.key}`} className="border-l p-1">
                            <div className={cn("rounded px-1 py-1.5 text-center text-xs font-semibold",
                              val === null ? "bg-muted/40 text-muted-foreground" : cellColor(val))}>
                              {val === null ? "N/A" : `${Math.round(val)}%`}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {open && (viewMode === 'booking' || viewMode === 'both' || viewMode === 'forecast') && (
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

      <Legend viewMode={viewMode} />
    </div>
  );
}

function EmployeeDetails({ employee }: { employee: Employee }) {
  const { bookings, opportunities } = useDashboard();
  const empB = bookings.filter((b) => b.employeeId === employee.id);
  const empO = opportunities.filter((o) => o.members.some(m => m.employeeId === employee.id));

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
                  <div className="text-sm font-medium">
                    {b.type === 'vacation' ? 'Vacation' : (b.project || '—')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.type === 'vacation'
                      ? `${fmtDate(b.start)} → ${fmtDate(b.end)}`
                      : `${b.customer} · ${fmtDate(b.start)} → ${fmtDate(b.end)}`}
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
            {empO.map((o) => {
              const member = o.members.find(m => m.employeeId === employee.id);
              return (
                <li key={o.id} className="flex items-center justify-between rounded bg-background border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{o.project}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.customer} · {fmtDate(o.start)} → {fmtDate(o.end)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{member?.workload ?? 0}%</div>
                    <div className="text-xs text-muted-foreground">{o.probability}% likely</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Legend({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {viewMode === 'forecast' && <span className="font-medium text-foreground">Forecast (bookings + Σ opp × probability):</span>}
        {viewMode === 'booking' && <span className="font-medium text-foreground">Booking:</span>}
        {viewMode === 'both' && <span className="font-medium text-foreground">Both views:</span>}
        <Swatch className="bg-red-500/30" /> &lt;50%
        <Swatch className="bg-amber-500/30" /> 50–89%
        <Swatch className="bg-emerald-500/30" /> 90–100%
        <Swatch className="bg-purple-500/30" /> &gt;100%
      </div>
    </div>
  );
}
function Swatch({ className }: { className: string }) {
  return <span className={cn("inline-block size-3 rounded", className)} />;
}
