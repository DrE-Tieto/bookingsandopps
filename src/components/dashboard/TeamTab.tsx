import { useState } from "react";
import { Plus, Pencil, Trash2, PowerOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboard } from "@/lib/dashboard-store";
import { EmployeeDialog, type EmployeeFormValue } from "./EmployeeDialog";
import { toast } from "sonner";

export function TeamTab() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, canEdit } = useDashboard();

  const [empOpen, setEmpOpen] = useState(false);
  const [empEdit, setEmpEdit] = useState<{
    id: string; name: string; role: string; teamId: string;
    availableFrom?: string; availableUntil?: string; active: boolean; hourlyCost?: number; skills: string[];
  } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
                      <Button size="icon" variant="ghost" onClick={async () => {
                        const err = await deleteEmployee(e.id);
                        err ? toast.error(err) : toast.success("Employee removed");
                      }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  No employees yet. Add your first team member above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeDialog
        open={empOpen}
        onOpenChange={setEmpOpen}
        title={empEdit ? "Edit employee" : "New employee"}
        initial={empEdit ? {
          name: empEdit.name, role: empEdit.role, teamId: empEdit.teamId,
          availableFrom: empEdit.availableFrom, availableUntil: empEdit.availableUntil,
          active: empEdit.active, hourlyCost: empEdit.hourlyCost, skills: empEdit.skills,
        } : undefined}
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
