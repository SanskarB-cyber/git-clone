# 🚀 GitTogether - Full-Stack Git IDE

A complete full-stack Git repository manager with browser-based IDE, Supabase authentication, and cloud storage. Create repositories, edit files, and commit changes - all in the browser!

## ✨ Features

- **� Authentication** - Email/password signup and login via Supabase Auth
- **📦 Repository Management** - Create new repos or select existing ones
- **💻 Browser IDE** - Replit-style in-situ code editor
- **📁 File Explorer** - Navigate repository structure
- **💾 Version Control** - Commit changes with messages
- **🗄️ Cloud Storage** - All data in Supabase PostgreSQL (no local files)
- **👤 User Isolation** - Each user sees only their own repos
- **🎨 Modern UI** - Clean, intuitive interface
- **⚡ Real-time Ready** - Built for real-time collaboration

## 🏗️ Architecture

```
┌─────────────────────┐
│ Frontend (React)    │
│ - LoginPage         │
│ - RepoSetup         │
│ - IDE               │
│ - File Editor       │
└──────────┬──────────┘
           │
        HTTP/JSON
           │
┌──────────▼──────────┐
│ Backend (Express)   │
│ - Auth endpoints    │
│ - Repo endpoints    │
│ - File endpoints    │
│ - Commit endpoints  │
└──────────┬──────────┘
           │
      Supabase Client
           │
┌──────────▼──────────┐
│ Supabase Database   │
│ - PostgreSQL        │
│ - Auth             │
│ - Storage          │
└─────────────────────┘
```

## 📊 Database Schema

```
users (Supabase Auth)
repositories (owner_id → users.id)
  ├── branches
  ├── files
  └── commits
      └── commit_files
```

## Stack
- **Frontend**: React 18, TypeScript, Vite, Supabase JS
- **Backend**: Node.js, Express, Supabase JS Client  
- **Database**: Supabase PostgreSQL with Auth
- **Authentication**: Supabase Auth (email/password)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Supabase account and project

### 1. Clone & Install

### 1. Create Supabase Project
```bash
Visit: https://app.supabase.com
Create new project (takes ~2 min)
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials:
#   SUPABASE_URL=https://xxxxx.supabase.co
#   SUPABASE_KEY=your-service-role-key

npm install
npm run dev
```

### 3. Create Database & Start Frontend
```bash
# Run this SQL in Supabase SQL Editor (copy from SUPABASE_ONLY_SETUP.md)
# Then...

cd frontend
npm install
npm run dev
```

Open http://localhost:5173 🎉

## 📚 Documentation

- **[SUPABASE_ONLY_SETUP.md](./SUPABASE_ONLY_SETUP.md)** ← **START HERE**
- [BACKEND_SUPABASE_IMPLEMENTATION.md](./BACKEND_SUPABASE_IMPLEMENTATION.md) - Detailed steps
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Commands & API
- [VISUAL_SETUP_GUIDE.md](./VISUAL_SETUP_GUIDE.md) - Visual walkthrough
