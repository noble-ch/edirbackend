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
import CreatePenaltyModal from "./CreatePenaltyModal";
import EditPenaltyModal from "./EditPenaltyModal";
import PenaltyDetails from "./PenaltyDetails";
import { api } from "@/lib/api";

const PenaltiesTable = ({ edirSlug }) => {
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState(null);

  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const data = await api.get(`${edirSlug}/penalties/`);
        setPenalties(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch penalties");
        console.error("Fetch penalties error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPenalties();
  }, [edirSlug]);

  const handleWaive = async (id) => {
    if (!window.confirm("Are you sure you want to waive this penalty?")) return;

    try {
      // Assuming your API has an endpoint to waive penalties
      const updatedPenalty = await api.patch(`${edirSlug}/penalties/${id}/`, {
        status: "waived",
      });

      setPenalties(
        penalties.map((penalty) =>
          penalty.id === id ? updatedPenalty : penalty
        )
      );
    } catch (err) {
      setError(err.message || "Failed to waive penalty");
      console.error("Waive penalty error:", err);
    }
  };

  if (loading) return <div>Loading penalties...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Penalty
        </Button>
      </div>

      {penalties.length === 0 ? (
        <div className="text-center py-8">No penalties found</div>
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
            {penalties.map((penalty) => (
              <TableRow key={penalty.id}>
                <TableCell>{penalty.id}</TableCell>
                <TableCell>${penalty.amount}</TableCell>
                <TableCell>{penalty.penalty_type}</TableCell>
                <TableCell>{penalty.status}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPenalty(penalty);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPenalty(penalty);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleWaive(penalty.id)}
                      disabled={penalty.status === "waived"}
                    >
                      <span className="text-green-500">Waive</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modals */}
      <CreatePenaltyModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={(newPenalty) => {
          setPenalties([newPenalty, ...penalties]);
          setCreateModalOpen(false);
        }}
        edirSlug={edirSlug}
      />

      {selectedPenalty && (
        <>
          <EditPenaltyModal
            isOpen={isEditModalOpen}
            onClose={() => setEditModalOpen(false)}
            penalty={selectedPenalty}
            onSave={(updatedPenalty) => {
              setPenalties(
                penalties.map((p) =>
                  p.id === updatedPenalty.id ? updatedPenalty : p
                )
              );
              setEditModalOpen(false);
            }}
            edirSlug={edirSlug}
          />

          <PenaltyDetails
            isOpen={isDetailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            penalty={selectedPenalty}
          />
        </>
      )}
    </div>
  );
};

export default PenaltiesTable;
