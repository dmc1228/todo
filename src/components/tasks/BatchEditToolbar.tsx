import { useState } from "react";
import {
  X,
  Calendar,
  Flag,
  Clock,
  Tag,
  FolderOpen,
  Trash2,
  Zap,
} from "lucide-react";
import { Task, Project, Importance, Length } from "../../types";
import "./BatchEditToolbar.css";

interface BatchEditToolbarProps {
  selectedCount: number;
  projects: Project[];
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BatchEditToolbar({
  selectedCount,
  projects,
  onUpdate,
  onDelete,
  onClearSelection,
}: BatchEditToolbarProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");

  if (selectedCount === 0) return null;

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ due_date: e.target.value || null });
  };

  const handlePriorityChange = (importance: Importance) => {
    onUpdate({ importance });
  };

  const handleUrgentChange = (urgent: boolean) => {
    onUpdate({ urgent });
  };

  const handleLengthChange = (length: Length) => {
    onUpdate({ length });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ project_id: e.target.value || null });
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      // For batch adding tags, we'll send the tag to add
      // The parent will handle merging with existing tags
      onUpdate({ tags: [tagInput.trim()] });
      setTagInput("");
      setShowTagInput(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setShowTagInput(false);
      setTagInput("");
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete ${selectedCount} task${selectedCount > 1 ? "s" : ""}?`,
    );
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <div className="batch-edit-toolbar">
      <div className="batch-edit-header">
        <span className="selected-count">{selectedCount} selected</span>
        <button
          className="clear-selection"
          onClick={onClearSelection}
          aria-label="Clear selection"
        >
          <X size={16} />
        </button>
      </div>

      <div className="batch-edit-actions">
        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <Calendar size={14} />
            Due
          </label>
          <input
            type="date"
            onChange={handleDueDateChange}
            className="batch-edit-input"
          />
        </div>

        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <Flag size={14} />
            Priority
          </label>
          <div className="batch-edit-buttons">
            <button
              className="batch-btn priority-normal"
              onClick={() => handlePriorityChange("normal")}
              title="Low"
            >
              Low
            </button>
            <button
              className="batch-btn priority-important"
              onClick={() => handlePriorityChange("important")}
              title="Medium"
            >
              Med
            </button>
            <button
              className="batch-btn priority-very_important"
              onClick={() => handlePriorityChange("very_important")}
              title="High"
            >
              High
            </button>
          </div>
        </div>

        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <Zap size={14} />
            Urgent
          </label>
          <div className="batch-edit-buttons">
            <button
              className="batch-btn urgent-false"
              onClick={() => handleUrgentChange(false)}
            >
              No
            </button>
            <button
              className="batch-btn urgent-true"
              onClick={() => handleUrgentChange(true)}
            >
              Yes
            </button>
          </div>
        </div>

        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <Clock size={14} />
            Length
          </label>
          <div className="batch-edit-buttons">
            <button
              className="batch-btn"
              onClick={() => handleLengthChange("short")}
            >
              S
            </button>
            <button
              className="batch-btn"
              onClick={() => handleLengthChange("medium")}
            >
              M
            </button>
            <button
              className="batch-btn"
              onClick={() => handleLengthChange("long")}
            >
              L
            </button>
          </div>
        </div>

        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <FolderOpen size={14} />
            Project
          </label>
          <select onChange={handleProjectChange} className="batch-edit-select">
            <option value="">Select...</option>
            <option value="">No Project</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        <div className="batch-edit-group">
          <label className="batch-edit-label">
            <Tag size={14} />
            Add Tag
          </label>
          {showTagInput ? (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInput.trim()) handleAddTag();
                else setShowTagInput(false);
              }}
              className="batch-edit-input"
              placeholder="Tag name"
              autoFocus
            />
          ) : (
            <button
              className="batch-btn add-tag-btn"
              onClick={() => setShowTagInput(true)}
            >
              + Add
            </button>
          )}
        </div>

        <div className="batch-edit-group batch-edit-danger">
          <button className="batch-btn delete-btn" onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
