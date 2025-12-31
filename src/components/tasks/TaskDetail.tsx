import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Circle,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Tag,
  FileText,
  Trash2,
} from "lucide-react";
import { Task, Section, Project, Importance } from "../../types";
import { format } from "date-fns";
import "./TaskDetail.css";

interface TaskDetailProps {
  task: Task;
  sections: Section[];
  projects: Project[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetail({
  task,
  sections,
  projects,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailProps) {
  const [name, setName] = useState(task.name);
  const [importance, setImportance] = useState<Importance | null>(task.importance);
  const [sectionId, setSectionId] = useState(task.section_id);
  const [projectId, setProjectId] = useState<string | null>(task.project_id);
  const [dueDate, setDueDate] = useState<string | null>(task.due_date);
  const [tags, setTags] = useState<string[]>(task.tags);
  const [notes, setNotes] = useState(task.notes || "");
  const [tagInput, setTagInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nameRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<number>();

  // Auto-save changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const updates: Partial<Task> = {};
      if (name !== task.name) updates.name = name;
      if (importance !== task.importance) updates.importance = importance;
      if (sectionId !== task.section_id) updates.section_id = sectionId;
      if (projectId !== task.project_id) updates.project_id = projectId;
      if (dueDate !== task.due_date) updates.due_date = dueDate;
      if (JSON.stringify(tags) !== JSON.stringify(task.tags))
        updates.tags = tags;
      if (notes !== (task.notes || "")) updates.notes = notes;

      if (Object.keys(updates).length > 0) {
        onUpdate(task.id, updates);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    name,
    importance,
    sectionId,
    projectId,
    dueDate,
    tags,
    notes,
    task,
    onUpdate,
  ]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(task.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const getImportanceIcon = (level: Importance) => {
    switch (level) {
      case "very_important":
        return <AlertTriangle size={16} />;
      case "important":
        return <AlertCircle size={16} />;
      default:
        return <Circle size={16} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="task-detail-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="task-detail-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="task-detail-close" onClick={onClose}>
            <X size={20} />
          </button>

          <div className="task-detail-content">
            {/* Task Name */}
            <textarea
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="task-detail-name"
              placeholder="Task name"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />

            {/* Importance Toggle */}
            <div className="detail-section">
              <label className="detail-label">Importance</label>
              <div className="importance-toggle">
                <button
                  className={`importance-btn ${importance === "normal" ? "active" : ""}`}
                  onClick={() => setImportance("normal")}
                >
                  {getImportanceIcon("normal")}
                  Normal
                </button>
                <button
                  className={`importance-btn important ${importance === "important" ? "active" : ""}`}
                  onClick={() => setImportance("important")}
                >
                  {getImportanceIcon("important")}
                  Important
                </button>
                <button
                  className={`importance-btn very-important ${importance === "very_important" ? "active" : ""}`}
                  onClick={() => setImportance("very_important")}
                >
                  {getImportanceIcon("very_important")}
                  Urgent
                </button>
              </div>
            </div>

            <div className="detail-divider" />

            {/* Section Selector */}
            <div className="detail-section">
              <label className="detail-label">Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="detail-select"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selector */}
            <div className="detail-section">
              <label className="detail-label">Project</label>
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="detail-select"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="detail-section">
              <label className="detail-label">
                <Calendar size={16} />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate || ""}
                onChange={(e) => setDueDate(e.target.value || null)}
                className="detail-input"
              />
            </div>

            <div className="detail-divider" />

            {/* Tags */}
            <div className="detail-section">
              <label className="detail-label">
                <Tag size={16} />
                Tags
              </label>
              <div className="tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-item">
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="tag-remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleAddTag}
                placeholder="Add tag..."
                className="detail-input"
              />
            </div>

            <div className="detail-divider" />

            {/* Notes */}
            <div className="detail-section">
              <label className="detail-label">
                <FileText size={16} />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="detail-textarea"
                rows={6}
              />
            </div>

            <div className="detail-divider" />

            {/* Footer */}
            <div className="task-detail-footer">
              <span className="task-created">
                Created {format(new Date(task.created_at), "MMM d, yyyy")}
              </span>
              <button
                className={`delete-button ${showDeleteConfirm ? "confirm" : ""}`}
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                {showDeleteConfirm ? "Click again to confirm" : "Delete task"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
