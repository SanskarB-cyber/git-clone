// src/ui/App.tsx
import React, { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import { RepoSetup } from './RepoSetup';
import { IDE } from './IDE';
import { History } from './History';
import { getCurrentUser, signOut, onAuthStateChange } from '../lib/supabaseClient';

type AuthUser = { id: string; email: string; username?: string } | null;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [repoInitialized, setRepoInitialized] = useState(false);
  const [showIDE, setShowIDE] = useState(true);
  const [currentBranch, setCurrentBranch] = useState('main'); // Global Branch State

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
    return () => { data?.subscription.unsubscribe(); };
  }, []);

  async function call(path: string, init?: RequestInit) {
    const r = await fetch(path, init);
    if (!r.ok) {
        const txt = await r.text();
        console.error("API Error:", txt);
        throw new Error(txt);
    }
    return r.json();
  }

  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;

  if (!repoInitialized || !repo) {
    return <RepoSetup owner={owner} userId={user?.id || ''} onRepoCreated={(repoName) => {
      setRepo(repoName);
      setRepoInitialized(true);
    }} />;
  }

  if (showIDE) {
    return (
      <IDE
        owner={owner}
        repo={repo}
        userId={user?.id || ''}
        currentBranch={currentBranch}
        onBranchChange={setCurrentBranch}
        onCommit={async (msg) => {
          await call(`/api/repos/${owner}/${repo}/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: msg, 
                author_name: owner, 
                author_email: user?.email || 'user@example.com', 
                owner_id: user?.id,
                branch: currentBranch 
            }),
          });
        }}
        onRefresh={async () => {}}
        onShowHistory={() => setShowIDE(false)}
        onSignOut={async () => {
          await signOut();
          setIsLoggedIn(false);
          setUser(null);
          setRepo('');
          setRepoInitialized(false);
        }}
      />
    );
  }

  return (
    <History
      owner={owner}
      repo={repo}
      userId={user?.id || ''}
      currentBranch={currentBranch}
      onBranchChange={setCurrentBranch} // Pass the handler
      onShowIDE={() => setShowIDE(true)}
    />
  );
}