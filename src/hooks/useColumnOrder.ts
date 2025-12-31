import { useState, useEffect, useCallback } from "react";

export type ColumnId =
  | "number"
  | "taskName"
  | "dueDate"
  | "priority"
  | "urgent"
  | "length"
  | "tags"
  | "projects";

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "number",
  "taskName",
  "dueDate",
  "priority",
  "urgent",
  "length",
  "tags",
  "projects",
];

const STORAGE_KEY = "todo-column-order";

export function useColumnOrder() {
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnId[];
        // Validate that all columns are present
        if (
          parsed.length === DEFAULT_COLUMN_ORDER.length &&
          DEFAULT_COLUMN_ORDER.every((col) => parsed.includes(col))
        ) {
          return parsed;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return DEFAULT_COLUMN_ORDER;
  });

  // Persist to localStorage when order changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const reorderColumns = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);
        return newOrder;
      });
    },
    [],
  );

  const moveColumn = useCallback(
    (columnId: ColumnId, toIndex: number) => {
      setColumnOrder((prev) => {
        const fromIndex = prev.indexOf(columnId);
        if (fromIndex === -1 || fromIndex === toIndex) return prev;

        const newOrder = [...prev];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);
        return newOrder;
      });
    },
    [],
  );

  const resetColumnOrder = useCallback(() => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
  }, []);

  return {
    columnOrder,
    reorderColumns,
    moveColumn,
    resetColumnOrder,
  };
}
