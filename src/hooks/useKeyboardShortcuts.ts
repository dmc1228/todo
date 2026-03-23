import { useState, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardShortcutHandlers {
  onComplete: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onOpenQuickAdd: () => void;
  onSelectNext: () => void;
  onSelectPrevious: () => void;
  onEscape: () => void;
  onOpenDetail: () => void;
  onAddTaskBelow: () => void;
  onCreateSection: () => void;
  onOpenSectionSelector: () => void;
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

  useHotkeys("mod+n", (e) => {
    e.preventDefault();
    handlers.onOpenQuickAdd();
  });

  useHotkeys("shift+/", (e) => {
    e.preventDefault();
    setShowShortcutsHelp(true);
  });

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
        handlers.onAddTaskBelow();
      }
    },
    [selectedTaskId],
  );

  useHotkeys(
    "space",
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
      e.preventDefault();
      if (showShortcutsHelp) {
        setShowShortcutsHelp(false);
        return;
      }
      if (!isInputFocused()) {
        handlers.onEscape();
      }
    },
    [selectedTaskId, showShortcutsHelp],
  );

  // Tab sequence shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      if (e.key === "Tab" && !tabPressed) {
        e.preventDefault();
        setTabPressed(true);
        if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
        tabTimerRef.current = window.setTimeout(() => {
          setTabPressed(false);
        }, 500);
        return;
      }

      if (tabPressed) {
        if (e.key.toLowerCase() === "q") {
          e.preventDefault();
          handlers.onOpenQuickAdd();
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
          return;
        }

        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          handlers.onCreateSection();
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
          return;
        }

        if (e.key === "Enter" && selectedTaskId) {
          e.preventDefault();
          handlers.onComplete();
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
          return;
        }

        if (selectedTaskId) {
          e.preventDefault();
          if (e.key.toLowerCase() === "u") {
            handlers.onOpenSectionSelector();
          }
          setTabPressed(false);
          if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    };
  }, [tabPressed, selectedTaskId, handlers]);

  return { showShortcutsHelp, setShowShortcutsHelp };
}
