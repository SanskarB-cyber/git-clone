import React, { useEffect, useState } from 'react';

// Placeholder components - these would need to be created/enhanced
// to match the visual design and functionality depicted in the image.
// For now, they are just functional components returning basic divs.

// --- Placeholder RepoHeader Component ---
const RepoHeader: React.FC<{
  owner: string;
  repo: string;
  setOwner: (owner: string) => void;
  setRepo: (repo: string) => void;
  onInit: () => void;
  onRefresh: () => void;
}> = ({ owner, repo, setOwner, setRepo, onInit, onRefresh }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '15px',
    background: '#BAEDD2', // Light Teal/Mint Green
    marginBottom: '20px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    gap: '15px'
  }}>
    <h2 style={{ margin: 0, fontSize: '1.8em', color: '#333' }}>Repo Header</h2>
    <input
      type="text"
      value={owner}
      onChange={(e) => setOwner(e.target.value)}
      placeholder="Owner"
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        flexGrow: 1,
        maxWidth: '150px'
      }}
    />
    <input
      type="text"
      value={repo}
      onChange={(e) => setRepo(e.target.value)}
      placeholder="Repo"
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        flexGrow: 1,
        maxWidth: '180px'
      }}
    />
    <button
      onClick={onInit}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: '#4CAF50', // Green
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}
    >
      Init Repo <span style={{fontSize: '1.2em'}}>🚀</span>
    </button>
    <button
      onClick={onRefresh}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: '#2196F3', // Blue
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}
    >
      Refresh <span style={{fontSize: '1.2em'}}>🔄</span>
    </button>
    <span style={{marginLeft: 'auto', fontSize: '2em'}}>🚀</span> {/* Icon */}
  </div>
);

// --- Placeholder FileEditor Component ---
const FileEditor: React.FC<{ owner: string; repo: string; onCommitted: () => void }> = ({ onCommitted }) => (
  <div style={{ padding: '20px', borderRadius: '15px', background: '#D6FAD4', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}> {/* Light Green */}
    <h3 style={{marginTop: 0}}>File Editor</h3>
    <pre style={{
      background: '#e0e0e0', // Lighter grey for code background
      padding: '15px',
      borderRadius: '8px',
      minHeight: '150px',
      overflow: 'auto',
      fontFamily: 'monospace',
      color: '#333'
    }}>
      {`// Example code\nimport React from 'react';\n\nfunction MyComponent() {\n  return (\n    <div>\n      <h1>Hello, Colorful World!</h1>\n    </div>\n  );\n}\n\nexport default MyComponent;`}
    </pre>
    <input
      type="text"
      placeholder="Commit Message"
      style={{
        width: 'calc(100% - 20px)',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        marginTop: '15px',
        marginBottom: '10px'
      }}
    />
    <button
      onClick={onCommitted}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: '#FFD700', // Gold/Yellow
        color: '#333',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}
    >
      Commit
    </button>
  </div>
);

// --- Placeholder History Component ---
const History: React.FC<{ owner: string; repo: string }> = () => (
  <div style={{ padding: '20px', borderRadius: '15px', background: '#FFC0CB', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}> {/* Pale Pink/Coral */}
    <h3 style={{marginTop: 0}}>History</h3>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li style={{ marginBottom: '8px' }}>Commit: Initial setup (1 week ago)</li>
      <li style={{ marginBottom: '8px' }}>Commit: Added file editor (3 days ago)</li>
      <li style={{ marginBottom: '8px' }}>Commit: Refactored components (1 day ago)</li>
      {/* ... more history items */}
    </ul>
  </div>
);

// --- Placeholder Branches Component ---
const Branches: React.FC<{ owner: string; repo: string }> = () => (
  <div style={{ padding: '20px', borderRadius: '15px', background: '#FFECB3', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginTop: '20px' }}> {/* Soft Orange/Peach */}
    <h3 style={{marginTop: 0}}>Branches</h3>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
        <span style={{marginRight: '8px'}}>📁</span> main <span style={{marginLeft: 'auto', color: '#4CAF50'}}>✓</span>
      </li>
      <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
        <span style={{marginRight: '8px'}}>📄</span> feature/new-ui
      </li>
      <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
        <span style={{marginRight: '8px'}}>📄</span> bugfix/typo
      </li>
    </ul>
  </div>
);

// --- Main App Component ---
type Change = { filepath: string; head: number; worktree: number; stage: number };

export default function App() {
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
    const dummyTree = [
      { type: 'dir', path: 'src' },
      { type: 'file', path: 'src/index.js' },
      { type: 'file', path: 'README.md' },
    ];
    setTree(dummyTree);

    const dummyChanges = [
      { filepath: 'src/index.js', head: 1, worktree: 1, stage: 0 },
      { filepath: 'README.md', head: 0, worktree: 1, stage: 0 },
    ];
    setChanges(dummyChanges);

    // Actual API calls (uncomment when you have your backend running)
    // const t = await call(`/api/repos/${owner}/${repo}/tree`);
    // setTree(t.tree || []);
    // const s = await call(`/api/repos/${owner}/${repo}/status`);
    // setChanges(s.changes || []);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, [owner, repo]);

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      padding: '20px',
      background: '#F0F2F5', // General UI background - very light grey
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <RepoHeader owner={owner} repo={repo} setOwner={setOwner} setRepo={setRepo} onInit={initRepo} onRefresh={refresh} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginTop: '20px'
      }}>
        <div>
          {/* Files Card */}
          <div style={{
            padding: '20px',
            borderRadius: '15px',
            background: '#E6E6FA', // Soft Lavender
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            minHeight: '200px',
            marginBottom: '20px' // Margin for separation
          }}>
            <h3 style={{marginTop: 0}}>Files</h3>
            {tree.length === 0 ? (
              <div style={{textAlign: 'center', color: '#666'}}>No files yet</div>
            ) : (
              // Simplified file tree for demonstration.
              // A real file tree would involve more complex rendering with indentation and connections.
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {tree.map((t) => (
                  <li key={t.path} style={{
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: t.path.includes('index.js') ? '#8BC34A' : (t.path.includes('README.md') ? '#E91E63' : 'transparent'), // Example conditional background for files
                    color: t.path.includes('index.js') || t.path.includes('README.md') ? 'white' : 'inherit',
                    padding: '5px 8px',
                    borderRadius: '5px'
                  }}>
                    <span style={{marginRight: '8px', fontSize: '1.2em'}}>{t.type === 'dir' ? '📁' : '📄'}</span> {t.path}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Branches owner={owner} repo={repo} />
        </div>
        <div>
          <FileEditor owner={owner} repo={repo} onCommitted={refresh} />
          <History owner={owner} repo={repo} />
          {/* Changes Card */}
          <div style={{
            padding: '20px',
            borderRadius: '15px',
            background: '#FFFACD', // Light Yellow
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            marginTop: '20px', // Margin for separation
            minHeight: '150px'
          }}>
            <h3 style={{marginTop: 0}}>Changes</h3>
            {changes.length === 0 ? (
              <div style={{textAlign: 'center', color: '#666'}}>No pending changes</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {changes.map((change, index) => (
                  <li key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: index % 3 === 0 ? '#2196F3' : (index % 3 === 1 ? '#4CAF50' : '#FFC107'), // Different colored dots
                      marginRight: '10px'
                    }}></span>
                    {change.filepath}
                    {/* You'd parse and display head/worktree/stage more visually here */}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}