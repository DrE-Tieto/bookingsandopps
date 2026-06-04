import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardProvider } from "@/lib/dashboard-store";
import { AvailabilityTab } from "@/components/dashboard/AvailabilityTab";
import { DataTab } from "@/components/dashboard/DataTab";
import { RiskTab } from "@/components/dashboard/RiskTab";
import { Toaster } from "@/components/ui/sonner";
import { Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team Availability Dashboard" },
      { name: "description", content: "Weekly booking and opportunity overview for consulting teams." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-3">
            <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Team Availability</h1>
              <p className="text-xs text-muted-foreground">Bookings & opportunities · 6-month forward view</p>
            </div>
          </div>
        </header>
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="data">Bookings & Opportunities</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <AvailabilityTab />
            </TabsContent>
            <TabsContent value="data" className="mt-4">
              <DataTab />
            </TabsContent>
            <TabsContent value="risk" className="mt-4">
              <RiskTab />
            </TabsContent>
          </Tabs>
        </main>
        <Toaster />
      </div>
    </DashboardProvider>
  );
}
