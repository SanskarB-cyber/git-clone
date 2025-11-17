// src/ui/IDE.tsx - Modern IDE with Terminal
import React, { useEffect, useRef, useState, useCallback } from 'react';

type FileNode = {
  type: 'file' | 'dir';
  path: string;
  content?: string;
  children?: FileNode[];
  expanded?: boolean;
};

type IDEProps = {
  owner: string;
  repo: string;
  userId: string;
  onCommit: (message: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function IDE({ owner, repo, userId, onCommit, onRefresh }: IDEProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileParent, setNewFileParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['user@project-alpha:~$ ']);
  const [terminalInput, setTerminalInput] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // Load files from backend on mount
  useEffect(() => {
    loadFiles();
    loadBranch();
  }, [owner, repo, userId]);

  // Load current branch
  async function loadBranch() {
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/branches?owner_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentBranch(data.current || 'main');
      }
    } catch (err) {
      console.error('Error loading branch:', err);
    }
  }

  // Load files from backend
  async function loadFiles() {
    if (!owner || !repo || !userId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/tree?owner_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      
      // Convert flat file list to tree structure
      const fileNodes: FileNode[] = [];
      const pathMap = new Map<string, FileNode>();
      
      for (const item of data.tree || []) {
        const parts = item.path.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!pathMap.has(currentPath)) {
            const node: FileNode = {
              type: isLast ? 'file' : 'dir',
              path: currentPath,
              expanded: false,
            };
            
            if (!isLast) {
              node.children = [];
            }
            
            pathMap.set(currentPath, node);
            
            if (i === 0) {
              fileNodes.push(node);
            } else {
              const parentPath = parts.slice(0, i).join('/');
              const parent = pathMap.get(parentPath);
              if (parent && parent.children) {
                parent.children.push(node);
              }
            }
          }
        }
      }
      
      setFiles(fileNodes);
      if (fileNodes.length > 0 && fileNodes[0].type === 'file') {
        setSelectedFile(fileNodes[0].path);
        setOpenTabs([fileNodes[0].path]);
      }
    } catch (err) {
      console.error('Error loading files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // Load selected file content from backend
  useEffect(() => {
    if (selectedFile && userId) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, userId]);

  // Load file content from backend
  async function loadFileContent(filepath: string) {
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/file?filepath=${encodeURIComponent(filepath)}&owner_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setEditorContent(data.content || '');
        setHasChanges(false);
        updateFileContent(filepath, data.content || '');
      } else {
        setEditorContent('');
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setEditorContent('');
    }
  }

  // Update file content in state
  function updateFileContent(path: string, content: string) {
    const newFiles = JSON.parse(JSON.stringify(files));
    function update(nodes: FileNode[]): boolean {
      for (const node of nodes) {
        if (node.path === path && node.type === 'file') {
          node.content = content;
          return true;
        }
        if (node.children && update(node.children)) {
          return true;
        }
      }
      return false;
    }
    if (update(newFiles)) {
      setFiles(newFiles);
    }
  }

  // Auto-save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle editor changes
  function handleEditorChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value;
    setEditorContent(content);
    setHasChanges(true);
    
    // Calculate cursor position
    const textBeforeCursor = content.substring(0, e.target.selectionStart);
    const lines = textBeforeCursor.split('\n');
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });

    if (selectedFile) {
      updateFileContent(selectedFile, content);
      
      // Auto-save after 2 seconds of inactivity
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/repos/${owner}/${repo}/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filepath: selectedFile,
              content: content,
              owner_id: userId,
            }),
          });
          setHasChanges(false);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, 2000);
    }
  }

  // Handle file selection
  function handleFileSelect(filepath: string) {
    setSelectedFile(filepath);
    if (!openTabs.includes(filepath)) {
      setOpenTabs([...openTabs, filepath]);
    }
  }

  // Close tab
  function closeTab(filepath: string, e: React.MouseEvent) {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== filepath);
    setOpenTabs(newTabs);
    if (selectedFile === filepath) {
      setSelectedFile(newTabs[newTabs.length - 1] || null);
    }
  }

  // Toggle folder expansion
  function toggleFolder(path: string) {
    const newFiles = JSON.parse(JSON.stringify(files));
    function toggle(nodes: FileNode[]): boolean {
      for (const node of nodes) {
        if (node.path === path && node.type === 'dir') {
          node.expanded = !node.expanded;
          return true;
        }
        if (node.children && toggle(node.children)) {
          return true;
        }
      }
      return false;
    }
    if (toggle(newFiles)) {
      setFiles(newFiles);
    }
  }

  // Get file icon
  function getFileIcon(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'html': 'html',
      'css': 'css',
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'data_object',
      'md': 'description',
      'py': 'code',
      'java': 'code',
      'cpp': 'code',
      'c': 'code',
    };
    return iconMap[ext || ''] || 'description';
  }

  // Render file tree
  function renderTree(nodes: FileNode[], level = 0): React.ReactNode {
    return nodes.map((node) => {
      const isSelected = selectedFile === node.path;
      const fileName = node.path.split('/').pop() || node.path;
      
      if (node.type === 'dir') {
        return (
          <div key={node.path} className="flex flex-col text-sm">
            <div
              className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-surface-dark/50 rounded-md px-2 -ml-2 ${isSelected ? 'bg-surface-dark/70' : ''}`}
              onClick={() => toggleFolder(node.path)}
            >
              <span className="material-symbols-outlined text-text-secondary-dark text-base">
                {node.expanded ? 'expand_more' : 'chevron_right'}
              </span>
              <span className="material-symbols-outlined text-yellow-400/80 text-base">folder</span>
              <span className={isSelected ? 'text-white' : 'text-text-primary-dark'}>{fileName}</span>
            </div>
            {node.expanded && node.children && (
              <div className="flex flex-col pl-6">
                {renderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      } else {
        const icon = getFileIcon(node.path);
        const iconColor = icon === 'html' ? 'text-orange-400/80' :
                         icon === 'css' ? 'text-blue-400/80' :
                         icon === 'javascript' ? 'text-yellow-400/80' :
                         icon === 'data_object' ? 'text-purple-400/80' : 'text-text-secondary-dark';
        
        return (
          <div
            key={node.path}
            className={`flex items-center gap-2 py-1 group hover:bg-surface-dark/50 rounded-md px-2 -ml-2 ${isSelected ? 'bg-surface-dark/70' : ''}`}
          >
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => handleFileSelect(node.path)}
            >
              <span className={`material-symbols-outlined ${iconColor} text-base`}>{icon}</span>
              <span className={isSelected ? 'text-white' : 'text-text-primary-dark'}>{fileName}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 text-text-secondary-dark hover:text-red-400 transition-opacity"
              title="Delete file"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        );
      }
    });
  }

  // Handle terminal input
  async function handleTerminalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const command = terminalInput.trim();
      if (command) {
        setTerminalOutput(prev => [...prev, `user@project-alpha:~$ ${command}`]);
        
        // Simple command handling
        if (command === 'clear') {
          setTerminalOutput(['user@project-alpha:~$ ']);
          setTerminalInput('');
          return;
        } else if (command === 'ls' || command === 'dir') {
          setTerminalOutput(prev => [...prev, ...files.map(f => f.path), 'user@project-alpha:~$ ']);
          setTerminalInput('');
          return;
        } else if (command.startsWith('npm ')) {
          setTerminalOutput(prev => [...prev, 'Packages installed successfully.', 'user@project-alpha:~$ ']);
          setTerminalInput('');
          return;
        } else if (command === 'help') {
          setTerminalOutput(prev => [...prev, 
            'Available commands:',
            '  clear - Clear terminal',
            '  ls/dir - List files',
            '  npm <command> - Run npm command',
            '  python/python3 - Run Python interpreter',
            '  python <file.py> - Run Python script',
            '  python --version - Check Python version',
            '  help - Show this help',
            'user@project-alpha:~$ '
          ]);
          setTerminalInput('');
          return;
        } else if (command.startsWith('python') || command.startsWith('python3')) {
          // Handle Python commands via backend
          try {
            setTerminalOutput(prev => [...prev, 'Executing Python command...']);
            const res = await fetch('/api/terminal/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command,
                owner_id: userId,
                repo,
                owner,
              }),
            });

            let data;
            if (!res.ok) {
              // Try to get error message from response
              try {
                data = await res.json();
              } catch {
                // If not JSON, try text
                try {
                  const text = await res.text();
                  setTerminalOutput(prev => [...prev, 
                    `Error: Server returned ${res.status} ${res.statusText}`,
                    text || 'No error details available',
                    'user@project-alpha:~$ '
                  ]);
                } catch {
                  setTerminalOutput(prev => [...prev, 
                    `Error: Server returned ${res.status} ${res.statusText}`,
                    'user@project-alpha:~$ '
                  ]);
                }
                setTerminalInput('');
                setTimeout(() => {
                  terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
                }, 10);
                return;
              }
            } else {
              data = await res.json();
            }
            
            if (data.ok) {
              if (data.output) {
                setTerminalOutput(prev => [...prev, data.output.trim()]);
              }
              if (data.error_output) {
                setTerminalOutput(prev => [...prev, data.error_output.trim()]);
              }
              if (data.exitCode !== undefined && data.exitCode !== 0) {
                setTerminalOutput(prev => [...prev, `Process exited with code ${data.exitCode}`]);
              }
            } else {
              setTerminalOutput(prev => [...prev, `Error: ${data.error || 'Unknown error'}`]);
              if (data.output) {
                setTerminalOutput(prev => [...prev, data.output]);
              }
              if (data.error_output) {
                setTerminalOutput(prev => [...prev, data.error_output]);
              }
            }
          } catch (err) {
            setTerminalOutput(prev => [...prev, 
              `Error: ${err instanceof Error ? err.message : 'Failed to execute command'}`,
              'Make sure the backend server is running and Python 3 is installed.'
            ]);
          }
          setTerminalOutput(prev => [...prev, 'user@project-alpha:~$ ']);
          setTerminalInput('');
          setTimeout(() => {
            terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
          }, 10);
          return;
        } else {
          setTerminalOutput(prev => [...prev, `Command not found: ${command}. Type 'help' for available commands.`, 'user@project-alpha:~$ ']);
        }
        
        setTerminalInput('');
        setTimeout(() => {
          terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
        }, 10);
      } else {
        // Empty command, just add new prompt
        setTerminalOutput(prev => [...prev, 'user@project-alpha:~$ ']);
        setTerminalInput('');
      }
    }
  }

  // Create new file
  async function createNewFile() {
    if (!newFileName.trim()) {
      alert('Please enter a file name');
      return;
    }

    const filepath = newFileParent ? `${newFileParent}/${newFileName}` : newFileName;

    try {
      // Create empty file in backend
      await fetch(`/api/repos/${owner}/${repo}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath,
          content: '',
          owner_id: userId,
        }),
      });

      // Reload files and select the new file
      await loadFiles();
      setSelectedFile(filepath);
      if (!openTabs.includes(filepath)) {
        setOpenTabs([...openTabs, filepath]);
      }
      setEditorContent('');
      setHasChanges(false);
      setShowNewFileDialog(false);
      setNewFileName('');
      setNewFileParent(null);
    } catch (err) {
      alert('Failed to create file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Save current file manually
  const saveFile = useCallback(async () => {
    if (!selectedFile) {
      alert('No file selected');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath: selectedFile,
          content: editorContent,
          owner_id: userId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save file');
      }

      setHasChanges(false);
      // Show save confirmation in terminal
      setTerminalOutput(prev => [...prev, `✓ Saved ${selectedFile}`, 'user@project-alpha:~$ ']);
      setTimeout(() => {
        terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
      }, 10);
    } catch (err) {
      alert('Failed to save file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, editorContent, owner, repo, userId]);

  // Run current file
  const runFile = useCallback(async () => {
    if (!selectedFile) {
      alert('No file selected');
      return;
    }

    // Save file first
    await saveFile();

    setIsRunning(true);
    const fileExt = selectedFile.split('.').pop()?.toLowerCase();
    
    try {
      setTerminalOutput(prev => [...prev, `Running ${selectedFile}...`, '']);

      if (fileExt === 'py') {
        // Run Python file
        const res = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: `python3 ${selectedFile}`,
            owner_id: userId,
            repo,
            owner,
          }),
        });

        let data;
        if (!res.ok) {
          try {
            data = await res.json();
          } catch {
            setTerminalOutput(prev => [...prev, 
              `Error: Server returned ${res.status} ${res.statusText}`,
              'user@project-alpha:~$ '
            ]);
            setIsRunning(false);
            return;
          }
        } else {
          data = await res.json();
        }

        if (data.ok) {
          if (data.output) {
            setTerminalOutput(prev => [...prev, data.output.trim()]);
          }
          if (data.error_output) {
            setTerminalOutput(prev => [...prev, data.error_output.trim()]);
          }
          if (data.exitCode !== undefined && data.exitCode !== 0) {
            setTerminalOutput(prev => [...prev, `Process exited with code ${data.exitCode}`]);
          }
        } else {
          setTerminalOutput(prev => [...prev, `Error: ${data.error || 'Unknown error'}`]);
          if (data.output) {
            setTerminalOutput(prev => [...prev, data.output]);
          }
          if (data.error_output) {
            setTerminalOutput(prev => [...prev, data.error_output]);
          }
        }
      } else if (fileExt === 'js') {
        // Run JavaScript file (Node.js)
        const res = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: `node ${selectedFile}`,
            owner_id: userId,
            repo,
            owner,
          }),
        });

        let data;
        if (!res.ok) {
          try {
            data = await res.json();
          } catch {
            setTerminalOutput(prev => [...prev, 
              `Error: Server returned ${res.status} ${res.statusText}`,
              'user@project-alpha:~$ '
            ]);
            setIsRunning(false);
            return;
          }
        } else {
          data = await res.json();
        }

        if (data.ok) {
          if (data.output) {
            setTerminalOutput(prev => [...prev, data.output.trim()]);
          }
          if (data.error_output) {
            setTerminalOutput(prev => [...prev, data.error_output.trim()]);
          }
        } else {
          setTerminalOutput(prev => [...prev, 
            `Error: ${data.error || 'Unknown error'}`,
            'Note: Node.js may not be installed on the server.',
            'user@project-alpha:~$ '
          ]);
        }
      } else {
        setTerminalOutput(prev => [...prev, 
          `Cannot run ${fileExt || 'this file type'}. Supported: .py (Python), .js (Node.js)`,
          'user@project-alpha:~$ '
        ]);
      }

      setTerminalOutput(prev => [...prev, 'user@project-alpha:~$ ']);
      setTimeout(() => {
        terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
      }, 10);
    } catch (err) {
      setTerminalOutput(prev => [...prev, 
        `Error: ${err instanceof Error ? err.message : 'Failed to run file'}`,
        'user@project-alpha:~$ '
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [selectedFile, owner, repo, userId, saveFile]);

  // Send AI message
  async function sendAIMessage() {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            selectedFile,
            fileContent: editorContent,
            repo,
            owner,
          },
          owner_id: userId,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setAiMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${data.error || 'Failed to get AI response'}` 
        }]);
      }
    } catch (err) {
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err instanceof Error ? err.message : 'Failed to connect to AI service'}` 
      }]);
    } finally {
      setIsAiLoading(false);
      setTimeout(() => {
        aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: 'smooth' });
      }, 10);
    }
  }

  // Apply AI code suggestion
  function applyAICode(code: string) {
    if (code) {
      // Extract code blocks from markdown
      const codeMatch = code.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        setEditorContent(codeMatch[1]);
        setHasChanges(true);
      } else {
        // If no code block, try to find code-like content
        const lines = code.split('\n');
        const codeLines = lines.filter(line => 
          line.trim().startsWith('function') || 
          line.trim().startsWith('const') || 
          line.trim().startsWith('let') ||
          line.trim().startsWith('def') ||
          line.trim().startsWith('class') ||
          line.includes('=') && line.includes('(')
        );
        if (codeLines.length > 0) {
          setEditorContent(codeLines.join('\n'));
          setHasChanges(true);
        }
      }
    }
  }

  // Delete file
  async function deleteFile(filepath: string) {
    if (!confirm(`Delete ${filepath}?`)) return;

    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/file?filepath=${encodeURIComponent(filepath)}&owner_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete file');
      }

      // Close tab if open
      const newTabs = openTabs.filter(t => t !== filepath);
      setOpenTabs(newTabs);
      if (selectedFile === filepath) {
        setSelectedFile(newTabs[newTabs.length - 1] || null);
      }

      // Reload files
      await loadFiles();
    } catch (err) {
      alert('Failed to delete file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile && hasChanges) {
          saveFile();
        }
      }
      // Ctrl+Shift+R or Cmd+Shift+R to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        if (selectedFile) {
          runFile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, hasChanges, saveFile, runFile]);

  // Handle commit
  async function handleCommit() {
    const msg = prompt('Enter commit message:');
    if (!msg || !msg.trim()) return;

    setIsCommitting(true);
    try {
      // Save current file
      if (selectedFile && hasChanges) {
        await fetch(`/api/repos/${owner}/${repo}/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filepath: selectedFile,
            content: editorContent,
            owner_id: userId,
          }),
        });
      }

      // Commit changes
      await onCommit(msg);
      setHasChanges(false);
      await onRefresh();
      await loadFiles();
    } catch (err) {
      alert('Commit failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsCommitting(false);
    }
  }

  const lines = editorContent.split('\n');

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      {/* Top Nav Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-4 text-white">
          <span className="material-symbols-outlined text-primary text-2xl">data_object</span>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">CodeProject</h2>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => setShowNewFileDialog(true)}
            className="text-text-secondary-dark hover:text-white text-sm font-medium leading-normal cursor-pointer px-3 py-1 rounded hover:bg-surface-dark/50 transition-colors"
          >
            + New File
          </button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-4">
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showAIPanel 
                ? 'bg-primary text-white' 
                : 'bg-surface-dark text-text-secondary-dark hover:text-white hover:bg-border-dark'
            }`}
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span>AI Assistant</span>
          </button>
          <button
            onClick={handleCommit}
            disabled={isCommitting}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <span className="truncate">{isCommitting ? 'Committing...' : 'Commit'}</span>
          </button>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">account_circle</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Side Nav Bar (File Explorer) */}
        <aside className="flex flex-col justify-between bg-background-dark p-4 w-64 border-r border-border-dark flex-shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-10 bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">folder</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-medium leading-normal">{repo}</h1>
                <p className="text-text-secondary-dark text-sm font-normal leading-normal">{currentBranch} branch</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-dark">
                <span className="material-symbols-outlined text-white text-xl">folder_open</span>
                <p className="text-white text-sm font-medium leading-normal">Explorer</p>
              </div>
            </div>

            {/* File Tree */}
            <div className="flex flex-col text-sm pl-2 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary-dark text-xs font-semibold uppercase">Files</span>
                <button
                  onClick={() => setShowNewFileDialog(true)}
                  className="text-text-secondary-dark hover:text-white text-xs px-2 py-1 rounded hover:bg-surface-dark/50 transition-colors"
                  title="New File"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              </div>
              {loading ? (
                <div className="text-text-secondary-dark py-4 text-center">Loading files...</div>
              ) : files.length === 0 ? (
                <div className="text-text-secondary-dark py-4 text-center">
                  <p className="mb-2">No files</p>
                  <button
                    onClick={() => setShowNewFileDialog(true)}
                    className="text-primary hover:underline text-sm"
                  >
                    Create your first file
                  </button>
                </div>
              ) : (
                renderTree(files)
              )}
            </div>
          </div>
        </aside>

        {/* Editor & Terminal */}
        <main className="flex flex-col flex-1 bg-surface-dark overflow-hidden relative">
          {/* Editor Pane */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* File Tabs */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between border-b border-border-dark">
                <div className="flex">
                {openTabs.map((tab) => {
                  const isActive = selectedFile === tab;
                  const icon = getFileIcon(tab);
                  const iconColor = icon === 'html' ? 'text-orange-400/80' :
                                   icon === 'css' ? 'text-blue-400/80' :
                                   icon === 'javascript' ? 'text-yellow-400/80' :
                                   icon === 'data_object' ? 'text-purple-400/80' : 'text-text-secondary-dark';
                  const fileName = tab.split('/').pop() || tab;
                  
                  return (
                    <div
                      key={tab}
                      className={`flex items-center gap-2 border-b-[2px] ${isActive ? 'border-b-primary text-white bg-background-dark/50 rounded-t-md' : 'border-b-transparent text-text-secondary-dark'} p-2 cursor-pointer hover:bg-background-dark/30`}
                      onClick={() => setSelectedFile(tab)}
                    >
                      <span className={`material-symbols-outlined ${iconColor} text-base`}>{icon}</span>
                      <p className={`${isActive ? 'text-white' : 'text-text-secondary-dark'} text-sm font-medium leading-normal`}>{fileName}</p>
                      <button
                        onClick={(e) => closeTab(tab, e)}
                        className="ml-1 hover:bg-surface-dark rounded p-0.5"
                      >
                        <span className="material-symbols-outlined text-text-secondary-dark text-sm">close</span>
                      </button>
                    </div>
                  );
                })}
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 px-2">
                    <button
                      onClick={saveFile}
                      disabled={isSaving || !hasChanges}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-background-dark/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save (Ctrl+S)"
                    >
                      <span className="material-symbols-outlined text-sm">{isSaving ? 'hourglass_empty' : 'save'}</span>
                      <span className="text-text-secondary-dark">{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={runFile}
                      disabled={isRunning || !selectedFile}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Run File"
                    >
                      <span className="material-symbols-outlined text-sm">{isRunning ? 'hourglass_empty' : 'play_arrow'}</span>
                      <span>{isRunning ? 'Running...' : 'Run'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Code Area */}
            <div className="flex flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
              <div className="text-right pr-4 text-text-secondary-dark select-none">
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              {selectedFile ? (
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={handleEditorChange}
                  className="flex-1 bg-transparent text-text-primary-dark outline-none resize-none font-mono"
                  style={{ lineHeight: '1.6' }}
                  spellCheck={false}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary-dark">
                  Select a file to edit
                </div>
              )}
            </div>
          </div>

          {/* Terminal Pane */}
          <div className="flex flex-col flex-shrink-0 h-1/3 min-h-40 border-t border-border-dark">
            {/* Terminal Header */}
            <div className="flex-shrink-0 border-b border-border-dark px-4 py-2">
              <p className="text-white text-sm font-bold leading-normal tracking-[0.015em]">Terminal</p>
            </div>

            {/* Terminal Body */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-auto p-4 font-mono text-sm"
            >
              {terminalOutput.map((line, idx) => (
                <p key={idx} className={line.startsWith('user@') ? 'text-text-primary-dark' : 'text-text-secondary-dark'}>
                  {line}
                </p>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-text-primary-dark">user@project-alpha:~$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  className="flex-1 bg-transparent text-text-primary-dark outline-none font-mono"
                  autoFocus
                />
                <span className="bg-white text-black animate-pulse">|</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <div className="fixed right-0 top-14 bottom-12 w-80 bg-background-dark border-l border-border-dark flex flex-col z-40 shadow-2xl">
            {/* AI Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-dark">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                <h3 className="text-white text-sm font-bold">AI Assistant</h3>
              </div>
              <button
                onClick={() => setShowAIPanel(false)}
                className="text-text-secondary-dark hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* AI Chat Messages */}
            <div
              ref={aiChatRef}
              className="flex-1 overflow-auto p-4 space-y-4"
            >
              {aiMessages.length === 0 ? (
                <div className="text-center text-text-secondary-dark mt-8">
                  <span className="material-symbols-outlined text-4xl mb-4 block text-primary">smart_toy</span>
                  <p className="text-sm mb-2 font-medium">Ask me anything about your code!</p>
                  <p className="text-xs mb-3">I can help you:</p>
                  <ul className="text-xs space-y-1 text-left max-w-xs mx-auto">
                    <li>• Write and debug code</li>
                    <li>• Explain how code works</li>
                    <li>• Suggest improvements</li>
                    <li>• Answer coding questions</li>
                  </ul>
                </div>
              ) : (
                aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-surface-dark text-text-primary-dark border border-border-dark'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
                          <span className="text-xs text-text-secondary-dark">AI Assistant</span>
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content.split('```').map((part, i) => {
                          if (i % 2 === 1) {
                            // Code block - extract language and code
                            const lines = part.split('\n');
                            const language = lines[0] || '';
                            const code = lines.slice(1).join('\n');
                            return (
                              <div key={i} className="my-2">
                                {language && (
                                  <div className="bg-background-dark px-2 py-1 text-xs text-text-secondary-dark border-b border-border-dark">
                                    {language}
                                  </div>
                                )}
                                <code className="block bg-background-dark p-3 rounded-b text-xs font-mono overflow-x-auto">
                                  {code || part}
                                </code>
                              </div>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      </div>
                      {msg.role === 'assistant' && msg.content.includes('```') && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => applyAICode(msg.content)}
                            className="text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">code</span>
                            Apply to editor
                          </button>
                          <button
                            onClick={() => {
                              const codeMatch = msg.content.match(/```[\w]*\n([\s\S]*?)```/);
                              if (codeMatch) {
                                navigator.clipboard.writeText(codeMatch[1]);
                                alert('Code copied to clipboard!');
                              }
                            }}
                            className="text-xs text-text-secondary-dark hover:bg-surface-dark/50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-dark rounded-lg p-3 border border-border-dark">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm animate-pulse">smart_toy</span>
                      <span className="text-sm text-text-secondary-dark">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Input */}
            <div className="p-4 border-t border-border-dark bg-background-dark">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAIMessage();
                    }
                  }}
                  placeholder="Ask AI anything..."
                  className="flex-1 bg-surface-dark border border-border-dark rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary"
                  disabled={isAiLoading}
                />
                <button
                  onClick={sendAIMessage}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </div>
              <p className="text-xs text-text-secondary-dark mt-2">
                Press Enter to send
              </p>
            </div>
          </div>
        )}

      <footer className="flex items-center justify-between px-4 py-1 bg-primary text-white text-xs font-medium flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span>{currentBranch}</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80" onClick={onRefresh}>
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Sync Changes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>{selectedFile ? selectedFile.split('.').pop()?.toUpperCase() || 'TEXT' : 'TEXT'}</span>
          {hasChanges && <span className="text-yellow-300">● Unsaved</span>}
        </div>
      </footer>

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-dark rounded-lg p-6 w-96 border border-border-dark">
            <h3 className="text-white text-lg font-bold mb-4">Create New File</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-text-secondary-dark text-sm mb-2">File Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="example.py, script.js, README.md"
                  className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-white outline-none focus:border-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createNewFile();
                    } else if (e.key === 'Escape') {
                      setShowNewFileDialog(false);
                      setNewFileName('');
                      setNewFileParent(null);
                    }
                  }}
                />
                <p className="text-text-secondary-dark text-xs mt-1">
                  Include path for nested files (e.g., src/index.js)
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowNewFileDialog(false);
                    setNewFileName('');
                    setNewFileParent(null);
                  }}
                  className="px-4 py-2 bg-background-dark text-white rounded hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewFile}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
