// src/ui/History.tsx
import React, { useEffect, useState, useRef } from 'react';

// Types based on your backend response
type Author = { name: string; email: string; timestamp: number; };
type Commit = { message: string; author: Author };
type LogEntry = {
  oid: string;
  commit: Commit;
};

interface HistoryProps {
  owner: string;
  repo: string;
  userId: string;
  currentBranch: string;
  onBranchChange: (branch: string) => void;
  onShowIDE: () => void;
}

export function History({ owner, repo, userId, currentBranch, onBranchChange, onShowIDE }: HistoryProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<LogEntry | null>(null);
  const [filter, setFilter] = useState('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Load Branches and Commits on mount or when branch changes
  useEffect(() => {
    loadData();
  }, [owner, repo, userId, currentBranch]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Fetch Branches
      const bRes = await fetch(`/api/repos/${owner}/${repo}/branches?owner_id=${encodeURIComponent(userId)}`);
      const bData = await bRes.json();
      if (bData.branches) setBranches(bData.branches);

      // Fetch Log for current branch
      const cRes = await fetch(`/api/repos/${owner}/${repo}/log?owner_id=${encodeURIComponent(userId)}&branch=${currentBranch}`);
      const cData = await cRes.json();
      
      const logData = cData.log || [];
      setLog(logData);
      if (logData.length > 0) setSelectedCommit(logData[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // 2. Handle Branch Switch
  async function handleSwitchBranch(targetBranch: string) {
    setIsBranchDropdownOpen(false);
    if (targetBranch === currentBranch) return;

    try {
      // Call checkout API
      await fetch(`/api/repos/${owner}/${repo}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: targetBranch, owner_id: userId })
      });
      
      // Update global state
      onBranchChange(targetBranch);
      // Effect hook will re-trigger data load
    } catch (e) {
      alert("Failed to switch branch");
    }
  }

  // Helper: Format Time
  function formatRelativeTime(timestamp: number): string {
    const now = new Date();
    const commitDate = new Date(timestamp * 1000);
    const diffInSeconds = Math.floor((now.getTime() - commitDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  }

  // Helper: Consistent Color generation based on author name
  const getAuthorColor = (name: string) => {
    const colors = ['bg-teal-500', 'bg-orange-500', 'bg-purple-500', 'bg-blue-500', 'bg-pink-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      
      {/* --- Top Navigation Bar --- */}
      <header className="flex w-full items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-[#232f48] px-6 py-3 bg-background-light dark:bg-background-dark z-20 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-2xl text-primary">data_object</span>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">{repo}</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-medium leading-normal text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary cursor-pointer" onClick={onShowIDE}>Code</a>
            <a className="text-sm font-medium leading-normal text-gray-800 dark:text-white cursor-pointer font-bold border-b-2 border-primary pb-0.5">Commits</a>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-primary/20 flex items-center justify-center text-primary font-bold">
            {owner.substring(0,2).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- Side Navigation Bar --- */}
        <aside className="flex h-full w-64 flex-col justify-between border-r border-gray-200 dark:border-[#232f48] bg-background-light dark:bg-background-dark p-4 shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-10 bg-primary/10 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary text-xl">folder_data</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-medium leading-normal text-gray-900 dark:text-white">{repo}</h1>
                <p className="text-sm font-normal leading-normal text-gray-500 dark:text-[#92a4c9]">{owner}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-4">
              <a onClick={onShowIDE} className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#232f48] hover:text-gray-900 dark:hover:text-white">
                <span className="material-symbols-outlined text-xl">code</span>
                <p className="text-sm font-medium leading-normal">Files (IDE)</p>
              </a>
              <a className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 dark:bg-[#232f48] text-primary dark:text-white">
                <span className="material-symbols-outlined text-xl">history</span>
                <p className="text-sm font-medium leading-normal">Commits</p>
              </a>
            </div>
            
            {/* Visible Branch List in Sidebar */}
            <div className="mt-6">
                <div className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Branches</div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {branches.map(b => (
                        <a 
                            key={b} 
                            onClick={() => handleSwitchBranch(b)}
                            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${b === currentBranch ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-sm">hub</span>
                            {b}
                        </a>
                    ))}
                </div>
            </div>
          </div>
        </aside>

        {/* --- Main Content Area --- */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-panel-dark">
          
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-[#232f48] px-4 py-2 shrink-0">
            <div className="flex items-center gap-2 relative">
              {/* Branch Dropdown Trigger */}
              <button 
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-[#232f48] px-3 hover:bg-gray-200 dark:hover:bg-[#2d3b55] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">hub</span>
                <p className="text-sm font-medium leading-normal text-gray-800 dark:text-white">Branch: {currentBranch}</p>
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>

              {/* Branch Dropdown Menu */}
              {isBranchDropdownOpen && (
                  <div className="absolute top-10 left-0 w-64 bg-white dark:bg-[#1e293b] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                          <input 
                            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded px-2 py-1 text-sm text-gray-800 dark:text-white focus:ring-1 focus:ring-primary" 
                            placeholder="Filter branches..."
                            onClick={(e) => e.stopPropagation()}
                          />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {branches.map(b => (
                            <button 
                                key={b}
                                onClick={() => handleSwitchBranch(b)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">hub</span>
                                    {b}
                                </span>
                                {b === currentBranch && <span className="material-symbols-outlined text-sm text-primary">check</span>}
                            </button>
                        ))}
                      </div>
                  </div>
              )}
            </div>
            
            <div className="flex gap-2">
               {isLoading && <span className="text-sm text-gray-400 flex items-center mr-4">Refreshing...</span>}
               <button 
                 onClick={() => loadData()}
                 className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-blue-600 transition-colors"
                >
                <span className="material-symbols-outlined text-lg">refresh</span>
                <span className="truncate">Fetch</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            
            {/* Commit Log List */}
            <div className="flex flex-1 flex-col overflow-y-auto border-r border-gray-200 dark:border-[#232f48]">
              
              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-[#232f48]">
                <label className="flex flex-col min-w-40 h-11 w-full">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                    <div className="text-gray-400 dark:text-[#92a4c9] flex border-none bg-gray-100 dark:bg-[#232f48] items-center justify-center pl-4 rounded-l-lg border-r-0">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input 
                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-800 dark:text-white focus:outline-0 focus:ring-0 border-none bg-gray-100 dark:bg-[#232f48] focus:border-none h-full placeholder:text-gray-400 dark:placeholder:text-[#92a4c9] px-4 pl-2 text-base font-normal leading-normal" 
                        placeholder="Filter commits..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                </label>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-0">
                {log.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">No commits found for <strong>{currentBranch}</strong></div>
                ) : (
                    log.filter(e => e.commit.message.toLowerCase().includes(filter.toLowerCase())).map((entry, idx) => {
                        const isSelected = selectedCommit?.oid === entry.oid;
                        const isLast = idx === log.length - 1;
                        
                        return (
                            <div 
                                key={entry.oid} 
                                onClick={() => setSelectedCommit(entry)}
                                className={`flex items-start gap-4 p-2 rounded-lg cursor-pointer transition-all group ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                            >
                                {/* Visual Graph Rail */}
                                <div className="relative pt-1.5 px-1">
                                    {!isLast && <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-[-20px] w-0.5 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600"></div>}
                                    <div className={`relative z-10 size-3 rounded-full ring-4 ring-white dark:ring-panel-dark ${getAuthorColor(entry.commit.author.name)}`}></div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-gray-900 dark:text-white truncate pr-2">{entry.commit.message}</p>
                                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{entry.oid.substring(0,7)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        <div className={`size-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${getAuthorColor(entry.commit.author.name)}`}>
                                            {entry.commit.author.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{entry.commit.author.name}</span>
                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                        <span>{formatRelativeTime(entry.commit.author.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
              </div>
            </div>

            {/* --- Right Details Panel --- */}
            {selectedCommit && (
                <aside className="w-96 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#151b28]">
                    <div className="p-4 border-b border-gray-200 dark:border-[#232f48]">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Commit Details</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-6">
                        {/* Message */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message</p>
                            <p className="mt-2 text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-white dark:bg-[#1e293b] p-3 rounded border border-gray-200 dark:border-gray-700">
                                {selectedCommit.commit.message}
                            </p>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hash</p>
                                <p className="font-mono text-sm text-gray-700 dark:text-gray-300 mt-1 select-all">{selectedCommit.oid}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{new Date(selectedCommit.commit.author.timestamp * 1000).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Author */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Author</p>
                            <div className="flex items-center gap-3 mt-2 bg-white dark:bg-[#1e293b] p-3 rounded border border-gray-200 dark:border-gray-700">
                                <div className={`size-8 rounded-full flex items-center justify-center text-sm text-white font-bold ${getAuthorColor(selectedCommit.commit.author.name)}`}>
                                    {selectedCommit.commit.author.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedCommit.commit.author.name}</p>
                                    <p className="text-xs text-gray-500">{selectedCommit.commit.author.email}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div className="p-4 border-t border-gray-200 dark:border-[#232f48] bg-white dark:bg-[#1e293b]">
                        <button
                            onClick={onShowIDE}
                            className="w-full flex items-center justify-center gap-2 rounded-lg h-9 bg-primary text-white text-sm font-bold hover:bg-blue-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">code</span>
                            Browse Files
                        </button>
                    </div>
                </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}