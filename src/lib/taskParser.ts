import {
  parse,
  addDays,
  addWeeks,
  startOfDay,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
} from "date-fns";
import { ParsedTaskInput, Project, Importance } from "../types";

/**
 * Parses a quick-add task string into structured data.
 *
 * Syntax:
 * - Leading * sets importance (important)
 * - Leading ! sets urgent
 * - Can combine *! or !* for urgent and important
 * - #tag adds a tag (multiple allowed)
 * - proj:ProjectName or p:ProjectName assigns a project
 * - @due(date) sets due date (supports relative dates like "tomorrow", "next monday")
 * - Everything else is the task name
 *
 * @param input - The raw task string to parse
 * @returns ParsedTaskInput object with extracted data
 */
export function parseQuickAdd(input: string): ParsedTaskInput {
  let text = input.trim();
  let importance: Importance = "normal";
  let urgent = false;
  const tags: string[] = [];
  let project: string | undefined;
  let dueDate: Date | undefined;

  // Extract importance and urgent from leading * and !
  // Check for combinations like *!, !*, *, or !
  if (text.startsWith("*!") || text.startsWith("!*")) {
    importance = "important";
    urgent = true;
    text = text.slice(2).trim();
  } else if (text.startsWith("*")) {
    importance = "important";
    text = text.slice(1).trim();
  } else if (text.startsWith("!")) {
    urgent = true;
    text = text.slice(1).trim();
  }

  // Extract tags (#tag)
  const tagRegex = /#(\w+)/gi;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1].toLowerCase());
  }
  text = text.replace(tagRegex, "").trim();

  // Extract project (proj:Name or p:Name)
  const projectRegex = /(?:proj?|p):(\S+)/i;
  const projectMatch = text.match(projectRegex);
  if (projectMatch) {
    project = projectMatch[1];
    text = text.replace(projectRegex, "").trim();
  }

  // Extract due date (@due(date))
  const dueDateRegex = /@due\(([^)]+)\)/i;
  const dueDateMatch = text.match(dueDateRegex);
  if (dueDateMatch) {
    const dateString = dueDateMatch[1].trim();
    dueDate = parseRelativeDate(dateString);
    text = text.replace(dueDateRegex, "").trim();
  }

  // Clean up extra whitespace
  const name = text.replace(/\s+/g, " ").trim();

  return {
    name,
    importance,
    urgent,
    project,
    tags,
    dueDate,
  };
}

/**
 * Parses a relative date string into a Date object.
 * Supports: today, tomorrow, next [day], next week, and ISO dates.
 *
 * @param dateString - The date string to parse
 * @returns Date object or undefined if invalid
 */
function parseRelativeDate(dateString: string): Date | undefined {
  const normalized = dateString.toLowerCase().trim();
  const today = startOfDay(new Date());

  try {
    // Handle "today"
    if (normalized === "today") {
      return today;
    }

    // Handle "tomorrow"
    if (normalized === "tomorrow") {
      return addDays(today, 1);
    }

    // Handle "next week"
    if (normalized === "next week") {
      return addWeeks(today, 1);
    }

    // Handle "next [day of week]"
    const nextDayMatch = normalized.match(
      /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
    );
    if (nextDayMatch) {
      const day = nextDayMatch[1];
      switch (day) {
        case "monday":
          return nextMonday(today);
        case "tuesday":
          return nextTuesday(today);
        case "wednesday":
          return nextWednesday(today);
        case "thursday":
          return nextThursday(today);
        case "friday":
          return nextFriday(today);
        case "saturday":
          return nextSaturday(today);
        case "sunday":
          return nextSunday(today);
      }
    }

    // Handle ISO date format (YYYY-MM-DD)
    const isoDateMatch = normalized.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoDateMatch) {
      const parsed = parse(normalized, "yyyy-MM-dd", new Date());
      return isNaN(parsed.getTime()) ? undefined : startOfDay(parsed);
    }

    // Handle common date formats (MM/DD/YYYY, DD/MM/YYYY)
    const slashDateMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashDateMatch) {
      // Try MM/DD/YYYY first
      const parsed = parse(normalized, "MM/dd/yyyy", new Date());
      return isNaN(parsed.getTime()) ? undefined : startOfDay(parsed);
    }

    // Invalid date
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Finds a project by name with fuzzy matching (case-insensitive, partial match).
 *
 * @param projects - Array of Project objects to search
 * @param projectName - The project name to search for
 * @returns The matched Project object or undefined if no match
 */
export function getProjectFromName(
  projects: Project[],
  projectName: string,
): Project | undefined {
  if (!projectName) return undefined;

  const normalized = projectName.toLowerCase().trim();

  // First, try exact match (case-insensitive)
  const exactMatch = projects.find((p) => p.name.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Then try partial match (case-insensitive)
  const partialMatch = projects.find((p) =>
    p.name.toLowerCase().includes(normalized),
  );
  if (partialMatch) return partialMatch;

  // Then try starts-with match
  const startsWithMatch = projects.find((p) =>
    p.name.toLowerCase().startsWith(normalized),
  );
  if (startsWithMatch) return startsWithMatch;

  return undefined;
}
