# Backend (Node + Express + isomorphic-git)

## Setup
```bash
cd backend
npm install
npm run dev
# or: npm start
```

## Env
- `PORT` (default 4000)
- `REPO_ROOT` (default `./data/repos`)

## API (selected)
- `POST /api/repos/:owner/:repo/init`
- `POST /api/repos/:owner/:repo/file` `{ filepath, content }`
- `POST /api/repos/:owner/:repo/commit` `{ message, name, email }`
- `GET  /api/repos/:owner/:repo/status`
- `GET  /api/repos/:owner/:repo/tree`
- `GET  /api/repos/:owner/:repo/log`
- `POST /api/repos/:owner/:repo/branch` `{ name }`
- `POST /api/repos/:owner/:repo/checkout` `{ ref }`
- `GET  /api/repos/:owner/:repo/branches`
