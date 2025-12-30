import { useState, useEffect, useRef, useCallback } from "react";

interface ColumnWidths {
  taskName: number;
  dueDate: number;
  priority: number;
  urgent: number;
  length: number;
  tags: number;
  projects: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  taskName: 33, // percentage
  dueDate: 12,
  priority: 10,
  urgent: 8,
  length: 10,
  tags: 12,
  projects: 15,
};

const STORAGE_KEY = "taskTableColumnWidths";

export function useColumnResize() {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_WIDTHS;
  });

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const nextStartWidthRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const handleMouseDown = useCallback(
    (
      column:
        | "taskName"
        | "dueDate"
        | "priority"
        | "urgent"
        | "length"
        | "tags",
      startX: number,
    ) => {
      setIsResizing(column);
      startXRef.current = startX;
      startWidthRef.current = columnWidths[column];

      // Store the width of the next column
      if (column === "taskName") {
        nextStartWidthRef.current = columnWidths.dueDate;
      } else if (column === "dueDate") {
        nextStartWidthRef.current = columnWidths.priority;
      } else if (column === "priority") {
        nextStartWidthRef.current = columnWidths.urgent;
      } else if (column === "urgent") {
        nextStartWidthRef.current = columnWidths.length;
      } else if (column === "length") {
        nextStartWidthRef.current = columnWidths.tags;
      } else if (column === "tags") {
        nextStartWidthRef.current = columnWidths.projects;
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const containerWidth =
        document.querySelector(".tasks-table")?.clientWidth || 1000;
      const deltaPercent = (deltaX / containerWidth) * 100;

      setColumnWidths((prev) => {
        const newWidth = Math.max(
          5,
          Math.min(70, startWidthRef.current + deltaPercent),
        );
        const nextWidth = Math.max(
          5,
          Math.min(70, nextStartWidthRef.current - deltaPercent),
        );

        if (isResizing === "taskName") {
          return {
            ...prev,
            taskName: newWidth,
            dueDate: nextWidth,
          };
        } else if (isResizing === "dueDate") {
          return {
            ...prev,
            dueDate: newWidth,
            priority: nextWidth,
          };
        } else if (isResizing === "priority") {
          return {
            ...prev,
            priority: newWidth,
            urgent: nextWidth,
          };
        } else if (isResizing === "urgent") {
          return {
            ...prev,
            urgent: newWidth,
            length: nextWidth,
          };
        } else if (isResizing === "length") {
          return {
            ...prev,
            length: newWidth,
            tags: nextWidth,
          };
        } else if (isResizing === "tags") {
          return {
            ...prev,
            tags: newWidth,
            projects: nextWidth,
          };
        }
        return prev;
      });
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    columnWidths,
    isResizing,
    handleMouseDown,
  };
}
