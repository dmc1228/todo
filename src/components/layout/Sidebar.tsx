import { useState } from "react";
import {
  Menu,
  ChevronLeft,
  Inbox,
  Plus,
  Settings,
  LogOut,
  MoreVertical,
  Keyboard,
} from "lucide-react";
import { Project, Task, Section } from "../../types";
import { SearchInput } from "../common/SearchInput";
import { ViewType } from "../../hooks/useTaskFilter";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: ViewType;
  currentProjectId?: string;
  onViewChange: (view: ViewType, projectId?: string) => void;
  tasks: Task[];
  sections: Section[];
  projects: Project[];
  userEmail: string;
  onSignOut: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchResultCount?: number;
  remindersCount?: number;
  onCreateProject: () => void;
  onOpenShortcuts: () => void;
  onOpenJournal: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  currentView,
  currentProjectId,
  onViewChange,
  tasks,
  sections,
  projects,
  userEmail,
  onSignOut,
  searchValue,
  onSearchChange,
  searchResultCount,
  onCreateProject,
  onOpenShortcuts,
}: SidebarProps) {
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Handle view change with auto-close on mobile
  const handleViewChange = (view: ViewType, projectId?: string) => {
    onViewChange(view, projectId);
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter((task) => task.project_id === projectId).length;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} />}

      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Menu size={20} />
            <span className="sidebar-title">DC App</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="sidebar-search">
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            resultCount={searchResultCount}
            placeholder="Search tasks..."
          />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <button
              className={`nav-item ${currentView === "all" ? "active" : ""}`}
              onClick={() => handleViewChange("all")}
            >
              <Inbox size={18} />
              <span>To Do</span>
              <span className="nav-badge">{tasks.length}</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-header">
              <span>Projects</span>
              <button
                className="nav-add-button"
                onClick={onCreateProject}
                aria-label="Add project"
              >
                <Plus size={16} />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="nav-empty">No projects yet</div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="nav-project-item"
                  onMouseLeave={() => setProjectMenuOpen(null)}
                >
                  <button
                    className={`nav-item ${
                      currentView === "project" &&
                      currentProjectId === project.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleViewChange("project", project.id)}
                  >
                    <span
                      className="project-dot"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="project-name">{project.name}</span>
                    <span className="nav-badge">
                      {getProjectTaskCount(project.id)}
                    </span>
                  </button>

                  <button
                    className="project-menu-button"
                    onClick={() =>
                      setProjectMenuOpen(
                        projectMenuOpen === project.id ? null : project.id,
                      )
                    }
                    aria-label="Project menu"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {projectMenuOpen === project.id && (
                    <div className="project-menu">
                      <button className="project-menu-item">Edit</button>
                      <button className="project-menu-item danger">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            className="shortcuts-button"
            onClick={onOpenShortcuts}
            aria-label="View keyboard shortcuts"
          >
            <Keyboard size={16} />
            <span>Keyboard Shortcuts</span>
          </button>
          <div className="user-info">
            <span className="user-email" title={userEmail}>
              {userEmail}
            </span>
          </div>
          <div className="footer-actions">
            <button className="footer-button" aria-label="Settings">
              <Settings size={18} />
            </button>
            <button
              className="footer-button"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
