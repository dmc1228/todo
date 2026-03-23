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
  onMoveTaskToSection: (taskId: string, newSectionId: string, newPosition: number) => void;
  onAddSection: () => void;
  onAddTask: (sectionId: string, rawInput: string) => Promise<Task | null>;
  onOpenSectionMove?: (taskId: string) => void;
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
}: {
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
}) {
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
    />
  );
}

type SortColumn = "name" | "due_date" | "importance" | "urgent" | "length" | "tags" | "project";
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
}: SectionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"task" | "section" | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [showFilterMenu, setShowFilterMenu] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sectionIds = sections.map((s) => s.id);

  const toSortSection = sections.find((s) => s.name.toLowerCase() === "to sort");
  const regularSections = sections.filter((s) => s.name.toLowerCase() !== "to sort");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilterMenu && !target.closest(".filter-menu") && !target.closest(".col-filter-button")) {
        setShowFilterMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilterMenu]);

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleFilter = (column: keyof ColumnFilters, value: string) => {
    setFilters((prev) => {
      const current = prev[column] || [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [column]: updated.length > 0 ? updated : undefined };
    });
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filters.importance?.length) result = result.filter((t) => t.importance && filters.importance!.includes(t.importance));
    if (filters.urgent?.length) result = result.filter((t) => filters.urgent!.includes(String(t.urgent ?? false)));
    if (filters.length?.length) result = result.filter((t) => t.length && filters.length!.includes(t.length));
    if (filters.tags?.length) result = result.filter((t) => t.tags.some((tag) => filters.tags!.includes(tag)));
    if (filters.project?.length) result = result.filter((t) => t.project_id && filters.project!.includes(t.project_id));

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortColumn) {
          case "name": aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase(); break;
          case "due_date": aValue = a.due_date ? parseISO(a.due_date).getTime() : 0; bValue = b.due_date ? parseISO(b.due_date).getTime() : 0; break;
          case "importance": {
            const order: Record<string, number> = { normal: 0, important: 1, very_important: 2 };
            aValue = a.importance ? order[a.importance] : -1; bValue = b.importance ? order[b.importance] : -1; break;
          }
          case "urgent": aValue = a.urgent ? 1 : 0; bValue = b.urgent ? 1 : 0; break;
          case "length": {
            const order: Record<string, number> = { short: 0, medium: 1, long: 2 };
            aValue = a.length ? order[a.length] : -1; bValue = b.length ? order[b.length] : -1; break;
          }
          case "tags": aValue = a.tags.join(",").toLowerCase(); bValue = b.tags.join(",").toLowerCase(); break;
          case "project": {
            const ap = projects.find((p) => p.id === a.project_id);
            const bp = projects.find((p) => p.id === b.project_id);
            aValue = ap?.name.toLowerCase() || ""; bValue = bp?.name.toLowerCase() || ""; break;
          }
          default: return 0;
        }
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, sortColumn, sortDirection, filters, projects]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(tasks.some((t) => t.id === event.active.id) ? "task" : "section");
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || activeType !== "task") return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let targetSectionId: string | null = null;
    if (sections.find((s) => s.id === over.id)) {
      targetSectionId = over.id as string;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetSectionId = overTask.section_id;
    }

    if (targetSectionId && activeTask.section_id !== targetSectionId) {
      const newSectionTasks = tasks.filter((t) => t.section_id === targetSectionId);
      onMoveTaskToSection(active.id as string, targetSectionId, newSectionTasks.length);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || active.id === over.id) return;

    if (activeType === "section") {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex !== newIndex) {
        const newOrder = [...sections];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        onReorderSections(newOrder.map((s) => s.id));
      }
    } else if (activeType === "task") {
      const activeTask = tasks.find((t) => t.id === active.id);
      const overTask = tasks.find((t) => t.id === over.id);
      if (activeTask && overTask && activeTask.section_id === overTask.section_id) {
        const sectionTasks = tasks
          .filter((t) => t.section_id === activeTask.section_id)
          .sort((a, b) => a.position - b.position);
        const oldIndex = sectionTasks.findIndex((t) => t.id === active.id);
        const newIndex = sectionTasks.findIndex((t) => t.id === over.id);
        if (oldIndex !== newIndex) {
          const newOrder = [...sectionTasks];
          const [moved] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, moved);
          onReorderTasks(activeTask.section_id, newOrder.map((t) => t.id));
        }
      }
    }
  };

  const getTasksBySectionId = (sectionId: string) => {
    return sortedAndFilteredTasks
      .filter((t) => t.section_id === sectionId)
      .sort((a, b) => (sortColumn && sortDirection ? 0 : a.position - b.position));
  };

  const getUniqueValues = (column: keyof ColumnFilters) => {
    const values = new Set<string>();
    switch (column) {
      case "importance": tasks.forEach((t) => { if (t.importance) values.add(t.importance); }); break;
      case "length": tasks.forEach((t) => { if (t.length) values.add(t.length); }); break;
      case "tags": tasks.forEach((t) => t.tags.forEach((tag) => values.add(tag))); break;
      case "project": tasks.forEach((t) => { if (t.project_id) values.add(t.project_id); }); break;
    }
    return Array.from(values);
  };

  if (sections.length === 0) {
    return (
      <div className="section-list">
        <EmptyState type="sections" onAction={onAddSection} actionLabel="Create Section" />
      </div>
    );
  }

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const renderFilterButton = (column: keyof ColumnFilters, values: string[], renderLabel: (v: string) => string) => (
    <>
      <button
        className={`col-filter-button ${filters[column]?.length ? "active" : ""}`}
        onClick={(e) => { e.stopPropagation(); setShowFilterMenu(showFilterMenu === column ? null : column); }}
      >
        <Filter size={14} />
      </button>
      {showFilterMenu === column && (
        <div className="filter-menu">
          {values.map((value) => (
            <label key={value} className="filter-option">
              <input type="checkbox" checked={filters[column]?.includes(value) || false} onChange={() => toggleFilter(column, value)} />
              <span>{renderLabel(value)}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="section-list">
        {toSortSection && (
          <table className="tasks-table to-sort-table">
            <thead>
              <tr className="table-header-row">
                <th className="col-number">#</th>
                <th className="col-task-name"><div className="col-header-content"><span>Task</span></div></th>
                <th className="col-due-date"><div className="col-header-content"><span>Due date</span></div></th>
                <th className="col-priority"><div className="col-header-content"><span>Priority</span></div></th>
                <th className="col-projects"><div className="col-header-content"><span>Projects</span></div></th>
                <th className="col-urgent"><div className="col-header-content"><span>Urgent</span></div></th>
                <th className="col-length"><div className="col-header-content"><span>Length</span></div></th>
                <th className="col-tags"><div className="col-header-content"><span>Tags</span></div></th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={[toSortSection.id]} strategy={verticalListSortingStrategy}>
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
                />
              </SortableContext>
            </tbody>
          </table>
        )}

        <table className="tasks-table">
          <thead>
            <tr className="table-header-row">
              <th className="col-number">#</th>
              <th className="col-task-name">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("name")}>
                    <span>Task</span>{renderSortIcon("name")}
                  </button>
                </div>
              </th>
              <th className="col-due-date">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("due_date")}>
                    <span>Due date</span>{renderSortIcon("due_date")}
                  </button>
                </div>
              </th>
              <th className="col-priority">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("importance")}>
                    <span>Priority</span>{renderSortIcon("importance")}
                  </button>
                  {renderFilterButton("importance", ["normal", "important", "very_important"], (v) =>
                    v === "very_important" ? "High" : v === "important" ? "Medium" : "Low"
                  )}
                </div>
              </th>
              <th className="col-projects">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("project")}>
                    <span>Projects</span>{renderSortIcon("project")}
                  </button>
                  {renderFilterButton("project", getUniqueValues("project"), (v) =>
                    projects.find((p) => p.id === v)?.name || "Unknown"
                  )}
                </div>
              </th>
              <th className="col-urgent">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("urgent")}>
                    <span>Urgent</span>{renderSortIcon("urgent")}
                  </button>
                  {renderFilterButton("urgent", ["true", "false"], (v) => v === "true" ? "Yes" : "No")}
                </div>
              </th>
              <th className="col-length">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("length")}>
                    <span>Length</span>{renderSortIcon("length")}
                  </button>
                  {renderFilterButton("length", ["short", "medium", "long"], (v) => v.charAt(0).toUpperCase() + v.slice(1))}
                </div>
              </th>
              <th className="col-tags">
                <div className="col-header-content">
                  <button className="col-header-button" onClick={() => handleHeaderClick("tags")}>
                    <span>Tags</span>{renderSortIcon("tags")}
                  </button>
                  {renderFilterButton("tags", getUniqueValues("tags"), (v) => v)}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
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
          <div className="drag-overlay-task">{tasks.find((t) => t.id === activeId)?.name}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
