import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function PenaltyDetails({ isOpen, onClose, penalty }) {
  if (!isOpen || !penalty) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Penalty Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Member:</span>
            <span className="col-span-3">{penalty.member_name || "N/A"}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Amount:</span>
            <span className="col-span-3">${penalty.amount}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Type:</span>
            <span className="col-span-3 capitalize">
              {penalty.penalty_type.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Status:</span>
            <span className="col-span-3 capitalize">{penalty.status}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Reason:</span>
            <span className="col-span-3">{penalty.reason || "N/A"}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Created At:</span>
            <span className="col-span-3">{formatDate(penalty.created_at)}</span>
          </div>

          {penalty.updated_at && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Updated At:</span>
              <span className="col-span-3">
                {formatDate(penalty.updated_at)}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PenaltyDetails;
