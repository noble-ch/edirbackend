import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { api } from "@/lib/api";

const EditReminderModal = ({ isOpen, onClose, reminder, onSave, edirslug }) => {
  const [formData, setFormData] = useState(reminder);
  const [members, setMembers] = useState([]);
  const [date, setDate] = useState(new Date(reminder.scheduled_time));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    try {
      const data = await api.get(`${edirslug}/members/`);
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch members');
      console.error('Fetch members error:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    setFormData(reminder);
    setDate(new Date(reminder.scheduled_time));
  }, [reminder, edirslug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecipientChange = (id, checked) => {
    setFormData((prev) => {
      const newRecipients = checked
        ? [...prev.recipients, id]
        : prev.recipients.filter((memberId) => memberId !== id);
      return { ...prev, recipients: newRecipients };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const updatedReminder = await api.patch(
        `${edirslug}/reminders/${reminder.id}/`,
        {
          ...formData,
          scheduled_time: date.toISOString(),
        }
      );
      onSave(updatedReminder);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update reminder');
      console.error('Update reminder error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reminder Type</Label>
              <Select
                value={formData.reminder_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, reminder_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="event_reminder">Event Reminder</SelectItem>
                  <SelectItem value="task_reminder">Task Reminder</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) =>
                  setFormData({ ...formData, channel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                  <SelectItem value="all">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
            />
          </div>

          <div>
            <Label>Scheduled Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP HH:mm") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
                <div className="p-3">
                  <Input
                    type="time"
                    value={date ? format(date, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(date);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      setDate(newDate);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Recipients</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`member-${member.id}`}
                    checked={formData.recipients.includes(member.id)}
                    onChange={(e) =>
                      handleRecipientChange(member.id, e.target.checked)
                    }
                  />
                  <label htmlFor={`member-${member.id}`}>
                    {member.full_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReminderModal;