import {
  Menu,
  ChevronLeft,
  Inbox,
  Settings,
  LogOut,
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
  // currentProjectId is not used in simplified sidebar (no project views)
  onViewChange,
  tasks,
  // sections is not used in the simplified sidebar
  // projects is not used in simplified sidebar (no project views)
  userEmail,
  onSignOut,
  searchValue,
  onSearchChange,
  searchResultCount,
  // onCreateProject is not used in simplified sidebar (no project views)
  onOpenShortcuts,
}: SidebarProps) {
  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Handle view change with auto-close on mobile
  const handleViewChange = (view: ViewType, projectId?: string) => {
    onViewChange(view, projectId);
    if (isMobile && isOpen) {
      onToggle();
    }
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
