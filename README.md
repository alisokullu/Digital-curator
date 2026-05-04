<div align="center">
  <img src="public/logo.png" width="120" height="auto" alt="Digital Curator Logo" />
  <h1>The Digital Curator</h1>
  <p>A modern task management and curation application built with React, Supabase, and Netlify.</p>
</div>

---

## Overview

Digital Curator helps users organize tasks, notes, recurring routines, archive items, and completion insights inside personal collections. The frontend is a Create React App project and the backend is a Supabase Postgres project with email/password authentication, row-level security, and realtime table subscriptions.

## Key Features

- Collection-based task management with archive and restore flows.
- Notes workspace with rich text editing.
- Daily, weekly, and monthly routine tracking.
- Insight and history views for completion metrics.
- Light/dark theme support and bilingual UI text.
- Supabase Auth, Postgres, RLS, and Realtime integration.
- Netlify deployment with SPA redirects.

## Tech Stack

- Frontend: React, React DOM, Create React App
- Styling: CSS
- Icons: Lucide React
- Backend: Supabase Auth, Postgres, Realtime
- Deployment: Netlify

## Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/digital-curator.git
   cd digital-curator
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill `.env` with your Supabase project values:

   ```bash
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Install dependencies and start the app:

   ```bash
   npm install
   npm start
   ```

## Supabase Setup

For a new Supabase project, run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor. It creates the required `folders`, `tasks`, `notes`, and `task_history` tables, enables RLS, and adds `auth.uid() = user_id` policies so users can only read and write their own records.

For an existing production project with real data, do not run the full schema file blindly. First run [supabase/rls-audit.sql](supabase/rls-audit.sql), which only reads metadata and row counts. Confirm that every table has `user_id`, RLS is enabled, and policies already match the expected ownership model before making any changes.

Enable email/password sign-in in Supabase Auth. If your project requires confirmed emails, new users must confirm their email before signing in.

The app listens for realtime changes on:

- `folders`
- `tasks`
- `notes`
- `task_history`

## Netlify Setup

Netlify should build from GitHub with:

- Build command: `CI= npm run build`
- Publish directory: `build`

Add these environment variables in Netlify under Site configuration > Environment variables:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

`netlify.toml` already includes the SPA redirect rule needed for direct page reloads.

## Security Notes

- `.env` and local environment files are ignored by Git.
- `build/` and `dist/` are ignored; Netlify should generate production assets during deployment.
- The Supabase anon/publishable key is safe to use in the browser only when RLS policies are enabled and tested.
- If a real Supabase URL or key was ever committed or pushed to GitHub, rotate the key in Supabase and update Netlify with the new value.
- Never use a Supabase `service_role` key in this frontend application.

## Verification

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`:

```bash
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
```

---

Created by Ali Sokullu as a demonstration of modern frontend UI/UX and React capabilities.
