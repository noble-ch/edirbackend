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

const CreatePaymentModal = ({ isOpen, onClose, onSave, edirSlug }) => {
  const [formData, setFormData] = React.useState({
    amount: "",
    payment_type: "contribution",
    payment_method: "cash",
    status: "pending",
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
      const response = await api.post(`${edirSlug}/payments/`, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      onSave(response);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create payment");
      console.error("Payment creation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div>
            <Label>Amount</Label>
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
            <Label>Payment Type</Label>
            <Select
              name="payment_type"
              value={formData.payment_type}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contribution">Contribution</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="monthly">Monthly Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select
              name="payment_method"
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentModal;
