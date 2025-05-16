import React, { useState, useEffect, useCallback } from "react";
import { getMembersList, updateMember } from "../../services/authService"; // Adjust path if needed
import { useEdirSlug } from "../../hooks/useEdirSlug"; // Adjust path if needed

import {
  ChevronDown,
  ChevronUp,
  Filter as FilterIconLucide, // Renamed to avoid conflict with local Filter
  RefreshCw,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Circle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  BadgeDollarSign,
  Home,
  CalendarCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button"; // Shadcn
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"; // Shadcn
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Shadcn
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn

const AVAILABLE_STATUSES = ["pending", "approved", "rejected", "inactive"];

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-amber-500 mr-2" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500 mr-2" />,
  rejected: <XCircle className="w-4 h-4 text-red-500 mr-2" />,
  inactive: <Circle className="w-4 h-4 text-gray-400 mr-2" />,
};

const ROLE_CHOICES = [
  {
    value: "TREASURER",
    label: "Treasurer",
    icon: <BadgeDollarSign className="w-4 h-4 text-green-500 mr-2" />,
  },
  {
    value: "PROPERTY_MANAGER",
    label: "Property Manager",
    icon: <Home className="w-4 h-4 text-purple-500 mr-2" />,
  },
  {
    value: "COORDINATOR",
    label: "Event Coordinator",
    icon: <CalendarCheck className="w-4 h-4 text-indigo-500 mr-2" />,
  },
  {
    value: "MEMBER",
    label: "Regular Member",
    icon: <User className="w-4 h-4 text-gray-500 mr-2" />,
  },
];

function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingMember, setUpdatingMember] = useState({
    id: null,
    field: null,
  });
  const [filters, setFilters] = useState({
    status: null,
    role: null,
    sortField: null,
    sortDirection: "asc",
  });

  const edirslug = useEdirSlug();

  const fetchMembers = useCallback(async () => {
    if (!edirslug) {
      setError("Edir slug is not available.");
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Not authenticated. Please log in.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMembersList(edirslug, token);
      const membersData = data.results || data || [];
      setMembers(membersData);
      // ApplyFilters will be called by its own useEffect when members or filters change
    } catch (err) {
      setError(err.message || "Failed to fetch members list.");
      console.error("Error fetching members:", err);
    } finally {
      setIsLoading(false);
    }
  }, [edirslug]);

  const applyFilters = useCallback(() => {
    let result = [...members];
    if (filters.status) {
      result = result.filter((member) => member.status === filters.status);
    }
    if (filters.role) {
      result = result.filter((member) => {
        const currentRole =
          member.role || (member.user && member.user.role) || "MEMBER";
        return currentRole === filters.role;
      });
    }
    if (filters.sortField) {
      result.sort((a, b) => {
        let valueA, valueB;
        if (filters.sortField === "role") {
          valueA = a.role || (a.user && a.user.role) || "MEMBER";
          valueB = b.role || (b.user && b.user.role) || "MEMBER";
        } else if (filters.sortField === "full_name") {
          valueA =
            a.full_name ||
            (a.user && `${a.user.first_name} ${a.user.last_name}`) ||
            "";
          valueB =
            b.full_name ||
            (b.user && `${b.user.first_name} ${b.user.last_name}`) ||
            "";
        } else {
          valueA = a[filters.sortField];
          valueB = b[filters.sortField];
        }
        if (valueA < valueB) return filters.sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return filters.sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    setFilteredMembers(result);
  }, [members, filters]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleMemberUpdate = async (memberId, field, value) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Authentication token is missing. Please log in again.");
      return;
    }
    setUpdatingMember({ id: memberId, field });
    setError(null);
    try {
      const payload = { [field]: value };
      const updatedMemberFromServer = await updateMember(
        edirslug,
        memberId,
        payload,
        token
      );
      setMembers((prevMembers) =>
        prevMembers.map((m) =>
          m.id === memberId ? { ...m, ...updatedMemberFromServer } : m
        )
      );
    } catch (err) {
      setError(err.message || `Failed to update ${field} for member.`);
      console.error(`Error updating member ${memberId} (${field}):`, err);
    } finally {
      setUpdatingMember({ id: null, field: null });
    }
  };

  const toggleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortDirection:
        prev.sortField === field && prev.sortDirection === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const handleFilterChange = (field, value) => {
    // For Shadcn Select, value is the selected value, or undefined if placeholder is chosen
    setFilters((prev) => ({
      ...prev,
      [field]: value === `all-${field}` ? null : value, // Assuming 'all-status' or 'all-roles' as value for "All"
    }));
  };

  const renderSortIcon = (field) => {
    if (filters.sortField !== field)
      return <FilterIconLucide className="w-4 h-4 ml-1 opacity-50" />;
    return filters.sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  if (isLoading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Loading Members...</h1>
        <p className="text-muted-foreground">
          Please wait while we fetch the member data
        </p>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchMembers} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && members.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>An error occurred</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Members List</CardTitle>{" "}
              <p className="text-muted-foreground">
                Manage all members of your Edir.
              </p>
            </div>
            <div className="flex space-x-2">
              <Select
                value={filters.status || `all-status`}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={`all-status`}>All Statuses</SelectItem>
                  {AVAILABLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.role || `all-roles`}
                onValueChange={(value) => handleFilterChange("role", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={`all-roles`}>All Roles</SelectItem>
                  {ROLE_CHOICES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={fetchMembers}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading && members.length > 0 ? ( // Show loader only if refreshing
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && members.length > 0 && (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
              <span>Updating member data...</span>
            </div>
          )}

          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                No members found
              </h3>
              <p className="text-muted-foreground">
                {filters.status || filters.role
                  ? "Try adjusting your filters or "
                  : "This Edir currently has no members. "}
                {(filters.status || filters.role) && (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() =>
                      setFilters({
                        status: null,
                        role: null,
                        sortField: null,
                        sortDirection: "asc",
                      })
                    }
                  >
                    clear filters.
                  </Button>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort("full_name")}
                        className="px-0 hover:bg-transparent"
                      >
                        Full Name {renderSortIcon("full_name")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" /> Email
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" /> Phone
                      </div>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort("created_at")}
                        className="px-0 hover:bg-transparent"
                      >
                        <Calendar className="w-4 h-4 mr-1" /> Reg. Date{" "}
                        {renderSortIcon("created_at")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort("status")}
                        className="px-0 hover:bg-transparent"
                      >
                        Status {renderSortIcon("status")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSort("role")}
                        className="px-0 hover:bg-transparent"
                      >
                        Role {renderSortIcon("role")}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const currentRole =
                      member.role ||
                      (member.user && member.user.role) ||
                      "MEMBER";
                    const status = member.status || "pending";
                    const memberFullName =
                      member.full_name ||
                      (member.user &&
                        `${member.user.first_name} ${member.user.last_name}`) ||
                      "N/A";

                    return (
                      <TableRow key={member.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {member.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {memberFullName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email ||
                            (member.user && member.user.email) ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.phone_number || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(value) =>
                              handleMemberUpdate(member.id, "status", value)
                            }
                            disabled={
                              updatingMember.id === member.id &&
                              updatingMember.field === "status"
                            }
                          >
                            <SelectTrigger
                              className="w-[130px]"
                              aria-label={`Status for ${memberFullName}`}
                            >
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  <div className="flex items-center">
                                    {STATUS_ICONS[s]}
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentRole}
                            onValueChange={(value) =>
                              handleMemberUpdate(member.id, "role", value)
                            }
                            disabled={
                              updatingMember.id === member.id &&
                              updatingMember.field === "role"
                            }
                          >
                            <SelectTrigger
                              className="w-[180px]"
                              aria-label={`Role for ${memberFullName}`}
                            >
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_CHOICES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center">
                                    {role.icon}
                                    {role.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MembersManagement;
