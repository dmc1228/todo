import { Inbox, FolderOpen, CheckCircle2, Plus } from "lucide-react";
import "./EmptyState.css";

interface EmptyStateProps {
  type: "tasks" | "sections" | "projects" | "search";
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const configs = {
    tasks: {
      icon: <Inbox size={48} />,
      title: "No tasks yet",
      description: "Add a task above to get started",
    },
    sections: {
      icon: <FolderOpen size={48} />,
      title: "No sections yet",
      description: "Create your first section to organize your tasks",
    },
    projects: {
      icon: <CheckCircle2 size={48} />,
      title: "No projects yet",
      description: "Projects help you organize tasks by category",
    },
    search: {
      icon: <Inbox size={48} />,
      title: "No tasks found",
      description: "Try adjusting your search or filters",
    },
  };

  const config = configs[type];

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{config.icon}</div>
      <h3 className="empty-state-title">{config.title}</h3>
      <p className="empty-state-description">{config.description}</p>
      {onAction && actionLabel && (
        <button onClick={onAction} className="empty-state-action">
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
