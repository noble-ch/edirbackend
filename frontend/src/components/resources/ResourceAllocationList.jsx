// components/ResourceAllocationList.jsx
import { useState, useEffect } from "react";
import { api } from "../../api/api";
import { useParams } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed: import { set } from "date-fns"; // Unused import

export const ResourceAllocationList = () => {
  const { edirslug } = useParams();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [allocationToApprove, setAllocationToApprove] = useState(null);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [currentAllocationIdForPayload, setCurrentAllocationIdForPayload] =
    useState(null); // Renamed for clarity
  const [resourceUsageId, setResourceUsageId] = useState(null); // This is for the URL

  // Form states
  const [checkOutData, setCheckOutData] = useState({
    pre_use_condition: "good",
    requested_quantity: 1,
    post_use_condition: "good", // Note: post_use_condition for check-out might be unusual, ensure backend expects it or ignores it.
  });

  const [checkInData, setCheckInData] = useState({
    post_use_condition: "good",
    condition_notes: "",
    returned_quantity: 1,
    damaged_quantity: 0,
  });

  useEffect(() => {
    fetchAllocations();
  }, [edirslug]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      // Ensure `resource_usage_id` is part of the allocation object if `usage` is null but a usage record stub exists
      const data = await api.get(
        `${edirslug}/resource-allocations/?expand=usage`
      );
      setAllocations(data);
    } catch (error) {
      toast.error("Failed to fetch allocations");
      console.error("Error fetching allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (allocationId) => {
    try {
      await api.post(
        `${edirslug}/resource-allocations/${allocationId}/approve/`
      );
      toast.success("Allocation approved successfully");
      fetchAllocations();
    } catch (error) {
      toast.error("Failed to approve allocation");
      console.error("Error approving allocation:", error);
    } finally {
      setApproveDialogOpen(false);
    }
  };

  const handleReject = async (allocationId) => {
    try {
      await api.post(
        `${edirslug}/resource-allocations/${allocationId}/reject/`
      );
      toast.success("Allocation rejected");
      fetchAllocations();
    } catch (error) {
      toast.error("Failed to reject allocation");
      console.error("Error rejecting allocation:", error);
    }
  };

  const handleCheckOut = async () => {
    if (!resourceUsageId) {
      toast.error("Resource Usage ID is missing. Cannot check out.");
      console.error("handleCheckOut: resourceUsageId is null or undefined.");
      setCheckOutDialogOpen(false);
      return;
    }
    console.log("Checking out with Resource Usage ID:", resourceUsageId);
    try {
      await api.patch(
        `${edirslug}/resource-usage/${resourceUsageId}/check_out/`,
        {
          allocation: currentAllocationIdForPayload, // Sending allocation_id in payload
          ...checkOutData,
        }
      );
      toast.success("Resource checked out successfully");
      fetchAllocations();
    } catch (error) {
      toast.error("Failed to check out resource");
      console.error("Error checking out resource:", error);
    } finally {
      setCheckOutDialogOpen(false);
      setCurrentAllocationIdForPayload(null);
      setResourceUsageId(null);
    }
  };

  const handleCheckIn = async () => {
    // currentUsage state for check-in holds the usage.id
    if (!currentAllocationIdForPayload) {
      // Reusing state, currentAllocationIdForPayload holds usage.id for check-in
      toast.error("Usage ID is missing. Cannot check in.");
      console.error(
        "handleCheckIn: currentAllocationIdForPayload (usageId) is null or undefined."
      );
      setCheckInDialogOpen(false);
      return;
    }
    try {
      await api.post(
        `${edirslug}/resource-usage/${currentAllocationIdForPayload}/check_in/`, // currentAllocationIdForPayload is usage.id here
        checkInData
      );
      toast.success("Resource checked in successfully");
      fetchAllocations();
    } catch (error) {
      toast.error("Failed to check in resource");
      console.error("Error checking in resource:", error);
    } finally {
      setCheckInDialogOpen(false);
      setCurrentAllocationIdForPayload(null);
    }
  };

  // Renamed allocationUsage parameter to usageIdForCheckout for clarity
  const openCheckOutDialog = (allocationId, usageIdForCheckout) => {
    const allocation = allocations.find((a) => a.id === allocationId);

    if (allocation?.usage) {
      // This case should ideally not be met if button visibility is correct
      toast.error(
        "This resource appears to be already in use (based on allocation.usage object)."
      );
      return;
    }

    if (!usageIdForCheckout) {
      toast.error(
        "Resource Usage ID is missing for this allocation. Cannot proceed with check-out."
      );
      console.error(
        "openCheckOutDialog: usageIdForCheckout is undefined or null for allocation ID:",
        allocationId
      );
      return;
    }

    console.log(
      "Opening Check Out Dialog for allocation ID:",
      allocationId,
      "and resource_usage_id:",
      usageIdForCheckout
    );

    setCurrentAllocationIdForPayload(allocationId); // This is the allocation.id for the payload
    setResourceUsageId(usageIdForCheckout); // This is the resource_usage_id for the URL

    setCheckOutData({
      pre_use_condition: "good",
      requested_quantity: allocation?.quantity || 1,
      post_use_condition: "good", // As noted, ensure this field is expected by backend for checkout
    });
    setCheckOutDialogOpen(true);
  };

  const openCheckInDialog = (usageId) => {
    // For check-in, currentAllocationIdForPayload will store usageId
    setCurrentAllocationIdForPayload(usageId);
    const usage = allocations
      .flatMap((a) => (a.usage ? [a.usage] : []))
      .find((u) => u.id === usageId);

    setCheckInData({
      post_use_condition: usage?.pre_use_condition || "good", // Default to pre_use_condition if available
      condition_notes: "",
      returned_quantity: usage?.requested_quantity || 1,
      damaged_quantity: 0,
    });
    setCheckInDialogOpen(true);
  };

  if (loading) return <div>Loading allocations...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Resource Allocations</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map((allocation) => (
            <TableRow key={allocation.id}>
              <TableCell>{allocation.resource_name}</TableCell>
              <TableCell>{allocation?.event_title || "N/A"}</TableCell>
              <TableCell>{allocation?.member_name}</TableCell>
              <TableCell>
                {new Date(allocation.start_date).toLocaleDateString()} -
                {new Date(allocation.end_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    allocation.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : allocation.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : allocation.status === "rented"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {allocation.status}
                </span>
              </TableCell>
              <TableCell className="space-x-2">
                {allocation.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAllocationToApprove(allocation.id);
                        setApproveDialogOpen(true);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(allocation.id)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {/* The button is shown if approved AND not yet checked out (allocation.usage is null/undefined) */}
                {/* We rely on allocation.resource_usage_id being present here, typically set by backend on approval. */}
                {allocation.status === "approved" && !allocation.usage && (
                  <Button
                    size="sm"
                    onClick={() =>
                      openCheckOutDialog(
                        allocation.id,
                        allocation.resource_usage_id // This should be the ID of the ResourceUsage record
                      )
                    }
                    // Disable button if resource_usage_id is missing, as a safeguard
                    disabled={!allocation.resource_usage_id}
                  >
                    Check Out
                  </Button>
                )}
                {allocation.usage && !allocation.usage.actual_end && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCheckInDialog(allocation.usage.id)}
                  >
                    Check In
                  </Button>
                )}
                {allocation.usage?.actual_end && (
                  <span className="text-sm text-muted-foreground">
                    Returned on{" "}
                    {new Date(allocation.usage.actual_end).toLocaleDateString()}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this resource allocation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleApprove(allocationToApprove)}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check Out Dialog */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Resource</DialogTitle>
            <DialogDescription>
              Confirm the condition and quantity before checking out.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pre_use_condition" className="text-right">
                Condition
              </Label>
              <Select
                value={checkOutData.pre_use_condition}
                onValueChange={(value) =>
                  setCheckOutData({ ...checkOutData, pre_use_condition: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requested_quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="requested_quantity"
                type="number"
                min="1"
                value={checkOutData.requested_quantity}
                onChange={(e) =>
                  setCheckOutData({
                    ...checkOutData,
                    requested_quantity: parseInt(e.target.value) || 1,
                  })
                }
                className="col-span-3"
              />
            </div>
            {/* Consider if post_use_condition is truly needed for checkout */}
            {/* <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post_use_condition_checkout" className="text-right">
                Post Use Condition (Initial) 
              </Label>
              <Input
                id="post_use_condition_checkout"
                value={checkOutData.post_use_condition}
                // onChange or make it read-only if it's just a default
                className="col-span-3"
                readOnly 
              />
            </div> */}
          </div>
          <DialogFooter>
            {/* Corrected onClick handler */}
            <Button onClick={handleCheckOut}>Confirm Check Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check In Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Resource</DialogTitle>
            <DialogDescription>
              Record the condition and any notes upon return.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post_use_condition" className="text-right">
                Return Condition
              </Label>
              <Select
                value={checkInData.post_use_condition}
                onValueChange={(value) =>
                  setCheckInData({ ...checkInData, post_use_condition: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="returned_quantity" className="text-right">
                Returned Quantity
              </Label>
              <Input
                id="returned_quantity"
                type="number"
                min="0"
                value={checkInData.returned_quantity}
                onChange={(e) =>
                  setCheckInData({
                    ...checkInData,
                    returned_quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="damaged_quantity" className="text-right">
                Damaged Quantity
              </Label>
              <Input
                id="damaged_quantity"
                type="number"
                min="0"
                value={checkInData.damaged_quantity}
                onChange={(e) =>
                  setCheckInData({
                    ...checkInData,
                    damaged_quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="condition_notes" className="text-right">
                Notes
              </Label>
              <Input
                id="condition_notes"
                value={checkInData.condition_notes}
                onChange={(e) =>
                  setCheckInData({
                    ...checkInData,
                    condition_notes: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCheckIn}>Confirm Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
