import { addMonths, startOfMonth, endOfMonth, format, eachWeekOfInterval, startOfISOWeek, endOfISOWeek, max as dmax, min as dmin, parseISO, differenceInCalendarDays } from "date-fns";
import type { Booking, Opportunity } from "./dashboard-store";

export const RISK_MONTHS = 12;

function weeklyOverlapFraction(ws: Date, we: Date, startISO: string, endISO: string) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < ws || s > we) return 0;
  const os = dmax([s, ws]);
  const oe = dmin([e, we]);
  const days = differenceInCalendarDays(oe, os) + 1;
  return Math.max(0, Math.min(7, days)) / 7;
}

export function monthlyAvailability(
  empId: string,
  monthStart: Date,
  bookings: Booking[],
  opportunities: Opportunity[],
): number {
  const mStart = startOfMonth(monthStart);
  const mEnd = endOfMonth(monthStart);
  const weekStarts = eachWeekOfInterval(
    { start: startOfISOWeek(mStart), end: mEnd },
    { weekStartsOn: 1 },
  );
  let sum = 0;
  let totalW = 0;
  for (const ws of weekStarts) {
    const wStart = startOfISOWeek(ws);
    const wEnd = endOfISOWeek(ws);
    const inStart = dmax([wStart, mStart]);
    const inEnd = dmin([wEnd, mEnd]);
    if (inEnd < inStart) continue;
    const daysInMonth = differenceInCalendarDays(inEnd, inStart) + 1;
    const w = Math.max(0, Math.min(7, daysInMonth)) / 7;
    if (w <= 0) continue;
    let booked = 0;
    let opp = 0;
    for (const b of bookings) {
      if (b.employeeId !== empId) continue;
      const f = weeklyOverlapFraction(wStart, wEnd, b.start, b.end);
      if (f > 0) booked += b.workload * f;
    }
    for (const o of opportunities) {
      if (o.employeeId !== empId) continue;
      const f = weeklyOverlapFraction(wStart, wEnd, o.start, o.end);
      if (f > 0) opp += (o.workload * o.probability / 100) * f;
    }
    const avail = Math.max(0, 100 - (booked + opp));
    sum += avail * w;
    totalW += w;
  }
  return totalW ? sum / totalW : 0;
}

export interface EmployeeRisk {
  employeeId: string;
  overall: number;
  near: number;
  mid: number;
  far: number;
  monthly: number[];
}

export function computeRisk(
  employeeIds: string[],
  bookings: Booking[],
  opportunities: Opportunity[],
  base: Date = new Date(),
): EmployeeRisk[] {
  const months: Date[] = [];
  for (let i = 0; i <= RISK_MONTHS; i++) months.push(startOfMonth(addMonths(base, i)));
  return employeeIds.map((empId) => {
    const monthly = months.map((m) => monthlyAvailability(empId, m, bookings, opportunities));
    let overall = 0;
    for (let i = 0; i < monthly.length; i++) overall += monthly[i] * Math.pow(0.9, i);
    const partial = (from: number, to: number) => {
      let s = 0;
      const n = to - from + 1;
      for (let i = from; i <= to; i++) s += monthly[i];
      return s / n;
    };
    return { employeeId: empId, overall, near: partial(0, 1), mid: partial(2, 5), far: partial(6, 12), monthly };
  });
}

export function teamRisk(risks: EmployeeRisk[]): number {
  if (!risks.length) return 0;
  return risks.reduce((a, r) => a + r.overall, 0) / risks.length;
}

// ===== Snapshot storage (localStorage) =====
const SNAP_KEY = "team-risk-snapshots-v2";

export interface Snapshot {
  date: string; // yyyy-MM-dd (Monday of ISO week)
  department: number;
  teams: Record<string, number>; // teamId -> risk
}

function snapWeekKey(d: Date) {
  return format(startOfISOWeek(d), "yyyy-MM-dd");
}

export function loadSnapshots(): Snapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(snaps: Snapshot[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
}

export function ensureWeeklySnapshot(
  departmentRisk: number,
  teamRisks: Record<string, number>,
): Snapshot[] {
  const today = new Date();
  const todayKey = snapWeekKey(today);
  const snaps = loadSnapshots();
  const snap: Snapshot = {
    date: todayKey,
    department: Math.round(departmentRisk * 10) / 10,
    teams: Object.fromEntries(
      Object.entries(teamRisks).map(([id, v]) => [id, Math.round(v * 10) / 10])
    ),
  };
  const idx = snaps.findIndex((s) => s.date === todayKey);
  if (idx >= 0) snaps[idx] = snap;
  else snaps.push(snap);
  snaps.sort((a, b) => a.date.localeCompare(b.date));
  saveSnapshots(snaps);
  return snaps;
}
