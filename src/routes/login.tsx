import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const TEAMS = [
  { label: "Data 1", value: "00000000-0000-0000-0000-000000000010" },
  { label: "Data 2", value: "00000000-0000-0000-0000-000000000020" },
  { label: "Data 3", value: "00000000-0000-0000-0000-000000000030" },
  { label: "Data 4", value: "00000000-0000-0000-0000-000000000040" },
  { label: "Department Head", value: "dept_head" },
];

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamValue, setTeamValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const err = await signIn(email, password);
        if (err) { setError(err); return; }
      } else {
        const isDeptHead = teamValue === "dept_head";
        const role = isDeptHead ? "department_head" : "team_lead";
        const teamId = isDeptHead ? null : teamValue || null;
        const err = await signUp(email, password, fullName, teamId, role);
        if (err) { setError(err); return; }
      }
      navigate({ to: "/" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Users className="size-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">Team Availability</h1>
            <p className="text-sm text-muted-foreground">Bookings & opportunities dashboard</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-medium">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
