import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { Plus, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { Section as SectionType, Task, Project } from "../../types";
import { Section } from "./Section";
import { GlobalShoppingSearch } from "./GlobalShoppingSearch";
import { useColumnResize } from "../../hooks/useColumnResize";
import { EmptyState } from "../common/EmptyState";
import { parseISO } from "date-fns";
import "./SectionList.css";

interface SectionListProps {
  sections: SectionType[];
  tasks: Task[];
  projects: Project[];
  selectedTaskId: string | null;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, event?: React.MouseEvent) => void;
  onCompleteTask: (taskId: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onUpdateSection: (id: string, updates: Partial<SectionType>) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onReorderTasks: (sectionId: string, orderedIds: string[]) => void;
  onMoveTaskToSection: (
    taskId: string,
    newSectionId: string,
    newPosition: number,
  ) => void;
  onAddSection: () => void;
  onAddTask: (sectionId: string, rawInput: string) => Promise<Task | null>;
  onOpenSectionMove?: (taskId: string) => void;
  allTasks?: Task[]; // All tasks including completed for shopping list
  onUnarchiveTask?: (taskId: string) => void;
}

interface SortableSectionProps {
  section: SectionType;
  tasks: Task[];
  projects: Project[];
  selectedTaskId: string | null;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, event?: React.MouseEvent) => void;
  onCompleteTask: (taskId: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onUpdateSection: (id: string, updates: Partial<SectionType>) => void;
  onDeleteSection: (id: string) => void;
  onAddTask: (sectionId: string, rawInput: string) => Promise<Task | null>;
  onOpenSectionMove?: (taskId: string) => void;
  columnWidths: {
    taskName: number;
    dueDate: number;
    priority: number;
    urgent: number;
    length: number;
    tags: number;
    projects: number;
  };
  allTasks?: Task[];
  onUnarchiveTask?: (taskId: string) => void;
}

function SortableSection({
  section,
  tasks,
  projects,
  selectedTaskId,
  selectedTaskIds,
  onSelectTask,
  onCompleteTask,
  onUpdateTask,
  onUpdateSection,
  onDeleteSection,
  onAddTask,
  onOpenSectionMove,
  columnWidths,
  allTasks,
  onUnarchiveTask,
}: SortableSectionProps) {
  const { attributes, listeners } = useSortable({ id: section.id });

  return (
    <Section
      section={section}
      tasks={tasks}
      projects={projects}
      selectedTaskId={selectedTaskId}
      selectedTaskIds={selectedTaskIds}
      onSelectTask={onSelectTask}
      onCompleteTask={onCompleteTask}
      onUpdateTask={onUpdateTask}
      onUpdateSection={onUpdateSection}
      onDeleteSection={onDeleteSection}
      onAddTask={onAddTask}
      onOpenSectionMove={onOpenSectionMove}
      dragHandleProps={{ ...attributes, ...listeners }}
      columnWidths={columnWidths}
      allTasks={allTasks}
      onUnarchiveTask={onUnarchiveTask}
    />
  );
}

type SortColumn =
  | "name"
  | "due_date"
  | "importance"
  | "urgent"
  | "length"
  | "tags"
  | "project";
type SortDirection = "asc" | "desc" | null;

interface ColumnFilters {
  importance?: string[];
  urgent?: string[];
  length?: string[];
  tags?: string[];
  project?: string[];
}

export function SectionList({
  sections,
  tasks,
  projects,
  selectedTaskId,
  selectedTaskIds,
  onSelectTask,
  onCompleteTask,
  onUpdateTask,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onReorderTasks,
  onMoveTaskToSection,
  onAddSection,
  onAddTask,
  onOpenSectionMove,
  allTasks,
  onUnarchiveTask,
}: SectionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"task" | "section" | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [showFilterMenu, setShowFilterMenu] = useState<string | null>(null);
  const {
    columnWidths,
    isResizing: _isResizing,
    handleMouseDown,
  } = useColumnResize();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const sectionIds = sections.map((s) => s.id);

  // Check if we're in shopping view (all sections have shopping context)
  const isShoppingView = sections.length > 0 && sections.every((s) => (s as any).context === "shopping");

  // Separate "To Sort" section from other sections
  const toSortSection = sections.find(
    (s) => s.name.toLowerCase() === "to sort",
  );
  const regularSections = sections.filter(
    (s) => s.name.toLowerCase() !== "to sort",
  );

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        showFilterMenu &&
        !target.closest(".filter-menu") &&
        !target.closest(".col-filter-button")
      ) {
        setShowFilterMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilterMenu]);

  // Handle column header click for sorting
  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Toggle filter for a column value
  const toggleFilter = (column: keyof ColumnFilters, value: string) => {
    setFilters((prev) => {
      const currentFilters = prev[column] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter((v) => v !== value)
        : [...currentFilters, value];

      return {
        ...prev,
        [column]: newFilters.length > 0 ? newFilters : undefined,
      };
    });
  };

  // Sort and filter tasks
  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply filters
    if (filters.importance && filters.importance.length > 0) {
      result = result.filter((task) =>
        task.importance ? filters.importance!.includes(task.importance) : false,
      );
    }
    if (filters.urgent && filters.urgent.length > 0) {
      result = result.filter((task) =>
        filters.urgent!.includes(String(task.urgent ?? false)),
      );
    }
    if (filters.length && filters.length.length > 0) {
      result = result.filter((task) =>
        task.length ? filters.length!.includes(task.length) : false
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((task) =>
        task.tags.some((tag) => filters.tags!.includes(tag)),
      );
    }
    if (filters.project && filters.project.length > 0) {
      result = result.filter(
        (task) => task.project_id && filters.project!.includes(task.project_id),
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "due_date":
            aValue = a.due_date ? parseISO(a.due_date).getTime() : 0;
            bValue = b.due_date ? parseISO(b.due_date).getTime() : 0;
            break;
          case "importance":
            const importanceOrder: Record<string, number> = {
              normal: 0,
              important: 1,
              very_important: 2,
            };
            aValue = a.importance ? importanceOrder[a.importance] : -1;
            bValue = b.importance ? importanceOrder[b.importance] : -1;
            break;
          case "urgent":
            aValue = a.urgent === true ? 1 : a.urgent === false ? 0 : -1;
            bValue = b.urgent === true ? 1 : b.urgent === false ? 0 : -1;
            break;
          case "length":
            const lengthOrder: Record<string, number> = { short: 0, medium: 1, long: 2 };
            aValue = a.length ? lengthOrder[a.length] : -1;
            bValue = b.length ? lengthOrder[b.length] : -1;
            break;
          case "tags":
            aValue = a.tags.join(",").toLowerCase();
            bValue = b.tags.join(",").toLowerCase();
            break;
          case "project":
            const aProject = projects.find((p) => p.id === a.project_id);
            const bProject = projects.find((p) => p.id === b.project_id);
            aValue = aProject?.name.toLowerCase() || "";
            bValue = bProject?.name.toLowerCase() || "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, sortColumn, sortDirection, filters, projects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Determine if dragging a task or section
    const isTask = tasks.some((t) => t.id === active.id);
    setActiveType(isTask ? "task" : "section");
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Only handle task dragging between sections
    if (activeType !== "task") return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    // Check if overId is a section
    let targetSectionId: string | null = null;
    const overSection = sections.find((s) => s.id === overId);

    if (overSection) {
      targetSectionId = overId;
    } else {
      // Check if overId is a task, get its section
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetSectionId = overTask.section_id;
      }
    }

    // Move to different section if needed
    if (targetSectionId && activeTask.section_id !== targetSectionId) {
      const newSectionTasks = tasks.filter((t) => t.section_id === targetSectionId);
      onMoveTaskToSection(activeTaskId, targetSectionId, newSectionTasks.length);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || active.id === over.id) return;

    if (activeType === "section") {
      // Reordering sections
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== newIndex) {
        const newOrder = [...sections];
        const [movedSection] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, movedSection);
        onReorderSections(newOrder.map((s) => s.id));
      }
    } else if (activeType === "task") {
      // Reordering tasks within a section
      const activeTask = tasks.find((t) => t.id === active.id);
      const overTask = tasks.find((t) => t.id === over.id);

      if (
        activeTask &&
        overTask &&
        activeTask.section_id === overTask.section_id
      ) {
        const sectionTasks = tasks
          .filter((t) => t.section_id === activeTask.section_id)
          .sort((a, b) => a.position - b.position);

        const oldIndex = sectionTasks.findIndex((t) => t.id === active.id);
        const newIndex = sectionTasks.findIndex((t) => t.id === over.id);

        if (oldIndex !== newIndex) {
          const newOrder = [...sectionTasks];
          const [movedTask] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, movedTask);
          onReorderTasks(
            activeTask.section_id,
            newOrder.map((t) => t.id),
          );
        }
      }
    }
  };

  const getTasksBySectionId = (sectionId: string) => {
    return sortedAndFilteredTasks
      .filter((t) => t.section_id === sectionId)
      .sort((a, b) => {
        // If we're actively sorting, don't apply position sort
        if (sortColumn && sortDirection) {
          return 0;
        }
        return a.position - b.position;
      });
  };

  // Get unique values for filters
  const getUniqueValues = (column: keyof ColumnFilters) => {
    const values = new Set<string>();

    switch (column) {
      case "importance":
        tasks.forEach((task) => {
          if (task.importance) values.add(task.importance);
        });
        break;
      case "length":
        tasks.forEach((task) => {
          if (task.length) values.add(task.length);
        });
        break;
      case "tags":
        tasks.forEach((task) => task.tags.forEach((tag) => values.add(tag)));
        break;
      case "project":
        tasks.forEach((task) => {
          if (task.project_id) values.add(task.project_id);
        });
        break;
    }

    return Array.from(values);
  };

  // Show empty state if no sections
  if (sections.length === 0) {
    return (
      <div className="section-list">
        <EmptyState
          type="sections"
          onAction={onAddSection}
          actionLabel="Create Section"
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="section-list">
        {/* Global search for shopping view */}
        {isShoppingView && allTasks && onUnarchiveTask && (
          <GlobalShoppingSearch
            allTasks={allTasks}
            sections={sections}
            onAddTask={onAddTask}
            onUnarchiveTask={onUnarchiveTask}
          />
        )}

        {/* To Sort section - rendered separately at the top */}
        {toSortSection && (
          <table className="tasks-table to-sort-table">
            <thead>
              <tr className="table-header-row">
                <th className="col-number">#</th>
                <th
                  className="col-task-name"
                  style={{ width: `${columnWidths.taskName}%` }}
                >
                  <div className="col-header-content">
                    <span>Task</span>
                  </div>
                </th>
                <th
                  className="col-due-date"
                  style={{ width: `${columnWidths.dueDate}%` }}
                >
                  <div className="col-header-content">
                    <span>Due date</span>
                  </div>
                </th>
                <th
                  className="col-priority"
                  style={{ width: `${columnWidths.priority}%` }}
                >
                  <div className="col-header-content">
                    <span>Priority</span>
                  </div>
                </th>
                <th
                  className="col-projects"
                  style={{ width: `${columnWidths.projects}%` }}
                >
                  <div className="col-header-content">
                    <span>Projects</span>
                  </div>
                </th>
                <th
                  className="col-urgent"
                  style={{ width: `${columnWidths.urgent}%` }}
                >
                  <div className="col-header-content">
                    <span>Urgent</span>
                  </div>
                </th>
                <th
                  className="col-length"
                  style={{ width: `${columnWidths.length}%` }}
                >
                  <div className="col-header-content">
                    <span>Length</span>
                  </div>
                </th>
                <th
                  className="col-tags"
                  style={{ width: `${columnWidths.tags}%` }}
                >
                  <div className="col-header-content">
                    <span>Tags</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={[toSortSection.id]}
                strategy={verticalListSortingStrategy}
              >
                <SortableSection
                  section={toSortSection}
                  tasks={getTasksBySectionId(toSortSection.id)}
                  projects={projects}
                  selectedTaskId={selectedTaskId}
                  selectedTaskIds={selectedTaskIds}
                  onSelectTask={onSelectTask}
                  onCompleteTask={onCompleteTask}
                  onUpdateTask={onUpdateTask}
                  onUpdateSection={onUpdateSection}
                  onDeleteSection={onDeleteSection}
                  onAddTask={onAddTask}
                  onOpenSectionMove={onOpenSectionMove}
                  columnWidths={columnWidths}
                  allTasks={allTasks}
                  onUnarchiveTask={onUnarchiveTask}
                />
              </SortableContext>
            </tbody>
          </table>
        )}

        {/* Main task list */}
        <table className={`tasks-table ${isShoppingView ? "shopping-view" : ""}`}>
          <thead>
            <tr className="table-header-row">
              <th className="col-number">#</th>
              <th
                className="col-task-name"
                style={{ width: `${columnWidths.taskName}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("name")}
                  >
                    <span>{isShoppingView ? "Item" : "Task"}</span>
                    {sortColumn === "name" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("taskName", e.clientX);
                    }}
                  />
                </div>
              </th>
              <th
                className="col-due-date"
                style={{ width: `${columnWidths.dueDate}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("due_date")}
                  >
                    <span>Due date</span>
                    {sortColumn === "due_date" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("dueDate", e.clientX);
                    }}
                  />
                </div>
              </th>
              {!isShoppingView && (
                <>
              <th
                className="col-priority"
                style={{ width: `${columnWidths.priority}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("importance")}
                  >
                    <span>Priority</span>
                    {sortColumn === "importance" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <button
                    className={`col-filter-button ${filters.importance && filters.importance.length > 0 ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterMenu(
                        showFilterMenu === "importance" ? null : "importance",
                      );
                    }}
                  >
                    <Filter size={14} />
                  </button>
                  {showFilterMenu === "importance" && (
                    <div className="filter-menu">
                      {["normal", "important", "very_important"].map(
                        (value) => (
                          <label key={value} className="filter-option">
                            <input
                              type="checkbox"
                              checked={
                                filters.importance?.includes(value) || false
                              }
                              onChange={() => toggleFilter("importance", value)}
                            />
                            <span>
                              {value === "very_important"
                                ? "High"
                                : value === "important"
                                  ? "Medium"
                                  : "Low"}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  )}
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("priority", e.clientX);
                    }}
                  />
                </div>
              </th>
              <th
                className="col-projects"
                style={{ width: `${columnWidths.projects}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("project")}
                  >
                    <span>Projects</span>
                    {sortColumn === "project" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <button
                    className={`col-filter-button ${filters.project && filters.project.length > 0 ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterMenu(
                        showFilterMenu === "project" ? null : "project",
                      );
                    }}
                  >
                    <Filter size={14} />
                  </button>
                  {showFilterMenu === "project" && (
                    <div className="filter-menu">
                      {getUniqueValues("project").map((projectId) => {
                        const project = projects.find(
                          (p) => p.id === projectId,
                        );
                        return (
                          <label key={projectId} className="filter-option">
                            <input
                              type="checkbox"
                              checked={
                                filters.project?.includes(projectId) || false
                              }
                              onChange={() =>
                                toggleFilter("project", projectId)
                              }
                            />
                            <span>{project?.name || "Unknown"}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("projects", e.clientX);
                    }}
                  />
                </div>
              </th>
              <th
                className="col-urgent"
                style={{ width: `${columnWidths.urgent}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("urgent")}
                  >
                    <span>Urgent</span>
                    {sortColumn === "urgent" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <button
                    className={`col-filter-button ${filters.urgent && filters.urgent.length > 0 ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterMenu(
                        showFilterMenu === "urgent" ? null : "urgent",
                      );
                    }}
                  >
                    <Filter size={14} />
                  </button>
                  {showFilterMenu === "urgent" && (
                    <div className="filter-menu">
                      {["true", "false"].map((value) => (
                        <label key={value} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.urgent?.includes(value) || false}
                            onChange={() => toggleFilter("urgent", value)}
                          />
                          <span>{value === "true" ? "Yes" : "No"}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("urgent", e.clientX);
                    }}
                  />
                </div>
              </th>
              <th
                className="col-length"
                style={{ width: `${columnWidths.length}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("length")}
                  >
                    <span>Length</span>
                    {sortColumn === "length" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <button
                    className={`col-filter-button ${filters.length && filters.length.length > 0 ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterMenu(
                        showFilterMenu === "length" ? null : "length",
                      );
                    }}
                  >
                    <Filter size={14} />
                  </button>
                  {showFilterMenu === "length" && (
                    <div className="filter-menu">
                      {["short", "medium", "long"].map((value) => (
                        <label key={value} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.length?.includes(value) || false}
                            onChange={() => toggleFilter("length", value)}
                          />
                          <span>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("length", e.clientX);
                    }}
                  />
                </div>
              </th>
              <th
                className="col-tags"
                style={{ width: `${columnWidths.tags}%` }}
              >
                <div className="col-header-content">
                  <button
                    className="col-header-button"
                    onClick={() => handleHeaderClick("tags")}
                  >
                    <span>Tags</span>
                    {sortColumn === "tags" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </button>
                  <button
                    className={`col-filter-button ${filters.tags && filters.tags.length > 0 ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterMenu(
                        showFilterMenu === "tags" ? null : "tags",
                      );
                    }}
                  >
                    <Filter size={14} />
                  </button>
                  {showFilterMenu === "tags" && (
                    <div className="filter-menu">
                      {getUniqueValues("tags").map((value) => (
                        <label key={value} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.tags?.includes(value) || false}
                            onChange={() => toggleFilter("tags", value)}
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown("tags", e.clientX);
                    }}
                  />
                </div>
              </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={sectionIds}
              strategy={verticalListSortingStrategy}
            >
              {regularSections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  tasks={getTasksBySectionId(section.id)}
                  projects={projects}
                  selectedTaskId={selectedTaskId}
                  selectedTaskIds={selectedTaskIds}
                  onSelectTask={onSelectTask}
                  onCompleteTask={onCompleteTask}
                  onUpdateTask={onUpdateTask}
                  onUpdateSection={onUpdateSection}
                  onDeleteSection={onDeleteSection}
                  onAddTask={onAddTask}
                  onOpenSectionMove={onOpenSectionMove}
                  columnWidths={columnWidths}
                  allTasks={allTasks}
                  onUnarchiveTask={onUnarchiveTask}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>

        <button className="add-section-button" onClick={onAddSection}>
          <Plus size={16} />
          Add Section
        </button>
      </div>

      <DragOverlay>
        {activeId && activeType === "task" ? (
          <div className="drag-overlay-task">
            {tasks.find((t) => t.id === activeId)?.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
