import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

const BulkCreatePaymentsModal = ({ isOpen, onClose, onSave, edirSlug }) => {
  const [formData, setFormData] = React.useState({
    amount: "",
    payment_type: "monthly",
    notes: "",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // api.post() returns just the data array directly
      const createdPayments = await api.post(
        `${edirSlug}/payments/bulk_create/`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
        }
      );

      if (!createdPayments || !Array.isArray(createdPayments)) {
        throw new Error("Invalid response format from server");
      }

      toast("Payments created successfully");

      onSave(createdPayments);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create payments");
      console.error("Bulk payment creation error:", err);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Payments for All Members</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <Label>Payment Type *</Label>
            <Select
              name="payment_type"
              value={formData.payment_type}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_type: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Fee</SelectItem>
                <SelectItem value="contribution">
                  Special Contribution
                </SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional description for all payments"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Payments"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCreatePaymentsModal;
