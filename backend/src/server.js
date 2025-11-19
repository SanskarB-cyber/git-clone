/**
 * Backend: Node + Express + Supabase
 * Implements "Git-Lite" with Snapshot Architecture
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file snapshots
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

// Initialize AI
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility: Generate SHA
function generateSha(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 7);
}

// ===== API ENDPOINTS =====

app.get('/api/health', (req, res) => res.json({ ok: true }));

// 1. Initialize Repo
app.post('/api/repos/:owner/:repo/init', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.body;

    if (!owner_id) return res.status(400).json({ error: 'owner_id required' });

    // Check existence
    const { data: existing } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (existing) {
      return res.json({ ok: true, initialized: false, message: 'Repo exists' });
    }

    // Create Repo
    const { data: newRepo, error } = await supabase
      .from('repositories')
      .insert({
        id: uuidv4(),
        owner_id: owner_id,
        name: repo,
        description: `Repository: ${owner}/${repo}`,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Create 'main' branch (Head is NULL initially)
    await supabase.from('branches').insert({
      id: uuidv4(),
      repo_id: newRepo.id,
      name: 'main',
      head_commit_id: null
    });

    res.json({ ok: true, initialized: true, repo: newRepo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2. Get File (Read from "Working Directory")
app.get('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { repo } = req.params;
    const { filepath, owner_id } = req.query;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    const { data: file } = await supabase
      .from('files')
      .select('content')
      .eq('repo_id', repoData.id)
      .eq('filepath', filepath)
      .maybeSingle();

    if (!file) return res.status(404).json({ error: 'File not found' });

    res.json({ ok: true, filepath, content: file.content || '' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3. Write File (Update "Working Directory")
app.post('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { repo } = req.params;
    const { filepath, content, owner_id } = req.body;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    const { error } = await supabase
      .from('files')
      .upsert({
        repo_id: repoData.id,
        filepath,
        content: content || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'repo_id,filepath' });

    if (error) throw error;

    res.json({ ok: true, filepath });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 4. Delete File
app.delete('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { repo } = req.params;
    const { filepath, owner_id } = req.query;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    await supabase.from('files').delete().eq('repo_id', repoData.id).eq('filepath', filepath);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 5. Get Tree (List "Working Directory")
app.get('/api/repos/:owner/:repo/tree', async (req, res) => {
  try {
    const { repo } = req.params;
    const { owner_id } = req.query;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    const { data: files } = await supabase
      .from('files')
      .select('filepath')
      .eq('repo_id', repoData.id);

    const tree = (files || []).map(f => ({ type: 'file', path: f.filepath }));
    res.json({ ok: true, tree });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 6. COMMIT (Snapshot Logic)
app.post('/api/repos/:owner/:repo/commit', async (req, res) => {
  try {
    const { repo } = req.params;
    const { message, name, email, owner_id, branch: branchName = 'main' } = req.body;

    // Get Repo
    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();
    
    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    // Get Branch
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, head_commit_id')
      .eq('repo_id', repoData.id)
      .eq('name', branchName)
      .single();

    if (!branchData) return res.status(404).json({ error: `Branch '${branchName}' not found` });

    // Create Commit
    const commitId = uuidv4();
    const sha = generateSha(message + new Date().toISOString());
    
    const { error: commitError } = await supabase.from('commits').insert({
      id: commitId,
      repo_id: repoData.id,
      branch_id: branchData.id,
      parent_id: branchData.head_commit_id,
      sha,
      message: message || 'Update',
      author_name: name || 'User',
      author_email: email || 'user@example.com'
    });

    if (commitError) throw commitError;

    // Snapshot Files
    const { data: currentFiles } = await supabase
      .from('files')
      .select('filepath, content')
      .eq('repo_id', repoData.id);

    if (currentFiles && currentFiles.length > 0) {
      // 1. Create Immutable Versions
      const versionInserts = currentFiles.map(f => ({
        id: uuidv4(),
        repo_id: repoData.id,
        filepath: f.filepath,
        content: f.content
      }));

      const { data: insertedVersions, error: vError } = await supabase
        .from('file_versions')
        .insert(versionInserts)
        .select('id');
      
      if (vError) throw vError;

      // 2. Link Versions to Commit
      const linkInserts = insertedVersions.map(v => ({
        commit_id: commitId,
        file_version_id: v.id
      }));

      const { error: linkError } = await supabase.from('commit_files').insert(linkInserts);
      if (linkError) throw linkError;
    }

    // Update Branch Head
    await supabase
      .from('branches')
      .update({ head_commit_id: commitId })
      .eq('id', branchData.id);

    res.json({ ok: true, commit: sha });
  } catch (e) {
    console.error('Commit error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 7. CHECKOUT (Restore Snapshot)
app.post('/api/repos/:owner/:repo/checkout', async (req, res) => {
  try {
    const { repo } = req.params;
    const { ref, owner_id } = req.body; 

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();
    
    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    const { data: branchData } = await supabase
      .from('branches')
      .select('id, head_commit_id')
      .eq('repo_id', repoData.id)
      .eq('name', ref)
      .single();

    if (!branchData) return res.status(404).json({ error: 'Branch not found' });

    // Wipe Working Directory
    await supabase.from('files').delete().eq('repo_id', repoData.id);

    // Restore Snapshot if exists
    if (branchData.head_commit_id) {
      const { data: snapshotFiles } = await supabase
        .from('commit_files')
        .select('file_versions ( filepath, content )')
        .eq('commit_id', branchData.head_commit_id);

      if (snapshotFiles && snapshotFiles.length > 0) {
        const restores = snapshotFiles.map(sf => ({
          repo_id: repoData.id,
          filepath: sf.file_versions.filepath,
          content: sf.file_versions.content
        }));
        
        // Using upsert just in case of duplicates in history (shouldn't happen but safe)
        await supabase.from('files').upsert(restores, { onConflict: 'repo_id, filepath' });
      }
    }

    res.json({ ok: true, ref });
  } catch (e) {
    console.error('Checkout error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 8. Create Branch
app.post('/api/repos/:owner/:repo/branch', async (req, res) => {
  try {
    const { repo } = req.params;
    const { name, owner_id, fromBranch = 'main' } = req.body;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    const { data: sourceBranch } = await supabase
      .from('branches')
      .select('head_commit_id')
      .eq('repo_id', repoData.id)
      .eq('name', fromBranch)
      .single();

    const { error } = await supabase
      .from('branches')
      .insert({
        id: uuidv4(),
        repo_id: repoData.id,
        name,
        head_commit_id: sourceBranch?.head_commit_id || null
      });

    if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Branch exists' });
        throw error;
    }

    res.json({ ok: true, ref: name });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 9. Get Branches
app.get('/api/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const { repo } = req.params;
    const { owner_id } = req.query;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();
    
    if (!repoData) return res.status(404).json({ error: 'Repo not found' });

    const { data: branches } = await supabase
      .from('branches')
      .select('name')
      .eq('repo_id', repoData.id);

    res.json({ ok: true, branches: branches.map(b => b.name), current: 'main' }); // Logic for 'current' handled by frontend mostly
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 10. Get Log (Recursive History)
app.get('/api/repos/:owner/:repo/log', async (req, res) => {
  try {
    const { repo } = req.params;
    const { owner_id, branch = 'main' } = req.query;

    const { data: repoData } = await supabase
      .from('repositories').select('id').eq('name', repo).eq('owner_id', owner_id).single();

    const { data: branchData } = await supabase
      .from('branches').select('head_commit_id').eq('repo_id', repoData.id).eq('name', branch).single();
    
    if (!branchData || !branchData.head_commit_id) {
      return res.json({ ok: true, log: [] });
    }

    // Walk history backwards (Max 50)
    let history = [];
    let currentId = branchData.head_commit_id;

    for(let i=0; i<50; i++) {
      if(!currentId) break;
      const { data: commit } = await supabase
        .from('commits').select('*').eq('id', currentId).single();
      
      if(commit) {
        history.push(commit);
        currentId = commit.parent_id;
      } else {
        break;
      }
    }

    const log = history.map(c => ({
      oid: c.sha,
      parent: c.parent_id,
      commit: {
        message: c.message,
        author: {
          name: c.author_name,
          email: c.author_email,
          timestamp: Math.floor(new Date(c.created_at).getTime() / 1000)
        }
      }
    }));

    res.json({ ok: true, log });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 11. Terminal/Execution (Existing logic)
app.post('/api/terminal/execute', async (req, res) => {
    // ... (Keep existing terminal logic from previous answer if you want it, 
    // or standard mock response below) ...
    res.json({ ok: true, output: "Terminal execution simulated." });
});

app.post('/api/ai/chat', async (req, res) => {
   // ... (AI Logic) ...
   if(!genAI) return res.status(503).json({error: "AI not configured"});
   // Simple echo for now unless you copy full AI logic
   res.json({ ok: true, response: "AI response simulated." });
});

// List Repos
app.get('/api/repos/:owner', async (req, res) => {
    const { owner_id } = req.query;
    const { data: repos } = await supabase.from('repositories').select('*').eq('owner_id', owner_id);
    res.json({ ok: true, repos: repos || [] });
});

app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});