import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Task, Project, Importance, Length } from "../../types";
import "./TaskDetailPanel.css";

interface TaskDetailPanelProps {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export function TaskDetailPanel({
  task,
  projects,
  onClose,
  onUpdate,
}: TaskDetailPanelProps) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState<Importance>("normal");
  const [length, setLength] = useState<Length>("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDueDate(task.due_date || "");
      setImportance(task.importance);
      setLength(task.length);
      setProjectId(task.project_id || "");
      setTags(task.tags || []);
      setNotes(task.notes || "");
    }
  }, [task]);

  if (!task) return null;

  const handleSave = (field: keyof Task, value: any) => {
    onUpdate(task.id, { [field]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      handleSave("tags", newTags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    handleSave("tags", newTags);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="task-detail-panel">
      <div className="task-detail-header">
        <h2>Task Details</h2>
        <button onClick={onClose} className="close-button" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="task-detail-content">
        {/* Task Name */}
        <div className="detail-section">
          <label className="detail-label">Task Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleSave("name", name)}
            className="detail-input"
          />
        </div>

        {/* Due Date */}
        <div className="detail-section">
          <label className="detail-label">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              handleSave("due_date", e.target.value || null);
            }}
            className="detail-input"
          />
        </div>

        {/* Priority */}
        <div className="detail-section">
          <label className="detail-label">Priority</label>
          <select
            value={importance}
            onChange={(e) => {
              const value = e.target.value as Importance;
              setImportance(value);
              handleSave("importance", value);
            }}
            className="detail-select"
          >
            <option value="normal">Low</option>
            <option value="important">Medium</option>
            <option value="very_important">High</option>
          </select>
        </div>

        {/* Length */}
        <div className="detail-section">
          <label className="detail-label">Length</label>
          <select
            value={length}
            onChange={(e) => {
              const value = e.target.value as Length;
              setLength(value);
              handleSave("length", value);
            }}
            className="detail-select"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        {/* Project */}
        <div className="detail-section">
          <label className="detail-label">Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              handleSave("project_id", e.target.value || null);
            }}
            className="detail-select"
          >
            <option value="">No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="detail-section">
          <label className="detail-label">Tags</label>
          <div className="tags-editor">
            <div className="tags-list">
              {tags.map((tag) => (
                <span key={tag} className="tag-item">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                    aria-label={`Remove ${tag}`}
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
              onKeyDown={handleTagInputKeyDown}
              onBlur={handleAddTag}
              placeholder="Add tag..."
              className="tag-input"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="detail-section">
          <label className="detail-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleSave("notes", notes)}
            className="detail-textarea"
            rows={6}
            placeholder="Add notes..."
          />
        </div>
      </div>
    </div>
  );
}
