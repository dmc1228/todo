import { Task, Project, Section } from "../types";
import { format } from "date-fns";

export function exportTasksToCSV(
  tasks: Task[],
  projects: Project[],
  sections: Section[]
): void {
  // Create CSV header
  const headers = [
    "Name",
    "Section",
    "Project",
    "Tags",
    "Due Date",
    "Strict Due Date",
    "Priority",
    "Urgent",
    "Length",
    "Notes",
    "Completed",
    "Created At",
  ];

  // Create CSV rows
  const rows = tasks.map((task) => {
    const section = sections.find((s) => s.id === task.section_id);
    const project = task.project_id
      ? projects.find((p) => p.id === task.project_id)
      : null;

    return [
      task.name,
      section?.name || "",
      project?.name || "",
      task.tags.join("; "),
      task.due_date || "",
      task.strict_due_date ? "Yes" : "No",
      task.importance || "",
      task.urgent ? "Yes" : "No",
      task.length || "",
      task.notes || "",
      task.completed_at ? "Yes" : "No",
      format(new Date(task.created_at), "yyyy-MM-dd HH:mm:ss"),
    ];
  });

  // Combine header and rows
  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) =>
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          typeof cell === "string" &&
          (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(",")
    )
    .join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `tasks-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
