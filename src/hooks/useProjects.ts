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
  getOrCreateProject: (name: string) => Promise<Project | null>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    fetchProjects();

    // Set up real-time subscription
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

  const fetchProjects = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // Ensure all projects have view_mode (default to 'standard' for backwards compatibility)
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

  const createProject = async (
    name: string,
    color?: string,
  ): Promise<Project | null> => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from("projects")
        .insert([
          {
            name,
            color: color || "#6366f1",
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Project creation error:", createError);
        throw createError;
      }

      // Optimistically update local state
      if (data) {
        setProjects((prev) => [...prev, data]);
      }

      return data;
    } catch (err) {
      console.error("Create project failed:", err);
      setError(err as Error);
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      // Optimistically update local state
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      const { error: updateError } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state
      fetchProjects();
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err as Error);
    }
  };

  const getOrCreateProject = async (name: string): Promise<Project | null> => {
    if (!user) return null;

    try {
      // Search for existing project (case-insensitive)
      const normalized = name.toLowerCase().trim();
      const existingProject = projects.find(
        (p) => p.name.toLowerCase() === normalized,
      );

      if (existingProject) {
        return existingProject;
      }

      // Create new project if not found
      return await createProject(name);
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getOrCreateProject,
  };
}
