import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Task, NewTask, Project } from "../types";
import { parseQuickAdd, getProjectFromName } from "../lib/taskParser";
import { calculateNextDueDate } from "../lib/recurrence";
import { useAuth } from "./useAuth";
import {
  cacheTasks,
  getCachedTasks,
  updateCachedTask,
  deleteCachedTask,
  addPendingChange,
} from "../services/offlineStorage";

interface UseTasksOptions {
  includeCompleted?: boolean;
}

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (
    rawInput: string,
    sectionId: string,
    projects: Project[],
  ) => Promise<Task | null>;
  createTaskDirect: (task: NewTask) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<Task | null>;
  undoDeleteTask: (task: Task) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  undoCompleteTask: (id: string) => Promise<void>;
  reorderTasks: (sectionId: string, orderedIds: string[]) => Promise<void>;
  moveTaskToSection: (
    taskId: string,
    newSectionId: string,
    newPosition: number,
  ) => Promise<void>;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { includeCompleted = false } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      if (!isOnline) {
        // Load from cache when offline
        const cachedData = await getCachedTasks();
        let filteredData = cachedData;
        if (!includeCompleted) {
          filteredData = cachedData.filter((t) => !t.archived);
        }
        setTasks(filteredData);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("tasks")
        .select("*");

      // Only filter by archived if not including completed tasks
      if (!includeCompleted) {
        query = query.eq("archived", false);
      }

      const { data, error: fetchError } = await query
        .order("position", { ascending: true });

      if (fetchError) throw fetchError;

      setTasks(data || []);
      setError(null);

      // Cache the fetched tasks for offline use
      if (data) {
        cacheTasks(data).catch(console.error);
      }
    } catch (err) {
      // On network error, try to load from cache
      console.error("Fetch failed, trying cache:", err);
      try {
        const cachedData = await getCachedTasks();
        let filteredData = cachedData;
        if (!includeCompleted) {
          filteredData = cachedData.filter((t) => !t.archived);
        }
        setTasks(filteredData);
      } catch (cacheErr) {
        setError(err as Error);
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, includeCompleted]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    fetchTasks();

    // Set up real-time subscription only when online
    if (!isOnline) return;

    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, includeCompleted, isOnline, fetchTasks]);

  const createTask = async (
    rawInput: string,
    sectionId: string,
    projects: Project[],
  ): Promise<Task | null> => {
    if (!user) return null;

    try {
      const parsed = parseQuickAdd(rawInput);

      // Match project name to existing projects
      let projectId: string | null = null;
      if (parsed.project) {
        const matchedProject = getProjectFromName(projects, parsed.project);
        if (matchedProject) {
          projectId = matchedProject.id;
        }
      }

      // Get the minimum position in this section to insert at the top
      const sectionTasks = tasks.filter((t) => t.section_id === sectionId);
      const minPosition =
        sectionTasks.length > 0
          ? Math.min(...sectionTasks.map((t) => t.position))
          : 0;

      const { data, error: createError } = await supabase
        .from("tasks")
        .insert([
          {
            name: parsed.name,
            section_id: sectionId,
            project_id: projectId,
            tags: parsed.tags.length > 0 ? parsed.tags : [],
            due_date: parsed.dueDate
              ? parsed.dueDate.toISOString().split("T")[0]
              : null,
            strict_due_date: false,
            importance:
              parsed.importance !== "normal" ? parsed.importance : null,
            urgent: parsed.urgent || false,
            length: null,
            position: minPosition - 1,
            recurrence_rule: null,
            notes: null,
            completed_at: null,
            archived: false,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Task creation error:", createError);
        throw createError;
      }

      // Optimistically update local state
      if (data) {
        setTasks((prev) => [...prev, data]);
      }

      return data;
    } catch (err) {
      console.error("Create task failed:", err);
      setError(err as Error);
      return null;
    }
  };

  const createTaskDirect = async (task: NewTask): Promise<Task | null> => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from("tasks")
        .insert([
          {
            ...task,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      // Optimistically update local state
      if (data) {
        setTasks((prev) => [...prev, data]);
      }

      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Optimistically update local state
      const updatedTask = tasks.find((t) => t.id === id);
      if (updatedTask) {
        const newTask = { ...updatedTask, ...updates };
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? newTask : task)),
        );
        // Update cache
        updateCachedTask(newTask).catch(console.error);
      }

      if (!isOnline) {
        // Queue for later sync
        await addPendingChange({
          entity: "task",
          operation: "update",
          entityId: id,
          data: updates,
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state on error
      if (isOnline) {
        fetchTasks();
      }
    }
  };

  const deleteTask = async (id: string): Promise<Task | null> => {
    try {
      // Get the task before deleting
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;

      // Optimistically remove from local state
      setTasks((prev) => prev.filter((task) => task.id !== id));
      // Remove from cache
      deleteCachedTask(id).catch(console.error);

      if (!isOnline) {
        // Queue for later sync
        await addPendingChange({
          entity: "task",
          operation: "delete",
          entityId: id,
          data: null,
        });
        return task;
      }

      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return task;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state on error
      if (isOnline) {
        fetchTasks();
      }
      return null;
    }
  };

  const undoDeleteTask = async (task: Task) => {
    try {
      const { error: restoreError } = await supabase.from("tasks").insert([
        {
          id: task.id,
          name: task.name,
          section_id: task.section_id,
          project_id: task.project_id,
          tags: task.tags,
          due_date: task.due_date,
          strict_due_date: task.strict_due_date || false,
          notes: task.notes,
          importance: task.importance,
          urgent: task.urgent ?? false,
          length: task.length,
          position: task.position,
          recurrence_rule: task.recurrence_rule,
          completed_at: task.completed_at,
          archived: task.archived || false,
          user_id: user!.id,
        },
      ]);

      if (restoreError) throw restoreError;

      // Refetch to get the restored task
      fetchTasks();
    } catch (err) {
      setError(err as Error);
    }
  };

  const completeTask = async (id: string) => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const completedAt = new Date().toISOString();
      const updates = { completed_at: completedAt, archived: true };

      // Optimistically remove from UI
      setTasks((prev) => prev.filter((t) => t.id !== id));
      // Update cache with completed state
      updateCachedTask({ ...task, ...updates }).catch(console.error);

      if (!isOnline) {
        // Queue for later sync
        await addPendingChange({
          entity: "task",
          operation: "update",
          entityId: id,
          data: updates,
        });
        return;
      }

      // Archive the completed task
      const { error: completeError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (completeError) throw completeError;

      // If task is recurring, create a new instance with the next due date
      if (task.recurrence_rule) {
        const nextDueDate = calculateNextDueDate(
          task.due_date,
          task.recurrence_rule,
        );

        if (nextDueDate) {
          const { error: createError } = await supabase.from("tasks").insert([
            {
              name: task.name,
              section_id: task.section_id,
              project_id: task.project_id,
              tags: task.tags,
              due_date: nextDueDate,
              strict_due_date: task.strict_due_date || false,
              notes: task.notes,
              importance: task.importance,
              urgent: task.urgent || false,
              length: task.length,
              position: task.position,
              recurrence_rule: task.recurrence_rule,
              completed_at: null,
              archived: false,
              user_id: user!.id,
            },
          ]);

          if (createError) {
            console.error("Failed to create recurring task:", createError);
          }
        }
      }
    } catch (err) {
      setError(err as Error);
      // Restore task on error
      if (isOnline) {
        fetchTasks();
      }
    }
  };

  const undoCompleteTask = async (id: string) => {
    try {
      // Unarchive the task
      const { error: undoError } = await supabase
        .from("tasks")
        .update({
          completed_at: null,
          archived: false,
        })
        .eq("id", id);

      if (undoError) throw undoError;

      // Refetch to get the restored task
      fetchTasks();
    } catch (err) {
      setError(err as Error);
    }
  };

  const reorderTasks = async (sectionId: string, orderedIds: string[]) => {
    try {
      // Update positions based on the new order
      const updates = orderedIds.map((id, index) => ({
        id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ position: update.position })
          .eq("id", update.id)
          .eq("section_id", sectionId);
      }

      // Optimistically update local state
      setTasks((prev) => {
        return prev.map((task) => {
          if (task.section_id !== sectionId) return task;
          const newPosition = orderedIds.indexOf(task.id);
          if (newPosition === -1) return task;
          return { ...task, position: newPosition };
        });
      });
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state
      fetchTasks();
    }
  };

  const moveTaskToSection = async (
    taskId: string,
    newSectionId: string,
    newPosition: number,
  ) => {
    try {
      // Optimistically update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, section_id: newSectionId, position: newPosition }
            : task
        ),
      );

      const { error: moveError } = await supabase
        .from("tasks")
        .update({
          section_id: newSectionId,
          position: newPosition,
        })
        .eq("id", taskId);

      if (moveError) throw moveError;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state
      fetchTasks();
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    createTaskDirect,
    updateTask,
    deleteTask,
    undoDeleteTask,
    completeTask,
    undoCompleteTask,
    reorderTasks,
    moveTaskToSection,
  };
}
