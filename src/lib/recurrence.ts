import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { RecurrenceRule } from "../types";

/**
 * Calculate the next due date for a recurring task
 * @param currentDueDate - The current due date (or null)
 * @param recurrenceRule - The recurrence pattern
 * @returns The next due date as an ISO string, or null if no recurrence
 */
export function calculateNextDueDate(
  currentDueDate: string | null,
  recurrenceRule: RecurrenceRule,
): string | null {
  if (!recurrenceRule || !currentDueDate) {
    return null;
  }

  const baseDate = new Date(currentDueDate);
  let nextDate: Date;

  switch (recurrenceRule) {
    case "daily":
      nextDate = addDays(baseDate, 1);
      break;
    case "weekly":
      nextDate = addWeeks(baseDate, 1);
      break;
    case "monthly":
      nextDate = addMonths(baseDate, 1);
      break;
    case "yearly":
      nextDate = addYears(baseDate, 1);
      break;
    default:
      return null;
  }

  return nextDate.toISOString().split("T")[0];
}
