import { addMonths, startOfMonth, endOfMonth, format, startOfISOWeek, parseISO } from "date-fns";
import type { Booking, Opportunity } from "./dashboard-store";
import { workingDaysCount } from "./week-utils";

export const RISK_MONTHS = 12;

/**
 * Average availability (0–100) for an employee over all working days in the month.
 * Uses day-by-day iteration so weekends are excluded cleanly.
 */
export function monthlyAvailability(
  empId: string,
  monthStart: Date,
  bookings: Booking[],
  opportunities: Opportunity[],
): number {
  const mStart = startOfMonth(monthStart);
  const mEnd = endOfMonth(monthStart);

  // Pre-parse booking/opportunity date ranges for this employee
  const empBookings = bookings
    .filter(b => b.employeeId === empId)
    .map(b => ({ workload: b.workload, s: parseISO(b.start), e: parseISO(b.end) }));

  const empOpps = opportunities
    .flatMap(o => {
      const m = o.members.find(m => m.employeeId === empId);
      if (!m) return [];
      return [{ workload: m.workload * o.probability / 100, s: parseISO(o.start), e: parseISO(o.end) }];
    });

  let totalDays = 0;
  let availSum = 0;

  const d = new Date(mStart);
  d.setHours(0, 0, 0, 0);

  while (d <= mEnd) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Mon–Fri only
      totalDays++;
      let booked = 0;
      for (const b of empBookings) {
        if (d >= b.s && d <= b.e) booked += b.workload;
      }
      for (const o of empOpps) {
        if (d >= o.s && d <= o.e) booked += o.workload;
      }
      availSum += Math.max(0, 100 - booked);
    }
    d.setDate(d.getDate() + 1);
  }

  return totalDays > 0 ? availSum / totalDays : 0;
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
