import { AlertTriangle } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { buildWeeks, rangeOverlapFraction } from "@/lib/week-utils";

export function BenchAlerts() {
  const { employees, bookings, opportunities } = useDashboard();

  const today = new Date();
  const next4Weeks = buildWeeks(today, 4);

  const atRisk = employees.filter((emp) => {
    let totalForecast = 0;
    let count = 0;
    for (const week of next4Weeks) {
      const booking = bookings
        .filter((b) => b.employeeId === emp.id)
        .reduce(
          (sum, b) => sum + b.workload * rangeOverlapFraction(week.start, week.end, b.start, b.end),
          0
        );

      const opp = opportunities
        .filter(o => o.members.some(m => m.employeeId === emp.id))
        .reduce((sum, o) => {
          const member = o.members.find(m => m.employeeId === emp.id)!;
          return sum + member.workload * (o.probability / 100) * rangeOverlapFraction(week.start, week.end, o.start, o.end);
        }, 0);

      totalForecast += booking + opp;
      count++;
    }
    return count > 0 && totalForecast / count < 50;
  });

  if (atRisk.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
      <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">Bench risk in next 4 weeks</p>
        <p className="text-sm text-amber-700 mt-1">
          {atRisk.map((e) => e.name).join(", ")} {atRisk.length === 1 ? "is" : "are"} forecast below 50% utilisation.
        </p>
      </div>
    </div>
  );
}
