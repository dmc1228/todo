import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Project } from "../types";
import { useAuth } from "./useAuth";

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  createProject: (name: string, color?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const projectsWithViewMode = (data || []).map((p) => ({
        ...p,
        view_mode: p.view_mode || "standard",
      }));

      setProjects(projectsWithViewMode);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    fetchProjects();

    const channel = supabase
      .channel("projects_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchProjects();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const createProject = async (
    name: string,
    color?: string,
  ): Promise<Project | null> => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from("projects")
        .insert([{ name, color: color || "#6366f1", user_id: user.id }])
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        setProjects((prev) => [...prev, data]);
      }
      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );

      const { error: updateError } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      fetchProjects();
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setProjects((prev) => prev.filter((p) => p.id !== id));

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err as Error);
      fetchProjects();
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
  };
}
