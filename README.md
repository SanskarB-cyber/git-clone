# GitHub Clone (Basic Git) — React + Node

A minimal educational full‑stack project that mimics a tiny subset of GitHub's repository features:
- Initialize a repo
- Create/edit files
- Stage & commit (auto-add modified files)
- View commit history
- Create and checkout branches
- View working tree status

## Stack
- **Backend**: Node, Express, isomorphic-git (stores repos on disk)
- **Frontend**: React (Vite + TS)

## Quick start
```bash
# terminal 1
cd backend
npm install
npm run dev

# terminal 2
cd frontend
npm install
npm run dev
```
Then open the UI at http://localhost:5173

> Repos are stored under `backend/data/repos/{owner}/{repo}`.
