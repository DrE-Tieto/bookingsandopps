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

export interface Delivery {
  id: string;
  customer: string;
  project: string;
  type: 'billable' | 'internal' | 'vacation';
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
  deliveryId?: string;
}

export interface OpportunityMember {
  id: string;
  opportunityId: string;
  employeeId: string;
  workload: number;
  isCritical: boolean;
}

export interface Opportunity {
  id: string;
  customer: string;
  project: string;
  probability: number;
  start: string;
  end: string;
  members: OpportunityMember[];
}

interface Ctx {
  employees: Employee[];
  bookings: Booking[];
  opportunities: Opportunity[];
  deliveries: Delivery[];
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
  addOpportunity: (o: Omit<Opportunity, 'id' | 'members'>) => Promise<string | null>;
  updateOpportunity: (o: Omit<Opportunity, 'members'>) => Promise<string | null>;
  deleteOpportunity: (id: string) => Promise<string | null>;
  convertOpportunity: (id: string) => Promise<string | null>;
  addOpportunityMember: (m: Omit<OpportunityMember, 'id'>) => Promise<string | null>;
  updateOpportunityMember: (m: OpportunityMember) => Promise<string | null>;
  deleteOpportunityMember: (id: string) => Promise<string | null>;
  addDelivery: (d: Omit<Delivery, 'id'>, members: Array<{employeeId: string; workload: number; start: string; end: string}>) => Promise<string | null>;
  updateDelivery: (d: Delivery, members: Array<{employeeId: string; workload: number; start: string; end: string}>) => Promise<string | null>;
  deleteDelivery: (id: string) => Promise<string | null>;
  convertOpportunityToDelivery: (opportunityId: string, d: Omit<Delivery, 'id'>, members: Array<{employeeId: string; workload: number; start: string; end: string}>) => Promise<string | null>;
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
        workload_pct: number; start_date: string; end_date: string; delivery_id?: string | null;
      }) => ({
        id: b.id,
        employeeId: b.employee_id,
        customer: b.customer,
        project: b.project,
        workload: b.workload_pct,
        start: b.start_date,
        end: b.end_date,
        type: (b.type ?? 'billable') as 'billable' | 'internal' | 'vacation',
        deliveryId: b.delivery_id ?? undefined,
      }));
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', selectedTeamId],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities')
        .select('*, opportunity_members(id, employee_id, workload_pct, is_critical)')
        .order('start_date');

      const opps = (data ?? []).map((o: any) => ({
        id: o.id,
        customer: o.customer,
        project: o.project,
        probability: o.probability,
        start: o.start_date,
        end: o.end_date,
        members: (o.opportunity_members ?? []).map((m: any) => ({
          id: m.id,
          opportunityId: o.id,
          employeeId: m.employee_id,
          workload: m.workload_pct,
          isCritical: m.is_critical,
        })),
      }));

      // Filter by team if selectedTeamId is set
      if (selectedTeamId) {
        const empIds = employees.map(e => e.id);
        return opps.filter((o: Opportunity) => o.members.some(m => empIds.includes(m.employeeId)));
      }
      return opps;
    },
    enabled: !selectedTeamId || employees.length > 0,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
      return (data ?? []).map((d: any) => ({ id: d.id, customer: d.customer, project: d.project, type: d.type as 'billable' | 'internal' | 'vacation' }));
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

  const addOpportunity = async (o: Omit<Opportunity, 'id' | 'members'>): Promise<string | null> => {
    const { data, error } = await supabase.from('opportunities').insert({
      customer: o.customer, project: o.project, probability: o.probability,
      start_date: o.start, end_date: o.end,
    }).select('id').single();
    if (error) return null;
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return data.id;
  };

  const updateOpportunity = async (o: Omit<Opportunity, 'members'>): Promise<string | null> => {
    const { error } = await supabase.from('opportunities').update({
      customer: o.customer, project: o.project, probability: o.probability,
      start_date: o.start, end_date: o.end,
    }).eq('id', o.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
  };

  const deleteOpportunity = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
  };

  const addOpportunityMember = async (m: Omit<OpportunityMember, 'id'>): Promise<string | null> => {
    const { error } = await supabase.from('opportunity_members').insert({
      opportunity_id: m.opportunityId, employee_id: m.employeeId,
      workload_pct: m.workload, is_critical: m.isCritical,
    });
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
  };

  const updateOpportunityMember = async (m: OpportunityMember): Promise<string | null> => {
    const { error } = await supabase.from('opportunity_members').update({
      workload_pct: m.workload, is_critical: m.isCritical,
    }).eq('id', m.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
  };

  const deleteOpportunityMember = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('opportunity_members').delete().eq('id', id);
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
  };

  const convertOpportunity = async (id: string): Promise<string | null> => {
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return 'Opportunity not found';
    for (const m of opp.members) {
      const { error } = await supabase.from('bookings').insert({
        employee_id: m.employeeId, customer: opp.customer, project: opp.project,
        workload_pct: m.workload, start_date: opp.start, end_date: opp.end, type: 'billable',
      });
      if (error) return error.message;
    }
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    }
    return error?.message ?? null;
  };

  const addDelivery = async (d: Omit<Delivery, 'id'>, members: Array<{employeeId: string; workload: number; start: string; end: string}>): Promise<string | null> => {
    const { data, error } = await supabase.from('deliveries').insert({ customer: d.customer, project: d.project, type: d.type }).select('id').single();
    if (error || !data) return error?.message ?? 'Failed to create delivery';
    const deliveryId = data.id;
    for (const m of members) {
      const { error: bErr } = await supabase.from('bookings').insert({
        employee_id: m.employeeId, customer: d.customer, project: d.project,
        workload_pct: m.workload, start_date: m.start, end_date: m.end,
        type: d.type, delivery_id: deliveryId,
      });
      if (bErr) return bErr.message;
    }
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    return null;
  };

  const updateDelivery = async (d: Delivery, members: Array<{employeeId: string; workload: number; start: string; end: string}>): Promise<string | null> => {
    const { error } = await supabase.from('deliveries').update({ customer: d.customer, project: d.project, type: d.type }).eq('id', d.id);
    if (error) return error.message;
    // Delete all existing member bookings and re-create
    const { error: delErr } = await supabase.from('bookings').delete().eq('delivery_id', d.id);
    if (delErr) return delErr.message;
    for (const m of members) {
      const { error: bErr } = await supabase.from('bookings').insert({
        employee_id: m.employeeId, customer: d.customer, project: d.project,
        workload_pct: m.workload, start_date: m.start, end_date: m.end,
        type: d.type, delivery_id: d.id,
      });
      if (bErr) return bErr.message;
    }
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    return null;
  };

  const deleteDelivery = async (id: string): Promise<string | null> => {
    // Cascade in DB deletes member bookings automatically
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
    return error?.message ?? null;
  };

  const convertOpportunityToDelivery = async (
    opportunityId: string,
    d: Omit<Delivery, 'id'>,
    members: Array<{employeeId: string; workload: number; start: string; end: string}>
  ): Promise<string | null> => {
    const err = await addDelivery(d, members);
    if (err) return err;
    const { error } = await supabase.from('opportunities').delete().eq('id', opportunityId);
    if (!error) queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    return error?.message ?? null;
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
        deliveries,
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
        addOpportunityMember,
        updateOpportunityMember,
        deleteOpportunityMember,
        addDelivery,
        updateDelivery,
        deleteDelivery,
        convertOpportunityToDelivery,
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
