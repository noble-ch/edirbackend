import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../services/authService";
import { format, parseISO } from "date-fns";
import RemindersTable from "./Reminders/RemindersTable";

// UI Components
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, PieChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Components
import EventTaskManagement from "./EventTaskManagement"; // Adjust path if needed
import EventAttendancesPage from "./EventAttendancesPage"; // Adjust path if needed

function EventCoordinatorDashboard() {
  const { edirslug } = useParams();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState({
    events: false,
    members: false,
  });
  const [error, setError] = useState(null);
  // const [activeTab, setActiveTab] = useState("tasks"); // activeTab state for Tabs can be managed by Tabs component itself unless needed for other logic

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading((prev) => ({ ...prev, events: true }));
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${API_BASE_URL}/${edirslug}/events/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEvents(Array.isArray(response.data) ? response.data : []);
        // If an event was previously selected, try to find it in the new list
        if (
          selectedEvent &&
          response.data.find((ev) => ev.id === selectedEvent.id)
        ) {
          // Potentially re-set selectedEvent if its data might have changed
          // setSelectedEvent(response.data.find(ev => ev.id === selectedEvent.id));
        } else if (response.data.length > 0 && !selectedEvent) {
          // Optionally select the first event by default
          // setSelectedEvent(response.data[0]);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch events");
        console.error("Error fetching events:", err);
        setEvents([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, events: false }));
      }
    };
    fetchEvents();
  }, [edirslug]); // Removed selectedEvent from deps here, was causing re-fetch

  useEffect(() => {
    if (!selectedEvent || !selectedEvent.id) {
      // Ensure selectedEvent.id exists
      setMembers([]); // Clear members if no event is selected
      return;
    }
    const fetchMembers = async () => {
      setIsLoading((prev) => ({ ...prev, members: true }));
      // setError(null); // Clearing error here might hide event fetching errors
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${API_BASE_URL}/${edirslug}/members/`, // This endpoint should probably be specific to the Edir, or filterable
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMembers(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError(err.response?.data?.message || "Failed to fetch members"); // Set error for members
        setMembers([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, members: false }));
      }
    };
    fetchMembers();
  }, [selectedEvent, edirslug]); // Fetch members when selectedEvent or edirslug changes

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
            Error: {error}
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-72 flex-shrink-0">
            {" "}
            {/* Increased width slightly */}
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Event Coordination</CardTitle>
                <CardDescription>Select and manage your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {" "}
                {/* Increased spacing */}
                <div>
                  <Label htmlFor="event-select">Select Event</Label>
                  {isLoading.events ? (
                    <Skeleton className="h-10 w-full mt-1" />
                  ) : events.length === 0 && !isLoading.events ? (
                    <p className="text-sm text-gray-500 mt-1">
                      No events found for this edir.
                    </p>
                  ) : (
                    <Select
                      value={selectedEvent?.id?.toString() || ""}
                      onValueChange={(value) => {
                        const eventId = Number(value);
                        setSelectedEvent(
                          value ? events.find((ev) => ev.id === eventId) : null
                        );
                      }}
                    >
                      <SelectTrigger id="event-select" className="w-full mt-1">
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem
                            key={event.id}
                            value={event.id.toString()}
                          >
                            {event.title} ({formatDate(event.start_date)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
            {selectedEvent && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {formatDate(selectedEvent.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {formatDate(selectedEvent.end_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">
                      {selectedEvent.location || "Not specified"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex-1">
            {!selectedEvent ? (
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to Event Coordination</CardTitle>
                  <CardDescription>
                    Select an event from the sidebar to start managing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="mx-auto max-w-md">
                    <CalendarIcon
                      size={48}
                      className="mx-auto text-gray-400 mb-4"
                    />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Event Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Choose an event from the dropdown to view and manage its
                      details.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="attendances">Attendances</TabsTrigger>
                  <TabsTrigger value="reminders">Reminders</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-4">
                  <EventTaskManagement
                    edirslug={edirslug}
                    selectedEvent={selectedEvent}
                    members={members}
                  />
                </TabsContent>

                <TabsContent value="attendances" className="mt-4">
                  <EventAttendancesPage
                    edirslug={edirslug}
                    selectedEvent={selectedEvent}
                    members={members}
                  />
                </TabsContent>

                <TabsContent value="reports" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Reports</CardTitle>
                      <CardDescription>
                        Analytics and summaries for your event.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto max-w-md">
                        <PieChart
                          size={48}
                          className="mx-auto text-gray-400 mb-4"
                        />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Reports Coming Soon
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          This section will provide detailed reports and
                          analytics for the event.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="reminders">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Reminder</CardTitle>
                      <CardDescription>
                        Analytics and summaries for your event.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center ">
                      <RemindersTable />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCoordinatorDashboard;
