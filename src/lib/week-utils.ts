import {
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  format,
  getISOWeek,
  startOfMonth,
  parseISO,
  isWithinInterval,
  max,
  min,
  differenceInCalendarDays,
} from "date-fns";

export interface WeekCol {
  start: Date;
  end: Date;
  isoWeek: number;
  monthKey: string; // e.g. "2026-06"
  monthLabel: string; // e.g. "Jun 2026"
  label: string; // e.g. "W23"
}

export function buildWeeks(from: Date, weeksCount: number): WeekCol[] {
  const start = startOfISOWeek(from);
  const out: WeekCol[] = [];
  for (let i = 0; i < weeksCount; i++) {
    const ws = addWeeks(start, i);
    const we = endOfISOWeek(ws);
    const mStart = startOfMonth(ws);
    out.push({
      start: ws,
      end: we,
      isoWeek: getISOWeek(ws),
      monthKey: format(mStart, "yyyy-MM"),
      monthLabel: format(mStart, "MMM yyyy"),
      label: `W${getISOWeek(ws)}`,
    });
  }
  return out;
}

export function groupByMonth(weeks: WeekCol[]) {
  const map = new Map<string, { label: string; weeks: WeekCol[] }>();
  for (const w of weeks) {
    if (!map.has(w.monthKey)) map.set(w.monthKey, { label: w.monthLabel, weeks: [] });
    map.get(w.monthKey)!.weeks.push(w);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

/** Overlap fraction of [start,end] with the week (0..1 based on days/7) */
export function weekOverlapFraction(week: WeekCol, startISO: string, endISO: string): number {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < week.start || s > week.end) return 0;
  const os = max([s, week.start]);
  const oe = min([e, week.end]);
  const days = differenceInCalendarDays(oe, os) + 1;
  return Math.max(0, Math.min(7, days)) / 7;
}

export function overlaps(week: WeekCol, startISO: string, endISO: string): boolean {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  return isWithinInterval(week.start, { start: s, end: e }) ||
    isWithinInterval(week.end, { start: s, end: e }) ||
    (s <= week.start && e >= week.end);
}

export function fmtDate(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy");
}
