// Updated DashboardNew component rewritten to match the provided UI design
// NOTE: Replace your existing DashboardNew.tsx with this file. Tailwind + structure fully redesigned.

import React, { useEffect, useState } from "react";
import { signOut } from "../lib/supabaseClient";

interface Commit {
  id: string;
  sha: string;
  message: string;
  author_name: string;
  author_email: string;
  created_at: string;
  relativeTime?: string;
  filename?: string;
  branch?: string;
}

interface DashboardNewProps {
  owner: string;
  repo: string;
  userId?: string;
  userEmail?: string;
  onOpenIDE: () => void;
  onLogout: () => void;
}

export default function DashboardNew({ owner, repo, userId, onOpenIDE, onLogout }: DashboardNewProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchCommits() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/log?owner_id=${encodeURIComponent(userId || "")}`);
      const data = await res.json();
      if (data.ok && data.log) {
        const formatted = data.log.map((c: any) => {
          const commitDate = new Date(c.created_at);
          const now = new Date();
          const diffMs = now.getTime() - commitDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let relativeTime = "just now";
          if (diffMins > 0) relativeTime = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
          if (diffHours > 0) relativeTime = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
          if (diffDays > 0) relativeTime = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

          return {
            id: c.id || c.sha?.substring(0, 7),
            sha: c.sha?.substring(0, 7) || "unknown",
            message: c.message || "No message",
            author_name: c.author_name || "Unknown",
            author_email: c.author_email || "unknown@example.com",
            created_at: commitDate.toLocaleString(),
            relativeTime,
            filename: c.filename || undefined,
            branch: selectedBranch
          };
        });
        setCommits(formatted);
        if (formatted.length > 0) setSelectedCommit(formatted[0]);
      }
    } catch (e) {
      setError("Failed to load commits");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBranches() {
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/branches?owner_id=${encodeURIComponent(userId || "")}`);
      const data = await res.json();
      if (data.ok && data.branches) setBranches(data.branches);
    } catch {}
  }

  useEffect(() => {
    fetchBranches();
    fetchCommits();
  }, [owner, repo, userId]);

  const filtered = commits.filter(c =>
    c.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sha.includes(searchTerm)
  );

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">

      {/* Top Bar */}
      <header className="flex w-full items-center justify-between border-b border-gray-200 dark:border-[#232f48] px-6 py-3 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-2xl text-primary">data_object</span>
            <h2 className="text-lg font-bold tracking-[-0.015em]">{repo}</h2>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={onOpenIDE} className="text-sm hover:text-primary dark:hover:text-primary">Code</button>
            <a className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary" href="#">Issues</a>
            <a className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary" href="#">Pull Requests</a>
            <a className="text-sm text-gray-800 dark:text-white" href="#">Commits</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-[#232f48] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>

          <button onClick={onLogout} className="h-10 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 dark:border-[#232f48] bg-background-light dark:bg-background-dark p-4 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">
              {repo.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-medium text-gray-900 dark:text-white">{repo}</h1>
              <p className="text-sm text-gray-500">{owner}/{repo}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#232f48]" href="#">
              <span className="material-symbols-outlined">folder</span>
              Files
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 dark:bg-[#232f48] text-primary dark:text-white" href="#">
              <span className="material-symbols-outlined">history</span>
              Commits
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#232f48]" href="#">
              <span className="material-symbols-outlined">account_tree</span>
              Branches
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#232f48]" href="#">
              <span className="material-symbols-outlined">label</span>
              Tags
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-panel-dark">

          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#232f48] px-4 py-3">
            <div className="flex items-center gap-2">
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-gray-100 dark:bg-[#232f48] px-3 py-1 rounded-lg text-sm">
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Commit List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filtered.map((c, i) => (
              <div key={c.id} onClick={() => setSelectedCommit(c)} className={`p-4 rounded-lg border cursor-pointer ${selectedCommit?.id === c.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-gray-100 dark:hover:bg-[#232f48]"}`}>
                <p className="font-semibold">{c.message}</p>
                <p className="text-sm text-gray-500">{c.author_name} — {c.relativeTime}</p>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
