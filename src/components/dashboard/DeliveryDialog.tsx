import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee, Delivery } from '@/lib/dashboard-store';

export interface DeliveryMemberValue {
  employeeId: string;
  workload: number;
  start: string;
  end: string;
}

export interface DeliveryFormValue {
  customer: string;
  project: string;
  type: 'billable' | 'internal' | 'vacation';
  members: DeliveryMemberValue[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  employees: Employee[];
  initial?: DeliveryFormValue;
  onSubmit: (v: DeliveryFormValue) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function DeliveryDialog({ open, onOpenChange, title, employees, initial, onSubmit }: Props) {
  const empty: DeliveryFormValue = { customer: '', project: '', type: 'billable', members: [] };
  const [v, setV] = useState<DeliveryFormValue>(initial ?? empty);
  const [newEmpId, setNewEmpId] = useState('');
  const [newWorkload, setNewWorkload] = useState(100);
  const [newStart, setNewStart] = useState(today);
  const [newEnd, setNewEnd] = useState(today);

  useEffect(() => {
    if (open) { setV(initial ?? empty); setNewEmpId(''); setNewWorkload(100); setNewStart(today); setNewEnd(today); }
  }, [open]);

  const addMember = () => {
    if (!newEmpId) return;
    if (v.members.some(m => m.employeeId === newEmpId)) return;
    setV({ ...v, members: [...v.members, { employeeId: newEmpId, workload: newWorkload, start: newStart, end: newEnd }] });
    setNewEmpId('');
    setNewWorkload(100);
  };

  const removeMember = (empId: string) => setV({ ...v, members: v.members.filter(m => m.employeeId !== empId) });

  const updateMember = (empId: string, field: keyof DeliveryMemberValue, value: string | number) =>
    setV({ ...v, members: v.members.map(m => m.employeeId === empId ? { ...m, [field]: value } : m) });

  const availableEmployees = employees.filter(e => !v.members.some(m => m.employeeId === e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Customer</Label>
              <Input value={v.customer} onChange={e => setV({ ...v, customer: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Input value={v.project} onChange={e => setV({ ...v, project: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={v.type} onValueChange={(val) => setV({ ...v, type: val as 'billable' | 'internal' | 'vacation' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members */}
          <div className="grid gap-2">
            <Label>Team members</Label>
            {v.members.length === 0 && (
              <p className="text-xs text-muted-foreground">No members yet.</p>
            )}
            {/* Header row */}
            {v.members.length > 0 && (
              <div className="grid grid-cols-[1fr_60px_130px_130px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>Employee</span><span className="text-center">%</span><span>Start</span><span>End</span><span/>
              </div>
            )}
            {v.members.map(m => {
              const emp = employees.find(e => e.id === m.employeeId);
              return (
                <div key={m.employeeId} className="grid grid-cols-[1fr_60px_130px_130px_32px] gap-2 items-center rounded border px-3 py-2 bg-muted/20">
                  <span className="text-sm font-medium">{emp?.name ?? '—'}</span>
                  <Input type="number" min={1} max={200} value={m.workload}
                    onChange={e => updateMember(m.employeeId, 'workload', Number(e.target.value))}
                    className="h-7 text-xs text-center px-1" />
                  <Input type="date" value={m.start}
                    onChange={e => updateMember(m.employeeId, 'start', e.target.value)}
                    className="h-7 text-xs" />
                  <Input type="date" value={m.end}
                    onChange={e => updateMember(m.employeeId, 'end', e.target.value)}
                    className="h-7 text-xs" />
                  <button type="button" onClick={() => removeMember(m.employeeId)}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}

            {/* Add member row */}
            {availableEmployees.length > 0 && (
              <div className="grid grid-cols-[1fr_60px_130px_130px_32px] gap-2 items-center">
                <Select value={newEmpId} onValueChange={setNewEmpId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Add member…" /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} max={200} value={newWorkload}
                  onChange={e => setNewWorkload(Number(e.target.value))}
                  className="h-8 text-xs text-center px-1" />
                <Input type="date" value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="h-8 text-xs" />
                <Input type="date" value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="h-8 text-xs" />
                <Button size="sm" variant="outline" onClick={addMember} disabled={!newEmpId} className="h-8 w-8 p-0">
                  <Plus className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSubmit(v); onOpenChange(false); }} disabled={v.members.length === 0}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
