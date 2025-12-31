import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Reminder } from "../types";
import { useAuth } from "./useAuth";

interface UseRemindersReturn {
  reminders: Reminder[];
  loading: boolean;
  error: Error | null;
  createReminder: (name: string, dueDate?: string | null) => Promise<Reminder | null>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    fetchReminders();

    // Set up real-time subscription
    const channel = supabase
      .channel("reminders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reminders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchReminders();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const fetchReminders = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("reminders")
        .select("*")
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      setReminders(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (
    name: string,
    dueDate?: string | null,
  ): Promise<Reminder | null> => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from("reminders")
        .insert([
          {
            name,
            due_date: dueDate || null,
            completed: false,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Reminder creation error:", createError);
        throw createError;
      }

      // Optimistically update local state
      if (data) {
        setReminders((prev) => [...prev, data]);
      }

      return data;
    } catch (err) {
      console.error("Create reminder failed:", err);
      setError(err as Error);
      return null;
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      // Optimistically update local state
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );

      const { error: updateError } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state
      fetchReminders();
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      // Optimistically update local state
      setReminders((prev) => prev.filter((r) => r.id !== id));

      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err as Error);
      fetchReminders();
    }
  };

  const completeReminder = async (id: string) => {
    try {
      // Optimistically remove from list
      setReminders((prev) => prev.filter((r) => r.id !== id));

      const { error: updateError } = await supabase
        .from("reminders")
        .update({ completed: true })
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      fetchReminders();
    }
  };

  return {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
  };
}
