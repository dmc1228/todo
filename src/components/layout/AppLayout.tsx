import { ReactNode } from "react";
import { Menu, Upload, Download, ChevronRight } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Project, Task, Section } from "../../types";
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
  onExport: () => void;

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
  onExport,
  viewName,
  children,
  detailPanel,
}: AppLayoutProps) {
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
            <button
              className="export-button"
              onClick={onExport}
              aria-label="Export tasks"
            >
              <Download size={16} />
              Export
            </button>
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
