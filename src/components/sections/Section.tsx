import { useState, KeyboardEvent, Fragment, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Section as SectionType, Task, Project } from "../../types";
import { TaskItem } from "../tasks/TaskItem";
import { SmartShoppingInput } from "./SmartShoppingInput";
import "./Section.css";

interface SectionProps {
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
  dragHandleProps?: any;
  columnWidths?: {
    taskName: number;
    dueDate: number;
    priority: number;
    urgent: number;
    length: number;
    tags: number;
    projects: number;
  };
  allTasks?: Task[]; // All tasks including completed for shopping list
  onUnarchiveTask?: (taskId: string) => void;
}

export function Section({
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
  dragHandleProps: _dragHandleProps,
  columnWidths,
  allTasks,
  onUnarchiveTask,
}: SectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [autoCreatedTaskId, setAutoCreatedTaskId] = useState<string | null>(null);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: section.id,
  });

  const taskIds = tasks.map((t) => t.id);

  // Check if this is a shopping section
  const isShoppingSection = (section as any).context === "shopping";

  const handleHeaderClick = () => {
    if (!isEditing) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameSave = () => {
    if (editValue.trim() && editValue !== section.name) {
      onUpdateSection(section.id, { name: editValue.trim() });
    } else {
      setEditValue(section.name);
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditValue(section.name);
      setIsEditing(false);
    }
  };

  const handleAddTaskSubmit = async () => {
    if (!newTaskInput.trim()) return;
    setIsAddingTask(true);
    try {
      // If we have an auto-created task, just clear state (task already exists)
      if (autoCreatedTaskId) {
        setAutoCreatedTaskId(null);
        setNewTaskInput("");
      } else {
        // Create new task (mobile or if auto-create didn't happen)
        await onAddTask(section.id, newTaskInput.trim());
        setNewTaskInput("");
      }
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTaskInput(value);

    // On desktop (not mobile), auto-create task when typing starts
    const isDesktop = window.innerWidth > 768;

    if (!value.trim() && autoCreatedTaskId) {
      // User cleared the input - delete the auto-created task
      // We'll need a delete function, but for now just reset the ID
      setAutoCreatedTaskId(null);
    } else if (isDesktop && value.trim() && !autoCreatedTaskId && !isShoppingSection) {
      setIsAddingTask(true);
      try {
        // Create a task and track its ID
        const newTask = await onAddTask(section.id, value.trim());
        if (newTask) {
          setAutoCreatedTaskId(newTask.id);
        }
      } finally {
        setIsAddingTask(false);
      }
    } else if (autoCreatedTaskId && value.trim()) {
      // Update the existing auto-created task as the user types
      await onUpdateTask(autoCreatedTaskId, { name: value.trim() });
    }
  };

  const handleAddTaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTaskSubmit();
    } else if (e.key === "Escape") {
      setNewTaskInput("");
      addTaskInputRef.current?.blur();
    }
  };

  const handleAddTaskPaste = async (
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const pastedText = e.clipboardData.getData("text");

    // Check if the pasted text contains multiple lines
    const lines = pastedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length > 1) {
      // Prevent default paste behavior
      e.preventDefault();

      setIsAddingTask(true);
      try {
        // Create a task for each line
        for (const line of lines) {
          try {
            await onAddTask(section.id, line);
          } catch (err) {
            console.error("Failed to create task from line:", line, err);
          }
        }

        // Clear input
        setNewTaskInput("");
      } finally {
        setIsAddingTask(false);
      }
    }
    // If only one line, allow normal paste behavior
  };

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        className="section-header-row"
        onClick={handleHeaderClick}
      >
        <td colSpan={8} className="section-cell-header">
          <div className="section-header-content">
            <button
              className="collapse-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="section-name-input"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <h3 className="section-name" onClick={handleNameClick}>
                  {section.name}
                </h3>
                <button
                  className="section-delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(section.id);
                  }}
                  title="Delete section"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      <AnimatePresence>
        {!isCollapsed && (
          <Fragment>
            {/* Add task input - right under section header */}
            <tr className="section-add-task-row">
              <td className="empty-cell"></td>
              <td className="section-add-task-cell">
                {isShoppingSection && allTasks && onUnarchiveTask ? (
                  <SmartShoppingInput
                    sectionId={section.id}
                    allTasks={allTasks}
                    onAddTask={onAddTask}
                    onUnarchiveTask={onUnarchiveTask}
                    disabled={isAddingTask}
                  />
                ) : (
                  <input
                    ref={addTaskInputRef}
                    type="text"
                    value={newTaskInput}
                    onChange={handleInputChange}
                    onKeyDown={handleAddTaskKeyDown}
                    onPaste={handleAddTaskPaste}
                    placeholder="New task"
                    disabled={isAddingTask}
                    className="section-add-task-input"
                  />
                )}
              </td>
              <td colSpan={6}></td>
            </tr>

            {tasks.length === 0 && (
              <tr className="empty-section-row">
                <td colSpan={8} className="empty-section-cell">
                  No tasks yet
                </td>
              </tr>
            )}

            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  selected={selectedTaskId === task.id}
                  isMultiSelected={selectedTaskIds.has(task.id)}
                  onSelect={(e) => onSelectTask(task.id, e)}
                  onComplete={() => onCompleteTask(task.id)}
                  onUpdate={onUpdateTask}
                  onOpenSectionMove={onOpenSectionMove}
                  rowNumber={index + 1}
                  columnWidths={columnWidths}
                />
              ))}
            </SortableContext>
          </Fragment>
        )}
      </AnimatePresence>
    </Fragment>
  );
}
