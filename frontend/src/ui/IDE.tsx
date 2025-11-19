// src/ui/IDE.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

type FileNode = { type: 'file' | 'dir'; path: string; content?: string; children?: FileNode[]; expanded?: boolean; };

type IDEProps = {
  owner: string;
  repo: string;
  userId: string;
  currentBranch: string;             // New prop
  onBranchChange: (b: string) => void; // New prop
  onCommit: (message: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onShowHistory: () => void;
  onSignOut: () => void;
};

export function IDE({ owner, repo, userId, currentBranch, onBranchChange, onCommit, onRefresh, onShowHistory, onSignOut }: IDEProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load files when repo/owner/branch changes
  useEffect(() => {
    loadFiles();
  }, [owner, repo, userId, currentBranch]); // Reload on branch change

  async function loadFiles() {
    setLoading(true);
    try {
      // This endpoint now returns the files specific to the Checked Out branch (via the 'files' table)
      const res = await fetch(`/api/repos/${owner}/${repo}/tree?owner_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      
      // Simple flat list to tree conversion
      const nodes: FileNode[] = data.tree.map((t: any) => ({ type: 'file', path: t.path }));
      setFiles(nodes);
      
      if (nodes.length > 0 && !selectedFile) {
        // Optional: auto-select first file
      }
    } catch (err) {
      console.error(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // Load Content
  useEffect(() => {
    if (selectedFile) loadFileContent(selectedFile);
  }, [selectedFile]);

  async function loadFileContent(filepath: string) {
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/file?filepath=${encodeURIComponent(filepath)}&owner_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setEditorContent(data.content || '');
        setHasChanges(false);
      } else {
        setEditorContent('');
      }
    } catch (err) {
        setEditorContent('');
    }
  }

  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await fetch(`/api/repos/${owner}/${repo}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: selectedFile, content: editorContent, owner_id: userId }),
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, editorContent, userId]);

  async function handleCommit() {
    const msg = prompt('Enter commit message:');
    if (!msg) return;
    setIsCommitting(true);
    try {
      if (selectedFile && hasChanges) await saveFile();
      await onCommit(msg);
      await loadFiles(); // Reload to be safe
    } catch (e) {
      alert('Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }

  // Branch Switching Logic
  async function handleBranchClick() {
    // 1. List branches
    const r = await fetch(`/api/repos/${owner}/${repo}/branches?owner_id=${encodeURIComponent(userId)}`);
    const data = await r.json();
    const branches = data.branches || [];

    // 2. Ask user (Simple UI for now)
    const target = prompt(`Switch branch?\nAvailable: ${branches.join(', ')}\n\nOr type a NEW name to create branch:`, currentBranch);
    
    if (!target || target === currentBranch) return;

    const exists = branches.includes(target);

    if (exists) {
        // Checkout
        await fetch(`/api/repos/${owner}/${repo}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: target, owner_id: userId })
        });
        onBranchChange(target);
    } else {
        // Create & Checkout
        const confirmCreate = confirm(`Create new branch '${target}' from '${currentBranch}'?`);
        if(!confirmCreate) return;

        await fetch(`/api/repos/${owner}/${repo}/branch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: target, owner_id: userId, fromBranch: currentBranch })
        });

        // Switch to it
        await fetch(`/api/repos/${owner}/${repo}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: target, owner_id: userId })
        });
        onBranchChange(target);
    }
  }

  // Helper for icons
  const getIcon = (p: string) => p.endsWith('.js') || p.endsWith('.ts') ? 'javascript' : p.endsWith('.css') ? 'css' : p.endsWith('.html') ? 'html' : 'description';

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-border-dark bg-background-dark">
        <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary">data_object</span>
            <h2 className="font-bold">{repo}</h2>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={onShowHistory} className="text-sm text-gray-400 hover:text-white">History</button>
            <button onClick={handleCommit} disabled={isCommitting} className="bg-primary px-4 py-1 rounded text-sm font-bold">
                {isCommitting ? 'Committing...' : 'Commit'}
            </button>
            <button onClick={onSignOut} className="material-symbols-outlined text-red-400 text-sm">logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-background-dark border-r border-border-dark p-4 flex flex-col">
            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Files</div>
            <div className="flex-1 overflow-y-auto">
                {files.map(f => (
                    <div key={f.path} onClick={() => { setSelectedFile(f.path); if(!openTabs.includes(f.path)) setOpenTabs([...openTabs, f.path]); }} 
                         className={`cursor-pointer px-2 py-1 rounded flex items-center gap-2 text-sm ${selectedFile === f.path ? 'bg-surface-dark text-white' : 'text-gray-400 hover:bg-surface-dark/50'}`}>
                        <span className="material-symbols-outlined text-base">{getIcon(f.path)}</span>
                        {f.path}
                    </div>
                ))}
                {files.length === 0 && !loading && <div className="text-gray-600 text-sm italic">No files. Create one!</div>}
                <button onClick={async () => {
                    const name = prompt("File name?");
                    if(name) {
                        await fetch(`/api/repos/${owner}/${repo}/file`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({filepath: name, content: '', owner_id: userId})});
                        loadFiles();
                    }
                }} className="mt-4 text-xs text-primary">+ New File</button>
            </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col bg-surface-dark">
            {/* Tabs */}
            <div className="flex bg-background-dark border-b border-border-dark">
                {openTabs.map(t => (
                    <div key={t} onClick={() => setSelectedFile(t)} className={`px-4 py-2 text-sm cursor-pointer border-r border-border-dark flex items-center gap-2 ${selectedFile === t ? 'bg-surface-dark text-white' : 'text-gray-500'}`}>
                        {t} 
                        <span onClick={(e)=>{e.stopPropagation(); setOpenTabs(openTabs.filter(x=>x!==t));}} className="text-xs hover:text-red-400">×</span>
                    </div>
                ))}
            </div>
            {/* Text Area */}
            <div className="flex-1 relative">
                {selectedFile ? (
                    <textarea 
                        className="w-full h-full bg-surface-dark text-gray-300 p-4 font-mono outline-none resize-none"
                        value={editorContent}
                        onChange={e => { setEditorContent(e.target.value); setHasChanges(true); }}
                        onKeyDown={e => { if((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); } }}
                    />
                ) : <div className="flex items-center justify-center h-full text-gray-600">Select a file</div>}
                {hasChanges && <div className="absolute bottom-4 right-4 text-yellow-500 text-xs bg-black/50 px-2 py-1 rounded">Unsaved changes</div>}
            </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-white px-4 py-1 text-xs flex justify-between items-center">
        <div className="flex items-center gap-4 cursor-pointer hover:underline" onClick={handleBranchClick} title="Click to switch branch">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span className="font-bold">{currentBranch}</span>
        </div>
        <div>{selectedFile}</div>
      </footer>
    </div>
  );
}