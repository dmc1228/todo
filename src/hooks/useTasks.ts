import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Task, NewTask, Project } from "../types";
import { parseQuickAdd, getProjectFromName } from "../lib/taskParser";
import { calculateNextDueDate } from "../lib/recurrence";
import { useAuth } from "./useAuth";

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

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    fetchTasks();

    // Set up real-time subscription
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
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("archived", false)
        .order("position", { ascending: true });

      if (fetchError) throw fetchError;

      setTasks(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

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

      // Get the highest position in this section
      const sectionTasks = tasks.filter((t) => t.section_id === sectionId);
      const maxPosition =
        sectionTasks.length > 0
          ? Math.max(...sectionTasks.map((t) => t.position))
          : -1;

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
            importance:
              parsed.importance !== "normal" ? parsed.importance : "normal",
            urgent: parsed.urgent || false,
            length: "medium", // Default length
            position: maxPosition + 1,
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
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...updates } : task)),
      );

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state on error
      fetchTasks();
    }
  };

  const deleteTask = async (id: string): Promise<Task | null> => {
    try {
      // Get the task before deleting
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;

      // Optimistically remove from local state
      setTasks((prev) => prev.filter((task) => task.id !== id));

      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return task;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state on error
      fetchTasks();
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
          notes: task.notes,
          importance: task.importance,
          urgent: task.urgent,
          length: task.length,
          position: task.position,
          recurrence_rule: task.recurrence_rule,
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

      // Optimistically remove from UI
      setTasks((prev) => prev.filter((t) => t.id !== id));

      // Archive the completed task
      const { error: completeError } = await supabase
        .from("tasks")
        .update({
          completed_at: new Date().toISOString(),
          archived: true,
        })
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
              notes: task.notes,
              importance: task.importance,
              position: task.position,
              recurrence_rule: task.recurrence_rule,
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
      fetchTasks();
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
