// ============================================================
// MJ's Superstars - Authentication Screen Component
// Login/Register UI that can be integrated into onboarding
// ============================================================

import React, { useState } from 'react';
import { useLogin, useRegister } from '../hooks/useAuth';

// Simple input component
function Input({ label, type = 'text', value, onChange, placeholder, error }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-700 focus:ring-sky-500 focus:border-sky-500'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

// Button component
function Button({ children, onClick, loading, disabled, variant = 'primary', className = '' }) {
  const baseStyles = 'w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-sky-600 hover:bg-sky-500 text-white disabled:bg-slate-700 disabled:text-slate-400',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white disabled:bg-slate-800 disabled:text-slate-500',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// Login Form
function LoginForm({ onSuccess, onSwitchToRegister }) {
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useLogin();

  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleSubmit(e);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-slate-400">Sign in to continue your journey</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
      />

      <Button type="submit" loading={loading}>
        Sign In
      </Button>

      <div className="text-center pt-4">
        <span className="text-slate-400">Don't have an account? </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-sky-400 hover:text-sky-300 font-medium"
        >
          Sign up
        </button>
      </div>
    </form>
  );
}

// Register Form
function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    displayName, setDisplayName,
    error, loading, handleSubmit
  } = useRegister();

  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleSubmit(e);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create account</h2>
        <p className="text-slate-400">Start your wellness journey with MJ</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <Input
        label="Name (optional)"
        value={displayName}
        onChange={setDisplayName}
        placeholder="What should MJ call you?"
      />

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
      />

      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="••••••••"
      />

      <Button type="submit" loading={loading}>
        Create Account
      </Button>

      <div className="text-center pt-4">
        <span className="text-slate-400">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sky-400 hover:text-sky-300 font-medium"
        >
          Sign in
        </button>
      </div>
    </form>
  );
}

// Main Auth Screen
export default function AuthScreen({ onSuccess, onSkip, showSkip = true }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-violet-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🌟</span>
          </div>
          <h1 className="text-3xl font-bold text-white">MJ's Superstars</h1>
          <p className="text-slate-400 mt-2">Your daily mental wellness companion</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={onSuccess}
              onSwitchToRegister={() => setMode('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={onSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        {/* Skip Option */}
        {showSkip && (
          <div className="text-center mt-6">
            <button
              onClick={onSkip}
              className="text-slate-500 hover:text-slate-400 text-sm"
            >
              Continue without account →
            </button>
            <p className="text-slate-600 text-xs mt-2">
              Your data will be stored locally
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export individual forms for flexibility
export { LoginForm, RegisterForm };
