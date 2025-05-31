import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../services/authService";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Check, Plus, Trash2, Edit, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
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

const SHIFT_OPTIONS = [
  { value: "morning", label: "Morning (8AM-12PM)" },
  { value: "afternoon", label: "Afternoon (12PM-4PM)" },
  { value: "evening", label: "Evening (4PM-8PM)" },
  { value: "night", label: "Night (8PM-12AM)" },
  { value: "custom", label: "Custom Shift" },
];

function EventTaskManagement({
  edirslug,
  selectedEvent,
  members,
  onTaskGroupCreate,
  onTaskGroupUpdate,
  onTaskGroupDelete,
  onTaskAssign,
  onTaskUpdate,
  onTaskDelete,
  onTaskComplete,
}) {
  const [taskGroups, setTaskGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState({
    taskGroups: false,
    tasks: false,
    operations: false,
  });
  const [error, setError] = useState(null);

  const [newTaskGroup, setNewTaskGroup] = useState({
    name: "",
    description: "",
    shift: "",
    shift_custom: "",
    members: [],
  });

  const [editingTaskGroup, setEditingTaskGroup] = useState(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: [],
    shift: "",
    shift_custom: "",
    due_date: "",
    priority: "medium",
  });

  const [editingTask, setEditingTask] = useState(null);

  const [isTaskGroupFormOpen, setIsTaskGroupFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState({});
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    open: false,
    type: null, // 'taskGroup' or 'task'
    id: null,
    taskGroupId: null, // for tasks
  });

  useEffect(() => {
    const initialState = {};
    taskGroups.forEach((group) => {
      initialState[group.id] = false;
    });
    setIsTaskFormOpen(initialState);
  }, [taskGroups]);

  useEffect(() => {
    if (!selectedEvent?.id) {
      setTaskGroups([]);
      setTasks([]);
      setError(null);
      return;
    }

    const fetchTaskGroups = async () => {
      setIsLoading((prev) => ({ ...prev, taskGroups: true }));
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTaskGroups(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch task groups");
        setTaskGroups([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, taskGroups: false }));
      }
    };
    fetchTaskGroups();
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent?.id || taskGroups.length === 0) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setIsLoading((prev) => ({ ...prev, tasks: true }));
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        const tasksPromises = taskGroups.map((group) =>
          axios.get(
            `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${group.id}/tasks/`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        );
        const tasksResponses = await Promise.all(tasksPromises);
        const allTasks = tasksResponses.flatMap(
          (response) => response.data || []
        );
        setTasks(allTasks);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch tasks");
        setTasks([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, tasks: false }));
      }
    };
    fetchTasks();
  }, [taskGroups, selectedEvent]);

  const handleCreateTaskGroup = async () => {
    if (!selectedEvent?.id) {
      setError("Please select an event first");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      const payload = {
        ...newTaskGroup,
        members: newTaskGroup.members.map((m) => m.id || m),
      };

      const response = await axios.post(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTaskGroups([...taskGroups, response.data]);
      setNewTaskGroup({
        name: "",
        description: "",
        shift: "",
        shift_custom: "",
        members: [],
      });
      setIsTaskGroupFormOpen(false);
      onTaskGroupCreate?.(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task group");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleUpdateTaskGroup = async () => {
    if (!editingTaskGroup?.id) {
      setError("No task group selected for editing");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      const payload = {
        ...editingTaskGroup,
        members: editingTaskGroup.members.map((m) => m.id || m),
      };

      const response = await axios.patch(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${editingTaskGroup.id}/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTaskGroups(
        taskGroups.map((group) =>
          group.id === editingTaskGroup.id ? response.data : group
        )
      );
      setEditingTaskGroup(null);
      onTaskGroupUpdate?.(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update task group");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleDeleteTaskGroup = async () => {
    if (!deleteConfirmation.id) {
      setError("No task group selected for deletion");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      await axios.delete(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${deleteConfirmation.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTaskGroups(taskGroups.filter((group) => group.id !== deleteConfirmation.id));
      setTasks(tasks.filter((task) => task.task_group !== deleteConfirmation.id));
      setDeleteConfirmation({ open: false, type: null, id: null });
      onTaskGroupDelete?.(deleteConfirmation.id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task group");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleAssignTask = async (taskGroupId) => {
    if (!taskGroupId) {
      setError("Task group ID is missing");
      return;
    }
    if (newTask.assigned_to.length === 0) {
      setError("Please assign the task to at least one member");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      const payload = {
        ...newTask,
        assigned_to: newTask.assigned_to.map((m) => m.id || m),
      };

      const response = await axios.post(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${taskGroupId}/tasks/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks([...tasks, response.data]);
      setNewTask({
        title: "",
        description: "",
        assigned_to: [],
        shift: "",
        shift_custom: "",
        due_date: "",
        priority: "medium",
      });
      setIsTaskFormOpen((prev) => ({ ...prev, [taskGroupId]: false }));
      onTaskAssign?.(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign task");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask?.id || !editingTask?.task_group) {
      setError("Task information incomplete for update");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      const payload = {
        ...editingTask,
        assigned_to: editingTask.assigned_to.map((m) => m.id || m),
      };

      const response = await axios.patch(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${editingTask.task_group}/tasks/${editingTask.id}/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks(
        tasks.map((task) =>
          task.id === editingTask.id ? response.data : task
        )
      );
      setEditingTask(null);
      onTaskUpdate?.(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update task");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirmation.id || !deleteConfirmation.taskGroupId) {
      setError("Task information incomplete for deletion");
      return;
    }

    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      await axios.delete(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${deleteConfirmation.taskGroupId}/tasks/${deleteConfirmation.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks(tasks.filter((task) => task.id !== deleteConfirmation.id));
      setDeleteConfirmation({ open: false, type: null, id: null, taskGroupId: null });
      onTaskDelete?.(deleteConfirmation.taskGroupId, deleteConfirmation.id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const handleCompleteTask = async (taskGroupId, taskId) => {
    setError(null);
    try {
      setIsLoading((prev) => ({ ...prev, operations: true }));
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${API_BASE_URL}/${edirslug}/events/${selectedEvent.id}/task-groups/${taskGroupId}/tasks/${taskId}/complete/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks(
        tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "completed",
                completed_at: new Date().toISOString(),
              }
            : task
        )
      );
      onTaskComplete?.(taskGroupId, taskId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete task");
    } finally {
      setIsLoading((prev) => ({ ...prev, operations: false }));
    }
  };

  const formatDateSafe = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const calculateCompletionPercentage = (groupTasks) => {
    if (!groupTasks?.length) return 0;
    const completed = groupTasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / groupTasks.length) * 100);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500 hover:bg-red-600";
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "low":
        return "bg-green-500 hover:bg-green-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getShiftDisplay = (shift, shift_custom) => {
    if (shift === "custom") return shift_custom;
    return SHIFT_OPTIONS.find((s) => s.value === shift)?.label || "";
  };

  const startEditTaskGroup = (group) => {
    setEditingTaskGroup({
      ...group,
      members: group.members.map((m) =>
        typeof m === "object" ? m : members.find((mem) => mem.id === m)
      ).filter(Boolean),
    });
    setIsTaskGroupFormOpen(true);
  };

  const startEditTask = (task) => {
    setEditingTask({
      ...task,
      assigned_to: task.assigned_to.map((a) =>
        typeof a === "object" ? a : members.find((mem) => mem.id === a)
      ).filter(Boolean),
    });
  };

  const cancelEdit = () => {
    setEditingTaskGroup(null);
    setEditingTask(null);
    setNewTaskGroup({
      name: "",
      description: "",
      shift: "",
      shift_custom: "",
      members: [],
    });
    setNewTask({
      title: "",
      description: "",
      assigned_to: [],
      shift: "",
      shift_custom: "",
      due_date: "",
      priority: "medium",
    });
    setIsTaskGroupFormOpen(false);
  };

  if (!selectedEvent) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          Please select an event to manage tasks.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{selectedEvent.title} Tasks</h1>
          <p className="text-gray-600">Manage all tasks for this event</p>
        </div>
        <Button onClick={() => setIsTaskGroupFormOpen(true)} className="gap-2">
          <Plus size={16} />
          New Task Group
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          Error: {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Task Groups</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading.taskGroups ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                taskGroups.length
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading.tasks ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                tasks.length
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
            <CardTitle className="text-3xl">
              {members ? members.length : <Skeleton className="h-8 w-12" />}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Task Group Form */}
      {(isTaskGroupFormOpen || editingTaskGroup) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editingTaskGroup ? "Edit Task Group" : "Create New Task Group"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X size={16} />
              </Button>
            </div>
            <CardDescription>
              Organize related tasks into groups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={editingTaskGroup ? editingTaskGroup.name : newTaskGroup.name}
                onChange={(e) =>
                  editingTaskGroup
                    ? setEditingTaskGroup({ ...editingTaskGroup, name: e.target.value })
                    : setNewTaskGroup({ ...newTaskGroup, name: e.target.value })
                }
                placeholder="e.g. Catering"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingTaskGroup ? editingTaskGroup.description : newTaskGroup.description}
                onChange={(e) =>
                  editingTaskGroup
                    ? setEditingTaskGroup({ ...editingTaskGroup, description: e.target.value })
                    : setNewTaskGroup({ ...newTaskGroup, description: e.target.value })
                }
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select
                value={editingTaskGroup ? editingTaskGroup.shift : newTaskGroup.shift}
                onValueChange={(value) =>
                  editingTaskGroup
                    ? setEditingTaskGroup({ ...editingTaskGroup, shift: value })
                    : setNewTaskGroup({ ...newTaskGroup, shift: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(editingTaskGroup?.shift === "custom" || newTaskGroup.shift === "custom") && (
                <Input
                  className="mt-2"
                  value={editingTaskGroup ? editingTaskGroup.shift_custom : newTaskGroup.shift_custom}
                  onChange={(e) =>
                    editingTaskGroup
                      ? setEditingTaskGroup({ ...editingTaskGroup, shift_custom: e.target.value })
                      : setNewTaskGroup({ ...newTaskGroup, shift_custom: e.target.value })
                  }
                  placeholder="Enter custom shift time"
                />
              )}
            </div>
            <div>
              <Label>Members</Label>
              <Select
                value={undefined}
                onValueChange={(value) => {
                  const member = members.find((m) => m.id.toString() === value);
                  if (!member) return;

                  if (editingTaskGroup) {
                    if (!editingTaskGroup.members.some((m) => m.id === member.id)) {
                      setEditingTaskGroup({
                        ...editingTaskGroup,
                        members: [...editingTaskGroup.members, member],
                      });
                    }
                  } else {
                    if (!newTaskGroup.members.some((m) => m.id === member.id)) {
                      setNewTaskGroup({
                        ...newTaskGroup,
                        members: [...newTaskGroup.members, member],
                      });
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add members" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {(editingTaskGroup ? editingTaskGroup.members : newTaskGroup.members).map((member) => (
                  <Badge key={member.id} className="flex items-center gap-1">
                    {member.full_name}
                    <button
                      onClick={() => {
                        if (editingTaskGroup) {
                          setEditingTaskGroup({
                            ...editingTaskGroup,
                            members: editingTaskGroup.members.filter(
                              (m) => m.id !== member.id
                            ),
                          });
                        } else {
                          setNewTaskGroup({
                            ...newTaskGroup,
                            members: newTaskGroup.members.filter(
                              (m) => m.id !== member.id
                            ),
                          });
                        }
                      }}
                      className="ml-1"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {editingTaskGroup && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteConfirmation({
                    open: true,
                    type: "taskGroup",
                    id: editingTaskGroup.id,
                  });
                }}
                disabled={isLoading.operations}
              >
                <Trash2 size={16} className="mr-2" />
                Delete Group
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={isLoading.operations}
              >
                Cancel
              </Button>
              <Button
                onClick={editingTaskGroup ? handleUpdateTaskGroup : handleCreateTaskGroup}
                disabled={isLoading.operations}
              >
                {editingTaskGroup ? "Update Group" : "Create Group"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Task Groups List */}
      {isLoading.taskGroups ? (
        <div className="space-y-4 p-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : taskGroups.length > 0 ? (
        <div className="space-y-6">
          {taskGroups.map((group) => {
            const groupTasks = tasks.filter(
              (task) => task.task_group === group.id
            );
            const completionPercentage =
              calculateCompletionPercentage(groupTasks);
            const groupMembers = (group.members || []).map((m) =>
              typeof m === "object"
                ? m
                : members.find((mem) => mem.id === m || mem.id.toString() === m.toString())
            ).filter(Boolean);

            return (
              <Card key={group.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {group.description || "No description"}
                        {group.shift && (
                          <span className="ml-2 text-sm text-gray-500">
                            • {getShiftDisplay(group.shift, group.shift_custom)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {groupTasks.length} task
                        {groupTasks.length !== 1 ? "s" : ""}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditTaskGroup(group)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setIsTaskFormOpen((prev) => ({
                              ...prev,
                              [group.id]: !prev[group.id],
                            }))
                          }
                        >
                          <Plus size={16} className="mr-1" />
                          Add Task
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {(isTaskFormOpen[group.id] || editingTask?.task_group === group.id) && (
                    <div className="p-6 border-b space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Task Title</Label>
                          <Input
                            value={editingTask ? editingTask.title : newTask.title}
                            onChange={(e) =>
                              editingTask
                                ? setEditingTask({ ...editingTask, title: e.target.value })
                                : setNewTask({ ...newTask, title: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Assign to</Label>
                          <Select
                            value={undefined}
                            onValueChange={(value) => {
                              const member = groupMembers.find(
                                (m) => m.id.toString() === value
                              );
                              if (!member) return;

                              if (editingTask) {
                                if (!editingTask.assigned_to.some((m) => m.id === member.id)) {
                                  setEditingTask({
                                    ...editingTask,
                                    assigned_to: [...editingTask.assigned_to, member],
                                  });
                                }
                              } else {
                                if (!newTask.assigned_to.some((m) => m.id === member.id)) {
                                  setNewTask({
                                    ...newTask,
                                    assigned_to: [...newTask.assigned_to, member],
                                  });
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {groupMembers.map((member) => (
                                <SelectItem
                                  key={member.id}
                                  value={member.id.toString()}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={member.profile_picture}
                                      />
                                      <AvatarFallback>
                                        {member.full_name
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.full_name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(editingTask ? editingTask.assigned_to : newTask.assigned_to).map((member) => (
                              <Badge
                                key={member.id}
                                className="flex items-center gap-1"
                              >
                                {member.full_name}
                                <button
                                  onClick={() => {
                                    if (editingTask) {
                                      setEditingTask({
                                        ...editingTask,
                                        assigned_to: editingTask.assigned_to.filter(
                                          (m) => m.id !== member.id
                                        ),
                                      });
                                    } else {
                                      setNewTask({
                                        ...newTask,
                                        assigned_to: newTask.assigned_to.filter(
                                          (m) => m.id !== member.id
                                        ),
                                      });
                                    }
                                  }}
                                  className="ml-1"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={editingTask ? editingTask.description : newTask.description}
                          onChange={(e) =>
                            editingTask
                              ? setEditingTask({ ...editingTask, description: e.target.value })
                              : setNewTask({ ...newTask, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Due Date</Label>
                          <Input
                            type="date"
                            value={editingTask ? editingTask.due_date : newTask.due_date}
                            onChange={(e) =>
                              editingTask
                                ? setEditingTask({ ...editingTask, due_date: e.target.value })
                                : setNewTask({ ...newTask, due_date: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select
                            value={editingTask ? editingTask.priority : newTask.priority}
                            onValueChange={(value) =>
                              editingTask
                                ? setEditingTask({ ...editingTask, priority: value })
                                : setNewTask({ ...newTask, priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Shift</Label>
                          <Select
                            value={editingTask ? editingTask.shift : newTask.shift}
                            onValueChange={(value) =>
                              editingTask
                                ? setEditingTask({ ...editingTask, shift: value })
                                : setNewTask({ ...newTask, shift: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              {SHIFT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(editingTask?.shift === "custom" || newTask.shift === "custom") && (
                            <Input
                              className="mt-2"
                              value={editingTask ? editingTask.shift_custom : newTask.shift_custom}
                              onChange={(e) =>
                                editingTask
                                  ? setEditingTask({ ...editingTask, shift_custom: e.target.value })
                                  : setNewTask({ ...newTask, shift_custom: e.target.value })
                              }
                              placeholder="Enter custom shift time"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        {editingTask && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setDeleteConfirmation({
                                open: true,
                                type: "task",
                                id: editingTask.id,
                                taskGroupId: editingTask.task_group,
                              });
                            }}
                            disabled={isLoading.operations}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Delete Task
                          </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (editingTask) {
                                setEditingTask(null);
                              } else {
                                setIsTaskFormOpen((prev) => ({
                                  ...prev,
                                  [group.id]: false,
                                }));
                              }
                              setNewTask({
                                title: "",
                                description: "",
                                assigned_to: [],
                                shift: "",
                                shift_custom: "",
                                due_date: "",
                                priority: "medium",
                              });
                            }}
                            disabled={isLoading.operations}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() =>
                              editingTask
                                ? handleUpdateTask()
                                : handleAssignTask(group.id)
                            }
                            disabled={isLoading.operations}
                          >
                            {editingTask ? "Update Task" : "Create Task"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="px-6 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-medium">
                        {completionPercentage}%
                      </span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                  </div>
                  <div className="divide-y dark:divide-gray-700">
                    {groupTasks.length > 0 ? (
                      groupTasks.map((task) => {
                        const assignees = members.filter((m) =>
                          task.assigned_to.includes(m.id)
                        );
                        return (
                          <div
                            key={task.id}
                            className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className="mt-1">
                                <Button
                                  variant={
                                    task.status === "completed"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="icon"
                                  className="h-5 w-5 rounded-full"
                                  onClick={() =>
                                    handleCompleteTask(group.id, task.id)
                                  }
                                  disabled={task.status === "completed" || isLoading.operations}
                                >
                                  {task.status === "completed" && (
                                    <Check size={12} />
                                  )}
                                </Button>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4
                                      className={`font-medium ${
                                        task.status === "completed"
                                          ? "line-through text-gray-400"
                                          : ""
                                      }`}
                                    >
                                      {task.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {task.description}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge
                                      variant="default"
                                      className={`${getPriorityColor(
                                        task.priority
                                      )} text-white text-xs`}
                                    >
                                      {task.priority}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditTask(task)}
                                      disabled={isLoading.operations}
                                    >
                                      <Edit size={16} />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                  {assignees.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex -space-x-2">
                                        {assignees
                                          .slice(0, 3)
                                          .map((assignee) => (
                                            <Avatar
                                              key={assignee.id}
                                              className="h-6 w-6 border-2 border-white"
                                            >
                                              <AvatarImage
                                                src={assignee.profile_picture}
                                              />
                                              <AvatarFallback>
                                                {assignee.full_name
                                                  ?.split(" ")
                                                  .map((n) => n[0])
                                                  .join("")}
                                              </AvatarFallback>
                                            </Avatar>
                                          ))}
                                        {assignees.length > 3 && (
                                          <Avatar className="h-6 w-6 border-2 border-white">
                                            <AvatarFallback className="text-xs">
                                              +{assignees.length - 3}
                                            </AvatarFallback>
                                          </Avatar>
                                        )}
                                      </div>
                                      <span>{assignees.length} assigned</span>
                                    </div>
                                  )}
                                  {task.shift && (
                                    <div className="flex items-center gap-2">
                                      <span>
                                        Shift:{" "}
                                        {getShiftDisplay(
                                          task.shift,
                                          task.shift_custom
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon size={14} />
                                      <span>
                                        Due {formatDateSafe(task.due_date)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        No tasks in this group yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Task Groups Yet</CardTitle>
            <CardDescription>
              Create your first task group for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsTaskGroupFormOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Task Group
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation({ ...deleteConfirmation, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this {deleteConfirmation.type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {deleteConfirmation.type} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading.operations}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={
                deleteConfirmation.type === "taskGroup"
                  ? handleDeleteTaskGroup
                  : handleDeleteTask
              }
              disabled={isLoading.operations}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading.operations ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default EventTaskManagement;