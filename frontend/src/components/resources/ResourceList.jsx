import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const CATEGORY_CHOICES = [
  { value: "equipment", label: "Equipment" },
  { value: "venue", label: "Venue" },
  { value: "supply", label: "Supply" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

const CONDITION_CHOICES = [
  { value: "new", label: "New" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "broken", label: "Broken" },
];

export const ResourceList = () => {
  const { edirslug } = useParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    quantity: 1,
    purchase_price: "",
    rental_price_per_day: "",
    replacement_cost: "",
    condition: "good",
    purchase_date: "",
    expected_lifespan: "",
    serial_number: "",
    location: "",
    maintenance_frequency: "",
    available: true,
  });

  useEffect(() => {
    fetchResources();
  }, [edirslug]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await api.get(`${edirslug}/resources/`);
      setResources(data);
    } catch (error) {
      toast.error("Failed to fetch resources");
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = () => {
    setEditingResource(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      quantity: 1,
      purchase_price: "",
      rental_price_per_day: "",
      replacement_cost: "",
      condition: "good",
      purchase_date: "",
      expected_lifespan: "",
      serial_number: "",
      location: "",
      maintenance_frequency: "",
      available: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditClick = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      description: resource.description,
      category: resource.category,
      quantity: resource.quantity,
      purchase_price: resource.purchase_price,
      rental_price_per_day: resource.rental_price_per_day,
      replacement_cost: resource.replacement_cost,
      condition: resource.condition,
      purchase_date: resource.purchase_date?.split("T")[0] || "",
      expected_lifespan: resource.expected_lifespan,
      serial_number: resource.serial_number,
      location: resource.location,
      maintenance_frequency: resource.maintenance_frequency,
      available: resource.available,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (resource) => {
    setResourceToDelete(resource);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`${edirslug}/resources/${resourceToDelete.id}/`);
      toast.success("Resource deleted successfully");
      fetchResources();
    } catch (error) {
      toast.error("Failed to delete resource");
      console.error("Error deleting resource:", error);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleAvailability = async (resource) => {
    try {
      await api.patch(`${edirslug}/resources/${resource.id}/`, {
        available: !resource.available,
      });
      toast.success(
        `Resource marked as ${
          !resource.available ? "available" : "unavailable"
        }`
      );
      fetchResources();
    } catch (error) {
      toast.error("Failed to update resource status");
      console.error("Error updating resource:", error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await api.patch(
          `${edirslug}/resources/${editingResource.id}/`,
          formData
        );
        toast.success("Resource updated successfully");
      } else {
        await api.post(`${edirslug}/resources/`, formData);
        toast.success("Resource created successfully");
      }
      fetchResources();
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(
        `Failed to ${editingResource ? "update" : "create"} resource`
      );
      console.error("Error saving resource:", error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading resources...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Resource Inventory</h2>
        <Button onClick={handleAddResource}>Add New Resource</Button>
      </div>

      <Table>
        <TableCaption>List of available resources</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource.id}>
              <TableCell className="font-medium">{resource.name}</TableCell>
              <TableCell>
                {resource.get_category_display || resource.category}
              </TableCell>
              <TableCell>{resource.quantity}</TableCell>
              <TableCell>
                {resource.get_condition_display || resource.condition}
              </TableCell>
              <TableCell>${resource.purchase_price || "N/A"}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  onClick={() => handleToggleAvailability(resource)}
                  className={`px-2 py-1 rounded-full text-xs ${
                    resource.available
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {resource.available ? "Available" : "Unavailable"}
                </Button>
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(resource)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(resource)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <span className="font-semibold">{resourceToDelete?.name}</span>{" "}
              resource.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit/Create Resource Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-screen">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "Edit Resource" : "Add New Resource"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name*</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category*</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleSelectChange("category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_CHOICES.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity*</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) =>
                    handleSelectChange("condition", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_CHOICES.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                <Input
                  id="purchase_price"
                  name="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={handleFormChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rental_price_per_day">
                  Rental Price/Day ($)
                </Label>
                <Input
                  id="rental_price_per_day"
                  name="rental_price_per_day"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rental_price_per_day}
                  onChange={handleFormChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="replacement_cost">Replacement Cost ($)</Label>
                <Input
                  id="replacement_cost"
                  name="replacement_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.replacement_cost}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={handleFormChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_lifespan">
                  Expected Lifespan (months)
                </Label>
                <Input
                  id="expected_lifespan"
                  name="expected_lifespan"
                  type="number"
                  min="1"
                  value={formData.expected_lifespan}
                  onChange={handleFormChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_frequency">
                  Maintenance Frequency (days)
                </Label>
                <Input
                  id="maintenance_frequency"
                  name="maintenance_frequency"
                  type="number"
                  min="1"
                  value={formData.maintenance_frequency}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleFormChange}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="available"
                name="available"
                type="checkbox"
                checked={formData.available}
                onChange={handleFormChange}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="available">Available</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingResource ? "Save Changes" : "Create Resource"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
