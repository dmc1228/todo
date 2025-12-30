#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - reads from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://whiwgzoariryhpeqbgzk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_KEY or SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define the tools
const tools = [
  {
    name: 'list_tasks',
    description: 'List all tasks with optional filtering. Returns tasks that are not archived or completed by default.',
    inputSchema: {
      type: 'object',
      properties: {
        include_completed: {
          type: 'boolean',
          description: 'Include completed tasks (default: false)',
        },
        include_archived: {
          type: 'boolean',
          description: 'Include archived tasks (default: false)',
        },
        project_id: {
          type: 'string',
          description: 'Filter by project ID',
        },
        section_id: {
          type: 'string',
          description: 'Filter by section ID',
        },
        search: {
          type: 'string',
          description: 'Search in task names (case-insensitive)',
        },
        urgent: {
          type: 'boolean',
          description: 'Filter by urgent flag',
        },
        importance: {
          type: 'string',
          enum: ['normal', 'important', 'very_important'],
          description: 'Filter by importance level',
        },
      },
    },
  },
  {
    name: 'get_task',
    description: 'Get a single task by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The task ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The task name',
        },
        section_id: {
          type: 'string',
          description: 'The section ID (required)',
        },
        project_id: {
          type: 'string',
          description: 'Optional project ID',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags',
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
        notes: {
          type: 'string',
          description: 'Task notes',
        },
        importance: {
          type: 'string',
          enum: ['normal', 'important', 'very_important'],
          description: 'Importance level (default: normal)',
        },
        urgent: {
          type: 'boolean',
          description: 'Whether the task is urgent (default: false)',
        },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: 'Estimated task length (default: medium)',
        },
      },
      required: ['name', 'section_id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The task ID to update',
        },
        name: {
          type: 'string',
          description: 'New task name',
        },
        section_id: {
          type: 'string',
          description: 'New section ID',
        },
        project_id: {
          type: 'string',
          description: 'New project ID (null to remove)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New array of tags',
        },
        due_date: {
          type: 'string',
          description: 'New due date in YYYY-MM-DD format (null to remove)',
        },
        notes: {
          type: 'string',
          description: 'New task notes',
        },
        importance: {
          type: 'string',
          enum: ['normal', 'important', 'very_important'],
          description: 'New importance level',
        },
        urgent: {
          type: 'boolean',
          description: 'New urgent flag',
        },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: 'New estimated length',
        },
        completed_at: {
          type: 'string',
          description: 'Completion timestamp (set to mark complete, null to uncomplete)',
        },
        archived: {
          type: 'boolean',
          description: 'Archive flag',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as complete or incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The task ID',
        },
        completed: {
          type: 'boolean',
          description: 'Whether the task is completed (default: true)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The task ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'find_replace',
    description: 'Find and replace text in task names across multiple tasks',
    inputSchema: {
      type: 'object',
      properties: {
        find: {
          type: 'string',
          description: 'Text to find in task names',
        },
        replace: {
          type: 'string',
          description: 'Text to replace with',
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Whether search is case-sensitive (default: false)',
        },
        preview: {
          type: 'boolean',
          description: 'If true, only show what would change without making changes (default: false)',
        },
      },
      required: ['find', 'replace'],
    },
  },
  {
    name: 'batch_update',
    description: 'Update multiple tasks at once with the same changes',
    inputSchema: {
      type: 'object',
      properties: {
        task_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task IDs to update',
        },
        updates: {
          type: 'object',
          description: 'Object containing the fields to update',
          properties: {
            section_id: { type: 'string' },
            project_id: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            due_date: { type: 'string' },
            importance: { type: 'string', enum: ['normal', 'important', 'very_important'] },
            urgent: { type: 'boolean' },
            length: { type: 'string', enum: ['short', 'medium', 'long'] },
          },
        },
      },
      required: ['task_ids', 'updates'],
    },
  },
  {
    name: 'list_sections',
    description: 'List all sections',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_section',
    description: 'Create a new section',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The section name',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The project name',
        },
        color: {
          type: 'string',
          description: 'The project color (hex, e.g., #6366f1)',
        },
      },
      required: ['name'],
    },
  },
];

// Tool handlers
async function handleListTasks(args) {
  let query = supabase.from('tasks').select('*');

  if (!args.include_archived) {
    query = query.eq('archived', false);
  }

  if (!args.include_completed) {
    query = query.is('completed_at', null);
  }

  if (args.project_id) {
    query = query.eq('project_id', args.project_id);
  }

  if (args.section_id) {
    query = query.eq('section_id', args.section_id);
  }

  if (args.search) {
    query = query.ilike('name', `%${args.search}%`);
  }

  if (args.urgent !== undefined) {
    query = query.eq('urgent', args.urgent);
  }

  if (args.importance) {
    query = query.eq('importance', args.importance);
  }

  query = query.order('position', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return { tasks: data, count: data.length };
}

async function handleGetTask(args) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', args.id)
    .single();

  if (error) {
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return { task: data };
}

async function handleCreateTask(args) {
  // Get the max position for the section
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('section_id', args.section_id)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const taskData = {
    name: args.name,
    section_id: args.section_id,
    project_id: args.project_id || null,
    tags: args.tags || [],
    due_date: args.due_date || null,
    notes: args.notes || null,
    importance: args.importance || 'normal',
    urgent: args.urgent || false,
    length: args.length || 'medium',
    position,
    archived: false,
    completed_at: null,
    recurrence_rule: null,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return { task: data, message: `Created task: ${data.name}` };
}

async function handleUpdateTask(args) {
  const { id, ...updates } = args;

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from('tasks')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return { task: data, message: `Updated task: ${data.name}` };
}

async function handleCompleteTask(args) {
  const completed = args.completed !== false;
  const completed_at = completed ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('tasks')
    .update({ completed_at })
    .eq('id', args.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return {
    task: data,
    message: completed ? `Completed task: ${data.name}` : `Uncompleted task: ${data.name}`
  };
}

async function handleDeleteTask(args) {
  // First get the task name for the response
  const { data: task } = await supabase
    .from('tasks')
    .select('name')
    .eq('id', args.id)
    .single();

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', args.id);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return { message: `Deleted task: ${task?.name || args.id}` };
}

async function handleFindReplace(args) {
  const { find, replace, case_sensitive = false, preview = false } = args;

  // Get all active tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .is('completed_at', null)
    .eq('archived', false);

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  // Find matching tasks
  const matches = tasks.filter(task => {
    if (case_sensitive) {
      return task.name.includes(find);
    }
    return task.name.toLowerCase().includes(find.toLowerCase());
  });

  if (matches.length === 0) {
    return {
      message: `No tasks found containing "${find}"`,
      matches: [],
      count: 0
    };
  }

  // Calculate changes
  const changes = matches.map(task => {
    let newName;
    if (case_sensitive) {
      newName = task.name.split(find).join(replace);
    } else {
      const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      newName = task.name.replace(regex, replace);
    }
    return {
      id: task.id,
      old_name: task.name,
      new_name: newName,
    };
  });

  if (preview) {
    return {
      message: `Preview: ${changes.length} task(s) would be updated`,
      changes,
      count: changes.length,
    };
  }

  // Apply changes
  for (const change of changes) {
    await supabase
      .from('tasks')
      .update({ name: change.new_name })
      .eq('id', change.id);
  }

  return {
    message: `Updated ${changes.length} task(s)`,
    changes,
    count: changes.length,
  };
}

async function handleBatchUpdate(args) {
  const { task_ids, updates } = args;

  if (!task_ids || task_ids.length === 0) {
    throw new Error('No task IDs provided');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  const results = [];

  for (const id of task_ids) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      results.push({ id, success: false, error: error.message });
    } else {
      results.push({ id, success: true, task: data });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    message: `Updated ${successCount} of ${task_ids.length} task(s)`,
    results,
    success_count: successCount,
    total_count: task_ids.length,
  };
}

async function handleListSections() {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Failed to list sections: ${error.message}`);
  }

  return { sections: data, count: data.length };
}

async function handleListProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }

  return { projects: data, count: data.length };
}

async function handleCreateSection(args) {
  // Get max position
  const { data: existing } = await supabase
    .from('sections')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('sections')
    .insert({ name: args.name, position })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create section: ${error.message}`);
  }

  return { section: data, message: `Created section: ${data.name}` };
}

async function handleCreateProject(args) {
  const projectData = {
    name: args.name,
    color: args.color || '#6366f1',
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return { project: data, message: `Created project: ${data.name}` };
}

// Create the server
const server = new Server(
  {
    name: 'todo-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'list_tasks':
        result = await handleListTasks(args || {});
        break;
      case 'get_task':
        result = await handleGetTask(args);
        break;
      case 'create_task':
        result = await handleCreateTask(args);
        break;
      case 'update_task':
        result = await handleUpdateTask(args);
        break;
      case 'complete_task':
        result = await handleCompleteTask(args);
        break;
      case 'delete_task':
        result = await handleDeleteTask(args);
        break;
      case 'find_replace':
        result = await handleFindReplace(args);
        break;
      case 'batch_update':
        result = await handleBatchUpdate(args);
        break;
      case 'list_sections':
        result = await handleListSections();
        break;
      case 'list_projects':
        result = await handleListProjects();
        break;
      case 'create_section':
        result = await handleCreateSection(args);
        break;
      case 'create_project':
        result = await handleCreateProject(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Todo MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
