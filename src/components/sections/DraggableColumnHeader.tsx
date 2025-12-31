import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { ColumnId } from "../../hooks/useColumnOrder";
import "./DraggableColumnHeader.css";

interface DraggableColumnHeaderProps {
  columnId: ColumnId;
  label: string;
  width: number;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  hasFilter?: boolean;
  isFilterActive?: boolean;
  onSort?: () => void;
  onFilterClick?: (e: React.MouseEvent) => void;
  onResize?: (e: React.MouseEvent) => void;
  filterMenu?: React.ReactNode;
}

export function DraggableColumnHeader({
  columnId,
  label,
  width,
  sortColumn,
  sortDirection,
  hasFilter,
  isFilterActive,
  onSort,
  onFilterClick,
  onResize,
  filterMenu,
}: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId });

  const style = {
    width: `${width}%`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1000 : undefined,
  };

  // Map columnId to sort column name
  const sortColumnName = columnId === "taskName" ? "name" : columnId === "dueDate" ? "due_date" : columnId === "priority" ? "importance" : columnId;

  const isActive = sortColumn === sortColumnName;

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`draggable-col-header col-${columnId} ${isDragging ? "dragging" : ""}`}
    >
      <div className="col-header-content">
        <div
          className="col-drag-handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </div>
        {onSort ? (
          <button className="col-header-button" onClick={onSort}>
            <span>{label}</span>
            {isActive && sortDirection === "asc" && <ArrowUp size={14} />}
            {isActive && sortDirection === "desc" && <ArrowDown size={14} />}
          </button>
        ) : (
          <span className="col-header-label">{label}</span>
        )}
        {hasFilter && onFilterClick && (
          <button
            className={`col-filter-button ${isFilterActive ? "active" : ""}`}
            onClick={onFilterClick}
          >
            <Filter size={14} />
          </button>
        )}
        {filterMenu}
        {onResize && (
          <div
            className="column-resize-handle"
            onMouseDown={onResize}
          />
        )}
      </div>
    </th>
  );
}
