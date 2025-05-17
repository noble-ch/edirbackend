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

const PaymentsTable = ({ edirSlug }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    console.log(edirSlug);
    const fetchPayments = async () => {
      try {
        const data = await api.get(`${edirSlug}/payments/`);
        setPayments(data);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?"))
      return;

    try {
      await api.delete(`${edirSlug}/payments/${id}/`);
      setPayments(payments.filter((payment) => payment.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete payment");
      console.error("Delete payment error:", err);
    }
  };

  if (loading) return <div>Loading payments...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Payment
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8">No payments found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.id}</TableCell>
                <TableCell>${payment.amount}</TableCell>
                <TableCell>{payment.payment_type}</TableCell>
                <TableCell>{payment.status}</TableCell>
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
        onSave={(newPayment) => {
          setPayments([newPayment, ...payments]);
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
              setPayments(
                payments.map((p) =>
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
