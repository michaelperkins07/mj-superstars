// ============================================================
// MJ's Superstars - Auth Hooks
// React hooks for authentication flows
// ============================================================

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for handling login form
 */
export function useLogin() {
  const { login, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    error: error || authError,
    loading: loading || authLoading,
    handleSubmit,
    reset
  };
}

/**
 * Hook for handling registration form
 */
export function useRegister() {
  const { register, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = useCallback(() => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return false;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  }, [email, password, confirmPassword]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setError(null);

    if (!validate()) return false;

    setLoading(true);
    try {
      await register(email, password, displayName || email.split('@')[0]);
      return true;
    } catch (err) {
      setError(err.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [email, password, displayName, register, validate]);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    displayName,
    setDisplayName,
    error: error || authError,
    loading: loading || authLoading,
    handleSubmit,
    reset,
    validate
  };
}

/**
 * Hook for password change
 */
export function useChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = useCallback(() => {
    if (!currentPassword) {
      setError('Please enter your current password');
      return false;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validate()) return false;

    setLoading(true);
    try {
      const { AuthAPI } = await import('../services/api');
      await AuthAPI.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return true;
    } catch (err) {
      setError(err.message || 'Password change failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, validate]);

  const reset = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  }, []);

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    loading,
    success,
    handleSubmit,
    reset,
    validate
  };
}

/**
 * Hook for social authentication (Apple, Google, X, Instagram)
 */
export function useSocialAuth() {
  const { socialLogin, loading: authLoading, error: authError } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = useCallback(async (provider, providerData) => {
    setError(null);
    setLoading(true);

    try {
      const response = await socialLogin(provider, providerData);
      return response;
    } catch (err) {
      setError(err.message || `${provider} sign-in failed`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [socialLogin]);

  const signInWithApple = useCallback(async (credential) => {
    return handleSocialLogin('apple', {
      id_token: credential.identityToken,
      authorization_code: credential.authorizationCode,
      user: credential.fullName ? {
        email: credential.email,
        name: {
          firstName: credential.fullName.givenName,
          lastName: credential.fullName.familyName
        }
      } : null
    });
  }, [handleSocialLogin]);

  const signInWithGoogle = useCallback(async (credential) => {
    return handleSocialLogin('google', {
      id_token: credential.id_token || credential.credential,
      access_token: credential.access_token
    });
  }, [handleSocialLogin]);

  const signInWithX = useCallback(async (credential) => {
    return handleSocialLogin('x', {
      oauth_token: credential.oauth_token,
      oauth_token_secret: credential.oauth_token_secret,
      user_id: credential.user_id,
      screen_name: credential.screen_name,
      name: credential.name,
      profile_image_url: credential.profile_image_url
    });
  }, [handleSocialLogin]);

  const signInWithInstagram = useCallback(async (credential) => {
    return handleSocialLogin('instagram', {
      access_token: credential.access_token,
      user_id: credential.user_id,
      username: credential.username,
      name: credential.name,
      profile_picture_url: credential.profile_picture_url
    });
  }, [handleSocialLogin]);

  return {
    signInWithApple,
    signInWithGoogle,
    signInWithX,
    signInWithInstagram,
    error: error || authError,
    loading: loading || authLoading
  };
}

export default {
  useLogin,
  useRegister,
  useChangePassword,
  useSocialAuth
};
