import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, parseErrorResponse } from "../services/authService";



function EventCoordinatorDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [taskGroups, setTaskGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
    const { edirslug } = useParams();
  

  const [newTaskGroup, setNewTaskGroup] = useState({
    name: "",
    description: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
  });
  const [selectedTaskGroupForNewTask, setSelectedTaskGroupForNewTask] = useState("");

  // Fetch all events
useEffect(() => {
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

  // Effects when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      // Clear previous data
      setTaskGroups([]);
      setTasks([]);
      setMembers([]);
      setSelectedTaskGroupForNewTask(""); // Reset selected task group for new task

      // Fetch task groups for selected event
      axios
        .get(
          `${API_BASE_URL}/task-groups/?event_id=${selectedEvent.id}`
        )
        .then((res) => setTaskGroups(res.data.results || res.data))
        .catch((err) => {
          console.error("Failed to fetch task groups:", err);
          setTaskGroups([]);
        });

      // Fetch members for the Edir (if edir ID exists on event)
      if (selectedEvent.edir) {
        axios
          .get(`${API_BASE_URL}/edirs/${selectedEvent.edir}/members/`)
          .then((res) => setMembers(res.data.results || res.data))
          .catch((err) => {
            console.error("Failed to fetch members:", err);
            setMembers([]);
          });
      } else {
        console.warn("Selected event does not have an 'edir' property. Cannot fetch members.");
        setMembers([]);
      }
    } else {
      // Clear data if no event is selected
      setTaskGroups([]);
      setTasks([]);
      setMembers([]);
      setSelectedEvent(null);
      setSelectedTaskGroupForNewTask("");
    }
  }, [selectedEvent]);

  // Fetch tasks for all loaded task groups
  useEffect(() => {
    if (taskGroups.length > 0) {
      const fetchTasksForGroups = async () => {
        try {
          const taskPromises = taskGroups.map((group) =>
            axios.get(`${API_BASE_URL}/task-groups/${group.id}/tasks/`)
          );
          const taskResponses = await Promise.all(taskPromises);
          // Assuming each response.data is an array of tasks or {results: [...tasks]}
          const allTasks = taskResponses.flatMap((response) => response.data.results || response.data);
          setTasks(allTasks);
        } catch (err) {
          console.error("Failed to fetch tasks for groups:", err);
          setTasks([]); // Clear tasks on error
        }
      };
      fetchTasksForGroups();
    } else {
      setTasks([]); // Clear tasks if there are no task groups
    }
  }, [taskGroups]); // Re-fetch tasks if taskGroups array changes

  // Create a new task group
  const handleCreateTaskGroup = () => {
    if (!selectedEvent) {
      alert("Please select an event first.");
      return;
    }
    axios
      .post(`${API_BASE_URL}/task-groups/`, {
        ...newTaskGroup,
        event: selectedEvent.id,
      })
      .then((res) => {
        setTaskGroups([...taskGroups, res.data]); // This will trigger the useEffect to fetch tasks
        setNewTaskGroup({ name: "", description: "" });
      })
      .catch((err) => console.error("Failed to create task group:", err));
  };

  // Assign a new task
  const handleAssignTask = (taskGroupId) => {
    if (!taskGroupId) {
        alert("Please select a task group to assign the task to.");
        return;
    }
    if (!newTask.assigned_to) {
        alert("Please assign the task to a member.");
        return;
    }
    axios
      .post(`${API_BASE_URL}/task-groups/${taskGroupId}/tasks/`, {
        ...newTask,
        task_group: Number(taskGroupId), // Ensure task_group is a number if backend expects it
        // assigned_to should already be an ID (string from select, backend might coerce or expect number)
      })
      .then((res) => {
        // Optimistically add task, or re-fetch tasks for the group for more robustness
        setTasks([...tasks, res.data]); 
        setNewTask({ // Reset new task form
          title: "",
          description: "",
          assigned_to: "",
          due_date: "",
          priority: "medium",
        });
        // Optionally, you could re-fetch tasks for the specific group or all groups
        // to ensure data consistency, e.g., by triggering the task fetching useEffect.
        // For now, optimistic update is used.
      })
      .catch((err) => console.error("Failed to assign task:", err.response ? err.response.data : err));
  };

  return (
    <div className="coordinator-dashboard">
      <h1>Event Coordinator Dashboard</h1>

      {/* Step 1: Select an Event */}
      <div className="section">
        <h2>Select Event</h2>
        <select
          value={selectedEvent ? selectedEvent.id : ""}
          onChange={(e) => {
            const eventId = e.target.value ? Number(e.target.value) : null;
            setSelectedEvent(eventId ? events.find((ev) => ev.id === eventId) : null);
          }}
        >
          <option value="">-- Select Event --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} ({event.start_date})
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Create Task Group (for selected event) */}
      {selectedEvent && (
        <div className="section">
          <h2>Create Task Group for "{selectedEvent.title}"</h2>
          <input
            type="text"
            placeholder="Task Group Name"
            value={newTaskGroup.name}
            onChange={(e) =>
              setNewTaskGroup({ ...newTaskGroup, name: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Description"
            value={newTaskGroup.description}
            onChange={(e) =>
              setNewTaskGroup({ ...newTaskGroup, description: e.target.value })
            }
          />
          <button onClick={handleCreateTaskGroup}>Create Task Group</button>
        </div>
      )}

      {/* Step 3: Assign Tasks */}
      {selectedEvent && taskGroups.length > 0 && (
        <div className="section">
          <h2>Assign Tasks</h2>
          <label htmlFor="taskGroupSelect">Assign to Task Group:</label>
          <select
            id="taskGroupSelect"
            value={selectedTaskGroupForNewTask}
            onChange={(e) => setSelectedTaskGroupForNewTask(e.target.value)}
          >
            <option value="">-- Select Task Group --</option>
            {taskGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          {selectedTaskGroupForNewTask && (
            <div style={{ marginTop: "10px", border: "1px solid #ccc", padding: "10px" }}>
              <h4>New Task for "{taskGroups.find(tg => tg.id === Number(selectedTaskGroupForNewTask))?.name}"</h4>
              <label htmlFor="memberSelect">Assign to Member:</label>
              <select
                id="memberSelect"
                value={newTask.assigned_to}
                onChange={(e) =>
                  setNewTask({ ...newTask, assigned_to: e.target.value })
                }
              >
                <option value="">-- Assign to Member --</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {/* Assuming member object has full_name. Adjust if structure is different e.g. member.user.full_name */}
                    {member.full_name || `Member ID: ${member.id}`} 
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Task Title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <textarea
                placeholder="Task Description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />
              <input
                type="date"
                placeholder="Due Date"
                value={newTask.due_date}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_date: e.target.value })
                }
              />
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button onClick={() => handleAssignTask(selectedTaskGroupForNewTask)}>
                Assign Task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Display Task Groups and Tasks */}
      <h2>Task Overview for "{selectedEvent ? selectedEvent.title : 'No Event Selected'}"</h2>
      {taskGroups.map((group) => (
        <div key={group.id} className="task-group" style={{ marginBottom: "20px", border: "1px solid #eee", padding: "10px" }}>
          <h3>{group.name}</h3>
          <p>{group.description}</p>
          <h4>Tasks:</h4>
          {tasks.filter((task) => task.task_group === group.id).length > 0 ? (
            <ul>
              {tasks
                .filter((task) => task.task_group === group.id)
                .map((task) => {
                  // Attempt to find member name if assigned_to_name is not directly available
                  const assignee = members.find(m => m.id === task.assigned_to) || 
                                   members.find(m => m.id === Number(task.assigned_to)); // try number conversion
                  const assigneeName = task.assigned_to_name || (assignee ? assignee.full_name : 'N/A');
                  
                  return (
                    <li key={task.id}>
                      <strong>{task.title}</strong> (Priority: {task.priority}, Due: {task.due_date || 'N/A'})
                      <p>{task.description}</p>
                      <span>Assigned to: {assigneeName}</span>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p>No tasks in this group yet.</p>
          )}
        </div>
      ))}
       {selectedEvent && taskGroups.length === 0 && (
        <p>No task groups created for this event yet.</p>
      )}
    </div>
  );
}

export default EventCoordinatorDashboard;