import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { addDays, addMonths, format } from "date-fns";

export interface Employee {
  id: string;
  name: string;
  role: string;
}

export interface Booking {
  id: string;
  employeeId: string;
  customer: string;
  project: string;
  workload: number; // %
  start: string; // ISO date
  end: string; // ISO date
}

export interface Opportunity {
  id: string;
  employeeId: string;
  customer: string;
  project: string;
  workload: number; // %
  probability: number; // %
  start: string;
  end: string;
}

interface Ctx {
  employees: Employee[];
  bookings: Booking[];
  opportunities: Opportunity[];
  addBooking: (b: Omit<Booking, "id">) => void;
  updateBooking: (b: Booking) => void;
  deleteBooking: (id: string) => void;
  addOpportunity: (o: Omit<Opportunity, "id">) => void;
  updateOpportunity: (o: Opportunity) => void;
  deleteOpportunity: (id: string) => void;
  convertOpportunity: (id: string) => void;
}

const DashboardContext = createContext<Ctx | null>(null);

const today = new Date();
const iso = (d: Date) => format(d, "yyyy-MM-dd");
const uid = () => Math.random().toString(36).slice(2, 10);

const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Alice Johansson", role: "Senior Consultant" },
  { id: "e2", name: "Ben Müller", role: "Consultant" },
  { id: "e3", name: "Chen Wei", role: "Principal" },
  { id: "e4", name: "Diana Rossi", role: "Senior Consultant" },
  { id: "e5", name: "Eitan Cohen", role: "Consultant" },
  { id: "e6", name: "Farida Khan", role: "Manager" },
];

const seedBookings: Booking[] = [
  { id: uid(), employeeId: "e1", customer: "Acme Corp", project: "Cloud Migration", workload: 60, start: iso(addDays(today, -10)), end: iso(addMonths(today, 4)) },
  { id: uid(), employeeId: "e1", customer: "Globex", project: "Data Platform", workload: 30, start: iso(addMonths(today, 1)), end: iso(addMonths(today, 3)) },
  { id: uid(), employeeId: "e2", customer: "Initech", project: "ERP Rollout", workload: 80, start: iso(addDays(today, -20)), end: iso(addMonths(today, 5)) },
  { id: uid(), employeeId: "e3", customer: "Umbrella", project: "AI Strategy", workload: 50, start: iso(today), end: iso(addMonths(today, 6)) },
  { id: uid(), employeeId: "e4", customer: "Stark Industries", project: "Process Redesign", workload: 100, start: iso(addDays(today, -5)), end: iso(addMonths(today, 3)) },
  { id: uid(), employeeId: "e5", customer: "Wayne Enterprises", project: "Security Audit", workload: 40, start: iso(addMonths(today, 1)), end: iso(addMonths(today, 4)) },
  { id: uid(), employeeId: "e6", customer: "Hooli", project: "Org Design", workload: 70, start: iso(today), end: iso(addMonths(today, 5)) },
];

const seedOpps: Opportunity[] = [
  { id: uid(), employeeId: "e1", customer: "Pied Piper", project: "Compression POC", workload: 40, probability: 60, start: iso(addMonths(today, 2)), end: iso(addMonths(today, 5)) },
  { id: uid(), employeeId: "e2", customer: "Soylent", project: "Supply Chain", workload: 50, probability: 80, start: iso(addMonths(today, 1)), end: iso(addMonths(today, 4)) },
  { id: uid(), employeeId: "e2", customer: "Vandelay", project: "Export Strategy", workload: 30, probability: 40, start: iso(addMonths(today, 2)), end: iso(addMonths(today, 5)) },
  { id: uid(), employeeId: "e3", customer: "Massive Dynamic", project: "R&D Roadmap", workload: 50, probability: 70, start: iso(addMonths(today, 1)), end: iso(addMonths(today, 6)) },
  { id: uid(), employeeId: "e4", customer: "Cyberdyne", project: "Automation", workload: 50, probability: 90, start: iso(addMonths(today, 3)), end: iso(addMonths(today, 6)) },
  { id: uid(), employeeId: "e5", customer: "Tyrell Corp", project: "Bioethics Review", workload: 60, probability: 50, start: iso(today), end: iso(addMonths(today, 3)) },
  { id: uid(), employeeId: "e5", customer: "Oscorp", project: "Lab Ops", workload: 40, probability: 70, start: iso(addMonths(today, 2)), end: iso(addMonths(today, 5)) },
  { id: uid(), employeeId: "e6", customer: "Gringotts", project: "Compliance", workload: 30, probability: 60, start: iso(addMonths(today, 1)), end: iso(addMonths(today, 4)) },
];

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [employees] = useState<Employee[]>(EMPLOYEES);
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(seedOpps);

  const value = useMemo<Ctx>(() => ({
    employees,
    bookings,
    opportunities,
    addBooking: (b) => setBookings((p) => [...p, { ...b, id: uid() }]),
    updateBooking: (b) => setBookings((p) => p.map((x) => (x.id === b.id ? b : x))),
    deleteBooking: (id) => setBookings((p) => p.filter((x) => x.id !== id)),
    addOpportunity: (o) => setOpportunities((p) => [...p, { ...o, id: uid() }]),
    updateOpportunity: (o) => setOpportunities((p) => p.map((x) => (x.id === o.id ? o : x))),
    deleteOpportunity: (id) => setOpportunities((p) => p.filter((x) => x.id !== id)),
    convertOpportunity: (id) => {
      setOpportunities((prev) => {
        const o = prev.find((x) => x.id === id);
        if (!o) return prev;
        setBookings((b) => [
          ...b,
          {
            id: uid(),
            employeeId: o.employeeId,
            customer: o.customer,
            project: o.project,
            workload: o.workload,
            start: o.start,
            end: o.end,
          },
        ]);
        return prev.filter((x) => x.id !== id);
      });
    },
  }), [employees, bookings, opportunities]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
