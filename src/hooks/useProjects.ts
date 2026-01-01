import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Project, ProjectCollaborator } from "../types";
import { useAuth } from "./useAuth";

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  createProject: (name: string, color?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getOrCreateProject: (name: string) => Promise<Project | null>;
  addCollaborator: (projectId: string, email: string) => Promise<boolean>;
  removeCollaborator: (projectId: string, collaboratorId: string) => Promise<boolean>;
  fetchCollaborators: (projectId: string) => Promise<ProjectCollaborator[]>;
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

  const fetchCollaborators = async (projectId: string): Promise<ProjectCollaborator[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_project_collaborators', { p_project_id: projectId });

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      console.error("Fetch collaborators failed:", err);
      setError(err as Error);
      return [];
    }
  };

  const addCollaborator = async (projectId: string, email: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('add_project_collaborator_by_email', {
          p_project_id: projectId,
          p_email: email,
          p_role: 'editor'
        });

      if (rpcError) {
        console.error("Add collaborator RPC error:", rpcError);
        return false;
      }

      if (data && !data.success) {
        console.error("Add collaborator failed:", data.error);
        return false;
      }

      // Refresh projects to show updated collaborator list
      await fetchProjects();
      return true;
    } catch (err) {
      console.error("Add collaborator failed:", err);
      setError(err as Error);
      return false;
    }
  };

  const removeCollaborator = async (projectId: string, collaboratorId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId)
        .eq('project_id', projectId);

      if (deleteError) {
        console.error("Remove collaborator error:", deleteError);
        return false;
      }

      // Refresh projects to show updated collaborator list
      await fetchProjects();
      return true;
    } catch (err) {
      console.error("Remove collaborator failed:", err);
      setError(err as Error);
      return false;
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
    addCollaborator,
    removeCollaborator,
    fetchCollaborators,
  };
}
