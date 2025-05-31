import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  CandlestickChart,
  Heart,
  Share2,
  PlusCircle,
} from "lucide-react";

export default function MemorialPage() {
  const { edirSlug } = useParams();
  const [memorials, setMemorials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMemorial, setCurrentMemorial] = useState(null);
  const [formData, setFormData] = useState({
    member: "",
    title: "",
    description: "",
    date_of_passing: "",
    memorial_date: "",
    location: "",
    is_public: false,
    photo: null,
  });

  useEffect(() => {
    fetchMemorials();
  }, [edirSlug]);

  const fetchMemorials = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/edirs/${edirSlug}/memorials/`);
      setMemorials(response.data);
    } catch (error) {
      console.error("Error fetching memorials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, photo: e.target.files[0] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          data.append(key, value);
        }
      });

      if (currentMemorial) {
        await axios.patch(
          `/api/edirs/${edirSlug}/memorials/${currentMemorial.id}/`,
          data
        );
      } else {
        await axios.post(`/api/edirs/${edirSlug}/memorials/`, data);
      }
      fetchMemorials();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving memorial:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/edirs/${edirSlug}/memorials/${id}/`);
      fetchMemorials();
    } catch (error) {
      console.error("Error deleting memorial:", error);
    }
  };

  const openCreateDialog = () => {
    setCurrentMemorial(null);
    setFormData({
      member: "",
      title: "",
      description: "",
      date_of_passing: "",
      memorial_date: "",
      location: "",
      is_public: false,
      photo: null,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (memorial) => {
    setCurrentMemorial(memorial);
    setFormData({
      member: memorial.member.id,
      title: memorial.title,
      description: memorial.description,
      date_of_passing: memorial.date_of_passing,
      memorial_date: memorial.memorial_date,
      location: memorial.location,
      is_public: memorial.is_public,
      photo: null,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2">
          <CandlestickChart className="w-8 h-8 text-emerald-700" />
          <h1 className="text-3xl font-bold text-emerald-800">
            In Loving Memory
          </h1>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Memorial
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
        </div>
      ) : memorials.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <CandlestickChart className="mx-auto h-16 w-16 text-emerald-700" />
          <h3 className="text-xl font-medium text-gray-600">
            No memorials yet
          </h3>
          <p className="text-gray-500">Be the first to honor a loved one</p>
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-700 hover:bg-emerald-800"
          >
            Create Memorial
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memorials.map((memorial) => (
            <div
              key={memorial.id}
              className="border rounded-lg hover:shadow-lg transition-shadow"
            >
              {memorial.photo && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={memorial.photo}
                    alt={memorial.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={memorial.member.profile_picture} />
                    <AvatarFallback>
                      {memorial.member.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-800">
                      {memorial.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {memorial.member.full_name}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 line-clamp-3 my-4">
                  {memorial.description}
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Passed:</span>{" "}
                    {format(new Date(memorial.date_of_passing), "MMMM d, yyyy")}
                  </p>
                  <p>
                    <span className="font-medium">Memorial:</span>{" "}
                    {format(new Date(memorial.memorial_date), "MMMM d, yyyy")}{" "}
                    at {memorial.location}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-between border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-red-500"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Remember
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => openEditDialog(memorial)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(memorial.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">
              {currentMemorial ? "Edit Memorial" : "Create Memorial"}
            </DialogTitle>
            <DialogDescription>
              {currentMemorial
                ? "Update the memorial details"
                : "Create a new memorial to honor a loved one"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member">Member ID</Label>
                <Input
                  id="member"
                  name="member"
                  type="number"
                  value={formData.member}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_passing">Date of Passing</Label>
                <Input
                  id="date_of_passing"
                  name="date_of_passing"
                  type="date"
                  value={formData.date_of_passing}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memorial_date">Memorial Date</Label>
                <Input
                  id="memorial_date"
                  name="memorial_date"
                  type="date"
                  value={formData.memorial_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="is_public"
                name="is_public"
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) =>
                  setFormData({ ...formData, is_public: e.target.checked })
                }
                className="h-4 w-4 text-emerald-700 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <Label htmlFor="is_public">Make this memorial public</Label>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {currentMemorial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
