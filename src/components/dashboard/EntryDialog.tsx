import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Employee } from "@/lib/dashboard-store";

export interface EntryFormValue {
  employeeId: string;
  customer: string;
  project: string;
  workload: number;
  start: string;
  end: string;
  probability?: number;
  type?: 'billable' | 'internal' | 'vacation';
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  employees: Employee[];
  initial?: EntryFormValue;
  withProbability?: boolean;
  onSubmit: (v: EntryFormValue) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function EntryDialog({ open, onOpenChange, title, employees, initial, withProbability, onSubmit }: Props) {
  const [v, setV] = useState<EntryFormValue>(
    initial ?? { employeeId: employees[0]?.id ?? "", customer: "", project: "", workload: 50, start: today, end: today, probability: 50, type: 'billable' }
  );

  useEffect(() => {
    if (open) {
      setV(initial ?? { employeeId: employees[0]?.id ?? "", customer: "", project: "", workload: 50, start: today, end: today, probability: 50, type: 'billable' });
    }
  }, [open, initial, employees]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Employee</Label>
            <Select value={v.employeeId} onValueChange={(val) => setV({ ...v, employeeId: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Customer</Label>
              <Input value={v.customer} onChange={(e) => setV({ ...v, customer: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Input value={v.project} onChange={(e) => setV({ ...v, project: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start</Label>
              <Input type="date" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>End</Label>
              <Input type="date" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Workload %</Label>
              <Input type="number" min={0} max={100} value={v.workload} onChange={(e) => setV({ ...v, workload: Number(e.target.value) })} />
            </div>
            {withProbability && (
              <div className="grid gap-1.5">
                <Label>Win probability %</Label>
                <Input type="number" min={0} max={100} value={v.probability ?? 0} onChange={(e) => setV({ ...v, probability: Number(e.target.value) })} />
              </div>
            )}
          </div>
          {!withProbability && (
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={v.type ?? 'billable'} onValueChange={(val) => setV({ ...v, type: val as 'billable' | 'internal' | 'vacation' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="billable">Billable</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSubmit(v); onOpenChange(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
