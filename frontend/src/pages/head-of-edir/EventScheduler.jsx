import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { API_BASE_URL, parseErrorResponse } from "../../services/authService";
import EventModal from "./EventModal";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  MapPin,
  PlusCircle,
  Edit3,
  Trash2,
  XCircle,
  Calendar as CalendarIcon,
  Users,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const initialFormData = {
  title: "",
  description: "",
  event_type: "meeting",
  start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  end_date: "",
  location: "",
  is_active: true,
};

function EventScheduler() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const { edirslug } = useParams();

  const [formData, setFormData] = useState(initialFormData);

  const fetchEvents = useCallback(async () => {
    if (!edirslug) {
      setError("Edir slug not found in URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication token not found.");
      
      const response = await fetch(`${API_BASE_URL}/${edirslug}/events/`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
      });
      
      if (!response.ok) throw new Error(await parseErrorResponse(response));
      
      const data = await response.json();
      setEvents(data.results || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [edirslug]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const resetFormAndCloseModals = () => {
    setFormData(initialFormData);
    setShowCreateModal(false);
    setShowEditModal(false);
    setCurrentEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/${edirslug}/events/`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error(await parseErrorResponse(response));
      
      await fetchEvents();
      resetFormAndCloseModals();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentEvent) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/${edirslug}/events/${currentEvent.id}/`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error(await parseErrorResponse(response));
      
      await fetchEvents();
      resetFormAndCloseModals();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (event) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: format(parseISO(event.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: event.end_date ? format(parseISO(event.end_date), "yyyy-MM-dd'T'HH:mm") : "",
      location: event.location,
      is_active: event.is_active,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (eventIdToDelete) => {
    if (!window.confirm("Are you sure you want to permanently delete this event?")) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/${edirslug}/events/${eventIdToDelete}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error(await parseErrorResponse(response));
      
      await fetchEvents();
      if (showEditModal && currentEvent?.id === eventIdToDelete) {
        resetFormAndCloseModals();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const eventTypeColors = {
    bereavement: "bg-gray-100 text-gray-800",
    wedding: "bg-pink-100 text-pink-800",
    birth: "bg-blue-100 text-blue-800",
    graduation: "bg-purple-100 text-purple-800",
    meeting: "bg-green-100 text-green-800",
    fundraising: "bg-amber-100 text-amber-800",
    other: "bg-indigo-100 text-indigo-800",
  };

  const eventTypeIcons = {
    bereavement: <Users className="h-4 w-4" />,
    wedding: <CalendarIcon className="h-4 w-4" />,
    birth: <CalendarIcon className="h-4 w-4" />,
    graduation: <CalendarIcon className="h-4 w-4" />,
    meeting: <Users className="h-4 w-4" />,
    fundraising: <CalendarIcon className="h-4 w-4" />,
    other: <CalendarIcon className="h-4 w-4" />,
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Event Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule and manage all {edirslug} events in one place
          </p>
        </div>
        <Button 
          onClick={() => { 
            setFormData(initialFormData); 
            setShowCreateModal(true); 
          }}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-200">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {events.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <CalendarIcon className="h-10 w-10 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No events scheduled</h3>
          <p className="text-sm text-gray-500 mb-4">
            Get started by creating your first event
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Events</p>
                  <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Upcoming</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {events.filter(e => new Date(e.start_date) > new Date()).length}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {events.filter(e => e.is_active).length}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <Card 
                key={event.id} 
                className={`overflow-hidden transition-all hover:shadow-md ${!event.is_active ? 'opacity-80' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                      {event.title}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`${eventTypeColors[event.event_type]} capitalize text-xs font-medium`}
                    >
                      {eventTypeIcons[event.event_type]}
                      <span className="ml-1">{event.event_type}</span>
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-sm mt-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    {format(parseISO(event.start_date), "MMM d, yyyy")}
                    {event.end_date && (
                      <>
                        <span className="mx-1">-</span>
                        {format(parseISO(event.end_date), "MMM d, yyyy")}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {event.description || "No description provided"}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-500" />
                    {format(parseISO(event.start_date), "h:mm a")}
                    {event.end_date && (
                      <>
                        <span className="mx-1">to</span>
                        {format(parseISO(event.end_date), "h:mm a")}
                      </>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between items-center pt-0 border-t">
                  <p className="text-xs text-gray-500">
                    Created by {event.user_full_name || 'Admin'}
                  </p>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditModal(event)}
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <EventModal
          isOpen={showCreateModal}
          onClose={resetFormAndCloseModals}
          onSubmit={handleSubmit}
          formData={formData}
          handleInputChange={handleInputChange}
          isLoading={isLoading}
          isCreate={true}
          title="Create New Event"
        />
      )}

      {showEditModal && currentEvent && (
        <EventModal
          isOpen={showEditModal}
          onClose={resetFormAndCloseModals}
          onSubmit={handleEditSubmit}
          formData={formData}
          handleInputChange={handleInputChange}
          isLoading={isLoading}
          isCreate={false}
          onDelete={() => handleDelete(currentEvent.id)}
          title="Edit Event"
        />
      )}
    </div>
  );
}

export default EventScheduler;