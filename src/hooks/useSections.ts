import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Section, SectionContext } from "../types";
import { useAuth } from "./useAuth";

interface UseSectionsReturn {
  sections: Section[];
  loading: boolean;
  error: Error | null;
  createSection: (name: string, context?: SectionContext) => Promise<Section | null>;
  updateSection: (id: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (orderedIds: string[]) => Promise<void>;
  getSectionsByContext: (context: SectionContext) => Section[];
}

export function useSections(): UseSectionsReturn {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }

    fetchSections();

    // Set up real-time subscription
    const channel = supabase
      .channel("sections_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sections",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSections();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const fetchSections = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("sections")
        .select("*")
        .order("position", { ascending: true });

      if (fetchError) throw fetchError;

      // Ensure all sections have a context (default to 'main' for backwards compatibility)
      const sectionsWithContext = (data || []).map((s) => ({
        ...s,
        context: s.context || "main",
      }));

      setSections(sectionsWithContext);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const createSection = async (
    name: string,
    context: SectionContext = "main"
  ): Promise<Section | null> => {
    if (!user) return null;

    try {
      // Get the highest position for this context
      const contextSections = sections.filter((s) => s.context === context);
      const maxPosition =
        contextSections.length > 0
          ? Math.max(...contextSections.map((s) => s.position))
          : -1;

      const { data, error: createError } = await supabase
        .from("sections")
        .insert([
          {
            name,
            position: maxPosition + 1,
            context,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Section creation error:", createError);
        throw createError;
      }

      // Optimistically update local state
      if (data) {
        const sectionWithContext = { ...data, context: data.context || context };
        setSections((prev) => [...prev, sectionWithContext]);
      }

      return data;
    } catch (err) {
      console.error("Create section failed:", err);
      setError(err as Error);
      return null;
    }
  };

  const getSectionsByContext = (context: SectionContext): Section[] => {
    return sections.filter((s) => s.context === context);
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    try {
      const { error: updateError } = await supabase
        .from("sections")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
    }
  };

  const deleteSection = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("sections")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err as Error);
    }
  };

  const reorderSections = async (orderedIds: string[]) => {
    try {
      // Update positions based on the new order
      const updates = orderedIds.map((id, index) => ({
        id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from("sections")
          .update({ position: update.position })
          .eq("id", update.id);
      }

      // Optimistically update local state
      setSections((prev) => {
        const reordered = orderedIds
          .map((id) => prev.find((s) => s.id === id))
          .filter((s): s is Section => s !== undefined)
          .map((s, index) => ({ ...s, position: index }));
        return reordered;
      });
    } catch (err) {
      setError(err as Error);
      // Refetch to restore correct state
      fetchSections();
    }
  };

  return {
    sections,
    loading,
    error,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    getSectionsByContext,
  };
}
