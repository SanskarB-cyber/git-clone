/**
 * Refactored Backend: Express + Supabase
 * Uses PostgreSQL database instead of file-based storage
 * Maintains same API endpoints for frontend compatibility
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
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

// Initialize Gemini AI (optional - won't crash if not set)
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
} else {
  console.log('⚠️  GEMINI_API_KEY not set - AI features will be disabled');
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility: Generate SHA for commits (simple hash of content + timestamp)
function generateSha(content) {
  return createHash('sha256').update(content + Date.now()).digest('hex').slice(0, 7);
}

// ===== API ENDPOINTS =====

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Initialize repo
app.post('/api/repos/:owner/:repo/init', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.body; // owner_id is the Supabase user ID

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in request body' });
    }

    // Check if repo already exists
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (existingRepo) {
      return res.json({ ok: true, initialized: false, message: 'Repo already exists' });
    }

    // Create repository with authenticated user's ID
    const { data: newRepo, error } = await supabase
      .from('repositories')
      .insert({
        id: uuidv4(),
        owner_id: owner_id,
        name: repo,
        description: `Repository: ${owner}/${repo}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    // Create default branch
    await supabase
      .from('branches')
      .insert({
        id: uuidv4(),
        repo_id: newRepo.id,
        name: 'main',
        created_at: new Date().toISOString()
      });

    res.json({ ok: true, initialized: true, repo: newRepo });
  } catch (e) {
    console.error('Error initializing repo:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get a file
app.get('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { filepath, owner_id } = req.query;

    if (!filepath) return res.status(400).json({ ok: false, error: 'filepath required in query params' });
    if (!owner_id) return res.status(400).json({ ok: false, error: 'owner_id required in query params' });

    // Get repo by name and owner_id
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get file
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('filepath, content')
      .eq('repo_id', repoData.id)
      .eq('filepath', filepath)
      .maybeSingle();

    if (fileError) throw fileError;

    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    res.json({ ok: true, filepath: file.filepath, content: file.content || '' });
  } catch (e) {
    console.error('Error reading file:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Write or update a file
app.post('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { filepath, content, owner_id } = req.body;

    if (!filepath) return res.status(400).json({ ok: false, error: 'filepath required' });
    if (!owner_id) return res.status(400).json({ ok: false, error: 'owner_id required' });

    // Get repo by name and owner_id
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Upsert file
    const { data: file, error: fileError } = await supabase
      .from('files')
      .upsert({
        id: uuidv4(),
        repo_id: repoData.id,
        filepath,
        content: content ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'repo_id,filepath' })
      .select('id')
      .single();

    if (fileError) throw fileError;

    res.json({ ok: true, filepath, file });
  } catch (e) {
    console.error('Error writing file:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete a file
app.delete('/api/repos/:owner/:repo/file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { filepath, owner_id } = req.query;

    if (!filepath) return res.status(400).json({ ok: false, error: 'filepath required in query params' });
    if (!owner_id) return res.status(400).json({ ok: false, error: 'owner_id required in query params' });

    // Get repo by name and owner_id
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Delete file
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('repo_id', repoData.id)
      .eq('filepath', filepath);

    if (deleteError) throw deleteError;

    res.json({ ok: true, message: 'File deleted' });
  } catch (e) {
    console.error('Error deleting file:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get repository tree
app.get('/api/repos/:owner/:repo/tree', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.query; // Get owner_id from query params

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in query params' });
    }

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get files
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('filepath')
      .eq('repo_id', repoData.id);

    if (filesError) throw filesError;

    // Build tree structure (simple: just list all filepaths as files)
    const tree = files.map(f => ({
      type: 'file',
      path: f.filepath
    }));

    res.json({ ok: true, tree });
  } catch (e) {
    console.error('Error getting tree:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Status (changed files)
app.get('/api/repos/:owner/:repo/status', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.query; // Get owner_id from query params

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in query params' });
    }

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get files (mock status: all files are "modified")
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('filepath')
      .eq('repo_id', repoData.id);

    if (filesError) throw filesError;

    const changes = files.map(f => ({
      filepath: f.filepath,
      head: 1,
      worktree: 1,
      stage: 0
    }));

    res.json({ ok: true, changes });
  } catch (e) {
    console.error('Error getting status:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Add commit
app.post('/api/repos/:owner/:repo/commit', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { message, name = 'Demo User', email = 'demo@example.com', owner_id } = req.body || {};

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in request body' });
    }

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get main branch
    const { data: branch } = await supabase
      .from('branches')
      .select('id')
      .eq('repo_id', repoData.id)
      .eq('name', 'main')
      .maybeSingle();

    // Create commit
    const sha = generateSha(message);
    const { data: commit, error: commitError } = await supabase
      .from('commits')
      .insert({
        id: uuidv4(),
        repo_id: repoData.id,
        branch_id: branch?.id || null,
        sha,
        message: message || 'chore: commit',
        author_name: name,
        author_email: email,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (commitError) throw commitError;

    res.json({ ok: true, commit: sha });
  } catch (e) {
    console.error('Error committing:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get commit log
app.get('/api/repos/:owner/:repo/log', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.query; // Get owner_id from query params

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in query params' });
    }

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get commits
    const { data: commits, error: commitsError } = await supabase
      .from('commits')
      .select('id, sha, message, author_name, author_email, created_at')
      .eq('repo_id', repoData.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (commitsError) throw commitsError;

    // Format for isomorphic-git compatibility
    const log = commits.map(c => ({
      oid: c.sha,
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
    console.error('Error getting log:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Create branch
app.post('/api/repos/:owner/:repo/branch', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { name, owner_id } = req.body || {};

    if (!name) return res.status(400).json({ ok: false, error: 'branch name required' });
    if (!owner_id) return res.status(400).json({ ok: false, error: 'owner_id required' });

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Create branch
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({
        id: uuidv4(),
        repo_id: repoData.id,
        name,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (branchError) {
      if (branchError.code === '23505') {
        return res.status(409).json({ ok: false, error: 'Branch already exists' });
      }
      throw branchError;
    }

    res.json({ ok: true, ref: name });
  } catch (e) {
    console.error('Error creating branch:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Checkout (switch branch) - for now just returns success
app.post('/api/repos/:owner/:repo/checkout', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { ref, owner_id } = req.body || {};

    if (!ref) return res.status(400).json({ ok: false, error: 'ref required' });
    if (!owner_id) return res.status(400).json({ ok: false, error: 'owner_id required' });

    // Get repo
    const { data: repoData } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (!repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Verify branch exists
    const { data: branch } = await supabase
      .from('branches')
      .select('id')
      .eq('repo_id', repoData.id)
      .eq('name', ref)
      .maybeSingle();

    if (!branch) {
      return res.status(404).json({ ok: false, error: 'Branch not found' });
    }

    res.json({ ok: true, ref });
  } catch (e) {
    console.error('Error checking out:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// List branches
app.get('/api/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { owner_id } = req.query; // Get owner_id from query params

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in query params' });
    }

    // Get repo
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('name', repo)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (repoError || !repoData) {
      return res.status(404).json({ ok: false, error: 'Repository not found' });
    }

    // Get branches
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('name')
      .eq('repo_id', repoData.id)
      .order('name');

    if (branchesError) throw branchesError;

    const branchNames = branches.map(b => b.name);

    res.json({ ok: true, branches: branchNames, current: branchNames[0] || 'main' });
  } catch (e) {
    console.error('Error listing branches:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// List repositories for a user
app.get('/api/repos/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const { owner_id } = req.query; // Get owner_id from query params

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required in query params' });
    }

    // Get repos filtered by owner_id
    const { data: repos, error } = await supabase
      .from('repositories')
      .select('id, name, owner_id, created_at, updated_at')
      .eq('owner_id', owner_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ ok: true, repos: repos || [] });
  } catch (e) {
    console.error('Error listing repos:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Execute Python code
app.post('/api/execute/python', async (req, res) => {
  try {
    const { code, owner_id } = req.body;

    if (!code) {
      return res.status(400).json({ ok: false, error: 'code required' });
    }

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required' });
    }

    // Create a temporary directory for user code execution
    const tempDir = path.join(__dirname, '../temp', owner_id);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a temporary Python file
    const tempFile = path.join(tempDir, `script_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code);

    // Execute Python with timeout (10 seconds)
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [tempFile], {
        timeout: 10000,
        cwd: tempDir,
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Set timeout
      timeoutId = setTimeout(() => {
        pythonProcess.kill();
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        resolve(res.status(500).json({ 
          ok: false, 
          error: 'Execution timeout (10 seconds)',
          output: stdout,
          error_output: stderr
        }));
      }, 10000);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        resolve(res.json({
          ok: true,
          exitCode: code,
          output: stdout,
          error_output: stderr,
        }));
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        // Check if Python is not installed
        if (error.code === 'ENOENT') {
          resolve(res.status(500).json({
            ok: false,
            error: 'Python 3 is not installed. Please install Python 3 to use this feature.',
            output: stdout,
            error_output: stderr
          }));
        } else {
          resolve(res.status(500).json({
            ok: false,
            error: error.message,
            output: stdout,
            error_output: stderr
          }));
        }
      });
    });
  } catch (e) {
    console.error('Error executing Python:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Execute Python command (for terminal)
app.post('/api/terminal/execute', async (req, res) => {
  try {
    const { command, owner_id, repo, owner } = req.body;

    if (!command) {
      return res.status(400).json({ ok: false, error: 'command required' });
    }

    if (!owner_id) {
      return res.status(400).json({ ok: false, error: 'owner_id required' });
    }

    // Handle Node.js commands
    if (command.startsWith('node ')) {
      const parts = command.split(/\s+/);
      const scriptPath = parts[1];

      if (scriptPath) {
        // Get file from repository
        let fileContent = null;
        let actualScriptPath = scriptPath;

        try {
          // Get repo
          const { data: repoData } = await supabase
            .from('repositories')
            .select('id')
            .eq('name', repo)
            .eq('owner_id', owner_id)
            .maybeSingle();

          if (repoData) {
            // Get file from database
            const { data: fileData } = await supabase
              .from('files')
              .select('content')
              .eq('repo_id', repoData.id)
              .eq('filepath', scriptPath)
              .maybeSingle();

            if (fileData) {
              fileContent = fileData.content;
            }
          }
        } catch (e) {
          console.error('Error fetching file from repo:', e);
        }

        // If file exists in repo, create temp file and run it
        if (fileContent !== null) {
          const tempDir = path.join(__dirname, '../temp', owner_id);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          actualScriptPath = path.join(tempDir, `script_${Date.now()}.js`);
          fs.writeFileSync(actualScriptPath, fileContent);
        }

        // If file exists (either from repo or filesystem)
        if (fileContent !== null || fs.existsSync(scriptPath)) {
          actualScriptPath = fileContent !== null ? actualScriptPath : scriptPath;
          const nodeProcess = spawn('node', [actualScriptPath], {
            timeout: 10000,
            cwd: fileContent !== null ? path.dirname(actualScriptPath) : process.cwd(),
          });

          let stdout = '';
          let stderr = '';

          return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              nodeProcess.kill();
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {}
              }
              resolve(res.status(500).json({
                ok: false,
                output: stdout,
                error_output: stderr + '\nExecution timeout (10 seconds)',
              }));
            }, 10000);

            nodeProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            nodeProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            nodeProcess.on('close', (code) => {
              clearTimeout(timeoutId);
              
              // Clean up temp file if we created one
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }
              
              resolve(res.json({
                ok: true,
                exitCode: code,
                output: stdout,
                error_output: stderr,
              }));
            });

            nodeProcess.on('error', (error) => {
              clearTimeout(timeoutId);
              
              // Clean up temp file if we created one
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }
              
              if (error.code === 'ENOENT') {
                resolve(res.status(500).json({
                  ok: false,
                  error: 'Node.js is not installed. Please install Node.js to run JavaScript files.',
                  output: stdout,
                  error_output: stderr
                }));
              } else {
                resolve(res.status(500).json({
                  ok: false,
                  error: error.message,
                  output: stdout,
                  error_output: stderr
                }));
              }
            });
          });
        } else {
          // File not found
          return res.status(404).json({
            ok: false,
            error: `File not found: ${scriptPath}`,
            output: '',
            error_output: ''
          });
        }
      } else {
        return res.status(400).json({
          ok: false,
          error: 'Please specify a file to run: node <file.js>',
          output: '',
          error_output: ''
        });
      }
    }
    // Handle Python commands
    else if (command.startsWith('python') || command.startsWith('python3')) {
      const parts = command.split(/\s+/);
      const pythonCmd = parts[0]; // python or python3
      const scriptPath = parts[1];

      // Check for version command first
      if (command.includes('--version')) {
        const pythonProcess = spawn(pythonCmd, ['--version'], {
          timeout: 5000,
        });

        let stdout = '';
        let stderr = '';

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            pythonProcess.kill();
            resolve(res.json({
              ok: true,
              output: 'Python version check timeout',
              error_output: '',
            }));
          }, 5000);

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          pythonProcess.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve(res.json({
              ok: true,
              exitCode: code,
              output: stdout || stderr, // Version often goes to stderr
              error_output: '',
            }));
          });

          pythonProcess.on('error', (error) => {
            clearTimeout(timeoutId);
            if (error.code === 'ENOENT') {
              resolve(res.status(500).json({
                ok: false,
                error: 'Python is not installed. Please install Python 3.',
                output: '',
                error_output: ''
              }));
            } else {
              resolve(res.status(500).json({
                ok: false,
                error: error.message,
                output: stdout,
                error_output: stderr
              }));
            }
          });
        });
      }
      // Check for one-liner command
      else if (command.includes('-c')) {
        // Python one-liner: python -c "print('hello')"
        const codeMatch = command.match(/-c\s+["'](.+?)["']/);
        if (codeMatch) {
          const code = codeMatch[1];
          // Execute the code directly
          const tempDir = path.join(__dirname, '../temp', owner_id);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const tempFile = path.join(tempDir, `script_${Date.now()}.py`);
          fs.writeFileSync(tempFile, code);

          const pythonProcess = spawn(pythonCmd, [tempFile], {
            timeout: 10000,
            cwd: tempDir,
          });

          let stdout = '';
          let stderr = '';

          return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              pythonProcess.kill();
              try {
                fs.unlinkSync(tempFile);
              } catch (e) {}
              resolve(res.status(500).json({
                ok: false,
                output: stdout,
                error_output: stderr + '\nExecution timeout (10 seconds)',
              }));
            }, 10000);

            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
              clearTimeout(timeoutId);
              try {
                fs.unlinkSync(tempFile);
              } catch (e) {}
              resolve(res.json({
                ok: true,
                exitCode: code,
                output: stdout,
                error_output: stderr,
              }));
            });

            pythonProcess.on('error', (error) => {
              clearTimeout(timeoutId);
              try {
                fs.unlinkSync(tempFile);
              } catch (e) {}
              if (error.code === 'ENOENT') {
                resolve(res.status(500).json({
                  ok: false,
                  error: 'Python is not installed. Please install Python 3.',
                  output: stdout,
                  error_output: stderr
                }));
              } else {
                resolve(res.status(500).json({
                  ok: false,
                  error: error.message,
                  output: stdout,
                  error_output: stderr
                }));
              }
            });
          });
        }
      }
      // If running a script file, try to get it from the repository
      else if (scriptPath) {
        // First try to get file from repository
        let fileContent = null;
        let actualScriptPath = scriptPath;

        try {
          // Get repo
          const { data: repoData } = await supabase
            .from('repositories')
            .select('id')
            .eq('name', repo)
            .eq('owner_id', owner_id)
            .maybeSingle();

          if (repoData) {
            // Get file from database
            const { data: fileData } = await supabase
              .from('files')
              .select('content')
              .eq('repo_id', repoData.id)
              .eq('filepath', scriptPath)
              .maybeSingle();

            if (fileData) {
              fileContent = fileData.content;
            }
          }
        } catch (e) {
          console.error('Error fetching file from repo:', e);
        }

        // If file exists in repo, create temp file and run it
        if (fileContent !== null) {
          const tempDir = path.join(__dirname, '../temp', owner_id);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          actualScriptPath = path.join(tempDir, `script_${Date.now()}.py`);
          fs.writeFileSync(actualScriptPath, fileContent);
        }

        // If file exists (either from repo or filesystem)
        if (fileContent !== null || fs.existsSync(scriptPath)) {
          actualScriptPath = fileContent !== null ? actualScriptPath : scriptPath;
          const pythonProcess = spawn(pythonCmd, [actualScriptPath], {
            timeout: 10000,
            cwd: fileContent !== null ? path.dirname(actualScriptPath) : process.cwd(),
          });

          let stdout = '';
          let stderr = '';

          return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              pythonProcess.kill();
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {}
              }
              resolve(res.status(500).json({
                ok: false,
                output: stdout,
                error_output: stderr + '\nExecution timeout (10 seconds)',
              }));
            }, 10000);

            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
              clearTimeout(timeoutId);
              
              // Clean up temp file if we created one
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }
              
              resolve(res.json({
                ok: true,
                exitCode: code,
                output: stdout,
                error_output: stderr,
              }));
            });

            pythonProcess.on('error', (error) => {
              clearTimeout(timeoutId);
              
              // Clean up temp file if we created one
              if (fileContent !== null && fs.existsSync(actualScriptPath)) {
                try {
                  fs.unlinkSync(actualScriptPath);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }
              
              if (error.code === 'ENOENT') {
                resolve(res.status(500).json({
                  ok: false,
                  error: 'Python is not installed. Please install Python 3.',
                  output: stdout,
                  error_output: stderr
                }));
              } else {
                resolve(res.status(500).json({
                  ok: false,
                  error: error.message,
                  output: stdout,
                  error_output: stderr
                }));
              }
            });
          });
        } else {
          // File not found
          return res.status(404).json({
            ok: false,
            error: `File not found: ${scriptPath}`,
            output: '',
            error_output: ''
          });
        }
      }
      // Just "python" or "python3" without arguments - show interactive message
      else {
        return res.json({
          ok: true,
          output: 'Python 3.x interactive mode is not supported. Use "python script.py" to run a file or "python -c \'code\'" for one-liners.',
          error_output: '',
        });
      }
    }

    // For other commands, return not implemented
    res.status(501).json({ 
      ok: false, 
      error: 'Command not implemented',
      output: `Command "${command}" is not yet supported.`,
    });
  } catch (e) {
    console.error('Error executing terminal command:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// AI Chat endpoint (Gemini)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, owner_id } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, error: 'message required' });
    }

    if (!genAI) {
      return res.status(503).json({ 
        ok: false, 
        error: 'AI service not available. Please set GEMINI_API_KEY in backend .env file.' 
      });
    }

    // Get current file context if available
    let fileContext = '';
    if (context?.selectedFile && context?.fileContent) {
      fileContext = `\n\nCurrent file: ${context.selectedFile}\nFile content:\n\`\`\`\n${context.fileContent}\n\`\`\``;
    }

    // Get repository files context
    let repoContext = '';
    if (context?.repo && context?.owner && owner_id) {
      try {
        const { data: repoData } = await supabase
          .from('repositories')
          .select('id')
          .eq('name', context.repo)
          .eq('owner_id', owner_id)
          .maybeSingle();

        if (repoData) {
          const { data: files } = await supabase
            .from('files')
            .select('filepath, content')
            .eq('repo_id', repoData.id)
            .limit(10);

          if (files && files.length > 0) {
            repoContext = '\n\nRepository files:\n' + files.map(f => `- ${f.filepath}`).join('\n');
          }
        }
      } catch (e) {
        console.error('Error fetching repo context:', e);
      }
    }

    // Build prompt with context
    const systemPrompt = `You are an AI coding assistant helping a developer in their IDE (like Replit's AI). 
You can see their code, help debug, write code, explain concepts, and suggest improvements.
Be concise, helpful, and provide code examples when relevant. When providing code, use markdown code blocks with language tags.
Format your responses clearly with code in \`\`\`language blocks.${fileContext}${repoContext}`;

    const fullPrompt = `${systemPrompt}\n\nUser question: ${message}\n\nAssistant:`;

    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      ok: true,
      response: text,
    });
  } catch (e) {
    console.error('Error in AI chat:', e.message);
    res.status(500).json({ 
      ok: false, 
      error: e.message || 'Failed to get AI response',
      details: e.toString()
    });
  }
});

// 404 handler
app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Backend listening on http://localhost:${PORT}`);
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🗄️  Connected to PostgreSQL database`);
  if (genAI) {
    console.log(`🤖 Gemini AI: Enabled`);
  } else {
    console.log(`🤖 Gemini AI: Disabled (set GEMINI_API_KEY to enable)`);
  }
  console.log('');
});
