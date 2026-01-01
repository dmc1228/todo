// Database types matching our Supabase schema

export type Importance = "normal" | "important" | "very_important";
export type Length = "short" | "medium" | "long";
export type RecurrenceRule = "daily" | "weekly" | "monthly" | "yearly" | null;
export type SectionContext = "main" | "shopping" | string; // string for "project-{id}"
export type ProjectViewMode = "standard" | "custom";
export type ShoppingViewMode = "incomplete-only" | "show-all-strikethrough";

export interface Section {
  id: string;
  name: string;
  position: number;
  context: SectionContext; // 'main', 'shopping', or 'project-{projectId}'
  user_id: string;
  created_at: string;
}

export interface ProjectCollaborator {
  id: string;
  user_id: string;
  role: 'owner' | 'editor';
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  view_mode: ProjectViewMode; // 'standard' uses main sections, 'custom' uses project-specific sections
  user_id: string;
  created_at: string;
  collaborators?: ProjectCollaborator[];
}

export interface Reminder {
  id: string;
  name: string;
  due_date: string | null;
  completed: boolean;
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
  importance: Importance | null;
  urgent: boolean | null;
  length: Length | null;
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
  context?: SectionContext;
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
