// Database types matching our Supabase schema

export type Importance = "normal" | "important" | "very_important";
export type Length = "short" | "medium" | "long";
export type RecurrenceRule = "daily" | "weekly" | "monthly" | "yearly" | null;

export interface Section {
  id: string;
  name: string;
  position: number;
  user_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  name: string;
  section_id: string;
  project_id: string | null;
  tags: string[];
  due_date: string | null;
  strict_due_date: boolean;
  notes: string | null;
  importance: Importance;
  urgent: boolean;
  length: Length;
  position: number;
  completed_at: string | null;
  archived: boolean;
  recurrence_rule: RecurrenceRule;
  user_id: string;
  created_at: string;
}

// Types for creating new records (omitting generated fields)

export interface NewTask {
  name: string;
  section_id: string;
  project_id?: string | null;
  tags?: string[];
  due_date?: string | null;
  strict_due_date?: boolean;
  notes?: string | null;
  importance?: Importance;
  urgent?: boolean;
  length?: Length;
  position: number;
  completed_at?: string | null;
  archived?: boolean;
  recurrence_rule?: RecurrenceRule;
}

export interface NewSection {
  name: string;
  position: number;
}

export interface NewProject {
  name: string;
  color?: string;
}

// Quick-add parser types

export interface ParsedTaskInput {
  name: string;
  importance: Importance;
  urgent: boolean;
  project?: string;
  tags: string[];
  dueDate?: Date;
}

// CSV import types

export type AsanaCSVRow = Record<string, string>;

export interface ColumnMapping {
  name: string;
  dueDate?: string;
  project?: string;
  tags?: string;
  notes?: string;
  section?: string;
}
