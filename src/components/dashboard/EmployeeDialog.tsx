import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";

export interface EmployeeFormValue {
  name: string;
  role: string;
  teamId: string;
  availableFrom?: string;
  availableUntil?: string;
  active: boolean;
  hourlyCost?: number;
  skills: string[];
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
  const skillInputRef = useRef<HTMLInputElement>(null);

  const defaultTeamId = profile?.role === "team_lead" ? (profile.teamId ?? "") : "";

  const empty: EmployeeFormValue = { name: "", role: "", teamId: defaultTeamId, availableFrom: "", availableUntil: "", active: true, hourlyCost: undefined, skills: [] };
  const [v, setV] = useState<EmployeeFormValue>(initial ?? empty);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (open) {
      setV(initial ?? { ...empty, teamId: defaultTeamId });
      setSkillInput("");
    }
  }, [open, initial, defaultTeamId]);

  const addSkill = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || v.skills.includes(tag)) return;
    setV({ ...v, skills: [...v.skills, tag] });
    setSkillInput("");
  };

  const removeSkill = (tag: string) => setV({ ...v, skills: v.skills.filter(s => s !== tag) });

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
          <div className="grid gap-1.5">
            <Label>Hourly cost <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              type="number" min={0} step={0.01} placeholder="e.g. 85.00"
              value={v.hourlyCost ?? ""}
              onChange={(e) => setV({ ...v, hourlyCost: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Skills <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {v.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {v.skills.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeSkill(tag)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={skillInputRef}
                placeholder="e.g. Python, Azure, ML…"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                className={cn("flex-1")}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()}>
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
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
