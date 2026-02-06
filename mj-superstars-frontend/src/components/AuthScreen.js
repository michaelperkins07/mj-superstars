// ============================================================
// MJ's Superstars - Authentication Screen Component
// Login/Register UI that can be integrated into onboarding
// ============================================================

import React, { useState, useCallback } from 'react';
import { useLogin, useRegister, useSocialAuth } from '../hooks/useAuth';
import { AuthAPI } from '../services/api';

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

// Social Sign-In Button
function SocialButton({ provider, icon, label, onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 bg-slate-700/80 hover:bg-slate-600 text-white border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <span className="text-xl w-6 text-center">{icon}</span>
      )}
      <span>{label}</span>
    </button>
  );
}

// Social Sign-In Buttons Group
function SocialSignInButtons({ onSuccess }) {
  const { signInWithApple, signInWithGoogle, signInWithX, signInWithInstagram, error, loading } = useSocialAuth();
  const [activeProvider, setActiveProvider] = useState(null);

  const handleAppleSignIn = useCallback(async () => {
    setActiveProvider('apple');
    try {
      // Apple Sign In via native bridge (Capacitor) or web fallback
      if (window.Capacitor?.isNativePlatform?.() && window.SignInWithApple) {
        const result = await window.SignInWithApple.authorize({
          clientId: 'com.mjsuperstars.app',
          redirectURI: window.location.origin,
          scopes: 'email name'
        });
        const response = await signInWithApple(result.response);
        if (response && onSuccess) onSuccess();
      } else {
        // Web fallback — Apple JS SDK
        if (window.AppleID) {
          const data = await window.AppleID.auth.signIn();
          const response = await signInWithApple({
            identityToken: data.authorization.id_token,
            authorizationCode: data.authorization.code,
            email: data.user?.email,
            fullName: data.user?.name
          });
          if (response && onSuccess) onSuccess();
        } else {
          alert('Apple Sign In is available on iOS devices. Please use the app to sign in with Apple.');
        }
      }
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        console.error('Apple sign-in error:', err);
      }
    } finally {
      setActiveProvider(null);
    }
  }, [signInWithApple, onSuccess]);

  const handleGoogleSignIn = useCallback(async () => {
    setActiveProvider('google');
    try {
      // Google Sign In via native bridge or web fallback
      if (window.Capacitor?.isNativePlatform?.() && window.GoogleAuth) {
        const result = await window.GoogleAuth.signIn();
        const response = await signInWithGoogle({
          id_token: result.authentication.idToken,
          access_token: result.authentication.accessToken
        });
        if (response && onSuccess) onSuccess();
      } else if (window.google?.accounts?.id) {
        // Google One Tap or button flow (already initialized)
        window.google.accounts.id.prompt(async (notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            alert('Google Sign In popup was blocked. Please allow popups or try another sign-in method.');
          }
        });
        // The callback is set up in the script initialization
      } else {
        alert('Google Sign In is loading. Please try again in a moment.');
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
    } finally {
      setActiveProvider(null);
    }
  }, [signInWithGoogle, onSuccess]);

  const handleXSignIn = useCallback(async () => {
    setActiveProvider('x');
    try {
      // X OAuth will redirect — placeholder for now
      alert('Sign in with X is coming soon! Use email or another provider for now.');
    } catch (err) {
      console.error('X sign-in error:', err);
    } finally {
      setActiveProvider(null);
    }
  }, []);

  const handleInstagramSignIn = useCallback(async () => {
    setActiveProvider('instagram');
    try {
      // Instagram OAuth will redirect — placeholder for now
      alert('Sign in with Instagram is coming soon! Use email or another provider for now.');
    } catch (err) {
      console.error('Instagram sign-in error:', err);
    } finally {
      setActiveProvider(null);
    }
  }, []);

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <SocialButton
        provider="apple"
        icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
        label="Continue with Apple"
        onClick={handleAppleSignIn}
        loading={activeProvider === 'apple'}
        disabled={loading && activeProvider !== 'apple'}
      />

      <SocialButton
        provider="google"
        icon={<svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
        label="Continue with Google"
        onClick={handleGoogleSignIn}
        loading={activeProvider === 'google'}
        disabled={loading && activeProvider !== 'google'}
      />

      <div className="grid grid-cols-2 gap-3">
        <SocialButton
          provider="x"
          icon={<svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
          label="X"
          onClick={handleXSignIn}
          loading={activeProvider === 'x'}
          disabled={loading && activeProvider !== 'x'}
        />
        <SocialButton
          provider="instagram"
          icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>}
          label="Instagram"
          onClick={handleInstagramSignIn}
          loading={activeProvider === 'instagram'}
          disabled={loading && activeProvider !== 'instagram'}
        />
      </div>
    </div>
  );
}

// Divider with text
function Divider({ text }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-slate-700"></div>
      <span className="text-slate-500 text-sm">{text}</span>
      <div className="flex-1 h-px bg-slate-700"></div>
    </div>
  );
}

// Login Form
function LoginForm({ onSuccess, onSwitchToRegister, onForgotPassword }) {
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useLogin();

  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleSubmit(e);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-slate-400">Sign in to continue your journey</p>
      </div>

      <SocialSignInButtons onSuccess={onSuccess} />

      <Divider text="or sign in with email" />

      <form onSubmit={onSubmit} className="space-y-4">
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

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            Forgot your password?
          </button>
        </div>

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
    </div>
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
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create account</h2>
        <p className="text-slate-400">Start your wellness journey with MJ</p>
      </div>

      <SocialSignInButtons onSuccess={onSuccess} />

      <Divider text="or sign up with email" />

      <form onSubmit={onSubmit} className="space-y-4">
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
    </div>
  );
}

// Forgot Password Form
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-900/40 rounded-full mx-auto flex items-center justify-center">
          <span className="text-3xl">📧</span>
        </div>
        <h2 className="text-xl font-bold text-white">Check Your Email</h2>
        <p className="text-slate-400 text-sm">
          If an account exists with that email, we've sent password reset instructions.
        </p>
        <button
          onClick={onBack}
          className="text-sky-400 hover:text-sky-300 text-sm font-medium"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-slate-400">Enter your email to receive reset instructions</p>
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

      <Button type="submit" loading={loading}>
        Send Reset Link
      </Button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 hover:text-slate-300 text-sm"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
}

// Main Auth Screen
export default function AuthScreen({ onSuccess, onSkip, showSkip = true }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'

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
          {mode === 'login' && (
            <LoginForm
              onSuccess={onSuccess}
              onSwitchToRegister={() => setMode('register')}
              onForgotPassword={() => setMode('forgot')}
            />
          )}
          {mode === 'register' && (
            <RegisterForm
              onSuccess={onSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordForm
              onBack={() => setMode('login')}
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
export { LoginForm, RegisterForm, ForgotPasswordForm, SocialSignInButtons };
