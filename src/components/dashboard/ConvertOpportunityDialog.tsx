import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee, Opportunity } from '@/lib/dashboard-store';
import type { DeliveryFormValue } from './DeliveryDialog';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunity: Opportunity | null;
  employees: Employee[];
  onSubmit: (v: DeliveryFormValue) => void;
}

export function ConvertOpportunityDialog({ open, onOpenChange, opportunity, employees, onSubmit }: Props) {
  const [v, setV] = useState<DeliveryFormValue>({ customer: '', project: '', type: 'billable', members: [] });

  useEffect(() => {
    if (open && opportunity) {
      setV({
        customer: opportunity.customer,
        project: opportunity.project,
        type: 'billable',
        members: opportunity.members.map(m => ({
          employeeId: m.employeeId,
          workload: m.workload,
          start: opportunity.start,
          end: opportunity.end,
        })),
      });
    }
  }, [open, opportunity]);

  const updateMember = (empId: string, field: keyof typeof v.members[0], value: string | number) =>
    setV({ ...v, members: v.members.map(m => m.employeeId === empId ? { ...m, [field]: value } : m) });

  const removeMember = (empId: string) => setV({ ...v, members: v.members.filter(m => m.employeeId !== empId) });

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert to delivery</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Review and adjust member dates before creating the delivery. The opportunity will be deleted.
        </p>
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

          <div className="grid gap-2">
            <Label>Team members — adjust individual dates as needed</Label>
            <div className="grid grid-cols-[1fr_60px_130px_130px_32px] gap-2 text-xs text-muted-foreground px-1">
              <span>Employee</span><span className="text-center">%</span><span>Start</span><span>End</span><span/>
            </div>
            {v.members.map(m => {
              const emp = employees.find(e => e.id === m.employeeId);
              const oppMember = opportunity.members.find(om => om.employeeId === m.employeeId);
              return (
                <div key={m.employeeId} className="grid grid-cols-[1fr_60px_130px_130px_32px] gap-2 items-center rounded border px-3 py-2 bg-muted/20">
                  <div>
                    <div className="text-sm font-medium">{emp?.name ?? '—'}</div>
                    {oppMember?.isCritical && <div className="text-xs text-amber-600">★ Critical</div>}
                  </div>
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSubmit(v); onOpenChange(false); }} disabled={v.members.length === 0}>
            Create delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
