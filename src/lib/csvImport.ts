import Papa from "papaparse";
import { parse, isValid } from "date-fns";
import {
  NewTask,
  Project,
  ColumnMapping,
  AsanaCSVRow,
  Importance,
} from "../types";

/**
 * Parse a CSV file and return headers and rows
 */
export function parseCSVFile(file: File): Promise<{
  headers: string[];
  rows: AsanaCSVRow[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as AsanaCSVRow[];
        resolve({ headers, rows });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Auto-detect Asana column names and suggest mapping
 */
export function detectAsanaColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: "",
  };

  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Detect name column
  const nameIndex = lowerHeaders.findIndex(
    (h) => h === "task name" || h === "name" || h === "title",
  );
  if (nameIndex !== -1) {
    mapping.name = headers[nameIndex];
  }

  // Detect due date column
  const dueDateIndex = lowerHeaders.findIndex(
    (h) => h === "due date" || h === "due" || h === "deadline",
  );
  if (dueDateIndex !== -1) {
    mapping.dueDate = headers[dueDateIndex];
  }

  // Detect project column
  const projectIndex = lowerHeaders.findIndex(
    (h) => h === "projects" || h === "project",
  );
  if (projectIndex !== -1) {
    mapping.project = headers[projectIndex];
  }

  // Detect tags column
  const tagsIndex = lowerHeaders.findIndex(
    (h) => h === "tags" || h === "labels",
  );
  if (tagsIndex !== -1) {
    mapping.tags = headers[tagsIndex];
  }

  // Detect notes column
  const notesIndex = lowerHeaders.findIndex(
    (h) => h === "notes" || h === "description" || h === "desc",
  );
  if (notesIndex !== -1) {
    mapping.notes = headers[notesIndex];
  }

  // Detect section column
  const sectionIndex = lowerHeaders.findIndex(
    (h) =>
      h === "section/column" ||
      h === "section" ||
      h === "column" ||
      h === "list",
  );
  if (sectionIndex !== -1) {
    mapping.section = headers[sectionIndex];
  }

  return mapping;
}

/**
 * Parse a date string flexibly
 */
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === "") return null;

  const trimmed = dateString.trim();

  // Try common formats
  const formats = [
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
    "yyyy-MM-dd HH:mm:ss",
  ];

  for (const format of formats) {
    try {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // Try ISO date
  try {
    const isoDate = new Date(trimmed);
    if (isValid(isoDate)) {
      return isoDate;
    }
  } catch {
    // Invalid date
  }

  return null;
}

/**
 * Extract importance from task name (* or ** prefix)
 */
function extractImportance(name: string): {
  name: string;
  importance: Importance;
} {
  let trimmed = name.trim();
  let importance: Importance = "normal";

  if (trimmed.startsWith("**")) {
    importance = "very_important";
    trimmed = trimmed.slice(2).trim();
  } else if (trimmed.startsWith("*")) {
    importance = "important";
    trimmed = trimmed.slice(1).trim();
  }

  return { name: trimmed, importance };
}

/**
 * Check if a row looks like a section header (ends with ":")
 */
function isSectionHeader(name: string): boolean {
  return name.trim().endsWith(":");
}

export interface TransformedTask extends NewTask {
  _newProject?: string;
  _newSection?: string;
}

/**
 * Transform CSV rows into task objects
 */
export function transformRows(
  rows: AsanaCSVRow[],
  mapping: ColumnMapping,
  existingProjects: Project[],
): TransformedTask[] {
  const tasks: TransformedTask[] = [];

  for (const row of rows) {
    // Get task name
    const rawName = row[mapping.name];
    if (!rawName || rawName.trim() === "") continue;

    // Skip section headers
    if (isSectionHeader(rawName)) continue;

    // Extract importance and clean name
    const { name, importance } = extractImportance(rawName);

    // Parse tags
    let tags: string[] = [];
    if (mapping.tags && row[mapping.tags]) {
      tags = row[mapping.tags]
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
    }

    // Parse due date
    let dueDate: string | null = null;
    if (mapping.dueDate && row[mapping.dueDate]) {
      const parsed = parseDate(row[mapping.dueDate]);
      if (parsed) {
        dueDate = parsed.toISOString().split("T")[0];
      }
    }

    // Handle project
    let projectId: string | null = null;
    let newProject: string | undefined;
    if (mapping.project && row[mapping.project]) {
      const projectName = row[mapping.project].trim();
      const existingProject = existingProjects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase(),
      );
      if (existingProject) {
        projectId = existingProject.id;
      } else if (projectName) {
        newProject = projectName;
      }
    }

    // Get notes
    const notes =
      mapping.notes && row[mapping.notes] ? row[mapping.notes] : null;

    // Get section name
    const newSection =
      mapping.section && row[mapping.section]
        ? row[mapping.section].trim()
        : undefined;

    // Create task object (section_id and position will be set during import)
    const task: TransformedTask = {
      name,
      section_id: "", // Will be set during import
      project_id: projectId,
      tags,
      due_date: dueDate,
      notes,
      importance,
      position: 0, // Will be set during import
    };

    if (newProject) {
      task._newProject = newProject;
    }

    if (newSection) {
      task._newSection = newSection;
    }

    tasks.push(task);
  }

  return tasks;
}
