// src/ui/App.tsx
import React, { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import { RepoSetup } from './RepoSetup';
import { RepoHeader } from './RepoHeader';
import { FileEditor } from './FileEditor';
import { History } from './History';
import { Branches } from './Branches';
import { IDE } from './IDE';
import { getCurrentUser, signOut, onAuthStateChange } from '../lib/supabaseClient';

type Change = { filepath: string; head: number; worktree: number; stage: number };
type AuthUser = { id: string; email: string; username?: string } | null;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [repoInitialized, setRepoInitialized] = useState(false);
  const [tree, setTree] = useState<{ type: 'file' | 'dir'; path: string }[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [showIDE, setShowIDE] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser as AuthUser);
        setOwner(currentUser.username || currentUser.email?.split('@')[0] || 'user');
        setIsLoggedIn(true);
      }
    };

    checkAuth();

    // Listen to auth changes
    const { data } = onAuthStateChange((user) => {
      if (user) {
        setUser(user as AuthUser);
        setOwner(user.username || user.email?.split('@')[0] || 'user');
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => {
      data?.subscription.unsubscribe();
    };
  }, []);

  async function call(path: string, init?: RequestInit) {
    const r = await fetch(path, init);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function initRepo() {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    await call(`/api/repos/${owner}/${repo}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: user.id }),
    });
    await refresh();
  }

  async function refresh() {
    // Simulate API calls
    const dummyTree: { type: 'file' | 'dir'; path: string }[] = [
      { type: 'dir', path: 'src' },
      { type: 'file', path: 'src/index.js' },
      { type: 'file', path: 'README.md' },
    ];
    setTree(dummyTree);

    const dummyChanges: Change[] = [
      { filepath: 'src/index.js', head: 1, worktree: 1, stage: 0 },
      { filepath: 'README.md', head: 0, worktree: 1, stage: 0 },
    ];
    setChanges(dummyChanges);

    // Real API calls can replace the above when backend is available.
    // const t = await call(`/api/repos/${owner}/${repo}/tree`);
    // setTree(t.tree || []);
    // const s = await call(`/api/repos/${owner}/${repo}/status`);
    // setChanges(s.changes || []);
  }

  useEffect(() => {
    if (isLoggedIn) refresh().catch(() => {});
  }, [owner, repo, isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  // Show repo setup if repo not initialized
  if (!repoInitialized || !repo) {
    return <RepoSetup owner={owner} userId={user?.id || ''} onRepoCreated={(repoName) => {
      setRepo(repoName);
      setRepoInitialized(true);
    }} />;
  }

  // Show IDE view
  if (showIDE) {
    return (
      <div>
        <div style={{ padding: '8px 16px', background: '#1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 600 }}>
            GitTogether IDE • {owner}/{repo} {user?.email && <span style={{ fontSize: '12px', color: '#9ca3af' }}>({user.email})</span>}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowIDE(false)}
              style={{
                padding: '6px 12px',
                background: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={async () => {
                await signOut();
                setIsLoggedIn(false);
                setUser(null);
              }}
              style={{
                padding: '6px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <IDE
          owner={owner}
          repo={repo}
          userId={user?.id || ''}
          onCommit={async (msg) => {
            await call(`/api/repos/${owner}/${repo}/commit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg, author_name: owner, author_email: user?.email || owner + '@example.com', owner_id: user?.id }),
            });
          }}
          onRefresh={refresh}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', minHeight: '100vh', background: '#fafafa', padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <RepoHeader owner={owner} repo={repo} setOwner={setOwner} setRepo={setRepo} onInit={initRepo} onRefresh={refresh} />
          </div>
          <button
            onClick={() => setShowIDE(true)}
            style={{
              padding: '8px 16px',
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            💻 Open IDE
          </button>
        </div>

        <h2 style={{ marginTop: 16, marginBottom: 12 }}>Overview</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* Seven colorful cards */}
          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#FF6B6B', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>Repository</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>{owner}/{repo}</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#6B8CFF', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>Branches</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>main, feature/new-ui</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#FFD166', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>Files</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>{tree.length} items</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#06D6A0', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>History</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>Recent commits</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#8338EC', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>Pull Requests</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>No open PRs</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#FF8FAB', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>CI</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>All checks passing</p>
          </div>

          <div style={{ padding: 18, borderRadius: 12, color: 'white', background: '#4CC9F0', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: 0 }}>Actions</h3>
            <p style={{ marginTop: 8, opacity: 0.95 }}>Init / Refresh / Commit</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 22 }}>
          <div>
            <FileEditor owner={owner} repo={repo} userId={user?.id || ''} onCommitted={refresh} />

            <div style={{ marginTop: 16 }}>
              <History owner={owner} repo={repo} />
            </div>
          </div>

          <aside style={{ background: '#fff', padding: 14, borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
            <h4 style={{ marginTop: 0 }}>Changes</h4>
            {changes.length === 0 ? (
              <div style={{ color: '#666' }}>No pending changes</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {changes.map((c, i) => (
                  <li key={i} style={{ padding: '8px 6px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, background: i % 2 === 0 ? '#fbfbfb' : 'transparent' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: i % 3 === 0 ? '#2196F3' : (i % 3 === 1 ? '#4CAF50' : '#FFC107') }} />
                    <span style={{ fontSize: '0.95rem' }}>{c.filepath}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}