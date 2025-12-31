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
  Bell,
  ShoppingCart,
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
  remindersCount,
  onCreateProject,
  onOpenShortcuts,
  onOpenJournal,
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

  // Handle journal with auto-close on mobile
  const handleOpenJournal = () => {
    onOpenJournal();
    if (isMobile && isOpen) {
      onToggle();
    }
  };

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

  const getRemindersCount = () => {
    return remindersCount || 0;
  };

  const getShoppingCount = () => {
    // Count tasks in shopping context sections
    const shoppingSectionIds = new Set(
      sections.filter((s) => (s as any).context === "shopping").map((s) => s.id)
    );
    return tasks.filter((task) => shoppingSectionIds.has(task.section_id)).length;
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
              onClick={() => handleViewChange("home")}
            >
              <Home size={20} />
              <span>Home</span>
            </button>

            <div className="nav-divider" />

            <button
              className={`nav-item ${currentView === "all" ? "active" : ""}`}
              onClick={() => handleViewChange("all")}
            >
              <Inbox size={18} />
              <span>All Tasks</span>
              <span className="nav-badge">{tasks.length}</span>
            </button>

            <button
              className={`nav-item ${currentView === "today" ? "active" : ""}`}
              onClick={() => handleViewChange("today")}
            >
              <Calendar size={18} />
              <span>Day Plan</span>
              {getTodayCount() > 0 && (
                <span className="nav-badge">{getTodayCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "urgent_important" ? "active" : ""}`}
              onClick={() => handleViewChange("urgent_important")}
            >
              <AlertTriangle size={18} />
              <span>Urgent & Important</span>
              {getUrgentImportantCount() > 0 && (
                <span className="nav-badge">{getUrgentImportantCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "focus" ? "active" : ""}`}
              onClick={() => handleViewChange("focus")}
            >
              <Zap size={18} />
              <span>Focus Mode</span>
              {getFocusCount() > 0 && (
                <span className="nav-badge">{getFocusCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "upcoming" ? "active" : ""}`}
              onClick={() => handleViewChange("upcoming")}
            >
              <CalendarClock size={18} />
              <span>Upcoming</span>
              {getUpcomingCount() > 0 && (
                <span className="nav-badge">{getUpcomingCount()}</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "priority" ? "active" : ""}`}
              onClick={() => handleViewChange("priority")}
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
              onClick={handleOpenJournal}
            >
              <BookOpen size={18} />
              <span>Journal</span>
            </button>

            <button
              className={`nav-item ${currentView === "reminders" ? "active" : ""}`}
              onClick={() => handleViewChange("reminders")}
            >
              <Bell size={18} />
              <span>Reminders</span>
              {getRemindersCount() > 0 && (
                <span className="nav-badge">{getRemindersCount()}</span>
              )}
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-header">
              <span>Lists</span>
            </div>
            <button
              className={`nav-item ${currentView === "shopping" ? "active" : ""}`}
              onClick={() => handleViewChange("shopping")}
            >
              <ShoppingCart size={18} />
              <span>Shopping List</span>
              {getShoppingCount() > 0 && (
                <span className="nav-badge">{getShoppingCount()}</span>
              )}
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
