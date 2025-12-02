// src/ui/RepoSetup.tsx - Step-by-step repo setup workflow
import React, { useState, useEffect } from 'react';

interface RepoSetupProps {
  owner: string;
  userId: string;
  onRepoCreated: (repo: string) => void;
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  created_at: string;
}

export function RepoSetup({ owner, userId, onRepoCreated }: RepoSetupProps) {
  const [step, setStep] = useState<'choice' | 'create' | 'list'>('choice');
  const [newRepoName, setNewRepoName] = useState('');
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch existing repos
  useEffect(() => {
    if (step === 'list') {
      fetchRepos();
    }
  }, [step]);

  async function fetchRepos() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/repos/${owner}?owner_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch repositories');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createRepo() {
    if (!newRepoName.trim()) {
      setError('Repository name is required');
      return;
    }

    if (!owner || !owner.trim()) {
      setError('Owner is required. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/repos/${owner}/${newRepoName}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, name: newRepoName, owner_id: userId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create repository');
      }

      setSuccess(`Repository "${newRepoName}" created successfully!`);
      setTimeout(() => {
        onRepoCreated(newRepoName);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectRepo(repoName: string) {
    setLoading(true);
    setError('');

    try {
      // Initialize the selected repo
      const res = await fetch(`/api/repos/${owner}/${repoName}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: userId }),
      });

      if (!res.ok) throw new Error('Failed to initialize repository');

      onRepoCreated(repoName);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex justify-center items-center font-display p-5">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(99,102,241,0.1)_0%,transparent_70%)] rounded-full" />
        <div className="absolute bottom-[-150px] left-[-150px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)] rounded-full" />
      </div>

      <div className="bg-panel-dark rounded-2xl p-12 shadow-2xl max-w-[550px] w-full relative z-10 border border-border-dark">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl">folder_data</span>
            </div>
          </div>
          <h1 className="text-center text-white mb-2 text-3xl font-bold tracking-tight">
            Repository Setup
          </h1>
          <p className="text-center text-gray-400 text-sm mb-1">
            Welcome to GitTogether
          </p>
          <p className="text-center text-gray-500 text-xs">
            Owner: <span className="font-semibold text-gray-400">{owner}</span>
          </p>
        </div>

        {/* Step: Choice */}
        {step === 'choice' && (
          <div>
            <p className="text-gray-400 mb-8 text-sm text-center">
              Choose how you'd like to get started
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setStep('create')}
                className="w-full py-5 px-6 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span>Create New Repository</span>
              </button>
              <button
                onClick={() => setStep('list')}
                className="w-full py-5 px-6 bg-surface-dark text-gray-200 border-2 border-border-dark rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-background-dark hover:border-gray-600 hover:-translate-y-0.5 flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined text-xl">folder_open</span>
                <span>Select Existing Repository</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Create */}
        {step === 'create' && (
          <div>
            <div className="mb-7">
              <label className="block text-gray-300 font-semibold mb-3 text-sm">
                Repository Name
              </label>
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="my-awesome-project"
                className="w-full py-3 px-4 border-2 border-border-dark rounded-xl text-sm bg-surface-dark text-white placeholder-gray-500 transition-all duration-300 focus:border-primary focus:bg-background-dark focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use lowercase letters, numbers, and hyphens. No spaces.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-5 text-sm border border-red-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 text-green-400 p-4 rounded-xl mb-5 text-sm border border-green-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                {success}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('choice');
                  setNewRepoName('');
                  setError('');
                }}
                className="flex-1 py-3 px-4 bg-surface-dark text-gray-300 border-2 border-border-dark rounded-xl cursor-pointer font-semibold text-sm transition-all duration-300 hover:bg-background-dark"
              >
                Back
              </button>
              <button
                onClick={createRepo}
                disabled={loading}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-purple-500 text-white cursor-pointer hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                    Create Repository
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: List */}
        {step === 'list' && (
          <div>
            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-5 text-sm border border-red-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4 block">progress_activity</span>
                <p className="text-gray-400 text-sm font-medium">
                  Loading your repositories...
                </p>
              </div>
            )}

            {!loading && repos.length === 0 && (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-5xl text-gray-600 mb-4 block">inbox</span>
                <p className="text-gray-300 text-sm font-semibold mb-2">
                  No repositories found
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Create your first repository to get started!
                </p>
                <button
                  onClick={() => setStep('create')}
                  className="py-3 px-6 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl cursor-pointer text-sm font-semibold transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  Create your first repository
                </button>
              </div>
            )}

            {!loading && repos.length > 0 && (
              <div>
                <div className="bg-primary/10 p-4 rounded-xl mb-6 border border-primary/20">
                  <p className="text-primary text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">folder</span>
                    Found {repos.length} repositor{repos.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <div className="flex flex-col gap-3 mb-6 max-h-64 overflow-y-auto">
                  {repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => selectRepo(repo.name)}
                      disabled={loading}
                      className="py-4 px-4 bg-surface-dark text-gray-200 border-2 border-border-dark rounded-xl cursor-pointer text-sm font-medium text-left transition-all duration-200 flex justify-between items-center hover:bg-background-dark hover:border-gray-600 hover:translate-x-1 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-lg">folder</span>
                        <span className="font-semibold">{repo.name}</span>
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(repo.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('choice')}
              className="w-full py-3 px-4 bg-surface-dark text-gray-300 border-2 border-border-dark rounded-xl cursor-pointer font-semibold text-sm transition-all duration-300 hover:bg-background-dark"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
