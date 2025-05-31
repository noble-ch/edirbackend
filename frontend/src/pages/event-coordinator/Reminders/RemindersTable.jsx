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
import { Plus, Edit, Trash2, Eye, Send } from "lucide-react";
import CreateReminderModal from "./CreateReminderModal";
import EditReminderModal from "./EditReminderModal";
import ReminderDetails from "./ReminderDetails";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Month } from "react-day-picker";
// import MonthlyReminder from "./MonthlyReminder";

const RemindersTable = () => {
  const { edirslug } = useParams();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const fetchReminders = async () => {
    try {
      const data = await api.get(`${edirslug}/reminders/`);
      setReminders(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch reminders");
      console.error("Fetch reminders error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (id) => {
    try {
      await api.post(`${edirslug}/reminders/${id}/send_now/`);
      fetchReminders(); // Refresh the list
    } catch (err) {
      setError(err.message || "Failed to send reminder");
      console.error("Send reminder error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?"))
      return;

    try {
      await api.delete(`${edirslug}/reminders/${id}/`);
      setReminders(reminders.filter((reminder) => reminder.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete reminder");
      console.error("Delete reminder error:", err);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [edirslug]);

  if (loading) return <div>Loading reminders...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Reminder
        </Button>
        {/* <MonthlyReminder /> */}
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-8">No reminders found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reminders.map((reminder) => (
              <TableRow key={reminder.id}>
                <TableCell>{reminder.subject}</TableCell>
                <TableCell>{reminder.reminder_type}</TableCell>
                <TableCell>{reminder.channel}</TableCell>
                <TableCell>{reminder.status}</TableCell>
                <TableCell>
                  {new Date(reminder.scheduled_time).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedReminder(reminder);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedReminder(reminder);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSendNow(reminder.id)}
                      disabled={reminder.status === "sent"}
                    >
                      <Send className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(reminder.id)}
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

      <CreateReminderModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={(newReminder) => {
          setReminders([newReminder, ...reminders]);
          setCreateModalOpen(false);
        }}
        edirslug={edirslug}
      />

      {selectedReminder && (
        <>
          <EditReminderModal
            isOpen={isEditModalOpen}
            onClose={() => setEditModalOpen(false)}
            reminder={selectedReminder}
            onSave={(updatedReminder) => {
              setReminders(
                reminders.map((r) =>
                  r.id === updatedReminder.id ? updatedReminder : r
                )
              );
              setEditModalOpen(false);
            }}
            edirslug={edirslug}
          />

          <ReminderDetails
            isOpen={isDetailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            reminder={selectedReminder}
            edirslug={edirslug}
          />
        </>
      )}
    </div>
  );
};

export default RemindersTable;
