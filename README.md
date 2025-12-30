# Todo App

A modern, feature-rich task management application built with React, TypeScript, and Supabase.

## Features

- **Smart Task Creation** - Quick-add syntax with natural language parsing
  - `@project` - Assign to project
  - `#tag` - Add tags
  - `!` / `!!` / `!!!` - Set importance (low/normal/high)
  - `*` - Mark as urgent
  - Date keywords: `today`, `tomorrow`, `monday`, etc.

- **Flexible Organization**
  - Sections for workflow stages (e.g., Inbox, Today, This Week)
  - Projects with custom colors
  - Tags for cross-cutting categorization
  - Drag-and-drop reordering

- **Strict Due Dates** - Flag deadlines that can't be missed with visual urgency indicators

- **Recurring Tasks** - Automatic task regeneration on completion

- **Keyboard Shortcuts**
  - `⌘+N` - New task
  - `⌘+Enter` - Complete task
  - `Tab+D` - Set due date
  - `Tab+P` - Assign project
  - `Tab+T` - Add tags
  - `↑/↓` or `J/K` - Navigate tasks
  - `Enter` - Open task detail
  - `Backspace` - Delete task
  - `⌘+Z` - Undo
  - `?` - Show all shortcuts

- **Real-time Sync** - Changes sync instantly across devices via Supabase

- **Dark Mode** - Automatic system preference detection

- **PWA Support** - Install as a native app, works offline

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: CSS with CSS Variables for theming
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: React hooks with optimistic updates
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd todo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup

### Supabase Configuration

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migrations in `supabase/migrations/` in order:
   ```bash
   npx supabase db push
   ```

   Or manually execute each SQL file in the Supabase SQL editor.

3. Enable Row Level Security (RLS) - the migrations include policies that restrict users to their own data.

### Database Schema

- **sections** - Task groupings (Inbox, Today, etc.)
- **projects** - Project categorization with colors
- **tasks** - Main task data with relationships to sections/projects

## Deployment

### Vercel

1. Push your code to GitHub

2. Import the repository in Vercel

3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AQICN_API_KEY` (optional, for air quality widget)

4. Deploy!

### Build Commands

```bash
npm run build    # Production build
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── components/
│   ├── common/       # Shared UI components
│   ├── home/         # Dashboard/home page
│   ├── import/       # Import functionality
│   ├── layout/       # Sidebar, header
│   └── tasks/        # Task-related components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and Supabase client
├── types/            # TypeScript interfaces
└── App.tsx           # Main application component
```

## License

MIT
