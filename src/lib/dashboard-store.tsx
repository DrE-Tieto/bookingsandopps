import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";

export interface Employee {
  id: string;
  name: string;
  role: string;
  teamId: string;
  availableFrom?: string;  // ISO date, optional
  availableUntil?: string; // ISO date, optional
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
}

export interface Booking {
  id: string;
  employeeId: string;
  customer: string;
  project: string;
  workload: number;
  start: string;
  end: string;
  type: 'billable' | 'internal' | 'vacation';
}

export interface Opportunity {
  id: string;
  employeeId: string;
  customer: string;
  project: string;
  workload: number;
  probability: number;
  start: string;
  end: string;
}

interface Ctx {
  employees: Employee[];
  bookings: Booking[];
  opportunities: Opportunity[];
  teams: Team[];
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
  isLoading: boolean;
  canEdit: (employeeTeamId: string) => boolean;
  addEmployee: (e: Omit<Employee, "id">) => Promise<string | null>;
  updateEmployee: (e: Employee) => Promise<string | null>;
  deleteEmployee: (id: string) => Promise<string | null>;
  addBooking: (b: Omit<Booking, "id">) => Promise<string | null>;
  updateBooking: (b: Booking) => Promise<string | null>;
  deleteBooking: (id: string) => Promise<string | null>;
  addOpportunity: (o: Omit<Opportunity, "id">) => Promise<string | null>;
  updateOpportunity: (o: Opportunity) => Promise<string | null>;
  deleteOpportunity: (id: string) => Promise<string | null>;
  convertOpportunity: (id: string) => Promise<string | null>;
}

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === "team_lead" && profile.teamId) {
      setSelectedTeamId(profile.teamId);
    }
  }, [profile]);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").order("name");
      return (data ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", selectedTeamId],
    queryFn: async () => {
      let q = supabase.from("employees").select("*");
      if (selectedTeamId) q = q.eq("team_id", selectedTeamId);
      const { data } = await q.order("full_name");
      return (data ?? []).map((e: { id: string; full_name: string; role: string; team_id: string; available_from: string | null; available_until: string | null; active: boolean }) => ({
        id: e.id,
        name: e.full_name,
        role: e.role,
        teamId: e.team_id,
        availableFrom: e.available_from ?? undefined,
        availableUntil: e.available_until ?? undefined,
        active: e.active,
      }));
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", selectedTeamId],
    queryFn: async () => {
      let query = supabase.from("bookings").select("*");
      if (selectedTeamId) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id")
          .eq("team_id", selectedTeamId);
        const ids = (emps ?? []).map((e: { id: string }) => e.id);
        if (ids.length === 0) return [];
        query = query.in("employee_id", ids);
      }
      const { data } = await query;
      return (data ?? []).map((b: {
        id: string; employee_id: string; customer: string; project: string;
        workload_pct: number; start_date: string; end_date: string;
      }) => ({
        id: b.id,
        employeeId: b.employee_id,
        customer: b.customer,
        project: b.project,
        workload: b.workload_pct,
        start: b.start_date,
        end: b.end_date,
        type: (b.type ?? 'billable') as 'billable' | 'internal' | 'vacation',
      }));
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities", selectedTeamId],
    queryFn: async () => {
      let query = supabase.from("opportunities").select("*");
      if (selectedTeamId) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id")
          .eq("team_id", selectedTeamId);
        const ids = (emps ?? []).map((e: { id: string }) => e.id);
        if (ids.length === 0) return [];
        query = query.in("employee_id", ids);
      }
      const { data } = await query;
      return (data ?? []).map((o: {
        id: string; employee_id: string; customer: string; project: string;
        workload_pct: number; probability: number; start_date: string; end_date: string;
      }) => ({
        id: o.id,
        employeeId: o.employee_id,
        customer: o.customer,
        project: o.project,
        workload: o.workload_pct,
        probability: o.probability,
        start: o.start_date,
        end: o.end_date,
      }));
    },
  });

  const addEmployee = async (e: Omit<Employee, "id">): Promise<string | null> => {
    const { error } = await supabase.from("employees").insert({
      full_name: e.name, role: e.role, team_id: e.teamId,
      available_from: e.availableFrom ?? null, available_until: e.availableUntil ?? null, active: e.active ?? true,
    });
    if (!error) queryClient.invalidateQueries({ queryKey: ["employees"] });
    return error?.message ?? null;
  };

  const updateEmployee = async (e: Employee): Promise<string | null> => {
    const { error } = await supabase.from("employees").update({
      full_name: e.name, role: e.role,
      available_from: e.availableFrom ?? null, available_until: e.availableUntil ?? null, active: e.active,
    }).eq("id", e.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["employees"] });
    return error?.message ?? null;
  };

  const deleteEmployee = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
    return error?.message ?? null;
  };

  const addBooking = async (b: Omit<Booking, "id">): Promise<string | null> => {
    const { error } = await supabase.from("bookings").insert({
      employee_id: b.employeeId, customer: b.customer, project: b.project,
      workload_pct: b.workload, start_date: b.start, end_date: b.end, type: b.type ?? 'billable',
    });
    if (!error) queryClient.invalidateQueries({ queryKey: ["bookings"] });
    return error?.message ?? null;
  };

  const updateBooking = async (b: Booking): Promise<string | null> => {
    const { error } = await supabase.from("bookings").update({
      employee_id: b.employeeId, customer: b.customer, project: b.project,
      workload_pct: b.workload, start_date: b.start, end_date: b.end, type: b.type,
    }).eq("id", b.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["bookings"] });
    return error?.message ?? null;
  };

  const deleteBooking = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["bookings"] });
    return error?.message ?? null;
  };

  const addOpportunity = async (o: Omit<Opportunity, "id">): Promise<string | null> => {
    const { error } = await supabase.from("opportunities").insert({
      employee_id: o.employeeId, customer: o.customer, project: o.project,
      workload_pct: o.workload, probability: o.probability, start_date: o.start, end_date: o.end,
    });
    if (!error) queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    return error?.message ?? null;
  };

  const updateOpportunity = async (o: Opportunity): Promise<string | null> => {
    const { error } = await supabase.from("opportunities").update({
      employee_id: o.employeeId, customer: o.customer, project: o.project,
      workload_pct: o.workload, probability: o.probability, start_date: o.start, end_date: o.end,
    }).eq("id", o.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    return error?.message ?? null;
  };

  const deleteOpportunity = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    return error?.message ?? null;
  };

  const convertOpportunity = async (id: string): Promise<string | null> => {
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) return "Opportunity not found";
    const { error } = await supabase.from("bookings").insert({
      employee_id: opp.employeeId, customer: opp.customer, project: opp.project,
      workload_pct: opp.workload, start_date: opp.start, end_date: opp.end, type: 'billable',
    });
    if (error) return error.message;
    const { error: delErr } = await supabase.from("opportunities").delete().eq("id", id);
    if (!delErr) {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
    return delErr?.message ?? null;
  };

  const canEdit = (employeeTeamId: string): boolean => {
    if (!profile) return false;
    if (profile.role === "observer") return false;
    if (profile.role === "department_head") return true;
    return profile.teamId === employeeTeamId;
  };

  return (
    <DashboardContext.Provider
      value={{
        employees,
        bookings,
        opportunities,
        teams,
        selectedTeamId,
        setSelectedTeamId,
        isLoading,
        canEdit,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addBooking,
        updateBooking,
        deleteBooking,
        addOpportunity,
        updateOpportunity,
        deleteOpportunity,
        convertOpportunity,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
