import { useState } from "react";
import {
  Menu,
  ChevronLeft,
  Home,
  Inbox,
  Calendar,
  CalendarClock,
  Flame,
  Plus,
  Settings,
  LogOut,
  MoreVertical,
  Keyboard,
  BookOpen,
  Zap,
  AlertTriangle,
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
  onOpenJournal,
}: SidebarProps) {
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);

  // Get "Day Plan" tasks - only from "Must finish today" or "Work on today" sections, excluding priority sections
  const getTodayCount = () => {
    const todaySections = sections.filter((s) => {
      const name = s.name.toLowerCase();
      const isTodaySection =
        name.includes("must finish today") || name.includes("work on today");
      const isPrioritySection = name.includes("priority");
      return isTodaySection && !isPrioritySection;
    });
    const todaySectionIds = new Set(todaySections.map((s) => s.id));
    return tasks.filter((task) => todaySectionIds.has(task.section_id)).length;
  };

  const getUpcomingCount = () => {
    // Show all sections EXCEPT "Must finish today" and "Work on today"
    const excludeSections = sections.filter((s) => {
      const name = s.name.toLowerCase();
      return (
        name.includes("must finish today") || name.includes("work on today")
      );
    });
    const excludeSectionIds = new Set(excludeSections.map((s) => s.id));
    return tasks.filter((task) => !excludeSectionIds.has(task.section_id))
      .length;
  };

  const getPriorityCount = () => {
    return tasks.filter((task) => task.importance === "very_important").length;
  };

  const getUrgentImportantCount = () => {
    // Show tasks that are high priority (very_important) AND urgent
    return tasks.filter(
      (task) => (task.urgent ?? false) && task.importance === "very_important",
    ).length;
  };

  const getFocusCount = () => {
    // Focus view shows tasks batched by project to minimize context switching
    // Count tasks that have a project assigned
    return tasks.filter((task) => task.project_id).length;
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
              className={`nav-item nav-item-home ${currentView === "home" ? "active" : ""}`}
              onClick={() => onViewChange("home")}
            >
              <Home size={20} />
              <span>Home</span>
            </button>

            <div className="nav-divider" />

            <button
              className={`nav-item ${currentView === "all" ? "active" : ""}`}
              onClick={() => onViewChange("all")}
            >
              <Inbox size={18} />
              <span>All Tasks</span>
              <span className="nav-badge">{tasks.length}</span>
            </button>

            <button
              className={`nav-item ${currentView === "today" ? "active" : ""}`}
              onClick={() => onViewChange("today")}
            >
              <Calendar size={18} />
              <span>Day Plan</span>
              {getTodayCount() > 0 && (
                <span className="nav-badge">{getTodayCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "urgent_important" ? "active" : ""}`}
              onClick={() => onViewChange("urgent_important")}
            >
              <AlertTriangle size={18} />
              <span>Urgent & Important</span>
              {getUrgentImportantCount() > 0 && (
                <span className="nav-badge">{getUrgentImportantCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "focus" ? "active" : ""}`}
              onClick={() => onViewChange("focus")}
            >
              <Zap size={18} />
              <span>Focus Mode</span>
              {getFocusCount() > 0 && (
                <span className="nav-badge">{getFocusCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "upcoming" ? "active" : ""}`}
              onClick={() => onViewChange("upcoming")}
            >
              <CalendarClock size={18} />
              <span>Upcoming</span>
              {getUpcomingCount() > 0 && (
                <span className="nav-badge">{getUpcomingCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "priority" ? "active" : ""}`}
              onClick={() => onViewChange("priority")}
            >
              <Flame size={18} />
              <span>High Priority</span>
              {getPriorityCount() > 0 && (
                <span className="nav-badge">{getPriorityCount()}</span>
              )}
            </button>

            <div className="nav-divider" />

            <button
              className={`nav-item ${currentView === "journal" ? "active" : ""}`}
              onClick={onOpenJournal}
            >
              <BookOpen size={18} />
              <span>Journal</span>
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
                    onClick={() => onViewChange("project", project.id)}
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
