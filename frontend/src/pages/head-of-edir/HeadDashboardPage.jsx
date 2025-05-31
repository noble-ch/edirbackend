import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembersManagement from "./MembersManagement";
import EventScheduler from "./EventScheduler";
import {
  Users,
  CalendarDays,
  LayoutDashboard,
  AlarmClock,
  MessageCircle,
  FileText,
} from "lucide-react";
import Emergency from "./Emergency";
import Feedback from "./Feedback";
import MemorialPage from "./MemorialPage";

function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3 text-primary" />
                HOE Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your Edir's members, events, and more.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-5 md:w-2xl mb-6">
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarDays className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="emergency">
              <AlarmClock className="w-4 h-4 mr-2" />
              Emergency
            </TabsTrigger>{" "}
            <TabsTrigger value="feedbacks">
              <MessageCircle className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="memorial">
              <FileText className="w-4 h-4 mr-2" />
              Memorial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <MembersManagement />
          </TabsContent>
          <TabsContent value="memorial">
            <MemorialPage />
          </TabsContent>
          <TabsContent value="events">
            <EventScheduler />
          </TabsContent>
          <TabsContent value="emergency">
            <Emergency />
          </TabsContent>
          <TabsContent value="feedbacks">
            <Feedback />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
