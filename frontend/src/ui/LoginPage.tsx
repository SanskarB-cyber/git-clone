import React, { useState } from 'react';
import { signUp, signIn } from '../lib/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (!username) {
          setError('Username is required for sign up');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const result = await signUp(email, password, username);
        if ('error' in result && result.error) {
          setError(String(result.error));
        } else {
          setSuccess('Account created successfully! Signing in...');
          setTimeout(() => {
            onLoginSuccess();
          }, 1500);
        }
      } else {
        const result = await signIn(email, password);
        if ('error' in result && result.error) {
          setError(String(result.error));
        } else {
          setSuccess('Logged in successfully!');
          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAuth();
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex justify-center items-center font-display p-5 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-30%] left-[-20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.06)_0%,transparent_70%)] rounded-full pointer-events-none" />

      <div className="bg-panel-dark rounded-2xl p-12 shadow-2xl w-full max-w-[480px] relative z-10 border border-border-dark">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-3xl">data_object</span>
            </div>
          </div>
          <h1 className="text-center text-white mb-2 text-3xl font-bold tracking-tight">
            Welcome to GitTogether
          </h1>
          <p className="text-center text-gray-400 text-sm">
            {isSignUp ? 'Create your GitTogether account' : 'Sign in to your account'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-8 gap-0 bg-surface-dark p-1 rounded-xl">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-3 px-4 rounded-lg cursor-pointer text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              !isSignUp
                ? 'bg-background-dark text-white font-bold shadow-md'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-3 px-4 rounded-lg cursor-pointer text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              isSignUp
                ? 'bg-background-dark text-white font-bold shadow-md'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-5 text-sm border border-red-500/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 text-green-400 p-4 rounded-xl mb-5 text-sm border border-green-500/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-5">
          <label className="block text-gray-300 font-semibold mb-2 text-sm">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="you@example.com"
            className="w-full py-3 px-4 border-2 border-border-dark rounded-xl text-sm bg-surface-dark text-white placeholder-gray-500 transition-all duration-300 focus:border-primary focus:bg-background-dark focus:outline-none"
          />
        </div>

        {/* Username Input (Sign Up Only) */}
        {isSignUp && (
          <div className="mb-5">
            <label className="block text-gray-300 font-semibold mb-2 text-sm">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="your-username"
              className="w-full py-3 px-4 border-2 border-border-dark rounded-xl text-sm bg-surface-dark text-white placeholder-gray-500 transition-all duration-300 focus:border-primary focus:bg-background-dark focus:outline-none"
            />
          </div>
        )}

        {/* Password Input */}
        <div className="mb-7">
          <label className="block text-gray-300 font-semibold mb-2 text-sm">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="••••••••"
            className="w-full py-3 px-4 border-2 border-border-dark rounded-xl text-sm bg-surface-dark text-white placeholder-gray-500 transition-all duration-300 focus:border-primary focus:bg-background-dark focus:outline-none"
          />
          {isSignUp && (
            <p className="text-xs text-gray-500 mt-2">
              Minimum 6 characters for security
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAuth}
          disabled={loading}
          className={`w-full py-4 px-4 rounded-xl text-base font-bold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 ${
            loading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5'
          }`}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              {isSignUp ? 'Creating Account...' : 'Signing In...'}
            </>
          ) : isSignUp ? (
            <>
              <span className="material-symbols-outlined text-lg">person_add</span>
              Create Account
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">login</span>
              Sign In
            </>
          )}
        </button>

        {/* Toggle Auth Mode */}
        <p className="text-center text-gray-400 text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="bg-transparent border-none text-primary cursor-pointer font-bold text-sm transition-all duration-200 hover:text-purple-400 hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
