import { useState } from "react";
import { ResourceList } from "@/components/resources/ResourceList";
import { ResourceAllocation } from "@/components/resources/ResourceAllocation";
import { ResourceUsageTracker } from "@/components/resources/ResourceUsageTracker";
import { ResourceReports } from "@/components/resources/ResourceReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceAllocationList } from "@/components/resources/ResourceAllocationList";
import RemindersTable from "./Reminders/RemindersTable";

export const ResourceDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Resource Management</h1>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="allocations-list">Allocations list</TabsTrigger>

          <TabsTrigger value="tracking">Usage Tracking</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>

          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <ResourceList />
        </TabsContent>

        <TabsContent value="allocations">
          <ResourceAllocation />
        </TabsContent>

        <TabsContent value="allocations-list">
          <ResourceAllocationList />
        </TabsContent>

        <TabsContent value="tracking">
          <ResourceUsageTracker />
        </TabsContent>

        <TabsContent value="reports">
          <ResourceReports />
        </TabsContent>
        <TabsContent value="reminders">
          <RemindersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};
