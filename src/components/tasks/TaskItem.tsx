import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  GripVertical,
  Circle,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Task, Project } from "../../types";
import "./TaskItem.css";

interface TaskItemProps {
  task: Task;
  projects: Project[];
  selected: boolean;
  isMultiSelected?: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onComplete: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  rowNumber: number;
  columnWidths?: {
    taskName: number;
    dueDate: number;
    priority: number;
    urgent: number;
    length: number;
    tags: number;
    projects: number;
  };
}

export function TaskItem({
  task,
  projects,
  selected,
  isMultiSelected,
  onSelect,
  onComplete,
  onUpdate,
  rowNumber,
  columnWidths,
}: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(task.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Custom listeners that allow dragging from anywhere on the row
  // except interactive elements (inputs, selects, buttons, text)
  const rowListeners = useMemo(() => {
    if (!listeners) return undefined;

    const wrappedListeners: typeof listeners = {};

    for (const [key, handler] of Object.entries(listeners)) {
      if (key === "onPointerDown" || key === "onKeyDown") {
        wrappedListeners[key as keyof typeof listeners] = ((
          event: React.PointerEvent | React.KeyboardEvent,
        ) => {
          const target = event.target as HTMLElement;
          // Don't start drag on interactive elements or text
          if (
            target.closest("input") ||
            target.closest("select") ||
            target.closest("button") ||
            target.closest(".task-name") ||
            target.closest(".tag-pill") ||
            target.closest('[data-no-dnd="true"]')
          ) {
            return;
          }
          (handler as (event: React.PointerEvent | React.KeyboardEvent) => void)(event);
        }) as typeof handler;
      } else {
        wrappedListeners[key as keyof typeof listeners] = handler;
      }
    }

    return wrappedListeners;
  }, [listeners]);

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    // Wait for animation to complete before calling onComplete
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onUpdate(task.id, { due_date: e.target.value || null });
  };

  const handleClearDueDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(task.id, { due_date: null, strict_due_date: false });
  };

  const handleStrictDueDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    e.stopPropagation();
    onUpdate(task.id, { strict_due_date: e.target.checked });
  };

  // Calculate urgency level for strict due dates
  const dueDateUrgency = useMemo(() => {
    if (!task.due_date || !task.strict_due_date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === 2) return "soon";
    if (diffDays < 0) return "overdue";
    return null;
  }, [task.due_date, task.strict_due_date]);

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    onUpdate(task.id, { importance: value === "" ? null : value as Task["importance"] });
  };

  const handleUrgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    onUpdate(task.id, { urgent: value === "" ? null : value === "true" });
  };

  const handleLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    onUpdate(task.id, { length: value === "" ? null : value as Task["length"] });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onUpdate(task.id, { project_id: e.target.value || null });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !task.tags.includes(tagInput.trim())) {
      const newTags = [...task.tags, tagInput.trim()];
      onUpdate(task.id, { tags: newTags });
      setTagInput("");
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    const newTags = task.tags.filter((tag) => tag !== tagToRemove);
    onUpdate(task.id, { tags: newTags });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
      // Keep isEditingTags true to allow adding multiple tags
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditingTags(false);
      setTagInput("");
    }
  };

  const handleTagsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTags(true);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setNameInput(task.name);
  };

  const handleNameSave = () => {
    if (nameInput.trim() && nameInput !== task.name) {
      onUpdate(task.id, { name: nameInput.trim() });
    } else {
      setNameInput(task.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    // Stop the native event from reaching useHotkeys
    e.nativeEvent.stopImmediatePropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setNameInput(task.name);
      setIsEditingName(false);
    }
  };

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      className={`task-row ${selected ? "selected" : ""} ${isMultiSelected ? "multi-selected" : ""} ${isCompleting ? "completing" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={(e) => onSelect(e)}
      initial={{ opacity: 0 }}
      animate={{
        opacity: isCompleting ? 0 : 1,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      {...attributes}
      {...rowListeners}
    >
      <td className="task-cell-number">
        <span className="task-number">{rowNumber}</span>
      </td>

      <td
        className="task-cell-name"
        style={
          columnWidths ? { width: `${columnWidths.taskName}%` } : undefined
        }
      >
        <div className="task-name-container">
          <button
            className="task-checkbox"
            onClick={handleCheckboxClick}
            aria-label="Complete task"
          >
            {isCompleting ? (
              <CheckCircle2 size={18} className="checkbox-icon checked" />
            ) : (
              <Circle size={18} className="checkbox-icon" />
            )}
          </button>
          {isEditingName ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                e.stopPropagation();
                setNameInput(e.target.value);
              }}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="inline-name-input"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`task-name ${isCompleting ? "strikethrough" : ""}`}
              onClick={handleNameClick}
            >
              {task.name}
            </span>
          )}
          <div className="task-drag-handle">
            <GripVertical size={14} />
          </div>
        </div>
      </td>

      <td
        className={`task-cell-due-date ${dueDateUrgency ? `strict-due-${dueDateUrgency}` : ""}`}
        style={columnWidths ? { width: `${columnWidths.dueDate}%` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="due-date-container">
          {dueDateUrgency && (
            <AlertTriangle
              size={16}
              className={`due-date-warning-icon due-date-warning-${dueDateUrgency}`}
            />
          )}
          <input
            type="date"
            value={task.due_date || ""}
            onChange={handleDueDateChange}
            className={`inline-date-input ${dueDateUrgency ? `strict-due-${dueDateUrgency}` : ""}`}
            placeholder="Set date"
          />
          {task.due_date && (
            <>
              <label className="strict-checkbox-label" title="Strict deadline">
                <input
                  type="checkbox"
                  checked={task.strict_due_date || false}
                  onChange={handleStrictDueDateChange}
                  className="strict-checkbox"
                />
                <span className="strict-label-text">!</span>
              </label>
              <button
                className="due-date-clear-btn"
                onClick={handleClearDueDate}
                title="Clear due date"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </td>

      <td
        className="task-cell-priority"
        style={
          columnWidths ? { width: `${columnWidths.priority}%` } : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={task.importance ?? ""}
          onChange={handlePriorityChange}
          className={`inline-select priority-select priority-${task.importance ?? "blank"}`}
        >
          <option value=""></option>
          <option value="normal">Low</option>
          <option value="important">Medium</option>
          <option value="very_important">High</option>
        </select>
      </td>

      <td
        className="task-cell-project"
        style={
          columnWidths ? { width: `${columnWidths.projects}%` } : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={task.project_id || ""}
          onChange={handleProjectChange}
          className="inline-select project-select"
        >
          <option value="">No Project</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name}
            </option>
          ))}
        </select>
      </td>

      <td
        className="task-cell-urgent"
        style={columnWidths ? { width: `${columnWidths.urgent}%` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={task.urgent === null ? "" : task.urgent.toString()}
          onChange={handleUrgentChange}
          className={`inline-select urgent-select urgent-${task.urgent === null ? "blank" : task.urgent}`}
        >
          <option value=""></option>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>

      <td
        className="task-cell-length"
        style={columnWidths ? { width: `${columnWidths.length}%` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={task.length ?? ""}
          onChange={handleLengthChange}
          className={`inline-select length-select length-${task.length ?? "blank"}`}
        >
          <option value=""></option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </td>

      <td
        className="task-cell-tags"
        style={columnWidths ? { width: `${columnWidths.tags}%` } : undefined}
        onClick={handleTagsClick}
      >
        <div className="tags-container">
          {task.tags &&
            task.tags.length > 0 &&
            task.tags.map((tag) => (
              <span key={tag} className="tag-pill">
                {tag}
                <button
                  className="tag-remove-inline"
                  onClick={(e) => handleRemoveTag(e, tag)}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          {isEditingTags && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => {
                e.stopPropagation();
                setTagInput(e.target.value);
              }}
              onKeyDown={handleTagInputKeyDown}
              onBlur={() => {
                handleAddTag();
                setIsEditingTags(false);
              }}
              className="inline-tag-input"
              placeholder="Add tag..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </td>
    </motion.tr>
  );
}
