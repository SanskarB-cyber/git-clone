
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
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: 'fixed',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-30%',
          left: '-20%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '56px 48px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
          width: '100%',
          maxWidth: '480px',
          position: 'relative',
          zIndex: 1,
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)',
              }}
            >
              🔐
            </div>
          </div>
          <h1
            style={{
              textAlign: 'center',
              color: '#0f172a',
              marginBottom: '8px',
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
            }}
          >
            Welcome to GitTogether
          </h1>
          <p
            style={{
              textAlign: 'center',
              color: '#64748b',
              fontSize: '15px',
              marginBottom: '0',
            }}
          >
            {isSignUp ? 'Create your GitTogether account' : 'Sign in to your account'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            marginBottom: '32px',
            gap: '0',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
          }}
        >
          <button
            onClick={() => setIsSignUp(false)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: !isSignUp ? 'white' : 'transparent',
              color: !isSignUp ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: !isSignUp ? 700 : 500,
              fontSize: '14px',
              transition: 'all 0.3s ease',
              boxShadow: !isSignUp ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
            }}
          >
            🔑 Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: isSignUp ? 'white' : 'transparent',
              color: isSignUp ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: isSignUp ? 700 : 500,
              fontSize: '14px',
              transition: 'all 0.3s ease',
              boxShadow: isSignUp ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
            }}
          >
            ✨ Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
              color: '#991b1b',
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)',
              color: '#166534',
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px' }}>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Email Input */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              color: '#1e293b',
              fontWeight: 600,
              marginBottom: '10px',
              fontSize: '14px',
            }}
          >
            📧 Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              background: '#f8fafc',
              transition: 'all 0.3s ease',
              color: '#0f172a',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
              (e.target as HTMLInputElement).style.background = 'white';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#e2e8f0';
              (e.target as HTMLInputElement).style.background = '#f8fafc';
            }}
          />
        </div>

        {/* Username Input (Sign Up Only) */}
        {isSignUp && (
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#1e293b',
                fontWeight: 600,
                marginBottom: '10px',
                fontSize: '14px',
              }}
            >
              👤 Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="your-username"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                background: '#f8fafc',
                transition: 'all 0.3s ease',
                color: '#0f172a',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
                (e.target as HTMLInputElement).style.background = 'white';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#e2e8f0';
                (e.target as HTMLInputElement).style.background = '#f8fafc';
              }}
            />
          </div>
        )}

        {/* Password Input */}
        <div style={{ marginBottom: '28px' }}>
          <label
            style={{
              display: 'block',
              color: '#1e293b',
              fontWeight: 600,
              marginBottom: '10px',
              fontSize: '14px',
            }}
          >
            🔒 Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              background: '#f8fafc',
              transition: 'all 0.3s ease',
              color: '#0f172a',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
              (e.target as HTMLInputElement).style.background = 'white';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#e2e8f0';
              (e.target as HTMLInputElement).style.background = '#f8fafc';
            }}
          />
          {isSignUp && (
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', margin: 0 }}>
              💡 Minimum 6 characters for security
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAuth}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: loading
              ? '#cbd5e1'
              : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.3)',
            transform: loading ? 'scale(1)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              {isSignUp ? 'Creating Account...' : 'Signing In...'}
            </span>
          ) : isSignUp ? (
            '✨ Create Account'
          ) : (
            '🚀 Sign In'
          )}
        </button>

        {/* Toggle Auth Mode */}
        <p
          style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '14px',
            marginTop: '24px',
            margin: '24px 0 0 0',
          }}
        >
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = '#8b5cf6';
              (e.target as HTMLButtonElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = '#3b82f6';
              (e.target as HTMLButtonElement).style.textDecoration = 'none';
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
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
