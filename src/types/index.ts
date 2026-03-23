export type Importance = "normal" | "important" | "very_important";
export type Length = "short" | "medium" | "long";
export type RecurrenceRule = "daily" | "weekly" | "monthly" | "yearly" | null;
export type SectionContext = "main" | string;
export type ProjectViewMode = "standard" | "custom";

export interface Section {
  id: string;
  name: string;
  position: number;
  context: SectionContext;
  user_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  view_mode: ProjectViewMode;
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

export interface ParsedTaskInput {
  name: string;
  importance: Importance;
  urgent: boolean;
  project?: string;
  tags: string[];
  dueDate?: Date;
}
