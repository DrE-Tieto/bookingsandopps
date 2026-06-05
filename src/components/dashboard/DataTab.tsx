import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRightCircle } from "lucide-react";
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
  const [empEdit, setEmpEdit] = useState<{ id: string; name: string; role: string; teamId: string } | null>(null);
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
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.role}</TableCell>
                  <TableCell>
                    {canEdit(e.teamId) && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEmpEdit(e); setEmpOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { deleteEmployee(e.id); toast.success("Employee removed"); }}>
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
                    <TableCell className="text-right">{b.workload}%</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(b.start)} → {fmtDate(b.end)}</TableCell>
                    <TableCell>
                      {(!emp || canEdit(emp.teamId)) && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setBEdit(b); setBOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { deleteBooking(b.id); toast.success("Booking deleted"); }}>
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
                            onClick={() => { convertOpportunity(o.id); toast.success("Converted to booking"); }}>
                            <ArrowRightCircle className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setOEdit(o); setOOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { deleteOpportunity(o.id); toast.success("Opportunity deleted"); }}>
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
        initial={bEdit ? { employeeId: bEdit.employeeId, customer: bEdit.customer, project: bEdit.project, workload: bEdit.workload, start: bEdit.start, end: bEdit.end } : undefined}
        onSubmit={(v: EntryFormValue) => {
          if (bEdit) {
            updateBooking({ ...bEdit, ...v });
            toast.success("Booking updated");
          } else {
            addBooking({ employeeId: v.employeeId, customer: v.customer, project: v.project, workload: v.workload, start: v.start, end: v.end });
            toast.success("Booking added");
          }
        }}
      />
      <EntryDialog
        open={oOpen}
        onOpenChange={setOOpen}
        title={oEdit ? "Edit opportunity" : "New opportunity"}
        employees={employees}
        withProbability
        initial={oEdit ? { employeeId: oEdit.employeeId, customer: oEdit.customer, project: oEdit.project, workload: oEdit.workload, start: oEdit.start, end: oEdit.end, probability: oEdit.probability } : undefined}
        onSubmit={(v: EntryFormValue) => {
          if (oEdit) {
            updateOpportunity({ ...oEdit, ...v, probability: v.probability ?? 0 });
            toast.success("Opportunity updated");
          } else {
            addOpportunity({ employeeId: v.employeeId, customer: v.customer, project: v.project, workload: v.workload, start: v.start, end: v.end, probability: v.probability ?? 0 });
            toast.success("Opportunity added");
          }
        }}
      />
      <EmployeeDialog
        open={empOpen}
        onOpenChange={setEmpOpen}
        title={empEdit ? "Edit employee" : "New employee"}
        initial={empEdit ? { name: empEdit.name, role: empEdit.role, teamId: empEdit.teamId } : undefined}
        onSubmit={(v: EmployeeFormValue) => {
          if (empEdit) {
            updateEmployee({ id: empEdit.id, ...v });
            toast.success("Employee updated");
          } else {
            addEmployee(v);
            toast.success("Employee added");
          }
        }}
      />
    </div>
  );
}
