import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionList } from "./components/sections/SectionList";
import { TaskDetailPanel } from "./components/tasks/TaskDetailPanel";
import { BatchEditToolbar } from "./components/tasks/BatchEditToolbar";
import { SectionMoveDropdown } from "./components/tasks/SectionMoveDropdown";
import { QuickAddModal } from "./components/tasks/QuickAddModal";
import { Journal } from "./components/journal/Journal";
import { Reminders } from "./components/reminders/Reminders";
import { ToastContainer } from "./components/common/Toast";
import { AppSkeleton } from "./components/common/LoadingSkeleton";
import { Home } from "./components/home/Home";

// Lazy load modals that are not immediately needed
const ImportModal = lazy(() =>
  import("./components/import/ImportModal").then((m) => ({
    default: m.ImportModal,
  })),
);
const ShortcutsHelp = lazy(() =>
  import("./components/common/ShortcutsHelp").then((m) => ({
    default: m.ShortcutsHelp,
  })),
);
import { useAuth } from "./hooks/useAuth";
import { useSections } from "./hooks/useSections";
import { useTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { useReminders } from "./hooks/useReminders";
import { useTaskFilter, ViewType } from "./hooks/useTaskFilter";
import { useToast } from "./hooks/useToast";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Task } from "./types";

function AppContent() {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("all");
  const [currentProjectId, setCurrentProjectId] = useState<
    string | undefined
  >();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(
    null,
  );
  const [detailPanelTaskId, setDetailPanelTaskId] = useState<string | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const [sectionSelectorOpen, setSectionSelectorOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { toasts, removeToast, addToast, success, error } = useToast();

  // Data hooks
  const {
    sections,
    loading: sectionsLoading,
    createSection,
    updateSection,
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
  const { projects, loading: projectsLoading, createProject, updateProject } = useProjects();
  const {
    reminders,
    loading: remindersLoading,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
  } = useReminders();

  const isLoading = sectionsLoading || tasksLoading || projectsLoading || remindersLoading;

  // Track which tasks have been auto-moved to prevent duplicate moves
  const autoMovedTasksRef = useRef<Set<string>>(new Set());

  // Auto-move tasks based on due dates
  useEffect(() => {
    if (isLoading || tasks.length === 0 || sections.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the target sections
    const highPrioritySection = sections.find(
      (s) => s.name.toLowerCase() === "high priority"
    );
    const workOnTodaySection = sections.find(
      (s) => s.name.toLowerCase() === "work on today"
    );
    const mustFinishTodaySection = sections.find(
      (s) => s.name.toLowerCase() === "must finish today"
    );

    if (!highPrioritySection || !workOnTodaySection || !mustFinishTodaySection) {
      return;
    }

    const tasksToMove: { taskId: string; targetSectionId: string; reason: string }[] = [];

    for (const task of tasks) {
      // Skip if no due date, already completed, or already auto-moved this session
      if (!task.due_date || task.completed_at || autoMovedTasksRef.current.has(task.id)) {
        continue;
      }

      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let targetSectionId: string | null = null;

      // Due tomorrow or today or overdue → Must Finish Today
      if (daysUntilDue <= 1) {
        if (task.section_id !== mustFinishTodaySection.id) {
          targetSectionId = mustFinishTodaySection.id;
        }
      }
      // Due in 2 days → Work on Today
      else if (daysUntilDue <= 2) {
        if (
          task.section_id !== mustFinishTodaySection.id &&
          task.section_id !== workOnTodaySection.id
        ) {
          targetSectionId = workOnTodaySection.id;
        }
      }
      // Due within a week → High Priority
      else if (daysUntilDue <= 7) {
        if (
          task.section_id !== mustFinishTodaySection.id &&
          task.section_id !== workOnTodaySection.id &&
          task.section_id !== highPrioritySection.id
        ) {
          targetSectionId = highPrioritySection.id;
        }
      }

      if (targetSectionId) {
        tasksToMove.push({
          taskId: task.id,
          targetSectionId,
          reason: `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
        });
      }
    }

    // Move tasks asynchronously
    const moveTasks = async () => {
      for (const { taskId, targetSectionId } of tasksToMove) {
        // Mark as auto-moved to prevent duplicate moves
        autoMovedTasksRef.current.add(taskId);

        // Get position at end of target section
        const sectionTasks = tasks.filter((t) => t.section_id === targetSectionId);
        const newPosition =
          sectionTasks.length > 0
            ? Math.max(...sectionTasks.map((t) => t.position)) + 1
            : 0;

        await moveTaskToSection(taskId, targetSectionId, newPosition);
      }

      if (tasksToMove.length > 0) {
        success(
          `Moved ${tasksToMove.length} task${tasksToMove.length > 1 ? "s" : ""} based on due dates`
        );
      }
    };

    moveTasks();
  }, [isLoading, tasks, sections, moveTaskToSection, success]);

  // Journal state - setJournalOpen used for view changes
  const [, setJournalOpen] = useState(false);

  // Wrapper for updateTask that auto-moves tasks to correct section based on priority
  const handleUpdateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      // If importance is being updated, move to the appropriate section
      if (updates.importance !== undefined) {
        const targetSectionName =
          updates.importance === "very_important"
            ? "High Priority"
            : updates.importance === "important"
              ? "Medium Priority"
              : "Low Priority";

        const targetSection = sections.find(
          (s) => s.name === targetSectionName,
        );

        if (targetSection) {
          // Move to the target section
          const sectionTasks = tasks.filter(
            (t) => t.section_id === targetSection.id,
          );
          const newPosition =
            sectionTasks.length > 0
              ? Math.max(...sectionTasks.map((t) => t.position)) + 1
              : 0;

          await moveTaskToSection(id, targetSection.id, newPosition);
        }
      }

      // Perform the update
      await updateTask(id, updates);
    },
    [sections, tasks, updateTask, moveTaskToSection],
  );

  // Filter tasks
  const { filteredTasks, resultCount } = useTaskFilter(
    tasks,
    projects,
    sections,
    {
      search: searchValue,
      view: currentView,
      projectId: currentProjectId,
    },
  );

  // Filter sections based on current view and context
  const filteredSections = useMemo(() => {
    // Shopping view uses shopping context sections
    if (currentView === "shopping") {
      return sections.filter((s) => (s as any).context === "shopping");
    }

    // Project view with custom sections uses project-specific context
    if (currentView === "project" && currentProjectId) {
      const project = projects.find((p) => p.id === currentProjectId);
      if ((project as any)?.view_mode === "custom") {
        return sections.filter(
          (s) => (s as any).context === `project-${currentProjectId}`
        );
      }
    }

    // Default: use main context sections
    const mainSections = sections.filter(
      (s) => (s as any).context === "main" || !(s as any).context
    );

    // For today view, filter out priority sections
    if (currentView === "today") {
      return mainSections.filter((s) => {
        const name = s.name.toLowerCase();
        const isPrioritySection = name.includes("priority");
        return !isPrioritySection;
      });
    }

    return mainSections;
  }, [sections, currentView, currentProjectId, projects]);

  const handleViewChange = (view: ViewType, projectId?: string) => {
    setCurrentView(view);
    setCurrentProjectId(projectId);
    setSearchValue(""); // Clear search when changing views
    setJournalOpen(false); // Close journal when changing views
  };

  const handleOpenJournal = () => {
    setCurrentView("journal");
    setJournalOpen(true);
  };

  const handleCreateSection = useCallback(async () => {
    const name = prompt("Section name:");
    if (name?.trim()) {
      // Determine context based on current view
      let context = "main";
      if (currentView === "shopping") {
        context = "shopping";
      } else if (currentView === "project" && currentProjectId) {
        const project = projects.find((p) => p.id === currentProjectId);
        if ((project as any)?.view_mode === "custom") {
          context = `project-${currentProjectId}`;
        }
      }

      const result = await createSection(name.trim(), context);
      if (result) {
        success("Section created");
      } else {
        error("Failed to create section");
      }
    }
  }, [createSection, success, error, currentView, currentProjectId, projects]);

  const handleCreateProject = useCallback(async () => {
    const name = prompt("Project name:");
    if (name?.trim()) {
      const result = await createProject(name.trim());
      if (result) {
        success("Project created");
      } else {
        error("Failed to create project");
      }
    }
  }, [createProject, success, error]);

  const handleToggleProjectViewMode = useCallback(
    async (projectId: string, newMode: "standard" | "custom") => {
      await updateProject(projectId, { view_mode: newMode });
    },
    [updateProject],
  );

  const handleAddTask = useCallback(
    async (sectionId: string, rawInput: string) => {
      if (!rawInput.trim()) {
        error("Task name cannot be empty");
        return;
      }
      const result = await createTask(rawInput, sectionId, projects);
      if (!result) {
        error("Failed to create task");
        return;
      }

      // Set importance based on priority section name
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        const sectionNameLower = section.name.toLowerCase();
        let importance: Task["importance"] | null = null;

        if (sectionNameLower.includes("high priority")) {
          importance = "very_important";
        } else if (sectionNameLower.includes("medium priority")) {
          importance = "important";
        } else if (sectionNameLower.includes("low priority")) {
          importance = "normal";
        }

        if (importance) {
          await updateTask(result.id, { importance });
        }
      }
    },
    [createTask, updateTask, sections, projects, error],
  );

  const handleCompleteTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      await completeTask(id);

      // Show undo toast with action
      addToast(`Completed "${task.name}"`, "success", 5000, {
        label: "Undo",
        onClick: async () => {
          await undoCompleteTask(id);
        },
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

      // Show undo toast with action
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

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSelectTask = useCallback(
    (taskId: string, event?: React.MouseEvent) => {
      const isCmdOrCtrl = event?.metaKey || event?.ctrlKey;
      const isShift = event?.shiftKey;
      const isMobile = window.innerWidth <= 768;

      if (isCmdOrCtrl) {
        // Toggle selection for this task
        setSelectedTaskIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(taskId)) {
            newSet.delete(taskId);
          } else {
            newSet.add(taskId);
          }
          return newSet;
        });
        setLastSelectedTaskId(taskId);
      } else if (isShift && lastSelectedTaskId) {
        // Range select from lastSelectedTaskId to taskId
        // Only select tasks within the same section
        const lastTask = tasks.find((t) => t.id === lastSelectedTaskId);
        const currentTask = tasks.find((t) => t.id === taskId);

        if (lastTask && currentTask && lastTask.section_id === currentTask.section_id) {
          // Get tasks in this section only
          const sectionTasks = filteredTasks.filter(
            (t) => t.section_id === currentTask.section_id
          );
          const lastIndex = sectionTasks.findIndex(
            (t) => t.id === lastSelectedTaskId,
          );
          const currentIndex = sectionTasks.findIndex((t) => t.id === taskId);

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            // Clear previous selection and select only the range
            const newSelection = new Set<string>();

            for (let i = start; i <= end; i++) {
              newSelection.add(sectionTasks[i].id);
            }

            setSelectedTaskIds(newSelection);
          }
        } else {
          // Tasks are in different sections, just select the clicked task
          setSelectedTaskIds(new Set());
          setSelectedTaskId(taskId);
          setLastSelectedTaskId(taskId);
        }
      } else {
        // Normal single click - clear multi-selection and select single task
        setSelectedTaskIds(new Set());
        setSelectedTaskId(taskId);
        setLastSelectedTaskId(taskId);

        // On mobile, automatically open the detail panel
        if (isMobile) {
          setDetailPanelTaskId(taskId);
        }
      }
    },
    [filteredTasks, tasks, lastSelectedTaskId],
  );

  const handleCloseTaskDetail = useCallback(() => {
    setDetailPanelTaskId(null);
  }, []);

  const handleBatchUpdate = useCallback(
    async (updates: Partial<Task>) => {
      const selectedIds = Array.from(selectedTaskIds);

      for (const taskId of selectedIds) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) continue;

        // Special handling for tags - merge instead of replace
        if (updates.tags && updates.tags.length > 0) {
          const newTags = [...new Set([...task.tags, ...updates.tags])];
          await handleUpdateTask(taskId, { ...updates, tags: newTags });
        } else {
          await handleUpdateTask(taskId, updates);
        }
      }

      success(
        `Updated ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`,
      );
    },
    [selectedTaskIds, tasks, handleUpdateTask, success],
  );

  const handleBatchDelete = useCallback(async () => {
    const selectedIds = Array.from(selectedTaskIds);

    for (const taskId of selectedIds) {
      await deleteTask(taskId);
    }

    setSelectedTaskIds(new Set());
    setSelectedTaskId(null);
    success(
      `Deleted ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`,
    );
  }, [selectedTaskIds, deleteTask, success]);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleMoveSelectedTaskToSection = useCallback(
    async (sectionId: string) => {
      if (!selectedTaskId) return;

      const task = tasks.find((t) => t.id === selectedTaskId);
      if (!task || task.section_id === sectionId) return;

      // Get the position at the end of the target section
      const sectionTasks = tasks.filter((t) => t.section_id === sectionId);
      const newPosition =
        sectionTasks.length > 0
          ? Math.max(...sectionTasks.map((t) => t.position)) + 1
          : 0;

      await moveTaskToSection(selectedTaskId, sectionId, newPosition);
      success("Task moved");
    },
    [selectedTaskId, tasks, moveTaskToSection, success],
  );

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
        // Update with additional properties
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
        error("Failed to create task");
      }
    },
    [createTask, updateTask, projects, success, error],
  );

  const handleImport = useCallback(
    async (
      transformedTasks: any[],
      createNewSections: boolean,
      defaultSectionId?: string,
    ) => {
      // Create a map to track new sections and projects
      const sectionMap = new Map<string, string>();
      const projectMap = new Map<string, string>();

      // First pass: Create new sections and projects if needed
      for (const task of transformedTasks) {
        // Handle new projects
        if (task._newProject && !projectMap.has(task._newProject)) {
          const newProject = await createProject(task._newProject);
          if (newProject) {
            projectMap.set(task._newProject, newProject.id);
          }
        }

        // Handle new sections
        if (
          createNewSections &&
          task._newSection &&
          !sectionMap.has(task._newSection)
        ) {
          const newSection = await createSection(task._newSection);
          if (newSection) {
            sectionMap.set(task._newSection, newSection.id);
          }
        }
      }

      // Second pass: Create tasks
      let successCount = 0;
      let failCount = 0;

      for (const task of transformedTasks) {
        try {
          // Determine the section_id
          let sectionId = defaultSectionId || sections[0]?.id;
          if (createNewSections && task._newSection) {
            sectionId = sectionMap.get(task._newSection) || sectionId;
          }

          // Determine the project_id
          let projectId = task.project_id;
          if (task._newProject) {
            projectId = projectMap.get(task._newProject) || null;
          }

          // Create the task
          const taskData = {
            ...task,
            section_id: sectionId,
            project_id: projectId,
          };

          // Remove the temporary fields
          delete taskData._newProject;
          delete taskData._newSection;

          const result = await createTask(taskData.name, sectionId, projects);
          if (result) {
            // Update the task with additional properties
            await updateTask(result.id, {
              due_date: taskData.due_date,
              importance: taskData.importance,
              length: taskData.length,
              tags: taskData.tags || [],
              notes: taskData.notes,
              project_id: projectId,
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error("Failed to import task:", err);
          failCount++;
        }
      }

      // Show success/failure message
      if (successCount > 0) {
        success(
          `Successfully imported ${successCount} task${successCount !== 1 ? "s" : ""}`,
        );
      }
      if (failCount > 0) {
        error(
          `Failed to import ${failCount} task${failCount !== 1 ? "s" : ""}`,
        );
      }

      setImportModalOpen(false);
    },
    [
      sections,
      projects,
      createSection,
      createProject,
      createTask,
      updateTask,
      success,
      error,
    ],
  );

  // Keyboard shortcuts
  const { showShortcutsHelp, setShowShortcutsHelp } = useKeyboardShortcuts({
    selectedTaskId,
    handlers: {
      onComplete: () => {
        if (selectedTaskId) handleCompleteTask(selectedTaskId);
      },
      onDelete: () => {
        if (selectedTaskId) handleDeleteTask(selectedTaskId);
      },
      onUndo: handleUndoDelete,
      onOpenDatePicker: () => {
        // Will focus date picker in task detail panel
        // Open date picker - TODO: implement
      },
      onOpenProjectSelector: () => {
        // Will focus project selector in task detail panel
        // Open project selector - TODO: implement
      },
      onOpenTagsInput: () => {
        // Will focus tags input in task detail panel
        // Open tags input - TODO: implement
      },
      onOpenSectionSelector: () => {
        if (selectedTaskId) {
          setSectionSelectorOpen(true);
        }
      },
      onOpenQuickAdd: () => {
        setQuickAddOpen(true);
      },
      onSelectNext: () => {
        const currentIndex = filteredTasks.findIndex(
          (t) => t.id === selectedTaskId,
        );
        if (currentIndex < filteredTasks.length - 1) {
          setSelectedTaskId(filteredTasks[currentIndex + 1].id);
        }
      },
      onSelectPrevious: () => {
        const currentIndex = filteredTasks.findIndex(
          (t) => t.id === selectedTaskId,
        );
        if (currentIndex > 0) {
          setSelectedTaskId(filteredTasks[currentIndex - 1].id);
        }
      },
      onNewTask: () => {
        // Focus the add task input in the first section
        // Create new task - handled by onAddTask
      },
      onEscape: () => {
        if (detailPanelTaskId) {
          setDetailPanelTaskId(null);
        } else {
          setSelectedTaskId(null);
        }
      },
      onOpenDetail: () => {
        if (selectedTaskId) {
          setDetailPanelTaskId(selectedTaskId);
        }
      },
      onGoToHome: () => {
        handleViewChange("home");
      },
      onGoToAllTasks: () => {
        handleViewChange("all");
      },
      onGoToDayPlan: () => {
        handleViewChange("today");
      },
      onGoToUrgentImportant: () => {
        handleViewChange("urgent_important");
      },
      onGoToJournal: () => {
        handleViewChange("journal");
      },
    },
  });

  const selectedTask = detailPanelTaskId
    ? tasks.find((t) => t.id === detailPanelTaskId) || null
    : null;

  // Get view name for header
  const getViewName = () => {
    switch (currentView) {
      case "home":
        return "Home";
      case "all":
        return "All Tasks";
      case "today":
        return "Day Plan";
      case "upcoming":
        return "Upcoming";
      case "priority":
        return "High Priority";
      case "urgent_important":
        return "Urgent & Important";
      case "focus":
        return "Focus Mode";
      case "journal":
        return "Journal";
      case "reminders":
        return "Reminders";
      case "shopping":
        return "Shopping List";
      case "project": {
        const project = projects.find((p) => p.id === currentProjectId);
        return project ? project.name : "Project";
      }
      default:
        return "Tasks";
    }
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
        onSignOut={handleSignOut}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchResultCount={searchValue ? resultCount : undefined}
        remindersCount={reminders.length}
        onCreateProject={handleCreateProject}
        onOpenShortcuts={() => setShowShortcutsHelp(true)}
        onOpenJournal={handleOpenJournal}
        onImport={() => setImportModalOpen(true)}
        onToggleProjectViewMode={handleToggleProjectViewMode}
        viewName={getViewName()}
      >
        {isLoading ? (
          <AppSkeleton />
        ) : currentView === "home" ? (
          <Home
            tasks={tasks}
            sections={sections}
            onCompleteTask={handleCompleteTask}
            onOpenJournal={handleOpenJournal}
          />
        ) : currentView === "journal" ? (
          <Journal />
        ) : currentView === "reminders" ? (
          <Reminders
            reminders={reminders}
            onCreateReminder={createReminder}
            onCompleteReminder={completeReminder}
            onUpdateReminder={updateReminder}
            onDeleteReminder={deleteReminder}
          />
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
            onReorderSections={reorderSections}
            onReorderTasks={reorderTasks}
            onMoveTaskToSection={moveTaskToSection}
            onAddSection={handleCreateSection}
            onAddTask={handleAddTask}
          />
        )}
      </AppLayout>

      <TaskDetailPanel
        task={selectedTask}
        projects={projects}
        onClose={handleCloseTaskDetail}
        onUpdate={handleUpdateTask}
      />

      <Suspense fallback={null}>
        {importModalOpen && (
          <ImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            sections={sections}
            projects={projects}
            onImport={handleImport}
          />
        )}
      </Suspense>

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
        onClearSelection={handleClearSelection}
      />

      <SectionMoveDropdown
        isOpen={sectionSelectorOpen}
        sections={sections}
        currentSectionId={
          selectedTaskId
            ? tasks.find((t) => t.id === selectedTaskId)?.section_id || null
            : null
        }
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
