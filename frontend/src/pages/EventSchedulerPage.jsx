import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { API_BASE_URL, parseErrorResponse } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { StepBack } from "lucide-react";

function EventSchedulerPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const { edirslug } = useParams();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "meeting",
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: "",
    location: "",
    is_active: true,
  });
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };
  // Fetch events
  useEffect(() => {
    console.log("edirslug", edirslug);

    const fetchEvents = async () => {

      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(`${API_BASE_URL}/${edirslug}/events/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(await parseErrorResponse(response));
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [edirslug]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      const newEvent = await response.json();
      setEvents([...events, newEvent]);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/${edirslug}/events/${currentEvent.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      const updatedEvent = await response.json();
      setEvents(
        events.map((event) =>
          event.id === currentEvent.id ? updatedEvent : event
        )
      );
      setShowEditModal(false);
      resetForm();
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
      end_date: event.end_date
        ? format(parseISO(event.end_date), "yyyy-MM-dd'T'HH:mm")
        : "",
      location: event.location,
      is_active: event.is_active,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "meeting",
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_date: "",
      location: "",
      is_active: true,
    });
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/${edirslug}/events/${eventId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      setEvents(events.filter((event) => event.id !== eventId));
      if (showEditModal && currentEvent?.id === eventId) {
        setShowEditModal(false);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const eventTypeColors = {
    bereavement: "bg-gray-200",
    wedding: "bg-pink-100",
    birth: "bg-blue-100",
    graduation: "bg-purple-100",
    meeting: "bg-green-100",
    fundraising: "bg-yellow-100",
    other: "bg-indigo-100",
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <button
        className="flex cursor-pointer items-center text-gray-600 hover:text-blue-600 mb-4"
        onClick={handleBack}
      >
        <StepBack />
        back dashboard
      </button>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Event Scheduler
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition duration-200"
          >
            Create New Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No events scheduled yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${
                  eventTypeColors[event.event_type]
                } rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(
                          parseISO(event.start_date),
                          "MMMM do, yyyy h:mm a"
                        )}
                        {event.end_date &&
                          ` - ${format(
                            parseISO(event.end_date),
                            "MMMM do, yyyy h:mm a"
                          )}`}
                      </p>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-white rounded-full">
                      {event.event_type}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-700">{event.description}</p>

                  <div className="mt-4 flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {event.location}
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Created by {event.created_by} on{" "}
                      {format(parseISO(event.created_at), "MMM d, yyyy")}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(event)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <EventModal
            title="Create New Event"
            onSubmit={handleSubmit}
            onClose={() => setShowCreateModal(false)}
            formData={formData}
            handleInputChange={handleInputChange}
            isLoading={isLoading}
            isCreate={true}
          />
        )}

        {/* Edit Event Modal */}
        {showEditModal && currentEvent && (
          <EventModal
            title="Edit Event"
            onSubmit={handleEditSubmit}
            onClose={() => setShowEditModal(false)}
            formData={formData}
            handleInputChange={handleInputChange}
            isLoading={isLoading}
            isCreate={false}
            onDelete={() => handleDelete(currentEvent.id)}
          />
        )}
      </div>
    </div>
  );
}

// Reusable Modal Component
function EventModal({
  title,
  onSubmit,
  onClose,
  formData,
  handleInputChange,
  isLoading,
  isCreate,
  onDelete,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="bereavement">Bereavement</option>
                  <option value="wedding">Wedding</option>
                  <option value="birth">Birth</option>
                  <option value="graduation">Graduation</option>
                  <option value="meeting">Meeting</option>
                  <option value="fundraising">Fundraising</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date & Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_active"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Active Event
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              {!isCreate && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              )}

              <div className="flex space-x-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading
                    ? isCreate
                      ? "Creating..."
                      : "Updating..."
                    : isCreate
                    ? "Create"
                    : "Update"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EventSchedulerPage;
