import { useMemo } from "react";
import { Task, Project, Section } from "../types";

export type ViewType = "all";

export interface FilterCriteria {
  search?: string;
  view: ViewType;
  projectId?: string;
}

interface UseTaskFilterReturn {
  filteredTasks: Task[];
  resultCount: number;
}

export function useTaskFilter(
  tasks: Task[],
  projects: Project[],
  sections: Section[],
  criteria: FilterCriteria,
): UseTaskFilterReturn {
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // For 'all' view, only show tasks from 'main' context sections
    const mainSectionIds = new Set(
      sections.filter((s) => (s as any).context === "main" || !(s as any).context).map((s) => s.id)
    );
    result = result.filter((task) => mainSectionIds.has(task.section_id));

    // Apply search filter
    if (criteria.search && criteria.search.trim()) {
      const searchTerm = criteria.search.toLowerCase().trim();

      result = result.filter((task) => {
        // Search in task name
        if (task.name.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in notes
        if (task.notes && task.notes.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in tags
        if (task.tags.some((tag) => tag.toLowerCase().includes(searchTerm))) {
          return true;
        }

        // Search in project name
        if (task.project_id) {
          const project = projects.find((p) => p.id === task.project_id);
          if (project && project.name.toLowerCase().includes(searchTerm)) {
            return true;
          }
        }

        return false;
      });
    }

    return result;
  }, [tasks, projects, sections, criteria]);

  return {
    filteredTasks,
    resultCount: filteredTasks.length,
  };
}
