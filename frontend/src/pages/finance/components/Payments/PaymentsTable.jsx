import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import CreatePaymentModal from "./CreatePaymentModal";
import EditPaymentModal from "./EditPaymentModal";
import PaymentDetails from "./PaymentDetails";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths, parseISO } from "date-fns";

const PaymentsTable = ({ edirSlug }) => {
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Payment type options from your model
  const paymentTypes = [
    { value: "all", label: "All Payments" },
    { value: "contribution", label: "Event Contribution" },
    { value: "monthly", label: "Monthly Fee" },
    { value: "penalty", label: "Penalty" },
    { value: "donation", label: "Donation" },
    { value: "other", label: "Other" },
  ];

  // Generate month options (last 12 months + "All time")
  const monthOptions = [
    { value: "all", label: "All Time" },
    ...Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      };
    }).reverse(),
  ];

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await api.get(`${edirSlug}/payments/`);
        setAllPayments(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch payments");
        console.error("Fetch payments error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [edirSlug]);

  useEffect(() => {
    // Apply filters whenever allPayments, activeTab, or selectedMonth changes
    let result = [...allPayments];

    // Filter by payment type
    if (activeTab !== "all") {
      result = result.filter((payment) => payment.payment_type === activeTab);
    }

    // Filter by month
    if (selectedMonth !== "all") {
      result = result.filter((payment) => {
        if (!payment.payment_date) return false;
        const paymentDate =
          typeof payment.payment_date === "string"
            ? parseISO(payment.payment_date)
            : new Date(payment.payment_date);
        return format(paymentDate, "yyyy-MM") === selectedMonth;
      });
    }

    setFilteredPayments(result);
  }, [allPayments, activeTab, selectedMonth]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?"))
      return;

    try {
      await api.delete(`${edirSlug}/payments/${id}/`);
      setAllPayments(allPayments.filter((payment) => payment.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete payment");
      console.error("Delete payment error:", err);
    }
  };

  if (loading) return <div>Loading payments...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          {/* Payment Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {paymentTypes.map((type) => (
                <TabsTrigger key={type.value} value={type.value}>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Month Filter */}
        <div className="w-40">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Payment
        </Button>
      </div>

      {/* Payment Count Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredPayments.length} of {allPayments.length} payments
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center py-8">
          No payments found matching your filters
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.id}</TableCell>
                <TableCell>{payment.member_name}</TableCell>
                <TableCell>${payment.amount}</TableCell>
                <TableCell>
                  {payment.payment_type_display || payment.payment_type}
                </TableCell>
                <TableCell>
                  {payment.payment_date
                    ? format(new Date(payment.payment_date), "MMM dd, yyyy")
                    : "Not set"}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      payment.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : payment.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : payment.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {payment.status_display || payment.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(payment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modals */}
      <CreatePaymentModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={(newPayments) => {
          setAllPayments([...newPayments, ...allPayments]);
        }}
        edirSlug={edirSlug}
      />

      {selectedPayment && (
        <>
          <EditPaymentModal
            isOpen={isEditModalOpen}
            onClose={() => setEditModalOpen(false)}
            payment={selectedPayment}
            onSave={(updatedPayment) => {
              setAllPayments(
                allPayments.map((p) =>
                  p.id === updatedPayment.id ? updatedPayment : p
                )
              );
              setEditModalOpen(false);
            }}
            edirSlug={edirSlug}
          />

          <PaymentDetails
            isOpen={isDetailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            payment={selectedPayment}
          />
        </>
      )}
    </div>
  );
};

export default PaymentsTable;
