import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useParams } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
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
} from "../ui/alert-dialog";
export const ResourceUsageTracker = () => {
  const { edirslug } = useParams();
  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [recordToCheckIn, setRecordToCheckIn] = useState(null);
  const [checkInForm, setCheckInForm] = useState({
    condition: "good",
    notes: "",
    returned_quantity: 0,
    damaged_quantity: 0,
  });

  useEffect(() => {
    fetchUsageRecords();
  }, [edirslug]);

  const fetchUsageRecords = async () => {
    try {
      setLoading(true);
      const data = await api.get(`${edirslug}/resource-usage/`);
      setUsageRecords(data);
    } catch (error) {
      toast.error("Failed to fetch usage records");
      console.error("Error fetching usage records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInClick = (record) => {
    setRecordToCheckIn(record);
    setCheckInForm({
      condition: record.post_use_condition || "good",
      notes: record.condition_notes || "",
      returned_quantity:
        record.returned_quantity || record.allocation?.quantity || 0,
      damaged_quantity: record.damaged_quantity || 0,
    });
    setCheckInDialogOpen(true);
  };

  const handleCheckInSubmit = async () => {
    try {
      await api.patch(
        `${edirslug}/resource-usage/${recordToCheckIn.id}/check_in/`,
        {
          actual_end: new Date().toISOString(),
          post_use_condition: checkInForm.condition,
          condition_notes: checkInForm.notes,
          returned_quantity: checkInForm.returned_quantity,
          damaged_quantity: checkInForm.damaged_quantity,
        }
      );
      toast.success("Resource checked in successfully");
      fetchUsageRecords();
      setCheckInDialogOpen(false);
    } catch (error) {
      toast.error("Failed to check in resource");
      console.error("Error checking in resource:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) return <div className="p-6">Loading usage records...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Resource Usage Tracking</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Checked Out</TableHead>
            <TableHead>Checked In</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usageRecords.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">
                {record.resource_name || "N/A"}
              </TableCell>
              <TableCell>{record?.event_title || "N/A"}</TableCell>
              <TableCell>{record?.member_name || "N/A"}</TableCell>
              <TableCell>
                {record.actual_start
                  ? formatDate(record.actual_start)
                  :  <span className="text-yellow-600">pending</span>}
              </TableCell>
              <TableCell>
                {record.actual_end ? (
                  formatDate(record.actual_end)
                ) : (
                  <span className="text-yellow-600">In Use</span>
                )}
              </TableCell>
              <TableCell>
                {record.actual_start
                  ? (record.post_use_condition ||
                    record.pre_use_condition ||
                    "Good")
                  : "N/A"}
              </TableCell>
              <TableCell>
                {record.returned_quantity !== undefined
                  ? `${record.returned_quantity}/${
                      record.allocation?.quantity || 0
                    }`
                  : record.allocation?.quantity || 0}
                {record.damaged_quantity > 0 && (
                  <span className="text-red-500 ml-1">
                    ({record.damaged_quantity} damaged)
                  </span>
                )}
              </TableCell>
              <TableCell>
                {!record.actual_end && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCheckInClick(record)}
                    disabled={!record.checked_out_by}
                  >
                    Check In
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Check In Dialog */}
      <AlertDialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check In Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Complete the details for{" "}
              {recordToCheckIn?.allocation?.resource?.name || "the resource"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Condition
              </label>
              <select
                className="w-full p-2 border rounded"
                value={checkInForm.condition}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, condition: e.target.value })
                }
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Returned Quantity
              </label>
              <input
                type="number"
                min="0"
                max={recordToCheckIn?.allocation?.quantity || 0}
                className="w-full p-2 border rounded"
                value={checkInForm.returned_quantity}
                onChange={(e) =>
                  setCheckInForm({
                    ...checkInForm,
                    returned_quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Damaged Quantity
              </label>
              <input
                type="number"
                min="0"
                max={checkInForm.returned_quantity}
                className="w-full p-2 border rounded"
                value={checkInForm.damaged_quantity}
                onChange={(e) =>
                  setCheckInForm({
                    ...checkInForm,
                    damaged_quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full p-2 border rounded"
                value={checkInForm.notes}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, notes: e.target.value })
                }
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckInSubmit}>
              Complete Check In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
