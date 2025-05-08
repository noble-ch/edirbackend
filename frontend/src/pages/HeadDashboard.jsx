import React, { useState, useEffect } from "react";
import { getMembersList, updateMember } from "../services/authService";
import { useEdirSlug } from "../hooks/useEdirSlug";
import {
  ChevronDown,
  ChevronUp,
  Filter,
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
  Loader2
} from "lucide-react";

// Define available options for status
const AVAILABLE_STATUSES = ["pending", "approved", "rejected", "inactive"];

// Define status icons
const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-amber-500" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
  inactive: <Circle className="w-4 h-4 text-gray-400" />
};

// Define role choices matching your Django model
const ROLE_CHOICES = [
  { value: "TREASURER", label: "Treasurer", icon: <Shield className="w-4 h-4 text-blue-500" /> },
  { value: "PROPERTY_MANAGER", label: "Property Manager", icon: <Shield className="w-4 h-4 text-purple-500" /> },
  { value: "COORDINATOR", label: "Event Coordinator", icon: <Shield className="w-4 h-4 text-indigo-500" /> },
  { value: "MEMBER", label: "Regular Member", icon: <User className="w-4 h-4 text-gray-500" /> },
];

function HeadDashboard() {
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
    sortDirection: 'asc'
  });

  const edirslug = useEdirSlug();

  const fetchMembers = async () => {
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
      setFilteredMembers(membersData);
      console.log("Fetched members:", membersData);
    } catch (err) {
      setError(err.message || "Failed to fetch members list.");
      console.error("Error fetching members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [edirslug]);

  useEffect(() => {
    applyFilters();
  }, [members, filters]);

  const applyFilters = () => {
    let result = [...members];

    // Apply status filter
    if (filters.status) {
      result = result.filter(member => member.status === filters.status);
    }

    // Apply role filter
    if (filters.role) {
      result = result.filter(member => {
        const currentRole = member.role || (member.user && member.user.role) || "MEMBER";
        return currentRole === filters.role;
      });
    }

    // Apply sorting
    if (filters.sortField) {
      result.sort((a, b) => {
        let valueA, valueB;

        if (filters.sortField === 'role') {
          valueA = a.role || (a.user && a.user.role) || "MEMBER";
          valueB = b.role || (b.user && b.user.role) || "MEMBER";
        } else {
          valueA = a[filters.sortField];
          valueB = b[filters.sortField];
        }

        if (valueA < valueB) {
          return filters.sortDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return filters.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredMembers(result);
  };

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
    if (filters.sortField === field) {
      setFilters(prev => ({
        ...prev,
        sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        sortField: field,
        sortDirection: 'asc'
      }));
    }
  };

  const toggleFilter = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: prev[field] === value ? null : value
    }));
  };

  const getRoleLabel = (roleValue) => {
    const role = ROLE_CHOICES.find((r) => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  const getRoleIcon = (roleValue) => {
    const role = ROLE_CHOICES.find((r) => r.value === roleValue);
    return role ? role.icon : <User className="w-4 h-4 text-gray-500" />;
  };

  const renderSortIcon = (field) => {
    if (filters.sortField !== field) return <Filter className="w-4 h-4 ml-1 opacity-50" />;
    return filters.sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1" /> 
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  if (isLoading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-800">Loading Members...</h1>
        <p className="text-gray-500">Please wait while we fetch the member data</p>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <User className="w-8 h-8 mr-2" /> Head Dashboard
        </h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
          <p className="font-bold flex items-center">
            <XCircle className="w-5 h-5 mr-1" /> Error
          </p>
          <p>{error}</p>
          <button 
            onClick={fetchMembers}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
              <User className="w-8 h-8 mr-2 text-blue-600" /> Member Management
            </h1>
            <p className="text-gray-600 mt-1">Manage all members of your Edir</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={fetchMembers}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
        </div>

        <nav className="mb-8 flex flex-wrap gap-2">
          {[
            { name: "Members", icon: <User className="w-4 h-4 mr-1" /> },
            { name: "Events", icon: <Calendar className="w-4 h-4 mr-1" /> },
            { name: "Emergency", icon: <Shield className="w-4 h-4 mr-1" /> },
            { name: "Reports", icon: <Filter className="w-4 h-4 mr-1" /> },
            { name: "Feedbacks", icon: <Mail className="w-4 h-4 mr-1" /> }
          ].map((item) => (
            <a
              key={item.name}
              href={item.name.toLowerCase()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center"
            >
              {item.icon}
              {item.name}
            </a>
          ))}
        </nav>

        {error && members.length > 0 && (
          <div
            className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start"
            role="alert"
          >
            <XCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">An error occurred</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow-md rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Member List</h2>
            <div className="flex space-x-2">
              <div className="relative">
                <select
                  value={filters.status || ""}
                  onChange={(e) => toggleFilter('status', e.target.value || null)}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  {AVAILABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <div className="relative">
                <select
                  value={filters.role || ""}
                  onChange={(e) => toggleFilter('role', e.target.value || null)}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  {ROLE_CHOICES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {isLoading && members.length > 0 && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-500" />
              <span className="text-gray-600">Updating member data...</span>
            </div>
          )}

          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
              <p className="text-gray-500">
                {filters.status || filters.role 
                  ? "Try adjusting your filters" 
                  : "This Edir currently has no members"}
              </p>
              {(filters.status || filters.role) && (
                <button
                  onClick={() => setFilters({ status: null, role: null, sortField: null, sortDirection: 'asc' })}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <button 
                        onClick={() => toggleSort('full_name')} 
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Full Name
                        {renderSortIcon('full_name')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" /> Email
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <button 
                        onClick={() => toggleSort('created_at')} 
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        <Calendar className="w-4 h-4 mr-1" /> Registration Date
                        {renderSortIcon('created_at')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" /> Phone
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <button 
                        onClick={() => toggleSort('status')} 
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Status
                        {renderSortIcon('status')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <button 
                        onClick={() => toggleSort('role')} 
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Role
                        {renderSortIcon('role')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => {
                    const currentRole = member.role || (member.user && member.user.role) || "MEMBER";
                    const status = member.status || "pending";

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.full_name || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.email || (member.user && member.user.email) || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.phone_number || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={status}
                            onChange={(e) =>
                              handleMemberUpdate(member.id, "status", e.target.value)
                            }
                            disabled={
                              updatingMember.id === member.id &&
                              updatingMember.field === "status"
                            }
                            className={`block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                              updatingMember.id === member.id &&
                              updatingMember.field === "status"
                                ? "bg-gray-100 cursor-not-allowed"
                                : "bg-white border-gray-300"
                            }`}
                            aria-label={`Status for ${member.full_name}`}
                          >
                            {AVAILABLE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                <div className="flex items-center">
                                  {STATUS_ICONS[s]}
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </div>
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={currentRole}
                            onChange={(e) =>
                              handleMemberUpdate(member.id, "role", e.target.value)
                            }
                            disabled={
                              updatingMember.id === member.id &&
                              updatingMember.field === "role"
                            }
                            className={`block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                              updatingMember.id === member.id &&
                              updatingMember.field === "role"
                                ? "bg-gray-100 cursor-not-allowed"
                                : "bg-white border-gray-300"
                            }`}
                            aria-label={`Role for ${member.full_name}`}
                          >
                            {ROLE_CHOICES.map((role) => (
                              <option key={role.value} value={role.value}>
                                <div className="flex items-center">
                                  {role.icon}
                                  <span className="ml-2">{role.label}</span>
                                </div>
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeadDashboard;