import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRightCircle, PowerOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboard, type Booking, type Opportunity } from "@/lib/dashboard-store";
import { EntryDialog, type EntryFormValue } from "./EntryDialog";
import { EmployeeDialog, type EmployeeFormValue } from "./EmployeeDialog";
import { fmtDate } from "@/lib/week-utils";
import { toast } from "sonner";

export function DataTab() {
  const {
    employees, bookings, opportunities,
    addEmployee, updateEmployee, deleteEmployee,
    addBooking, updateBooking, deleteBooking,
    addOpportunity, updateOpportunity, deleteOpportunity,
    convertOpportunity,
    canEdit,
  } = useDashboard();

  const [empOpen, setEmpOpen] = useState(false);
  const [empEdit, setEmpEdit] = useState<{ id: string; name: string; role: string; teamId: string; availableFrom?: string; availableUntil?: string; active: boolean } | null>(null);
  const [bOpen, setBOpen] = useState(false);
  const [bEdit, setBEdit] = useState<Booking | null>(null);
  const [oOpen, setOOpen] = useState(false);
  const [oEdit, setOEdit] = useState<Opportunity | null>(null);

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Team</h2>
            <p className="text-sm text-muted-foreground">Manage your consulting team members.</p>
          </div>
          <Button onClick={() => { setEmpEdit(null); setEmpOpen(true); }}>
            <Plus className="size-4 mr-1" /> New employee
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Availability window</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id} className={e.active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">
                    {e.name}
                    {!e.active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                  </TableCell>
                  <TableCell>{e.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.availableFrom || e.availableUntil
                      ? `${e.availableFrom ?? "—"} → ${e.availableUntil ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {canEdit(e.teamId) && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEmpEdit(e); setEmpOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          title={e.active ? "Deactivate (hide from views)" : "Reactivate"}
                          onClick={async () => {
                            const err = await updateEmployee({ ...e, active: !e.active });
                            err ? toast.error(err) : toast.success(e.active ? "Employee deactivated" : "Employee reactivated");
                          }}
                        >
                          {e.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={async () => { const err = await deleteEmployee(e.id); err ? toast.error(err) : toast.success("Employee removed"); }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Bookings</h2>
            <p className="text-sm text-muted-foreground">All confirmed work for the team.</p>
          </div>
          <Button onClick={() => { setBEdit(null); setBOpen(true); }}>
            <Plus className="size-4 mr-1" /> New booking
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Workload</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const emp = employees.find((e) => e.id === b.employeeId);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{nameOf(b.employeeId)}</TableCell>
                    <TableCell>{b.customer}</TableCell>
                    <TableCell>{b.project}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        b.type === 'internal' ? "bg-blue-100 text-blue-800 border-blue-200" :
                        b.type === 'vacation' ? "bg-orange-100 text-orange-800 border-orange-200" :
                        "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }>
                        {b.type ?? 'billable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{b.workload}%</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(b.start)} → {fmtDate(b.end)}</TableCell>
                    <TableCell>
                      {(!emp || canEdit(emp.teamId)) && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setBEdit(b); setBOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={async () => { const err = await deleteBooking(b.id); err ? toast.error(err) : toast.success("Booking deleted"); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Opportunities</h2>
            <p className="text-sm text-muted-foreground">Pipeline work. Convert to a booking once it lands.</p>
          </div>
          <Button onClick={() => { setOEdit(null); setOOpen(true); }}>
            <Plus className="size-4 mr-1" /> New opportunity
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Workload</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((o) => {
                const emp = employees.find((e) => e.id === o.employeeId);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{nameOf(o.employeeId)}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell>{o.project}</TableCell>
                    <TableCell className="text-right">{o.workload}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{o.probability}%</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(o.start)} → {fmtDate(o.end)}</TableCell>
                    <TableCell>
                      {(!emp || canEdit(emp.teamId)) && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Convert to booking"
                            onClick={async () => { const err = await convertOpportunity(o.id); err ? toast.error(err) : toast.success("Converted to booking"); }}>
                            <ArrowRightCircle className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setOEdit(o); setOOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={async () => { const err = await deleteOpportunity(o.id); err ? toast.error(err) : toast.success("Opportunity deleted"); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <EntryDialog
        open={bOpen}
        onOpenChange={setBOpen}
        title={bEdit ? "Edit booking" : "New booking"}
        employees={employees}
        initial={bEdit ? { employeeId: bEdit.employeeId, customer: bEdit.customer, project: bEdit.project, workload: bEdit.workload, start: bEdit.start, end: bEdit.end, type: bEdit.type } : undefined}
        onSubmit={async (v: EntryFormValue) => {
          const err = bEdit
            ? await updateBooking({ ...bEdit, ...v, type: v.type ?? 'billable' })
            : await addBooking({ employeeId: v.employeeId, customer: v.customer, project: v.project, workload: v.workload, start: v.start, end: v.end, type: v.type ?? 'billable' });
          err ? toast.error(err) : toast.success(bEdit ? "Booking updated" : "Booking added");
        }}
      />
      <EntryDialog
        open={oOpen}
        onOpenChange={setOOpen}
        title={oEdit ? "Edit opportunity" : "New opportunity"}
        employees={employees}
        withProbability
        initial={oEdit ? { employeeId: oEdit.employeeId, customer: oEdit.customer, project: oEdit.project, workload: oEdit.workload, start: oEdit.start, end: oEdit.end, probability: oEdit.probability } : undefined}
        onSubmit={async (v: EntryFormValue) => {
          const err = oEdit
            ? await updateOpportunity({ ...oEdit, ...v, probability: v.probability ?? 0 })
            : await addOpportunity({ employeeId: v.employeeId, customer: v.customer, project: v.project, workload: v.workload, start: v.start, end: v.end, probability: v.probability ?? 0 });
          err ? toast.error(err) : toast.success(oEdit ? "Opportunity updated" : "Opportunity added");
        }}
      />
      <EmployeeDialog
        open={empOpen}
        onOpenChange={setEmpOpen}
        title={empEdit ? "Edit employee" : "New employee"}
        initial={empEdit ? { name: empEdit.name, role: empEdit.role, teamId: empEdit.teamId, availableFrom: empEdit.availableFrom, availableUntil: empEdit.availableUntil, active: empEdit.active } : undefined}
        onSubmit={async (v: EmployeeFormValue) => {
          if (!v.teamId) { toast.error("Please select a team"); return; }
          const err = empEdit
            ? await updateEmployee({ id: empEdit.id, ...v })
            : await addEmployee(v);
          err ? toast.error(err) : toast.success(empEdit ? "Employee updated" : "Employee added");
        }}
      />
    </div>
  );
}
