import { ReactNode } from "react";
import { Menu, ChevronRight, LayoutList, FolderKanban } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Project, Task, Section, ProjectViewMode } from "../../types";
import { ViewType } from "../../hooks/useTaskFilter";
import "./AppLayout.css";

interface AppLayoutProps {
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
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onOpenShortcuts: () => void;
  onToggleProjectViewMode?: (projectId: string, newMode: ProjectViewMode) => void;
  viewName: string;
  children: ReactNode;
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
  onCreateProject,
  onDeleteProject,
  onOpenShortcuts,
  onToggleProjectViewMode,
  viewName,
  children,
}: AppLayoutProps) {
  const currentProject =
    currentView === "project" && currentProjectId
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
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onOpenShortcuts={onOpenShortcuts}
      />

      {!sidebarOpen && (
        <button className="sidebar-reopen-button" onClick={onSidebarToggle} aria-label="Open sidebar">
          <ChevronRight size={20} />
        </button>
      )}

      <div className={`main-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <header className="main-header">
          <div className="header-left">
            <button className="mobile-menu-button" onClick={onSidebarToggle} aria-label="Toggle menu">
              <Menu size={20} />
            </button>
            <h1 className="view-title">{viewName}</h1>
          </div>
          <div className="header-right">
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
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
