import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Emergency() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const { edirslug } = useParams();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const fetchEmergencies = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/${edirslug}/emergencies/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch emergencies");
        }

        const data = await response.json();
        setEmergencies(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencies();
  }, [edirslug]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-400">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-purple-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEmergencyTypeBadge = (type) => {
    switch (type) {
      case "medical":
        return <Badge className="bg-red-500">Medical</Badge>;
      case "accident":
        return <Badge className="bg-orange-500">Accident</Badge>;
      case "death":
        return <Badge className="bg-gray-500">Death</Badge>;
      case "financial":
        return <Badge className="bg-blue-500">Financial</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const handleViewDetails = (emergency) => {
    setSelectedEmergency(emergency);
    setIsDialogOpen(true);
  };

  const handleApproveClick = (emergency) => {
    setSelectedEmergency(emergency);
    setApprovedAmount(emergency.requested_amount || "");
    setIsApproveDialogOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!approvedAmount || isNaN(approvedAmount)) {
      setError("Please enter a valid amount");
      return;
    }

    setIsApproving(true);
    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/${edirslug}/emergencies/${selectedEmergency.id}/approve/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved_amount: approvedAmount,
            response_note: responseNote,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve emergency");
      }

      const updatedEmergency = await response.json();

      // Update the emergencies list
      setEmergencies(
        emergencies.map((emergency) =>
          emergency.id === updatedEmergency.id ? updatedEmergency : emergency
        )
      );

      setIsApproveDialogOpen(false);
      setSelectedEmergency(updatedEmergency);
      setApprovedAmount("");
      setResponseNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center ">
            <CardTitle>Emergency Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of recent emergency requests.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emergencies.map((emergency) => (
                <TableRow key={emergency.id}>
                  <TableCell className="font-medium">
                    {emergency.title}
                  </TableCell>
                  <TableCell>
                    {getEmergencyTypeBadge(emergency.emergency_type)}
                  </TableCell>
                  <TableCell>{getStatusBadge(emergency.status)}</TableCell>
                  <TableCell>
                    {emergency.requested_amount
                      ? `ETB ${emergency.requested_amount}`
                      : "Not specified"}
                  </TableCell>
                  <TableCell>
                    {new Date(emergency.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(emergency)}
                    >
                      View
                    </Button>
                    {emergency.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveClick(emergency)}
                      >
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {emergencies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No emergency requests found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedEmergency && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmergency.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex gap-2 mt-2">
                    {getEmergencyTypeBadge(selectedEmergency.emergency_type)}
                    {getStatusBadge(selectedEmergency.status)}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm mt-1 text-gray-600">
                    {selectedEmergency.description}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Requested Amount</h4>
                    <p className="text-sm mt-1 text-gray-600">
                      {selectedEmergency.requested_amount
                        ? `ETB ${selectedEmergency.requested_amount}`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Approved Amount</h4>
                    <p className="text-sm mt-1 text-gray-600">
                      {selectedEmergency.approved_amount
                        ? `ETB ${selectedEmergency.approved_amount}`
                        : "Not approved"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium">Submitted On</h4>
                  <p className="text-sm mt-1 text-gray-600">
                    {new Date(selectedEmergency.created_at).toLocaleString()}
                  </p>
                </div>

                {selectedEmergency.response_note && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium">Admin Notes</h4>
                      <p className="text-sm mt-1 text-gray-600">
                        {selectedEmergency.response_note}
                      </p>
                      {selectedEmergency.reviewed_at && (
                        <p className="text-xs mt-1 text-gray-500">
                          Reviewed on:{" "}
                          {new Date(
                            selectedEmergency.reviewed_at
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Emergency Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedEmergency && (
            <>
              <DialogHeader>
                <DialogTitle>Approve Emergency Request</DialogTitle>
                <DialogDescription>
                  Approve the emergency request for {selectedEmergency.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Approved Amount (ETB)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder="Enter approved amount"
                  />
                </div>
                <div>
                  <Label htmlFor="note">Response Note (Optional)</Label>
                  <Input
                    id="note"
                    type="text"
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder="Enter any notes for the member"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsApproveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApproveSubmit} disabled={isApproving}>
                    {isApproving ? "Approving..." : "Approve"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Emergency;
