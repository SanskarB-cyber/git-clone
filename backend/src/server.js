import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import * as git from 'isomorphic-git';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({limit: '5mb'}));
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const REPO_ROOT = process.env.REPO_ROOT || path.join(__dirname, '../data/repos');

function repoDir(owner, repo){
  return path.join(REPO_ROOT, owner, repo);
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

async function ensureGitRepo({owner, repo}){
  const dir = repoDir(owner, repo);
  ensureDir(dir);
  const gitDir = path.join(dir, '.git');
  if (!fs.existsSync(gitDir)) {
    await git.init({ fs, dir });
  }
  return dir;
}

// Health check
app.get('/api/health', (req,res)=> res.json({ok:true}));

// Initialize repo
app.post('/api/repos/:owner/:repo/init', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const dir = repoDir(owner, repo);
    ensureDir(dir);
    const already = fs.existsSync(path.join(dir, '.git'));
    await git.init({ fs, dir });
    res.json({ ok: true, initialized: !already, dir });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Write or update a file
app.post('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { filepath, content } = req.body;
    if (!filepath) return res.status(400).json({ ok:false, error: 'filepath required' });
    const dir = await ensureGitRepo({owner, repo});
    const abs = path.join(dir, filepath);
    ensureDir(path.dirname(abs));
    fs.writeFileSync(abs, content ?? '', 'utf8');
    res.json({ ok:true, filepath });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Get repository tree (basic, non-recursive depth)
app.get('/api/repos/:owner/:repo/tree', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const dir = await ensureGitRepo({owner, repo});
    function listDir(d, base=''){
      const entries = fs.readdirSync(d, { withFileTypes: true });
      let out = [];
      for (const ent of entries){
        if (ent.name === '.git') continue;
        const rel = path.join(base, ent.name);
        const full = path.join(d, ent.name);
        if (ent.isDirectory()){
          out.push({ type: 'dir', path: rel });
          out = out.concat(listDir(full, rel));
        } else {
          out.push({ type: 'file', path: rel });
        }
      }
      return out;
    }
    res.json({ ok:true, tree: listDir(dir) });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Status (basic changed files)
app.get('/api/repos/:owner/:repo/status', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const dir = await ensureGitRepo({owner, repo});
    const statusMatrix = await git.statusMatrix({ fs, dir });
    const changes = statusMatrix.map(([filepath, head, worktree, stage]) => ({
      filepath, head, worktree, stage
    }));
    res.json({ ok:true, changes });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Add all & commit
app.post('/api/repos/:owner/:repo/commit', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { message, name='Demo User', email='demo@example.com' } = req.body || {};
    const dir = await ensureGitRepo({owner, repo});
    const status = await git.statusMatrix({ fs, dir });
    for (let row of status){
      const [filepath, head, worktree, stage] = row;
      if (worktree !== stage){
        await git.add({ fs, dir, filepath });
      }
    }
    const sha = await git.commit({
      fs, dir, message: message || 'chore: commit',
      author: { name, email }
    });
    res.json({ ok:true, commit: sha });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Log
app.get('/api/repos/:owner/:repo/log', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const dir = await ensureGitRepo({owner, repo});
    const log = await git.log({ fs, dir, depth: 100 });
    res.json({ ok:true, log });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Branch create
app.post('/api/repos/:owner/:repo/branch', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { name, from = 'HEAD' } = req.body || {};
    if (!name) return res.status(400).json({ ok:false, error: 'branch name required' });
    const dir = await ensureGitRepo({owner, repo});
    await git.branch({ fs, dir, ref: name, checkout: false });
    res.json({ ok:true, ref: name });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Checkout
app.post('/api/repos/:owner/:repo/checkout', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { ref } = req.body || {};
    if (!ref) return res.status(400).json({ ok:false, error: 'ref required' });
    const dir = await ensureGitRepo({owner, repo});
    await git.checkout({ fs, dir, ref });
    res.json({ ok:true, ref });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// List branches
app.get('/api/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const dir = await ensureGitRepo({owner, repo});
    const branches = await git.listBranches({ fs, dir });
    const current = await git.currentBranch({ fs, dir, fullname: false });
    res.json({ ok:true, branches, current });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

app.use((req,res)=> res.status(404).json({ ok:false, error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`Repo root: ${REPO_ROOT}`);
});
