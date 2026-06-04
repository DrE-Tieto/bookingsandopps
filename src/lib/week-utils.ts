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
    // Assign each week to every calendar month it touches
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

/** Fraction (0..1) of a week's 7 days that fall within the given calendar month "yyyy-MM" */
export function weekMonthFraction(week: WeekCol, monthKey: string): number {
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(week.start);
    d.setDate(d.getDate() + i);
    if (format(startOfMonth(d), "yyyy-MM") === monthKey) days++;
  }
  return days / 7;
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

/** Overlap fraction of [startISO,endISO] with arbitrary date range [rangeStart,rangeEnd].
 *  Normalized by the length of the range in days, so a booking covering the entire
 *  range returns 1.0 regardless of whether the range is 2 days or 7. */
export function rangeOverlapFraction(rangeStart: Date, rangeEnd: Date, startISO: string, endISO: string): number {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < rangeStart || s > rangeEnd) return 0;
  const os = max([s, rangeStart]);
  const oe = min([e, rangeEnd]);
  const overlapDays = differenceInCalendarDays(oe, os) + 1;
  const rangeDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
  if (rangeDays <= 0) return 0;
  return Math.max(0, overlapDays) / rangeDays;
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
