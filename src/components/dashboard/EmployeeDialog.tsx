import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/lib/dashboard-store";

export interface EmployeeFormValue {
  name: string;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: EmployeeFormValue;
  onSubmit: (v: EmployeeFormValue) => void;
}

export function EmployeeDialog({ open, onOpenChange, title, initial, onSubmit }: Props) {
  const [v, setV] = useState<EmployeeFormValue>(initial ?? { name: "", role: "" });

  useEffect(() => {
    if (open) {
      setV(initial ?? { name: "", role: "" });
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Alice Johansson" />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Input value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} placeholder="e.g. Senior Consultant" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSubmit(v); onOpenChange(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
