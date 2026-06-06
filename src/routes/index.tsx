import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-store";
import { AvailabilityTab } from "@/components/dashboard/AvailabilityTab";
import { DataTab } from "@/components/dashboard/DataTab";
import { RiskTab } from "@/components/dashboard/RiskTab";
import { ReportingTab } from "@/components/dashboard/ReportingTab";
import { BenchAlerts } from "@/components/dashboard/BenchAlerts";
import { Toaster } from "@/components/ui/sonner";
import { Users, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team Availability Dashboard" },
      { name: "description", content: "Weekly booking and opportunity overview for consulting teams." },
    ],
  }),
  component: Index,
});

function InnerIndex() {
  const { employees: _e, isLoading, teams, selectedTeamId, setSelectedTeamId } = useDashboard();
  const { user, profile, signOut } = useAuth();

  // Only show full-screen loading on the very first load (no teams yet).
  // Subsequent loads (e.g. team switches) keep the UI mounted so the
  // active tab doesn't reset.
  if (isLoading && teams.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-3">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Users className="size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">Team Availability</h1>
            <p className="text-xs text-muted-foreground">Bookings & opportunities · 6-month forward view</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === "department_head" && (
              <Select value={selectedTeamId ?? "all"} onValueChange={(v) => setSelectedTeamId(v === "all" ? null : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Teams (Department)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams (Department)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Bookings & Opportunities</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <BenchAlerts />
            <AvailabilityTab />
          </TabsContent>
          <TabsContent value="data" className="mt-4">
            <DataTab />
          </TabsContent>
          <TabsContent value="reporting" className="mt-4">
            <ReportingTab />
          </TabsContent>
          <TabsContent value="risk" className="mt-4">
            <RiskTab />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  );
}

function Index() {
  return (
    <DashboardProvider>
      <InnerIndex />
    </DashboardProvider>
  );
}
