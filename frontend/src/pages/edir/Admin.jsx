// src/pages/edir/Admin.jsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EdirRequestsDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEdirRequests();
  }, []);

  const fetchEdirRequests = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get(
        "http://localhost:8000/api/edir/requests/",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching edir requests:", error);
      toast("Failed to fetch edir requests");
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      await axios.patch(
        `http://localhost:8000/api/edir/requests/${id}/approve/`,
        {
          status: "approved",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      toast("Edir request approved successfully");
      fetchEdirRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast("Error");
    }
  };

  const handleReject = async (id) => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      await axios.patch(
        `http://localhost:8000/api/edir-requests/${id}/approve/`,
        {
          status: "rejected",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      toast(
      "Edir request rejected"
      );
      fetchEdirRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast(
     
    "Failed to reject request",
      );
    }
  };

  const openRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "approved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edir Requests Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Edir Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No edir requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.id}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => openRequestDetails(request)}
                      className="text-blue-600 hover:underline"
                    >
                      {request.full_name}
                    </button>
                  </TableCell>
                  <TableCell>{request.edir_name}</TableCell>
                  <TableCell>
                    <span className={getStatusBadge(request.status)}>
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {request.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(request.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRequestDetails(request)}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedRequest && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edir Request Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Requester Name
                  </label>
                  <Input value={selectedRequest.full_name} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <Input value={selectedRequest.username} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input value={selectedRequest.email} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <Input value={selectedRequest.status} readOnly />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Edir Name
                </label>
                <Input value={selectedRequest.edir_name} readOnly />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Edir Description
                </label>
                <Input value={selectedRequest.edir_description} readOnly />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Proposed CBE Account
                  </label>
                  <Input
                    value={selectedRequest.proposed_cbe_account}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Request Date
                  </label>
                  <Input
                    value={formatDate(selectedRequest.created_at)}
                    readOnly
                  />
                </div>
              </div>

              {selectedRequest.status === "pending" && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="success"
                    onClick={() => {
                      handleApprove(selectedRequest.id);
                      setIsDialogOpen(false);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedRequest.id);
                      setIsDialogOpen(false);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
