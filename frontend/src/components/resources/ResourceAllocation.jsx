import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useParams, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";

export const ResourceAllocation = () => {
  const { edirslug } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    resource: "",
    event: "",
    quantity: 1,
    start_date: "",
    end_date: "",
    purpose: "",
    special_requirements: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resData, evtData] = await Promise.all([
          api.get(`${edirslug}/resources/?available=true`),
          api.get(`${edirslug}/events/?status=upcoming`),
        ]);
        setResources(resData);
        setEvents(evtData);
      } catch (error) {
        toast.error("Failed to fetch data");
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [edirslug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`${edirslug}/resource-allocations/`, formData);
      toast.success("Resource allocation request submitted successfully!");
      navigate(`/${edirslug}/propertymanager/dashboard`);
    } catch (error) {
      toast.error("Failed to submit allocation request");
      console.error("Error submitting allocation:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateDuration = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const selectedResource = resources.find(
    (r) => r.id.toString() === formData.resource
  );
  const duration = calculateDuration();
  const estimatedCost =
    selectedResource && duration
      ? (selectedResource.rental_price_per_day || 0) *
        duration *
        formData.quantity
      : 0;

  if (loading) {
    return <div className="p-6">Loading data...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Request Resource Allocation</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="resource">Resource*</Label>
          <Select
            value={formData.resource}
            onValueChange={(value) => handleSelectChange("resource", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a resource" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id.toString()}>
                  {resource.name} ({resource.category}) - Qty:{" "}
                  {resource.quantity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedResource && (
            <div className="mt-1 text-sm text-muted-foreground">
              <p>Condition: {selectedResource.condition}</p>
              <p>
                Rental Price: ${selectedResource.rental_price_per_day || 0}/day
              </p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="event">Event*</Label>
          <Select
            value={formData.event}
            onValueChange={(value) => handleSelectChange("event", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.title} (
                  {new Date(event.start_date).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Quantity*</Label>
            <Input
              type="number"
              name="quantity"
              min="1"
              max={selectedResource?.quantity || 1}
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex items-end">
            {selectedResource && (
              <p className="text-sm text-muted-foreground">
                Available:{" "}
                {selectedResource.quantity -
                  (selectedResource.allocated_quantity || 0)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Start Date/Time*</Label>
            <Input
              type="datetime-local"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="end_date">End Date/Time*</Label>
            <Input
              type="datetime-local"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              min={formData.start_date}
              required
            />
          </div>
        </div>

        {duration > 0 && (
          <div className="text-sm">
            <p>
              Duration: {duration} day{duration !== 1 ? "s" : ""}
            </p>
            {selectedResource?.rental_price_per_day && (
              <p>Estimated Cost: ${estimatedCost.toFixed(2)}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="purpose">Purpose*</Label>
          <Textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="special_requirements">Special Requirements</Label>
          <Textarea
            name="special_requirements"
            value={formData.special_requirements}
            onChange={handleChange}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          Submit Request
        </Button>
      </form>
    </div>
  );
};

export default ResourceAllocation;
