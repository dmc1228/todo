import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ProjectCollaborator } from "../types";
import { useAuth } from "./useAuth";

interface UseCollaboratorsOptions {
  projectId?: string;
  viewContext?: "shopping" | "agenda"; // For special shareable views
}

interface UseCollaboratorsReturn {
  collaborators: ProjectCollaborator[];
  loading: boolean;
  error: Error | null;
  addCollaborator: (email: string) => Promise<boolean>;
  removeCollaborator: (collaboratorId: string) => Promise<void>;
}

export function useCollaborators(
  options: UseCollaboratorsOptions = {}
): UseCollaboratorsReturn {
  const { projectId, viewContext } = options;
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Determine the resource type and ID
  const resourceType = projectId ? "project" : viewContext ? "view" : null;
  const resourceId = projectId || viewContext || null;

  useEffect(() => {
    if (!user || !resourceId) {
      setCollaborators([]);
      setLoading(false);
      return;
    }

    fetchCollaborators();

    // Set up real-time subscription for collaborators
    const channel = supabase
      .channel(`collaborators_${resourceType}_${resourceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaborators",
          filter: `resource_id=eq.${resourceId}`,
        },
        () => {
          fetchCollaborators();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, resourceId, resourceType]);

  const fetchCollaborators = async () => {
    if (!resourceId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("collaborators")
        .select("*")
        .eq("resource_id", resourceId)
        .eq("resource_type", resourceType);

      if (fetchError) throw fetchError;

      setCollaborators(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = useCallback(
    async (email: string): Promise<boolean> => {
      if (!user || !resourceId) return false;

      try {
        // First, check if user with this email exists
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          console.error("User not found with email:", email);
          return false;
        }

        // Add collaborator
        const { error: insertError } = await supabase
          .from("collaborators")
          .insert([
            {
              resource_id: resourceId,
              resource_type: resourceType,
              user_id: userData.id,
              email: email,
              role: "editor",
            },
          ]);

        if (insertError) throw insertError;

        await fetchCollaborators();
        return true;
      } catch (err) {
        console.error("Add collaborator failed:", err);
        setError(err as Error);
        return false;
      }
    },
    [user, resourceId, resourceType]
  );

  const removeCollaborator = useCallback(
    async (collaboratorId: string) => {
      try {
        const { error: deleteError } = await supabase
          .from("collaborators")
          .delete()
          .eq("id", collaboratorId);

        if (deleteError) throw deleteError;

        await fetchCollaborators();
      } catch (err) {
        setError(err as Error);
      }
    },
    []
  );

  return {
    collaborators,
    loading,
    error,
    addCollaborator,
    removeCollaborator,
  };
}
