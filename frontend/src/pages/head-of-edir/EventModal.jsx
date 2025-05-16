import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Calendar, MapPin, Info, Type } from "lucide-react";

function EventModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  handleInputChange,
  isLoading,
  isCreate,
  onDelete,
  title,
}) {
  const formatDateTimeForInput = (dateTimeString) => {
    if (!dateTimeString) return "";
    try {
      return format(new Date(dateTimeString), "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      return dateTimeString.includes("T") ? dateTimeString : "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90dvh] overflow-y-auto rounded-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isCreate
              ? "Create a new event with all the necessary details"
              : "Update your event information"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6 py-2">
          <div className="space-y-4">
            {/* Event Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-gray-500" />
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Event Title
                </Label>
              </div>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter event title"
                className="focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-500" />
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
              </div>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Provide details about the event"
                className="focus:ring-2 focus:ring-primary/50 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Type */}
              <div className="space-y-2">
                <Label htmlFor="event_type" className="text-sm font-medium text-gray-700">
                  Event Type
                </Label>
                <Select
                  name="event_type"
                  value={formData.event_type}
                  onValueChange={(value) =>
                    handleInputChange({ target: { name: "event_type", value } })
                  }
                >
                  <SelectTrigger id="event_type" className="focus:ring-2 focus:ring-primary/50">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent className="focus:ring-2 focus:ring-primary/50">
                    <SelectItem value="bereavement">Bereavement</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="birth">Birth</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="fundraising">Fundraising</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location
                  </Label>
                </div>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  placeholder="Event venue or address"
                  className="focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="start_date" className="text-sm font-medium text-gray-700">
                    Start Date & Time
                  </Label>
                </div>
                <Input
                  id="start_date"
                  type="datetime-local"
                  name="start_date"
                  value={formatDateTimeForInput(formData.start_date)}
                  onChange={handleInputChange}
                  required
                  className="focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="end_date" className="text-sm font-medium text-gray-700">
                    End Date & Time
                    <span className="text-xs text-gray-500 ml-1">(optional)</span>
                  </Label>
                </div>
                <Input
                  id="end_date"
                  type="datetime-local"
                  name="end_date"
                  value={formatDateTimeForInput(formData.end_date)}
                  onChange={handleInputChange}
                  className="focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Active Event */}
            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleInputChange({
                    target: { name: "is_active", type: "checkbox", checked },
                  })
                }
                className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-primary"
              />
              <Label
                htmlFor="is_active"
                className="text-sm font-medium leading-none text-gray-700"
              >
                Active Event
                <p className="text-xs font-normal text-gray-500 mt-1">
                  Toggle to show/hide this event from public view
                </p>
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row sm:justify-between gap-3">
            {!isCreate && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Event
              </Button>
            )}
            <div className="flex gap-3 w-full sm:w-auto">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreate ? "Create Event" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EventModal;