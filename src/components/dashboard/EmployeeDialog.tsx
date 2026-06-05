import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/lib/dashboard-store";

export interface EmployeeFormValue {
  name: string;
  role: string;
  teamId: string;
  availableFrom?: string;
  availableUntil?: string;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: EmployeeFormValue;
  onSubmit: (v: EmployeeFormValue) => void;
}

export function EmployeeDialog({ open, onOpenChange, title, initial, onSubmit }: Props) {
  const { profile } = useAuth();
  const { teams } = useDashboard();

  const defaultTeamId = profile?.role === "team_lead" ? (profile.teamId ?? "") : "";

  const [v, setV] = useState<EmployeeFormValue>(
    initial ?? { name: "", role: "", teamId: defaultTeamId, availableFrom: "", availableUntil: "", active: true }
  );

  useEffect(() => {
    if (open) {
      setV(initial ?? { name: "", role: "", teamId: defaultTeamId, availableFrom: "", availableUntil: "", active: true });
    }
  }, [open, initial, defaultTeamId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder="e.g. Alice Johansson"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Input
              value={v.role}
              onChange={(e) => setV({ ...v, role: e.target.value })}
              placeholder="e.g. Senior Consultant"
            />
          </div>
          {profile?.role === "department_head" && (
            <div className="grid gap-1.5">
              <Label>Team</Label>
              <Select value={v.teamId} onValueChange={(val) => setV({ ...v, teamId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Available from <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="date"
                value={v.availableFrom ?? ""}
                onChange={(e) => setV({ ...v, availableFrom: e.target.value || undefined })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Available until <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="date"
                value={v.availableUntil ?? ""}
                onChange={(e) => setV({ ...v, availableUntil: e.target.value || undefined })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            onSubmit({
              ...v,
              availableFrom: v.availableFrom || undefined,
              availableUntil: v.availableUntil || undefined,
            });
            onOpenChange(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
