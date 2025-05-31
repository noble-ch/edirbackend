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
import { CalendarIcon, Check, CheckCircle, Circle } from "lucide-react";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";

const CreateReminderModal = ({ isOpen, onClose, onSave, edirslug }) => {
  const [formData, setFormData] = useState({
    reminder_type: "payment_due",
    subject: "",
    message: "",
    channel: "email",
    scheduled_time: new Date(),
    recipients: [],
  });

  const [members, setMembers] = useState([]);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  const fetchMembers = async () => {
    try {
      const data = await api.get(`${edirslug}/members/`);
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch members");
      console.error("Fetch members error:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      // Reset form when opening
      setFormData({
        reminder_type: "payment_due",
        subject: "",
        message: "",
        channel: "email",
        scheduled_time: new Date(),
        recipients: [],
      });
      setDate(new Date());
      setSelectAll(false);
    }
  }, [isOpen, edirslug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecipientChange = (id, checked) => {
    setFormData((prev) => {
      const newRecipients = checked
        ? [...prev.recipients, id]
        : prev.recipients.filter((memberId) => memberId !== id);

      // Update selectAll state based on current selection
      if (checked && newRecipients.length === members.length) {
        setSelectAll(true);
      } else if (!checked && selectAll) {
        setSelectAll(false);
      }

      return { ...prev, recipients: newRecipients };
    });
  };

  const toggleSelectAll = (checked) => {
    setSelectAll(checked);
    setFormData((prev) => ({
      ...prev,
      recipients: checked ? members.map((member) => member.id) : [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        edir: edirslug,
        scheduled_time: date.toISOString(),
        recipients: formData.recipients,
      };

      const newReminder = await api.post(`${edirslug}/reminders/`, payload);
      onSave(newReminder);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create reminder"
      );
      console.error("Create reminder error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Reminder</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}

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
                  <SelectItem value="general">General Announcement</SelectItem>
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
              placeholder="Reminder subject"
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
              placeholder="Type your reminder message here..."
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
                  {date ? format(date, "PPPp") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
                <div className="p-3 border-t">
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
                    className="w-full"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Recipients</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
            </div>

            <div className="border rounded p-2 max-h-60 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No members available
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                      onClick={() =>
                        handleRecipientChange(
                          member.id,
                          !formData.recipients.includes(member.id)
                        )
                      }
                    >
                      <button
                        type="button"
                        className="flex items-center space-x-2 w-full text-left"
                      >
                        {formData.recipients.includes(member.id) ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span>{member.full_name}</span>
                        {member.phone_number && (
                          <span className="text-xs text-gray-500 ml-auto">
                            SMS
                          </span>
                        )}
                        {member.email && (
                          <span className="text-xs text-gray-500 ml-1">
                            Email
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.recipients.length === 0}
            >
              {loading ? "Creating..." : "Create Reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReminderModal;
