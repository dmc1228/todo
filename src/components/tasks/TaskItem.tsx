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
  FolderInput,
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
  onOpenSectionMove?: (taskId: string) => void;
  onAddTaskBelow?: () => void;
  rowNumber: number;
}

export function TaskItem({
  task,
  projects,
  selected,
  isMultiSelected,
  onSelect,
  onComplete,
  onUpdate,
  onOpenSectionMove,
  onAddTaskBelow,
  rowNumber,
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

  const rowListeners = useMemo(() => {
    if (!listeners) return undefined;
    const wrapped: typeof listeners = {};
    for (const [key, handler] of Object.entries(listeners)) {
      if (key === "onPointerDown" || key === "onKeyDown") {
        wrapped[key as keyof typeof listeners] = ((event: React.PointerEvent | React.KeyboardEvent) => {
          const target = event.target as HTMLElement;
          if (
            target.closest("input") || target.closest("select") ||
            target.closest("button") || target.closest(".task-name") ||
            target.closest(".tag-pill") || target.closest('[data-no-dnd="true"]')
          ) return;
          (handler as (event: React.PointerEvent | React.KeyboardEvent) => void)(event);
        }) as typeof handler;
      } else {
        wrapped[key as keyof typeof listeners] = handler;
      }
    }
    return wrapped;
  }, [listeners]);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    setTimeout(() => onComplete(), 500);
  };

  const dueDateUrgency = useMemo(() => {
    if (!task.due_date || !task.strict_due_date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date); dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === 2) return "soon";
    if (diffDays < 0) return "overdue";
    return null;
  }, [task.due_date, task.strict_due_date]);

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
    e.nativeEvent.stopImmediatePropagation();
    if (e.key === "Enter") { e.preventDefault(); handleNameSave(); onAddTaskBelow?.(); }
    else if (e.key === "Escape") { e.preventDefault(); setNameInput(task.name); setIsEditingName(false); }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !task.tags.includes(tagInput.trim())) {
      onUpdate(task.id, { tags: [...task.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    onUpdate(task.id, { tags: task.tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      className={`task-row ${selected ? "selected" : ""} ${isMultiSelected ? "multi-selected" : ""} ${isCompleting ? "completing" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={(e) => onSelect(e)}
      initial={{ opacity: 0 }}
      animate={{ opacity: isCompleting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      {...attributes}
      {...rowListeners}
    >
      <td className="task-cell-number">
        <span className="task-number">{rowNumber}</span>
      </td>

      <td className="task-cell-name">
        <div className="task-name-container">
          <button className="task-checkbox" onClick={handleCheckboxClick} aria-label="Complete task">
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
              onChange={(e) => { e.stopPropagation(); setNameInput(e.target.value); }}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="inline-name-input"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`task-name ${isCompleting ? "strikethrough" : ""}`} onClick={handleNameClick}>
              {task.name}
            </span>
          )}
          <button
            className="mobile-section-move-btn"
            onClick={(e) => { e.stopPropagation(); onOpenSectionMove?.(task.id); }}
            aria-label="Move to section"
            title="Move to section"
          >
            <FolderInput size={18} />
          </button>
          <div className="task-drag-handle">
            <GripVertical size={14} />
          </div>
        </div>
      </td>

      <td
        className={`task-cell-due-date ${dueDateUrgency ? `strict-due-${dueDateUrgency}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="due-date-container">
          {dueDateUrgency && <AlertTriangle size={16} className={`due-date-warning-icon due-date-warning-${dueDateUrgency}`} />}
          <input
            type="date"
            value={task.due_date || ""}
            onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
            className={`inline-date-input ${dueDateUrgency ? `strict-due-${dueDateUrgency}` : ""}`}
          />
          {task.due_date && (
            <>
              <label className="strict-checkbox-label" title="Strict deadline">
                <input
                  type="checkbox"
                  checked={task.strict_due_date || false}
                  onChange={(e) => { e.stopPropagation(); onUpdate(task.id, { strict_due_date: e.target.checked }); }}
                  className="strict-checkbox"
                />
                <span className="strict-label-text">!</span>
              </label>
              <button
                className="due-date-clear-btn"
                onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { due_date: null, strict_due_date: false }); }}
                title="Clear due date"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </td>

      <td className="task-cell-priority" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.importance ?? ""}
          onChange={(e) => onUpdate(task.id, { importance: e.target.value === "" ? null : e.target.value as Task["importance"] })}
          className={`inline-select priority-select priority-${task.importance ?? "blank"}`}
        >
          <option value=""></option>
          <option value="normal">Low</option>
          <option value="important">Medium</option>
          <option value="very_important">High</option>
        </select>
      </td>

      <td className="task-cell-project" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.project_id || ""}
          onChange={(e) => onUpdate(task.id, { project_id: e.target.value || null })}
          className="inline-select project-select"
        >
          <option value="">No Project</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>{proj.name}</option>
          ))}
        </select>
      </td>

      <td className="task-cell-urgent" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.urgent === null ? "" : task.urgent.toString()}
          onChange={(e) => onUpdate(task.id, { urgent: e.target.value === "" ? null : e.target.value === "true" })}
          className={`inline-select urgent-select urgent-${task.urgent === null ? "blank" : task.urgent}`}
        >
          <option value=""></option>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>

      <td className="task-cell-length" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.length ?? ""}
          onChange={(e) => onUpdate(task.id, { length: e.target.value === "" ? null : e.target.value as Task["length"] })}
          className={`inline-select length-select length-${task.length ?? "blank"}`}
        >
          <option value=""></option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </td>

      <td className="task-cell-tags" onClick={(e) => { e.stopPropagation(); setIsEditingTags(true); }}>
        <div className="tags-container">
          {task.tags?.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
              <button className="tag-remove-inline" onClick={(e) => handleRemoveTag(e, tag)} aria-label={`Remove ${tag}`}>x</button>
            </span>
          ))}
          {isEditingTags && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => { e.stopPropagation(); setTagInput(e.target.value); }}
              onKeyDown={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
                else if (e.key === "Escape") { e.preventDefault(); setIsEditingTags(false); setTagInput(""); }
              }}
              onBlur={() => { handleAddTag(); setIsEditingTags(false); }}
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
