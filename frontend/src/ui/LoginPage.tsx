// src/LoginPage.tsx
import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // --- Basic Authentication Logic (FOR DEMO ONLY) ---
    // In a real application, you would send these credentials to a backend
    // and await a response.
    if (username && password) {
      console.log('Attempting login with:', { username, password });
      // Simulate API call delay
      setTimeout(() => {
        // Assume successful login for any non-empty credentials for this demo
        // In reality, you'd check a token or a specific response
        onLoginSuccess();
      }, 500);
    } else {
      setError('Please enter both username and password.');
    }
  };

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#F0F2F5', // Light grey background
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#BAEDD2', // Light Teal/Mint Green from your header
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{
          marginTop: 0,
          color: '#333',
          fontSize: '2em',
          marginBottom: '30px'
        }}>Login to GitTogether <span role="img" aria-label="rocket">🚀</span></h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: '12px 15px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '1em'
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '12px 15px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '1em'
            }}
            required
          />
          {error && <p style={{ color: '#E53935', margin: '-10px 0 0', fontSize: '0.9em' }}>{error}</p>}
          <button
            type="submit"
            style={{
              padding: '15px 25px',
              borderRadius: '10px',
              border: 'none',
              background: '#4CAF50', // Green for login button
              color: 'white',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;