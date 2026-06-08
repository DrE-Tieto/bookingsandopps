import { useEffect, useState } from 'react';
import { Star, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/dashboard-store';

export interface OpportunityFormValue {
  customer: string;
  project: string;
  probability: number;
  start: string;
  end: string;
  members: Array<{ employeeId: string; workload: number; isCritical: boolean }>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  employees: Employee[];
  initial?: OpportunityFormValue;
  onSubmit: (v: OpportunityFormValue) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function OpportunityDialog({ open, onOpenChange, title, employees, initial, onSubmit }: Props) {
  const empty: OpportunityFormValue = { customer: '', project: '', probability: 50, start: today, end: today, members: [] };
  const [v, setV] = useState<OpportunityFormValue>(initial ?? empty);
  const [newEmpId, setNewEmpId] = useState('');
  const [newWorkload, setNewWorkload] = useState(50);
  const [newCritical, setNewCritical] = useState(false);

  useEffect(() => {
    if (open) { setV(initial ?? empty); setNewEmpId(''); setNewWorkload(50); setNewCritical(false); }
  }, [open]);

  const addMember = () => {
    if (!newEmpId) return;
    if (v.members.some(m => m.employeeId === newEmpId)) return;
    setV({ ...v, members: [...v.members, { employeeId: newEmpId, workload: newWorkload, isCritical: newCritical }] });
    setNewEmpId('');
    setNewWorkload(50);
    setNewCritical(false);
  };

  const removeMember = (empId: string) => setV({ ...v, members: v.members.filter(m => m.employeeId !== empId) });
  const toggleCritical = (empId: string) => setV({ ...v, members: v.members.map(m => m.employeeId === empId ? { ...m, isCritical: !m.isCritical } : m) });
  const updateWorkload = (empId: string, workload: number) => setV({ ...v, members: v.members.map(m => m.employeeId === empId ? { ...m, workload } : m) });

  const availableEmployees = employees.filter(e => !v.members.some(m => m.employeeId === e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Start</Label>
              <Input type="date" value={v.start} onChange={e => setV({ ...v, start: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>End</Label>
              <Input type="date" value={v.end} onChange={e => setV({ ...v, end: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Win probability %</Label>
              <Input type="number" min={0} max={100} value={v.probability} onChange={e => setV({ ...v, probability: Number(e.target.value) })} />
            </div>
          </div>

          {/* Members */}
          <div className="grid gap-2">
            <Label>Team members</Label>
            {v.members.length === 0 && (
              <p className="text-xs text-muted-foreground">No members yet. Add at least one below.</p>
            )}
            {v.members.map(m => {
              const emp = employees.find(e => e.id === m.employeeId);
              return (
                <div key={m.employeeId} className="flex items-center gap-2 rounded border px-3 py-2 bg-muted/20">
                  <div className="flex-1 text-sm font-medium">{emp?.name ?? '—'}</div>
                  <Input
                    type="number" min={1} max={100} value={m.workload}
                    onChange={e => updateWorkload(m.employeeId, Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <button
                    type="button"
                    title={m.isCritical ? 'Critical — click to remove' : 'Mark as critical'}
                    onClick={() => toggleCritical(m.employeeId)}
                    className={cn('rounded p-1 transition-colors', m.isCritical ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground')}
                  >
                    <Star className={cn('size-4', m.isCritical && 'fill-amber-400')} />
                  </button>
                  <button type="button" onClick={() => removeMember(m.employeeId)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}

            {/* Add member row */}
            {availableEmployees.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={newEmpId} onValueChange={setNewEmpId}>
                  <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Add member…" /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number" min={1} max={100} value={newWorkload}
                  onChange={e => setNewWorkload(Number(e.target.value))}
                  className="w-16 h-8 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">%</span>
                <button
                  type="button"
                  title={newCritical ? 'Critical' : 'Mark as critical'}
                  onClick={() => setNewCritical(!newCritical)}
                  className={cn('rounded p-1 transition-colors', newCritical ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground')}
                >
                  <Star className={cn('size-4', newCritical && 'fill-amber-400')} />
                </button>
                <Button size="sm" variant="outline" onClick={addMember} disabled={!newEmpId}>
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
