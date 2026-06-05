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
  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  addBooking: (b: Omit<Booking, "id">) => void;
  updateBooking: (b: Booking) => void;
  deleteBooking: (id: string) => void;
  addOpportunity: (o: Omit<Opportunity, "id">) => void;
  updateOpportunity: (o: Opportunity) => void;
  deleteOpportunity: (id: string) => void;
  convertOpportunity: (id: string) => void;
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

  const addEmployee = (e: Omit<Employee, "id">) => {
    supabase
      .from("employees")
      .insert({
        full_name: e.name,
        role: e.role,
        team_id: e.teamId,
        available_from: e.availableFrom ?? null,
        available_until: e.availableUntil ?? null,
        active: e.active ?? true,
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["employees"] }));
  };

  const updateEmployee = (e: Employee) => {
    supabase
      .from("employees")
      .update({
        full_name: e.name,
        role: e.role,
        available_from: e.availableFrom ?? null,
        available_until: e.availableUntil ?? null,
        active: e.active,
      })
      .eq("id", e.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["employees"] }));
  };

  const deleteEmployee = (id: string) => {
    supabase
      .from("employees")
      .delete()
      .eq("id", id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      });
  };

  const addBooking = (b: Omit<Booking, "id">) => {
    supabase
      .from("bookings")
      .insert({
        employee_id: b.employeeId,
        customer: b.customer,
        project: b.project,
        workload_pct: b.workload,
        start_date: b.start,
        end_date: b.end,
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["bookings"] }));
  };

  const updateBooking = (b: Booking) => {
    supabase
      .from("bookings")
      .update({
        employee_id: b.employeeId,
        customer: b.customer,
        project: b.project,
        workload_pct: b.workload,
        start_date: b.start,
        end_date: b.end,
      })
      .eq("id", b.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["bookings"] }));
  };

  const deleteBooking = (id: string) => {
    supabase
      .from("bookings")
      .delete()
      .eq("id", id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["bookings"] }));
  };

  const addOpportunity = (o: Omit<Opportunity, "id">) => {
    supabase
      .from("opportunities")
      .insert({
        employee_id: o.employeeId,
        customer: o.customer,
        project: o.project,
        workload_pct: o.workload,
        probability: o.probability,
        start_date: o.start,
        end_date: o.end,
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["opportunities"] }));
  };

  const updateOpportunity = (o: Opportunity) => {
    supabase
      .from("opportunities")
      .update({
        employee_id: o.employeeId,
        customer: o.customer,
        project: o.project,
        workload_pct: o.workload,
        probability: o.probability,
        start_date: o.start,
        end_date: o.end,
      })
      .eq("id", o.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["opportunities"] }));
  };

  const deleteOpportunity = (id: string) => {
    supabase
      .from("opportunities")
      .delete()
      .eq("id", id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["opportunities"] }));
  };

  const convertOpportunity = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) return;
    supabase
      .from("bookings")
      .insert({
        employee_id: opp.employeeId,
        customer: opp.customer,
        project: opp.project,
        workload_pct: opp.workload,
        start_date: opp.start,
        end_date: opp.end,
      })
      .then(() => supabase.from("opportunities").delete().eq("id", id))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      });
  };

  const canEdit = (employeeTeamId: string): boolean => {
    if (!profile) return false;
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
