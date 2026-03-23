import { useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionList } from "./components/sections/SectionList";
import { TaskDetailPanel } from "./components/tasks/TaskDetailPanel";
import { BatchEditToolbar } from "./components/tasks/BatchEditToolbar";
import { SectionMoveDropdown } from "./components/tasks/SectionMoveDropdown";
import { QuickAddModal } from "./components/tasks/QuickAddModal";
import { ToastContainer } from "./components/common/Toast";
import { AppSkeleton } from "./components/common/LoadingSkeleton";
import { OfflineIndicator } from "./components/common/OfflineIndicator";

const ShortcutsHelp = lazy(() =>
  import("./components/common/ShortcutsHelp").then((m) => ({
    default: m.ShortcutsHelp,
  })),
);

import { useAuth } from "./hooks/useAuth";
import { useSections } from "./hooks/useSections";
import { useTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { useTaskFilter, ViewType } from "./hooks/useTaskFilter";
import { useToast } from "./hooks/useToast";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Task } from "./types";

function AppContent() {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("all");
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);
  const [detailPanelTaskId, setDetailPanelTaskId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const [sectionSelectorOpen, setSectionSelectorOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { toasts, removeToast, addToast, success, error: showError } = useToast();

  const autoMovedTasksRef = useRef<Set<string>>(new Set());

  const {
    sections,
    loading: sectionsLoading,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  } = useSections();

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    undoDeleteTask,
    completeTask,
    undoCompleteTask,
    reorderTasks,
    moveTaskToSection,
  } = useTasks();

  const { projects, loading: projectsLoading, createProject, updateProject, deleteProject } = useProjects();

  const isLoading = sectionsLoading || tasksLoading || projectsLoading;

  // Auto-move tasks based on due dates
  const autoMoveRef = useRef(false);
  if (!autoMoveRef.current && !isLoading && tasks.length > 0 && sections.length > 0) {
    autoMoveRef.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const highPrioritySection = sections.find((s) => s.name.toLowerCase() === "high priority");
    const workOnTodaySection = sections.find((s) => s.name.toLowerCase() === "work on today");
    const mustFinishTodaySection = sections.find((s) => s.name.toLowerCase() === "must finish today");

    if (highPrioritySection && workOnTodaySection && mustFinishTodaySection) {
      const tasksToMove: { taskId: string; targetSectionId: string }[] = [];

      for (const task of tasks) {
        if (!task.due_date || task.completed_at || autoMovedTasksRef.current.has(task.id)) continue;

        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let targetSectionId: string | null = null;

        if (daysUntilDue <= 1 && task.section_id !== mustFinishTodaySection.id) {
          targetSectionId = mustFinishTodaySection.id;
        } else if (daysUntilDue <= 2 && task.section_id !== mustFinishTodaySection.id && task.section_id !== workOnTodaySection.id) {
          targetSectionId = workOnTodaySection.id;
        } else if (daysUntilDue <= 7 && task.section_id !== mustFinishTodaySection.id && task.section_id !== workOnTodaySection.id && task.section_id !== highPrioritySection.id) {
          targetSectionId = highPrioritySection.id;
        }

        if (targetSectionId) {
          tasksToMove.push({ taskId: task.id, targetSectionId });
        }
      }

      if (tasksToMove.length > 0) {
        (async () => {
          for (const { taskId, targetSectionId } of tasksToMove) {
            autoMovedTasksRef.current.add(taskId);
            const sectionTasks = tasks.filter((t) => t.section_id === targetSectionId);
            const newPosition = sectionTasks.length > 0 ? Math.max(...sectionTasks.map((t) => t.position)) + 1 : 0;
            await moveTaskToSection(taskId, targetSectionId, newPosition);
          }
          success(`Moved ${tasksToMove.length} task${tasksToMove.length > 1 ? "s" : ""} based on due dates`);
        })();
      }
    }
  }

  const handleUpdateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (updates.importance !== undefined) {
        const targetSectionName =
          updates.importance === "very_important" ? "High Priority"
          : updates.importance === "important" ? "Medium Priority"
          : "Low Priority";

        const targetSection = sections.find((s) => s.name === targetSectionName);
        if (targetSection) {
          const sectionTasks = tasks.filter((t) => t.section_id === targetSection.id);
          const newPosition = sectionTasks.length > 0 ? Math.max(...sectionTasks.map((t) => t.position)) + 1 : 0;
          await moveTaskToSection(id, targetSection.id, newPosition);
        }
      }
      await updateTask(id, updates);
    },
    [sections, tasks, updateTask, moveTaskToSection],
  );

  const { filteredTasks, resultCount } = useTaskFilter(tasks, projects, sections, {
    search: searchValue,
    view: currentView,
    projectId: currentProjectId,
  });

  const filteredSections = useMemo(() => {
    if (currentView === "project" && currentProjectId) {
      const project = projects.find((p) => p.id === currentProjectId);
      if (project?.view_mode === "custom") {
        return sections.filter((s) => s.context === `project-${currentProjectId}`);
      }
    }
    return sections.filter((s) => s.context === "main" || !s.context);
  }, [sections, currentView, currentProjectId, projects]);

  const handleViewChange = (view: ViewType, projectId?: string) => {
    setCurrentView(view);
    setCurrentProjectId(projectId);
    setSearchValue("");
  };

  const handleCreateSection = useCallback(async () => {
    const name = prompt("Section name:");
    if (name?.trim()) {
      let context = "main";
      if (currentView === "project" && currentProjectId) {
        const project = projects.find((p) => p.id === currentProjectId);
        if (project?.view_mode === "custom") {
          context = `project-${currentProjectId}`;
        }
      }
      const result = await createSection(name.trim(), context);
      if (result) success("Section created");
      else showError("Failed to create section");
    }
  }, [createSection, success, showError, currentView, currentProjectId, projects]);

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const sectionTasks = tasks.filter((t) => t.section_id === sectionId);
    const message = sectionTasks.length > 0
      ? `"${section.name}" contains ${sectionTasks.length} task${sectionTasks.length === 1 ? '' : 's'}. Deleting this section will also delete all tasks in it. Continue?`
      : `Delete section "${section.name}"?`;

    if (!window.confirm(message)) return;

    try {
      await deleteSection(sectionId);
      success("Section deleted");
    } catch {
      showError("Failed to delete section");
    }
  }, [sections, tasks, deleteSection, success, showError]);

  const handleCreateProject = useCallback(async () => {
    const name = prompt("Project name:");
    if (name?.trim()) {
      const result = await createProject(name.trim());
      if (result) success("Project created");
      else showError("Failed to create project");
    }
  }, [createProject, success, showError]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await deleteProject(projectId);
      if (currentView === "project" && currentProjectId === projectId) {
        setCurrentView("all");
        setCurrentProjectId(undefined);
      }
      success("Project deleted");
    } catch {
      showError("Failed to delete project");
    }
  }, [projects, deleteProject, currentView, currentProjectId, success, showError]);

  const handleToggleProjectViewMode = useCallback(
    async (projectId: string, newMode: "standard" | "custom") => {
      await updateProject(projectId, { view_mode: newMode });
    },
    [updateProject],
  );

  const handleAddTask = useCallback(
    async (sectionId: string, rawInput: string) => {
      if (!rawInput.trim()) {
        showError("Task name cannot be empty");
        return null;
      }
      const result = await createTask(rawInput, sectionId, projects);
      if (!result) {
        showError("Failed to create task");
        return null;
      }

      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        const sectionNameLower = section.name.toLowerCase();
        let importance: Task["importance"] | null = null;
        if (sectionNameLower.includes("high priority")) importance = "very_important";
        else if (sectionNameLower.includes("medium priority")) importance = "important";
        else if (sectionNameLower.includes("low priority")) importance = "normal";
        if (importance) await updateTask(result.id, { importance });
      }

      return result;
    },
    [createTask, updateTask, sections, projects, showError],
  );

  const handleCompleteTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      await completeTask(id);
      addToast(`Completed "${task.name}"`, "success", 5000, {
        label: "Undo",
        onClick: async () => { await undoCompleteTask(id); },
      });
    },
    [completeTask, undoCompleteTask, tasks, addToast],
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const deletedTask = await deleteTask(id);
      if (!deletedTask) return;
      setLastDeletedTask(deletedTask);
      setSelectedTaskId(null);
      setDetailPanelTaskId(null);
      addToast(`Deleted "${deletedTask.name}"`, "info", 5000, {
        label: "Undo",
        onClick: async () => {
          await undoDeleteTask(deletedTask);
          setLastDeletedTask(null);
        },
      });
    },
    [deleteTask, undoDeleteTask, addToast],
  );

  const handleUndoDelete = useCallback(async () => {
    if (lastDeletedTask) {
      await undoDeleteTask(lastDeletedTask);
      setLastDeletedTask(null);
    }
  }, [lastDeletedTask, undoDeleteTask]);

  const handleSelectTask = useCallback(
    (taskId: string, event?: React.MouseEvent) => {
      const isCmdOrCtrl = event?.metaKey || event?.ctrlKey;
      const isShift = event?.shiftKey;
      const isMobile = window.innerWidth <= 768;

      if (isCmdOrCtrl) {
        setSelectedTaskIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(taskId)) newSet.delete(taskId);
          else newSet.add(taskId);
          return newSet;
        });
        setLastSelectedTaskId(taskId);
      } else if (isShift && lastSelectedTaskId) {
        const lastTask = tasks.find((t) => t.id === lastSelectedTaskId);
        const currentTask = tasks.find((t) => t.id === taskId);

        if (lastTask && currentTask && lastTask.section_id === currentTask.section_id) {
          const sectionTasks = filteredTasks.filter((t) => t.section_id === currentTask.section_id);
          const lastIndex = sectionTasks.findIndex((t) => t.id === lastSelectedTaskId);
          const currentIndex = sectionTasks.findIndex((t) => t.id === taskId);

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const newSelection = new Set<string>();
            for (let i = start; i <= end; i++) newSelection.add(sectionTasks[i].id);
            setSelectedTaskIds(newSelection);
          }
        } else {
          setSelectedTaskIds(new Set());
          setSelectedTaskId(taskId);
          setLastSelectedTaskId(taskId);
        }
      } else {
        setSelectedTaskIds(new Set());
        setSelectedTaskId(taskId);
        setLastSelectedTaskId(taskId);
        if (isMobile) setDetailPanelTaskId(taskId);
      }
    },
    [filteredTasks, tasks, lastSelectedTaskId],
  );

  const handleMoveSelectedTaskToSection = useCallback(
    async (sectionId: string) => {
      const tasksToMove = selectedTaskIds.size > 0
        ? Array.from(selectedTaskIds)
        : selectedTaskId ? [selectedTaskId] : [];

      if (tasksToMove.length === 0) return;

      const sectionTasks = tasks.filter((t) => t.section_id === sectionId);
      let newPosition = sectionTasks.length > 0
        ? Math.max(...sectionTasks.map((t) => t.position)) + 1
        : 0;

      for (const taskId of tasksToMove) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.section_id === sectionId) continue;
        await moveTaskToSection(taskId, sectionId, newPosition);
        newPosition++;
      }

      if (selectedTaskIds.size > 0) setSelectedTaskIds(new Set());
      success(tasksToMove.length > 1 ? `Moved ${tasksToMove.length} tasks` : "Task moved");
    },
    [selectedTaskId, selectedTaskIds, tasks, moveTaskToSection, success],
  );

  const handleBatchUpdate = useCallback(
    async (updates: Partial<Task>) => {
      const selectedIds = Array.from(selectedTaskIds);
      for (const taskId of selectedIds) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) continue;
        if (updates.tags && updates.tags.length > 0) {
          const newTags = [...new Set([...task.tags, ...updates.tags])];
          await handleUpdateTask(taskId, { ...updates, tags: newTags });
        } else {
          await handleUpdateTask(taskId, updates);
        }
      }
      success(`Updated ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`);
    },
    [selectedTaskIds, tasks, handleUpdateTask, success],
  );

  const handleBatchDelete = useCallback(async () => {
    const selectedIds = Array.from(selectedTaskIds);
    for (const taskId of selectedIds) await deleteTask(taskId);
    setSelectedTaskIds(new Set());
    setSelectedTaskId(null);
    success(`Deleted ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`);
  }, [selectedTaskIds, deleteTask, success]);

  const handleQuickAddTask = useCallback(
    async (taskData: {
      name: string;
      sectionId: string;
      dueDate: string | null;
      importance: Task["importance"] | null;
      urgent: boolean | null;
      length: Task["length"] | null;
      tags: string[];
      projectId: string | null;
    }) => {
      const result = await createTask(taskData.name, taskData.sectionId, projects);
      if (result) {
        await updateTask(result.id, {
          due_date: taskData.dueDate,
          importance: taskData.importance,
          urgent: taskData.urgent,
          length: taskData.length,
          tags: taskData.tags,
          project_id: taskData.projectId,
        });
        success("Task created");
      } else {
        showError("Failed to create task");
      }
    },
    [createTask, updateTask, projects, success, showError],
  );

  const { showShortcutsHelp, setShowShortcutsHelp } = useKeyboardShortcuts({
    selectedTaskId,
    handlers: {
      onComplete: () => { if (selectedTaskId) handleCompleteTask(selectedTaskId); },
      onDelete: () => { if (selectedTaskId) handleDeleteTask(selectedTaskId); },
      onUndo: handleUndoDelete,
      onOpenQuickAdd: () => setQuickAddOpen(true),
      onSelectNext: () => {
        const currentIndex = filteredTasks.findIndex((t) => t.id === selectedTaskId);
        if (currentIndex < filteredTasks.length - 1) setSelectedTaskId(filteredTasks[currentIndex + 1].id);
      },
      onSelectPrevious: () => {
        const currentIndex = filteredTasks.findIndex((t) => t.id === selectedTaskId);
        if (currentIndex > 0) setSelectedTaskId(filteredTasks[currentIndex - 1].id);
      },
      onEscape: () => {
        if (detailPanelTaskId) setDetailPanelTaskId(null);
        else setSelectedTaskId(null);
      },
      onOpenDetail: () => { if (selectedTaskId) setDetailPanelTaskId(selectedTaskId); },
      onAddTaskBelow: async () => {
        if (selectedTaskId) {
          const selectedTask = tasks.find((t) => t.id === selectedTaskId);
          if (selectedTask) {
            const newTask = await createTask("New task", selectedTask.section_id, projects);
            if (newTask) {
              await moveTaskToSection(newTask.id, selectedTask.section_id, selectedTask.position + 1);
              setSelectedTaskId(newTask.id);
            }
          }
        }
      },
      onCreateSection: handleCreateSection,
      onOpenSectionSelector: () => { if (selectedTaskId) setSectionSelectorOpen(true); },
    },
  });

  const selectedTask = detailPanelTaskId ? tasks.find((t) => t.id === detailPanelTaskId) || null : null;

  const getViewName = () => {
    if (currentView === "project") {
      const project = projects.find((p) => p.id === currentProjectId);
      return project ? project.name : "Project";
    }
    return "All Tasks";
  };

  return (
    <>
      <AppLayout
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        currentProjectId={currentProjectId}
        onViewChange={handleViewChange}
        tasks={tasks}
        sections={sections}
        projects={projects}
        userEmail={user?.email || ""}
        onSignOut={async () => { await signOut(); }}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchResultCount={searchValue ? resultCount : undefined}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onOpenShortcuts={() => setShowShortcutsHelp(true)}
        onToggleProjectViewMode={handleToggleProjectViewMode}
        viewName={getViewName()}
      >
        {isLoading ? (
          <AppSkeleton />
        ) : (
          <SectionList
            sections={filteredSections}
            tasks={filteredTasks}
            projects={projects}
            selectedTaskId={selectedTaskId}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={handleSelectTask}
            onCompleteTask={handleCompleteTask}
            onUpdateTask={handleUpdateTask}
            onUpdateSection={updateSection}
            onDeleteSection={handleDeleteSection}
            onReorderSections={reorderSections}
            onReorderTasks={reorderTasks}
            onMoveTaskToSection={moveTaskToSection}
            onAddSection={handleCreateSection}
            onAddTask={handleAddTask}
            onOpenSectionMove={(taskId: string) => {
              setSelectedTaskId(taskId);
              setSectionSelectorOpen(true);
            }}
          />
        )}
      </AppLayout>

      <TaskDetailPanel
        task={selectedTask}
        projects={projects}
        onClose={() => setDetailPanelTaskId(null)}
        onUpdate={handleUpdateTask}
      />

      <Suspense fallback={null}>
        {showShortcutsHelp && (
          <ShortcutsHelp
            isOpen={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
          />
        )}
      </Suspense>

      <BatchEditToolbar
        selectedCount={selectedTaskIds.size}
        projects={projects}
        onUpdate={handleBatchUpdate}
        onDelete={handleBatchDelete}
        onClearSelection={() => setSelectedTaskIds(new Set())}
      />

      <SectionMoveDropdown
        isOpen={sectionSelectorOpen}
        sections={filteredSections}
        currentSectionId={
          selectedTaskId ? tasks.find((t) => t.id === selectedTaskId)?.section_id || null : null
        }
        selectedCount={selectedTaskIds.size > 0 ? selectedTaskIds.size : 1}
        onSelectSection={handleMoveSelectedTaskToSection}
        onClose={() => setSectionSelectorOpen(false)}
      />

      <QuickAddModal
        isOpen={quickAddOpen}
        sections={sections}
        projects={projects}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={handleQuickAddTask}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
      <OfflineIndicator />
    </>
  );
}

function App() {
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}

export default App;
