# The Digital Curator

Minimalist task management SPA built with React and Supabase, styled in a Mono Indigo direction with responsive sidebar, archive flow, inline editing, and persisted dark mode.

## Local setup

1. Create a `.env` file from `.env.example`.
2. Add your Supabase project values:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

3. In Supabase SQL Editor, run:

```sql
create table folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  folder_id uuid references folders(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean default false,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

## Commands

PowerShell policy on company machines may block `npm.ps1`, so these are the safer commands:

```powershell
npm.cmd install
npm.cmd start
npm.cmd test -- --watchAll=false
npm.cmd run build
```

## Included features

- Folder management with create, switch, and delete
- Task create, inline edit, complete, and soft-delete to archive
- Archive restore and permanent delete
- Insights dashboard with completion metrics
- Responsive mobile drawer and persisted theme mode
