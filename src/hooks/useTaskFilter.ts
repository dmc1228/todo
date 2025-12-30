import { useMemo } from "react";
import { Task, Project, Section } from "../types";

export type ViewType =
  | "home"
  | "all"
  | "today"
  | "upcoming"
  | "priority"
  | "urgent_important"
  | "focus"
  | "journal"
  | "project";

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

    // Apply view filter
    switch (criteria.view) {
      case "today":
        // Filter by tasks ONLY in "Must finish today" or "Work on today" sections
        // Exclude priority sections (High/Medium/Low Priority)
        const todaySections = sections.filter((s) => {
          const name = s.name.toLowerCase();
          const isTodaySection =
            name.includes("must finish today") ||
            name.includes("work on today");
          const isPrioritySection = name.includes("priority");
          return isTodaySection && !isPrioritySection;
        });
        const todaySectionIds = new Set(todaySections.map((s) => s.id));
        result = result.filter((task) => todaySectionIds.has(task.section_id));
        break;

      case "upcoming":
        // Show all sections EXCEPT "Must finish today" and "Work on today"
        const excludeSections = sections.filter((s) => {
          const name = s.name.toLowerCase();
          return (
            name.includes("must finish today") || name.includes("work on today")
          );
        });
        const excludeSectionIds = new Set(excludeSections.map((s) => s.id));
        result = result.filter(
          (task) => !excludeSectionIds.has(task.section_id),
        );
        break;

      case "priority":
        result = result.filter((task) => task.importance === "very_important");
        break;

      case "urgent_important":
        // Show tasks that are high priority (very_important) AND urgent
        result = result.filter(
          (task) =>
            (task.urgent ?? false) && task.importance === "very_important",
        );
        break;

      case "project":
        if (criteria.projectId) {
          result = result.filter(
            (task) => task.project_id === criteria.projectId,
          );
        }
        break;

      case "focus":
        // Focus mode: batch by project and sort by urgency/importance
        // First sort by project to group tasks together, then by urgency and importance
        result = result.sort((a, b) => {
          // First, group by project (nulls last)
          const projectA = a.project_id || "zzz";
          const projectB = b.project_id || "zzz";
          if (projectA !== projectB) {
            return projectA.localeCompare(projectB);
          }

          // Within project, sort by urgent first
          const urgentA = a.urgent ?? false;
          const urgentB = b.urgent ?? false;
          if (urgentA !== urgentB) {
            return urgentA ? -1 : 1;
          }

          // Then by importance
          const importanceOrder = {
            very_important: 0,
            important: 1,
            normal: 2,
          };
          const impA = importanceOrder[a.importance] ?? 2;
          const impB = importanceOrder[b.importance] ?? 2;
          return impA - impB;
        });
        break;

      case "journal":
        // Journal view doesn't show tasks, it shows journal entries
        result = [];
        break;

      case "all":
      default:
        // No additional filtering for 'all' view
        break;
    }

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
