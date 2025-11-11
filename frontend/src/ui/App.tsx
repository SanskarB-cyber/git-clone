// src/ui/App.tsx
import React, { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import { RepoHeader } from './RepoHeader';
import { FileEditor } from './FileEditor';
import { History } from './History';
import { Branches } from './Branches';

type Change = { filepath: string; head: number; worktree: number; stage: number };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [owner, setOwner] = useState('demo');
  const [repo, setRepo] = useState('hello-world');
  const [tree, setTree] = useState<{ type: 'file' | 'dir'; path: string }[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);

  async function call(path: string, init?: RequestInit) {
    const r = await fetch(path, init);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function initRepo() {
    await call(`/api/repos/${owner}/${repo}/init`, { method: 'POST' });
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

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', minHeight: '100vh', background: '#fafafa', padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <RepoHeader owner={owner} repo={repo} setOwner={setOwner} setRepo={setRepo} onInit={initRepo} onRefresh={refresh} />

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
            <FileEditor owner={owner} repo={repo} onCommitted={refresh} />

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