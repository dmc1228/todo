import { useMemo } from "react";
import { Task, Project, Section } from "../types";

export type ViewType = "all" | "project";

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

    switch (criteria.view) {
      case "project":
        if (criteria.projectId) {
          result = result.filter(
            (task) => task.project_id === criteria.projectId,
          );
        }
        break;

      case "all":
      default: {
        const mainSectionIds = new Set(
          sections
            .filter((s) => s.context === "main" || !s.context)
            .map((s) => s.id),
        );
        result = result.filter((task) => mainSectionIds.has(task.section_id));
        break;
      }
    }

    if (criteria.search && criteria.search.trim()) {
      const searchTerm = criteria.search.toLowerCase().trim();

      result = result.filter((task) => {
        if (task.name.toLowerCase().includes(searchTerm)) return true;
        if (task.notes && task.notes.toLowerCase().includes(searchTerm))
          return true;
        if (task.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
          return true;
        if (task.project_id) {
          const project = projects.find((p) => p.id === task.project_id);
          if (project && project.name.toLowerCase().includes(searchTerm))
            return true;
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
