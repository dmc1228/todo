import { ReactNode } from "react";
import { Menu, Upload, ChevronRight, LayoutList, FolderKanban, Eye, EyeOff } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Project, Task, Section, ProjectViewMode, ShoppingViewMode } from "../../types";
import { ViewType } from "../../hooks/useTaskFilter";
import "./AppLayout.css";

interface AppLayoutProps {
  // Sidebar props
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
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
  onImport: () => void;

  // Project view mode
  onToggleProjectViewMode?: (projectId: string, newMode: ProjectViewMode) => void;

  // Shopping view mode
  shoppingViewMode?: ShoppingViewMode;
  onToggleShoppingViewMode?: (mode: ShoppingViewMode) => void;

  // Main content
  viewName: string;
  children: ReactNode;

  // Detail panel
  detailPanel?: ReactNode;
}

export function AppLayout({
  sidebarOpen,
  onSidebarToggle,
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
  onImport,
  onToggleProjectViewMode,
  shoppingViewMode,
  onToggleShoppingViewMode,
  viewName,
  children,
  detailPanel,
}: AppLayoutProps) {
  // Get current project's view mode
  const currentProject = currentView === "project" && currentProjectId
    ? projects.find((p) => p.id === currentProjectId)
    : null;
  const projectViewMode = currentProject?.view_mode || "standard";
  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={onSidebarToggle}
        currentView={currentView}
        currentProjectId={currentProjectId}
        onViewChange={onViewChange}
        tasks={tasks}
        sections={sections}
        projects={projects}
        userEmail={userEmail}
        onSignOut={onSignOut}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchResultCount={searchResultCount}
        remindersCount={remindersCount}
        onCreateProject={onCreateProject}
        onOpenShortcuts={onOpenShortcuts}
        onOpenJournal={onOpenJournal}
      />

      {!sidebarOpen && (
        <button
          className="sidebar-reopen-button"
          onClick={onSidebarToggle}
          aria-label="Open sidebar"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div
        className={`main-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <header className="main-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={onSidebarToggle}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="view-title">{viewName}</h1>
          </div>
          <div className="header-right">
            {currentView === "shopping" && onToggleShoppingViewMode && (
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${shoppingViewMode === "incomplete-only" ? "active" : ""}`}
                  onClick={() => onToggleShoppingViewMode("incomplete-only")}
                  title="Show incomplete tasks only"
                >
                  <EyeOff size={16} />
                  <span>Active Only</span>
                </button>
                <button
                  className={`view-mode-btn ${shoppingViewMode === "show-all-strikethrough" ? "active" : ""}`}
                  onClick={() => onToggleShoppingViewMode("show-all-strikethrough")}
                  title="Show all tasks with completed crossed out"
                >
                  <Eye size={16} />
                  <span>Show All</span>
                </button>
              </div>
            )}
            {currentView === "project" && currentProjectId && onToggleProjectViewMode && (
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${projectViewMode === "standard" ? "active" : ""}`}
                  onClick={() => onToggleProjectViewMode(currentProjectId, "standard")}
                  title="Standard sections (shared)"
                >
                  <LayoutList size={16} />
                  <span>Standard</span>
                </button>
                <button
                  className={`view-mode-btn ${projectViewMode === "custom" ? "active" : ""}`}
                  onClick={() => onToggleProjectViewMode(currentProjectId, "custom")}
                  title="Custom sections (project-specific)"
                >
                  <FolderKanban size={16} />
                  <span>Custom</span>
                </button>
              </div>
            )}
            <button
              className="import-button"
              onClick={onImport}
              aria-label="Import tasks"
            >
              <Upload size={16} />
              Import
            </button>
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>

      {detailPanel && (
        <div className="detail-panel-container">{detailPanel}</div>
      )}
    </div>
  );
}
