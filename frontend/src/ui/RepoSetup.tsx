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
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        padding: '20px',
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '48px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
          maxWidth: '550px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          border: '1px solid #f0f0f0',
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}
            >
              📦
            </div>
          </div>
          <h1
            style={{
              textAlign: 'center',
              color: '#1f2937',
              marginBottom: '8px',
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Repository Setup
          </h1>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '15px', marginBottom: '4px' }}>
            Welcome to GitTogether
          </p>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Owner: <span style={{ fontWeight: 600, color: '#6b7280' }}>{owner}</span>
          </p>
        </div>

        {/* Step: Choice */}
        {step === 'choice' && (
          <div>
            <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '15px', textAlign: 'center' }}>
              Choose how you'd like to get started
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setStep('create')}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.2)';
                }}
              >
                <span style={{ fontSize: '20px' }}>✨</span>
                <span>Create New Repository</span>
              </button>
              <button
                onClick={() => setStep('list')}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: '#f9fafb',
                  color: '#1f2937',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#f3f4f6';
                  (e.target as HTMLButtonElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#f9fafb';
                  (e.target as HTMLButtonElement).style.borderColor = '#e5e7eb';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '20px' }}>📂</span>
                <span>Select Existing Repository</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Create */}
        {step === 'create' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#1f2937',
                  fontWeight: 600,
                  marginBottom: '12px',
                  fontSize: '15px',
                }}
              >
                Repository Name
              </label>
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="my-awesome-project"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  background: '#f9fafb',
                  color: '#1f2937',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#6366f1';
                  (e.target as HTMLInputElement).style.background = 'white';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                  (e.target as HTMLInputElement).style.background = '#f9fafb';
                }}
              />
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                Use lowercase letters, numbers, and hyphens. No spaces.
              </p>
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#991b1b',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>❌</span>
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: '#f0fdf4',
                  color: '#166534',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>✅</span>
                {success}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setStep('choice');
                  setNewRepoName('');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#f3f4f6';
                }}
              >
                ← Back
              </button>
              <button
                onClick={createRepo}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? '⏳ Creating...' : '🚀 Create Repository'}
              </button>
            </div>
          </div>
        )}

        {/* Step: List */}
        {step === 'list' && (
          <div>
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#991b1b',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>❌</span>
                {error}
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div
                  style={{
                    fontSize: '32px',
                    marginBottom: '16px',
                    animation: 'spin 2s linear infinite',
                  }}
                >
                  ⏳
                </div>
                <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: 500 }}>
                  Loading your repositories...
                </p>
              </div>
            )}

            {!loading && repos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p style={{ color: '#1f2937', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  No repositories found
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                  Create your first repository to get started!
                </p>
                <button
                  onClick={() => setStep('create')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  ✨ Create your first repository
                </button>
              </div>
            )}

            {!loading && repos.length > 0 && (
              <div>
                <div
                  style={{
                    background: '#f0f9ff',
                    padding: '16px',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    border: '1px solid #e0f2fe',
                  }}
                >
                  <p style={{ color: '#0369a1', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    📦 Found {repos.length} repositor{repos.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => selectRepo(repo.name)}
                      disabled={loading}
                      style={{
                        padding: '16px 18px',
                        background: '#f9fafb',
                        color: '#1f2937',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '15px',
                        fontWeight: 500,
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          (e.target as HTMLButtonElement).style.background = '#f3f4f6';
                          (e.target as HTMLButtonElement).style.borderColor = '#d1d5db';
                          (e.target as HTMLButtonElement).style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          (e.target as HTMLButtonElement).style.background = '#f9fafb';
                          (e.target as HTMLButtonElement).style.borderColor = '#e5e7eb';
                          (e.target as HTMLButtonElement).style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <span style={{ fontWeight: 600 }}>{repo.name}</span>
                      </span>
                      <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {new Date(repo.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('choice')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#f3f4f6';
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
