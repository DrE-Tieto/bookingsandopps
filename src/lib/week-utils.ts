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
} from "date-fns";

export interface WeekCol {
  start: Date;
  end: Date;
  isoWeek: number;
  monthKey: string; // e.g. "2026-06"
  monthLabel: string; // e.g. "Jun 2026"
  label: string; // e.g. "W23"
}

/** Count Mon–Fri days in [start, end] inclusive. */
export function workingDaysCount(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
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
    const monthsTouched = new Set<string>();
    monthsTouched.add(w.monthKey);
    const endMonthKey = format(startOfMonth(w.end), "yyyy-MM");
    monthsTouched.add(endMonthKey);
    for (const mk of monthsTouched) {
      if (!map.has(mk)) {
        const mLabel = mk === w.monthKey ? w.monthLabel : format(w.end, "MMM yyyy");
        map.set(mk, { label: mLabel, weeks: [] });
      }
      map.get(mk)!.weeks.push(w);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v }));
}

/**
 * Weight of a week-part for a given month: working days in that part / 5.
 * Weekend-only parts return 0 and are excluded from month averages.
 */
export function weekMonthFraction(week: WeekCol, monthKey: string): number {
  let workingDaysInMonth = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(week.start);
    d.setDate(d.getDate() + i);
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // skip weekends
    if (format(startOfMonth(d), "yyyy-MM") === monthKey) workingDaysInMonth++;
  }
  return workingDaysInMonth / 5; // 5 = working days per full week
}

/** Overlap fraction of [startISO,endISO] with arbitrary date range [rangeStart,rangeEnd].
 *  Uses working days (Mon–Fri) only. Returns 0 for weekend-only ranges. */
export function rangeOverlapFraction(rangeStart: Date, rangeEnd: Date, startISO: string, endISO: string): number {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < rangeStart || s > rangeEnd) return 0;
  const os = max([s, rangeStart]);
  const oe = min([e, rangeEnd]);
  if (oe < os) return 0;
  const rangeWd = workingDaysCount(rangeStart, rangeEnd);
  if (rangeWd === 0) return 0; // weekend-only range
  const overlapWd = workingDaysCount(os, oe);
  return overlapWd / rangeWd;
}

/** Overlap fraction of [startISO,endISO] with a WeekCol (0..1 based on working days / 5) */
export function weekOverlapFraction(week: WeekCol, startISO: string, endISO: string): number {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < week.start || s > week.end) return 0;
  const os = max([s, week.start]);
  const oe = min([e, week.end]);
  return workingDaysCount(os, oe) / 5;
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
