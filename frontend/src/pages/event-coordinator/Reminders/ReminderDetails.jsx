import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { api } from "@/lib/api";

const ReminderDetails = ({ isOpen, onClose, reminder, edirslug }) => {
  const [memberDetails, setMemberDetails] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!reminder?.recipients) return;
      
      setLoading(true);
      try {
        const responses = await Promise.all(
          reminder.recipients.map((memberId) =>
            api.get(`${edirslug}/members/${memberId}/`)
          )
        );
        setMemberDetails(responses);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch member details');
        console.error('Fetch member details error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberDetails();
  }, [reminder, edirslug]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reminder Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Subject:</Label>
            <p className="font-medium">{reminder.subject}</p>
          </div>

          <div>
            <Label>Message:</Label>
            <p className="whitespace-pre-line">{reminder.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type:</Label>
              <p>{reminder.reminder_type}</p>
            </div>

            <div>
              <Label>Channel:</Label>
              <p>{reminder.channel}</p>
            </div>

            <div>
              <Label>Status:</Label>
              <p>{reminder.status}</p>
            </div>

            <div>
              <Label>Scheduled Time:</Label>
              <p>{format(new Date(reminder.scheduled_time), "PPPpp")}</p>
            </div>
          </div>

          <div>
            <Label>Recipients ({reminder.recipients?.length || 0}):</Label>
            {loading ? (
              <div>Loading recipients...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {memberDetails.map((member) => (
                  <div key={member.id} className="py-1">
                    {member.full_name} ({member.email})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDetails;