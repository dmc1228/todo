import "./LoadingSkeleton.css";

export function TaskSkeleton() {
  return (
    <div className="task-skeleton">
      <div className="skeleton-checkbox" />
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-meta">
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
        </div>
      </div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="section-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-section-name" />
        <div className="skeleton-badge" />
      </div>
      <div className="skeleton-tasks">
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </div>
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div className="app-skeleton">
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}
