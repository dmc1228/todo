import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Section, Project, Task } from "../../types";
import "./QuickAddModal.css";

interface QuickAddModalProps {
  isOpen: boolean;
  sections: Section[];
  projects: Project[];
  onClose: () => void;
  onSubmit: (task: {
    name: string;
    sectionId: string;
    dueDate: string | null;
    importance: Task["importance"] | null;
    urgent: boolean | null;
    length: Task["length"] | null;
    tags: string[];
    projectId: string | null;
  }) => void;
}

export function QuickAddModal({
  isOpen,
  sections,
  projects,
  onClose,
  onSubmit,
}: QuickAddModalProps) {
  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState<Task["importance"] | null>(null);
  const [urgent, setUrgent] = useState<boolean | null>(null);
  const [length, setLength] = useState<Task["length"] | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [projectId, setProjectId] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize section when modal opens
  useEffect(() => {
    if (isOpen && sections.length > 0 && !sectionId) {
      setSectionId(sections[0].id);
    }
  }, [isOpen, sections, sectionId]);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setName("");
      setDueDate("");
      setImportance("normal");
      setUrgent(false);
      setLength("medium");
      setTagsInput("");
      setProjectId("");

      // Focus after a short delay to ensure modal is visible
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sectionId) return;

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSubmit({
      name: name.trim(),
      sectionId,
      dueDate: dueDate || null,
      importance,
      urgent,
      length,
      tags,
      projectId: projectId || null,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="quick-add-overlay" onClick={onClose}>
      <div
        className="quick-add-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-add-header">
          <h2 className="quick-add-title">Quick Add Task</h2>
          <button className="quick-add-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-add-form">
          <div className="quick-add-row">
            <label className="quick-add-label">Task Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What needs to be done?"
              className="quick-add-input"
              autoFocus
            />
          </div>

          <div className="quick-add-row-group">
            <div className="quick-add-row">
              <label className="quick-add-label">Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="quick-add-select"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-add-row">
              <label className="quick-add-label">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="quick-add-input"
              />
            </div>
          </div>

          <div className="quick-add-row-group">
            <div className="quick-add-row">
              <label className="quick-add-label">Priority</label>
              <select
                value={importance ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setImportance(val === "" ? null : val as Task["importance"]);
                }}
                className="quick-add-select"
              >
                <option value=""></option>
                <option value="normal">Low</option>
                <option value="important">Medium</option>
                <option value="very_important">High</option>
              </select>
            </div>

            <div className="quick-add-row">
              <label className="quick-add-label">Urgent</label>
              <select
                value={urgent === null ? "" : urgent.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setUrgent(val === "" ? null : val === "true");
                }}
                className="quick-add-select"
              >
                <option value=""></option>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            <div className="quick-add-row">
              <label className="quick-add-label">Length</label>
              <select
                value={length ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setLength(val === "" ? null : val as Task["length"]);
                }}
                className="quick-add-select"
              >
                <option value=""></option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          <div className="quick-add-row-group">
            <div className="quick-add-row">
              <label className="quick-add-label">Tags</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="quick-add-input"
              />
            </div>

            <div className="quick-add-row">
              <label className="quick-add-label">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="quick-add-select"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="quick-add-actions">
            <button
              type="button"
              onClick={onClose}
              className="quick-add-button quick-add-button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="quick-add-button quick-add-button-submit"
              disabled={!name.trim()}
            >
              Add Task
            </button>
          </div>
        </form>

        <div className="quick-add-hint">
          Press <kbd>Escape</kbd> to cancel
        </div>
      </div>
    </div>
  );
}
