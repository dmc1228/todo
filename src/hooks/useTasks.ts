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

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
        const cachedData = await getCachedTasks();
        setTasks(cachedData.filter((t) => !t.archived));
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("archived", false)
        .order("position", { ascending: true });

      if (fetchError) throw fetchError;

      setTasks(data || []);
      setError(null);

      if (data) {
        cacheTasks(data).catch(console.error);
      }
    } catch (err) {
      console.error("Fetch failed, trying cache:", err);
      try {
        const cachedData = await getCachedTasks();
        setTasks(cachedData.filter((t) => !t.archived));
      } catch (cacheErr) {
        setError(err as Error);
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    fetchTasks();

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
  }, [user, isOnline, fetchTasks]);

  const createTask = async (
    rawInput: string,
    sectionId: string,
    projects: Project[],
  ): Promise<Task | null> => {
    if (!user) return null;

    try {
      const parsed = parseQuickAdd(rawInput);

      let projectId: string | null = null;
      if (parsed.project) {
        const matchedProject = getProjectFromName(projects, parsed.project);
        if (matchedProject) {
          projectId = matchedProject.id;
        }
      }

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

      if (createError) throw createError;

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
        .insert([{ ...task, user_id: user.id }])
        .select()
        .single();

      if (createError) throw createError;

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
      const updatedTask = tasks.find((t) => t.id === id);
      if (updatedTask) {
        const newTask = { ...updatedTask, ...updates };
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? newTask : task)),
        );
        updateCachedTask(newTask).catch(console.error);
      }

      if (!isOnline) {
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
      if (isOnline) fetchTasks();
    }
  };

  const deleteTask = async (id: string): Promise<Task | null> => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;

      setTasks((prev) => prev.filter((t) => t.id !== id));
      deleteCachedTask(id).catch(console.error);

      if (!isOnline) {
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
      if (isOnline) fetchTasks();
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

      setTasks((prev) => prev.filter((t) => t.id !== id));
      updateCachedTask({ ...task, ...updates }).catch(console.error);

      if (!isOnline) {
        await addPendingChange({
          entity: "task",
          operation: "update",
          entityId: id,
          data: updates,
        });
        return;
      }

      const { error: completeError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (completeError) throw completeError;

      if (task.recurrence_rule) {
        const nextDueDate = calculateNextDueDate(
          task.due_date,
          task.recurrence_rule,
        );

        if (nextDueDate) {
          await supabase.from("tasks").insert([
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
        }
      }
    } catch (err) {
      setError(err as Error);
      if (isOnline) fetchTasks();
    }
  };

  const undoCompleteTask = async (id: string) => {
    try {
      const { error: undoError } = await supabase
        .from("tasks")
        .update({ completed_at: null, archived: false })
        .eq("id", id);

      if (undoError) throw undoError;
      fetchTasks();
    } catch (err) {
      setError(err as Error);
    }
  };

  const reorderTasks = async (sectionId: string, orderedIds: string[]) => {
    try {
      const updates = orderedIds.map((id, index) => ({ id, position: index }));

      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ position: update.position })
          .eq("id", update.id)
          .eq("section_id", sectionId);
      }

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
      fetchTasks();
    }
  };

  const moveTaskToSection = async (
    taskId: string,
    newSectionId: string,
    newPosition: number,
  ) => {
    try {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, section_id: newSectionId, position: newPosition }
            : task,
        ),
      );

      const { error: moveError } = await supabase
        .from("tasks")
        .update({ section_id: newSectionId, position: newPosition })
        .eq("id", taskId);

      if (moveError) throw moveError;
    } catch (err) {
      setError(err as Error);
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
