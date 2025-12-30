import { useState, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardShortcutHandlers {
  onComplete: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onOpenDatePicker: () => void;
  onOpenProjectSelector: () => void;
  onOpenTagsInput: () => void;
  onSelectNext: () => void;
  onSelectPrevious: () => void;
  onNewTask: () => void;
  onEscape: () => void;
  onOpenDetail: () => void;
}

interface UseKeyboardShortcutsProps {
  selectedTaskId: string | null;
  handlers: KeyboardShortcutHandlers;
}

interface UseKeyboardShortcutsReturn {
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
}

export function useKeyboardShortcuts({
  selectedTaskId,
  handlers,
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [tabPressed, setTabPressed] = useState(false);
  const tabTimerRef = useRef<number>();

  const isInputFocused = () => {
    const activeElement = document.activeElement;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    );
  };

  // Global shortcuts (work anywhere)
  useHotkeys("mod+n", (e) => {
    e.preventDefault();
    handlers.onNewTask();
  });

  useHotkeys("/", (e) => {
    if (!isInputFocused()) {
      e.preventDefault();
      // Focus search - TODO: implement with SearchInput ref
    }
  });

  useHotkeys("shift+/", (e) => {
    e.preventDefault();
    setShowShortcutsHelp(true);
  });

  // Task-selected shortcuts (only when a task is selected)
  useHotkeys(
    "mod+enter",
    (e) => {
      if (selectedTaskId && !isInputFocused()) {
        e.preventDefault();
        handlers.onComplete();
      }
    },
    [selectedTaskId],
  );

  useHotkeys(
    "enter",
    (e) => {
      if (selectedTaskId && !isInputFocused()) {
        e.preventDefault();
        handlers.onOpenDetail();
      }
    },
    [selectedTaskId],
  );

  useHotkeys(
    "backspace,delete",
    (e) => {
      if (selectedTaskId && !isInputFocused()) {
        e.preventDefault();
        handlers.onDelete();
      }
    },
    [selectedTaskId],
  );

  // Command+Z for undo
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      handlers.onUndo();
    },
    [],
  );

  useHotkeys(
    "up,k",
    (e) => {
      if (selectedTaskId && !isInputFocused()) {
        e.preventDefault();
        handlers.onSelectPrevious();
      }
    },
    [selectedTaskId],
  );

  useHotkeys(
    "down,j",
    (e) => {
      if (selectedTaskId && !isInputFocused()) {
        e.preventDefault();
        handlers.onSelectNext();
      }
    },
    [selectedTaskId],
  );

  useHotkeys(
    "escape",
    (e) => {
      if (!isInputFocused()) {
        e.preventDefault();
        handlers.onEscape();
      }
    },
    [selectedTaskId],
  );

  // Tab sequence shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      // Tab pressed - start the sequence
      if (e.key === "Tab" && !tabPressed) {
        e.preventDefault();
        setTabPressed(true);

        // Clear any existing timer
        if (tabTimerRef.current) {
          clearTimeout(tabTimerRef.current);
        }

        // Set 500ms timeout to clear the flag
        tabTimerRef.current = window.setTimeout(() => {
          setTabPressed(false);
        }, 500);
        return;
      }

      // If tab was pressed, check for follow-up keys
      if (tabPressed) {
        // Tab + Q: Quick add task (works without selection)
        if (e.key.toLowerCase() === "q") {
          e.preventDefault();
          handlers.onNewTask();
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
          return;
        }

        // Tab + Enter: Mark complete (Asana style)
        if (e.key === "Enter" && selectedTaskId) {
          e.preventDefault();
          handlers.onComplete();
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
          return;
        }

        // These require a task to be selected
        if (selectedTaskId) {
          e.preventDefault();

          switch (e.key.toLowerCase()) {
            case "d":
              handlers.onOpenDatePicker();
              setTabPressed(false);
              break;
            case "p":
              handlers.onOpenProjectSelector();
              setTabPressed(false);
              break;
            case "t":
              handlers.onOpenTagsInput();
              setTabPressed(false);
              break;
            case "s":
              // Section selector - TODO: implement
              setTabPressed(false);
              break;
          }

          // Clear the timer
          if (tabTimerRef.current) {
            clearTimeout(tabTimerRef.current);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (tabTimerRef.current) {
        clearTimeout(tabTimerRef.current);
      }
    };
  }, [tabPressed, selectedTaskId, handlers]);

  return {
    showShortcutsHelp,
    setShowShortcutsHelp,
  };
}
