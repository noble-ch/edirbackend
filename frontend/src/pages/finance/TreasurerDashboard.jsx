import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentsTable from "./components/Payments/PaymentsTable";
import PenaltiesTable from "./components/Penalties/PenaltiesTable";
import RemindersTable from "./components/Reminders/RemindersTable";
import ReportsTable from "./components/Reports/ReportsTable";
import { useParams } from "react-router-dom";

function TreasurerDashboard() {
  const [activeTab, setActiveTab] = useState("payments");
  const { edirslug } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Treasurer Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <PaymentsTable edirSlug={edirslug} />
        </TabsContent>

        <TabsContent value="penalties">
          <PenaltiesTable edirSlug={edirslug}/>
        </TabsContent>

        <TabsContent value="reminders">
          <RemindersTable />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TreasurerDashboard;
