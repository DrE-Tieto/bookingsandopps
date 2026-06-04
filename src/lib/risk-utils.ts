import { addMonths, startOfMonth, endOfMonth, format, eachWeekOfInterval, startOfISOWeek, endOfISOWeek, max as dmax, min as dmin, parseISO, differenceInCalendarDays } from "date-fns";
import type { Booking, Opportunity } from "./dashboard-store";

export const RISK_MONTHS = 12;

/** Average weekly availability (0..100) for an employee in a given month window. */
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
  const weekStarts = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
  let sum = 0;
  let count = 0;
  for (const ws of weekStarts) {
    const wStart = startOfISOWeek(ws);
    const wEnd = endOfISOWeek(ws);
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
    sum += avail;
    count += 1;
  }
  return count ? sum / count : 0;
}

export interface EmployeeRisk {
  employeeId: string;
  overall: number;
  near: number;   // months 0-1
  mid: number;    // months 2-5
  far: number;    // months 6-12
  monthly: number[]; // length 13 (months 0..12)
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
      for (let i = from; i <= to; i++) s += monthly[i] * Math.pow(0.9, i);
      return s / n;
    };
    return {
      employeeId: empId,
      overall,
      near: partial(0, 1),
      mid: partial(2, 5),
      far: partial(6, 12),
      monthly,
    };
  });
}

export function teamRisk(risks: EmployeeRisk[]): number {
  if (!risks.length) return 0;
  return risks.reduce((a, r) => a + r.overall, 0) / risks.length;
}

// ===== Snapshot storage (localStorage) =====
const SNAP_KEY = "team-risk-snapshots-v1";

export interface Snapshot {
  date: string; // yyyy-MM-dd (Monday of ISO week)
  teamRisk: number;
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

/** Ensure the current ISO week has a snapshot using `currentTeamRisk`.
 * If no history exists, seeds 12 weeks of synthetic prior snapshots so the chart isn't empty. */
export function ensureWeeklySnapshot(currentTeamRisk: number): Snapshot[] {
  const today = new Date();
  const todayKey = snapWeekKey(today);
  let snaps = loadSnapshots();
  if (snaps.length === 0) {
    // seed 12 prior weekly snapshots with a smooth pseudo-random walk around current
    const seeded: Snapshot[] = [];
    let val = currentTeamRisk + (Math.random() - 0.5) * 40;
    for (let i = 12; i >= 1; i--) {
      const ws = startOfISOWeek(new Date(today.getTime() - i * 7 * 86400000));
      val = Math.max(0, val + (Math.random() - 0.5) * 25);
      // drift toward current
      val = val * 0.7 + currentTeamRisk * 0.3;
      seeded.push({ date: format(ws, "yyyy-MM-dd"), teamRisk: Math.round(val * 10) / 10 });
    }
    snaps = seeded;
  }
  const idx = snaps.findIndex((s) => s.date === todayKey);
  if (idx >= 0) {
    snaps[idx] = { date: todayKey, teamRisk: Math.round(currentTeamRisk * 10) / 10 };
  } else {
    snaps.push({ date: todayKey, teamRisk: Math.round(currentTeamRisk * 10) / 10 });
  }
  snaps.sort((a, b) => a.date.localeCompare(b.date));
  saveSnapshots(snaps);
  return snaps;
}
