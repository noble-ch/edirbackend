import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../services/authService";
import { format, parseISO } from "date-fns";

// UI Components
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
// Input, Textarea, Select are removed as event selection is removed
import { Button } from "@/components/ui/button";
// Badge, Label removed (Label was for event select)
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Separator removed
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, HelpCircle, ClipboardList } from "lucide-react"; // Removed unused icons

function EventAttendancesPage({
  edirslug,
  selectedEvent,
  members: propMembers,
}) {
  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState({
    attendances: false,
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const members = Array.isArray(propMembers) ? propMembers : [];

  useEffect(() => {
    if (!selectedEvent || !selectedEvent.id) {
      setAttendances([]);
      setError(null); // Clear error when event is deselected
      return;
    }

    const fetchAttendances = async () => {
      setIsLoading((prev) => ({ ...prev, attendances: true }));
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/attendances/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Assuming API returns an array directly. If paginated, use response.data.results
        setAttendances(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.detail ||
            "Failed to fetch attendances"
        );
        console.error("Error fetching attendances:", err.response || err);
        setAttendances([]); // Clear attendances on error
      } finally {
        setIsLoading((prev) => ({ ...prev, attendances: false }));
      }
    };

    fetchAttendances();
  }, [selectedEvent, edirslug]);

  const handleUpdateAttendance = async (
    attendanceId,
    newStatus,
    memberIdForNew = null
  ) => {
    if (!selectedEvent || !selectedEvent.id) {
      setError("No event selected to update attendance.");
      return;
    }
    setError(null); // Clear previous errors
    try {
      const token = localStorage.getItem("accessToken");
      if (memberIdForNew && !attendanceId) {
        // Create new attendance
        const payload = {
          member: memberIdForNew,
          status: newStatus,
          event: selectedEvent.id, // API might need event ID
        };
        const response = await axios.post(
          `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/attendances/`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        setAttendances((prev) => [...prev, response.data]);
      } else {
        // Update existing attendance
        await axios.patch(
          `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/attendances/${attendanceId}/`,
          { status: newStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        // Re-fetch or optimistically update
        // Optimistic update:
        setAttendances((prevAttendances) =>
          prevAttendances.map((att) =>
            att.id === attendanceId
              ? {
                  ...att,
                  status: newStatus,
                  responded_at: new Date().toISOString(),
                }
              : att
          )
        );
        // Or re-fetch for guaranteed consistency if backend changes more data:
        // const updatedAttendances = await axios.get(...); setAttendances(updatedAttendances.data);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Failed to ${memberIdForNew ? "create" : "update"} attendance`;
      setError(errorMessage);
      console.error(
        `Error ${memberIdForNew ? "creating" : "updating"} attendance:`,
        err.response?.data || err.message
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy hh:mm a");
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "attending":
        return <Check className="w-4 h-4 text-green-500" />;
      case "not_attending":
        return <X className="w-4 h-4 text-red-500" />;
      case "maybe":
        return <HelpCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusCount = (status) => {
    return attendances.filter((att) => att.status === status).length;
  };

  const filteredAttendances = () => {
    if (activeTab === "all") return attendances;
    return attendances.filter((att) => att.status === activeTab);
  };

  if (!selectedEvent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Tracking</CardTitle>
          <CardDescription>
            Select an event from the main dashboard to view attendances.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="mx-auto max-w-md">
            <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Event Selected
            </h3>
            <p className="text-gray-500">
              Please select an event in the coordinator dashboard first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueRespondedMemberIds = new Set(attendances.map((a) => a.member));
  const pendingResponseCount = members.length - uniqueRespondedMemberIds.size;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {selectedEvent.title} - Attendances
          </h1>
          <p className="text-gray-600">Track and manage member participation</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attending</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {isLoading.attendances ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                getStatusCount("attending")
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {members.length > 0
                ? Math.round(
                    (getStatusCount("attending") / members.length) * 100
                  )
                : 0}
              % of members
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Not Attending</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {isLoading.attendances ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                getStatusCount("not_attending")
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {members.length > 0
                ? Math.round(
                    (getStatusCount("not_attending") / members.length) * 100
                  )
                : 0}
              % of members
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Response</CardDescription>
            <CardTitle className="text-3xl text-gray-600">
              {isLoading.attendances ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                pendingResponseCount
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {members.length > 0
                ? Math.round((pendingResponseCount / members.length) * 100)
                : 0}
              % of members
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({attendances.length})</TabsTrigger>
          <TabsTrigger value="attending">
            Attending ({getStatusCount("attending")})
          </TabsTrigger>
          <TabsTrigger value="not_attending">
            Not Attending ({getStatusCount("not_attending")})
          </TabsTrigger>
          <TabsTrigger value="maybe">
            Maybe ({getStatusCount("maybe")})
          </TabsTrigger>
        </TabsList>

        {["all", "attending", "not_attending", "maybe"].map((tabValue) => (
          <TabsContent
            key={tabValue}
            value={tabValue}
            forceMount={activeTab === tabValue}
          >
            {activeTab === tabValue && ( // Render content only if tab is active
              <Card>
                <CardContent className="p-0">
                  {isLoading.attendances ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          {tabValue === "all" && <TableHead>Status</TableHead>}
                          <TableHead>Response Date</TableHead>
                          <TableHead>Note</TableHead>
                          {(tabValue === "all" || tabValue === "maybe") && (
                            <TableHead>Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendances().length > 0 ? (
                          filteredAttendances().map((attendance) => {
                            const member = members.find(
                              (m) => m.id === attendance.member
                            );
                            if (!member)
                              return (
                                <TableRow key={attendance.id}>
                                  <TableCell colSpan={5}>
                                    Member data missing for attendance record.
                                  </TableCell>
                                </TableRow>
                              );
                            return (
                              <TableRow key={attendance.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={member?.profile_picture}
                                      />
                                      <AvatarFallback>
                                        {member?.full_name
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">
                                        {member?.full_name || "Unknown"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {member?.phone_number || ""}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                {tabValue === "all" && (
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(attendance.status)}
                                      <span className="capitalize">
                                        {attendance.status?.replace(
                                          /_/g,
                                          " "
                                        ) || "N/A"}
                                      </span>
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell>
                                  {formatDate(attendance.responded_at)}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {attendance.note || "-"}
                                </TableCell>
                                {(tabValue === "all" ||
                                  tabValue === "maybe") && (
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleUpdateAttendance(
                                            attendance.id,
                                            "attending"
                                          )
                                        }
                                        disabled={
                                          attendance.status === "attending"
                                        }
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Confirm
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleUpdateAttendance(
                                            attendance.id,
                                            "not_attending"
                                          )
                                        }
                                        disabled={
                                          attendance.status === "not_attending"
                                        }
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Decline
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={
                                tabValue === "all" || tabValue === "maybe"
                                  ? 5
                                  : 3
                              }
                              className="h-24 text-center"
                            >
                              No attendances found for this filter.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>No Response Yet</CardTitle>
          <CardDescription>
            Members who haven't responded to the event invitation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading.attendances ? ( // Could also check parent's members loading state
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.filter(
                  (member) => !uniqueRespondedMemberIds.has(member.id)
                ).length > 0 ? (
                  members
                    .filter(
                      (member) => !uniqueRespondedMemberIds.has(member.id)
                    )
                    .map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profile_picture} />
                              <AvatarFallback>
                                {member.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium">
                              {member.full_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{member.phone_number}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateAttendance(
                                  null,
                                  "attending",
                                  member.id
                                )
                              }
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Mark Attending
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateAttendance(
                                  null,
                                  "not_attending",
                                  member.id
                                )
                              }
                            >
                              <X className="w-4 h-4 mr-1" />
                              Mark Not Attending
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      All members have responded or no members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EventAttendancesPage;
