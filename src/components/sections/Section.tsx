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
}: SectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({ id: section.id });
  const taskIds = tasks.map((t) => t.id);

  const handleHeaderClick = () => {
    if (!isEditing) setIsCollapsed(!isCollapsed);
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
    if (e.key === "Enter") handleNameSave();
    else if (e.key === "Escape") { setEditValue(section.name); setIsEditing(false); }
  };

  const handleAddTaskSubmit = async () => {
    if (!newTaskInput.trim()) return;
    setIsAddingTask(true);
    try {
      await onAddTask(section.id, newTaskInput.trim());
      setNewTaskInput("");
    } finally {
      setIsAddingTask(false);
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

  const handleAddTaskPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const lines = pastedText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length > 1) {
      e.preventDefault();
      setIsAddingTask(true);
      try {
        for (const line of lines) {
          try { await onAddTask(section.id, line); }
          catch (err) { console.error("Failed to create task:", line, err); }
        }
        setNewTaskInput("");
      } finally {
        setIsAddingTask(false);
      }
    }
  };

  return (
    <Fragment>
      <tr ref={setNodeRef} className="section-header-row" onClick={handleHeaderClick}>
        <td colSpan={8} className="section-cell-header">
          <div className="section-header-content">
            <button
              className="collapse-toggle"
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
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
                <h3 className="section-name" onClick={handleNameClick}>{section.name}</h3>
                <button
                  className="section-delete-button"
                  onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
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
            <tr className="section-add-task-row">
              <td colSpan={8} className="section-add-task-cell">
                <input
                  ref={addTaskInputRef}
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={handleAddTaskKeyDown}
                  onPaste={handleAddTaskPaste}
                  placeholder="New task"
                  disabled={isAddingTask}
                  className="section-add-task-input"
                />
              </td>
            </tr>

            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
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
                  onAddTaskBelow={async () => { await onAddTask(section.id, "New task"); }}
                  rowNumber={index + 1}
                />
              ))}
            </SortableContext>
          </Fragment>
        )}
      </AnimatePresence>
    </Fragment>
  );
}
