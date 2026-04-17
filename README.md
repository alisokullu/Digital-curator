<div align="center">
  <img src="public/logo.png" width="120" height="auto" alt="Digital Curator Logo" />
  <h1>The Digital Curator</h1>
  <p>A modern, premium task management and curation application built for productivity.</p>
</div>

---

## 🎯 Overview

Digital Curator is a robust React application designed to manage tasks within grouped collections gracefully. It focuses deeply on a distraction-free, fluid user interface, leveraging "Glassmorphism" design paradigms, dynamic animations, and an overall premium aesthetic. 

Built automatically with CI/CD and connected to a serverless Postgres backend out-of-the-box.

## ✨ Key Features
- **Intelligent Collections:** Dynamically categorizes tasks via designated collections (Work, Daily, etc.) with automatic icon assignment.
- **Glassmorphic UI:** A visually stunning environment designed manually using advanced CSS filters and custom modern tokens.
- **Bilingual Architecture (i18n):** Flawless run-time toggling between English and Turkish via a centralized context engine.
- **Offline / PWA Ready:** Configured as a Progressive Web App. Installable natively on iOS/Android or desktop directly from a browser.
- **Real-Time Data Syncing:** Connected seamlessly with Supabase. Updates propagate without manual page refreshing or layout shifts.
- **Insights Dashboard:** Analytics pane for visualizing task completion metrics against specific collections seamlessly.

## 🛠 Tech Stack
- **Frontend:** React.js (Hooks, React DOM)
- **Styling:** Vanilla CSS3 + Custom Layouts (No dependencies - Full Control)
- **Icons:** Lucide-React
- **Database/Backend:** Supabase (PostgreSQL, Realtime APIs)
- **Deployment:** Netlify 

## 🚀 Quick Start

To run this project locally, follow these steps:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/digital-curator.git
   cd digital-curator
   ```

2. **Setup Environment Variables**
   There's an example configuration file included. Copy it to create your active `.env`:
   ```bash
   cp .env.example .env
   ```
   > **Note:** Fill `.env` with your actual Supabase URL and Anon Key. The `.env` file is intentionally git-ignored for strict security and will never be pushed.

3. **Install Dependencies & Start**
   ```bash
   npm install
   npm start
   ```

## 🔒 Security Practices Notice
For those reviewing this code: All security credentials (.env keys) are STRICTLY excluded from the version history to demonstrate industry-standard secure coding practices. 

---
*Created by [Ali Sokullu] as a demonstration of modern Front-end UI/UX & React capabilities.*
