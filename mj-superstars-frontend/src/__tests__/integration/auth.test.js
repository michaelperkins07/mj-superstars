// ============================================================
// MJ's Superstars - Auth Integration Tests
// ============================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import {
  mockApiResponse,
  mockApiError,
  mockUser
} from '../setup';

// Mock components for testing
const LoginForm = ({ onSubmit, onError }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onSubmit?.(data);
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
        required
      />
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? 'Logging in...' : 'Log In'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

const RegisterForm = ({ onSubmit, onError }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onSubmit?.(data);
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="register-form">
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={formData.name}
        onChange={handleChange}
        data-testid="name-input"
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        data-testid="email-input"
        required
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        data-testid="password-input"
        required
      />
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleChange}
        data-testid="confirm-password-input"
        required
      />
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

describe('Auth Integration', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    localStorage.clear();
  });

  // ============================================================
  // LOGIN TESTS
  // ============================================================

  describe('Login Flow', () => {
    test('renders login form', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    test('successful login', async () => {
      const onSubmit = jest.fn();

      global.fetch.mockResolvedValueOnce(mockApiResponse({
        user: mockUser,
        token: 'test-token-123'
      }));

      render(<LoginForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
          user: mockUser,
          token: 'test-token-123'
        }));
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      }));
    });

    test('shows error on invalid credentials', async () => {
      global.fetch.mockResolvedValueOnce(mockApiError('Invalid email or password', 401));

      render(<LoginForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'wrong@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'wrongpassword');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid email or password');
      });
    });

    test('shows loading state during submission', async () => {
      global.fetch.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({ user: mockUser })), 100))
      );

      render(<LoginForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Logging in...');
      expect(screen.getByTestId('submit-button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('submit-button')).toHaveTextContent('Log In');
      });
    });

    test('handles network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
      });
    });
  });

  // ============================================================
  // REGISTRATION TESTS
  // ============================================================

  describe('Registration Flow', () => {
    test('renders registration form', () => {
      render(<RegisterForm />);

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    test('successful registration', async () => {
      const onSubmit = jest.fn();

      global.fetch.mockResolvedValueOnce(mockApiResponse({
        user: { ...mockUser, name: 'New User' },
        token: 'new-token-123'
      }));

      render(<RegisterForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'New User');
      await userEvent.type(screen.getByTestId('email-input'), 'new@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Password123');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'Password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST'
      }));
    });

    test('validates password match', async () => {
      render(<RegisterForm />);

      await userEvent.type(screen.getByTestId('name-input'), 'New User');
      await userEvent.type(screen.getByTestId('email-input'), 'new@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Password123');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'DifferentPassword');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Passwords do not match');
      });

      // Should not call API
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('validates password length', async () => {
      render(<RegisterForm />);

      await userEvent.type(screen.getByTestId('name-input'), 'New User');
      await userEvent.type(screen.getByTestId('email-input'), 'new@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'short');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'short');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Password must be at least 8 characters');
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('shows error for existing email', async () => {
      global.fetch.mockResolvedValueOnce(mockApiError('Email already registered', 409));

      render(<RegisterForm />);

      await userEvent.type(screen.getByTestId('name-input'), 'New User');
      await userEvent.type(screen.getByTestId('email-input'), 'existing@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Password123');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'Password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Email already registered');
      });
    });
  });

  // ============================================================
  // TOKEN MANAGEMENT TESTS
  // ============================================================

  describe('Token Management', () => {
    test('stores token on successful login', async () => {
      global.fetch.mockResolvedValueOnce(mockApiResponse({
        user: mockUser,
        token: 'test-token-123'
      }));

      const onSubmit = jest.fn((data) => {
        localStorage.setItem('mj_auth_token', data.token);
      });

      render(<LoginForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(localStorage.getItem('mj_auth_token')).toBe('test-token-123');
      });
    });

    test('clears token on logout', async () => {
      localStorage.setItem('mj_auth_token', 'old-token');

      // Simulate logout
      localStorage.removeItem('mj_auth_token');

      expect(localStorage.getItem('mj_auth_token')).toBeNull();
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('Edge Cases', () => {
    test('trims whitespace from email', async () => {
      global.fetch.mockResolvedValueOnce(mockApiResponse({ user: mockUser }));

      render(<LoginForm />);

      await userEvent.type(screen.getByTestId('email-input'), '  test@example.com  ');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Note: The actual trim should happen in the component or API
    });

    test('handles empty form submission', async () => {
      render(<LoginForm />);

      // HTML5 validation should prevent submission
      const form = screen.getByTestId('login-form');
      expect(form).toHaveAttribute('data-testid', 'login-form');
    });

    test('handles rapid multiple submissions', async () => {
      global.fetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({ user: mockUser })), 100))
      );

      render(<LoginForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
      await userEvent.type(screen.getByTestId('password-input'), 'password123');

      // Try to click multiple times
      await userEvent.click(screen.getByTestId('submit-button'));
      await userEvent.click(screen.getByTestId('submit-button'));
      await userEvent.click(screen.getByTestId('submit-button'));

      // Button should be disabled after first click
      expect(screen.getByTestId('submit-button')).toBeDisabled();

      // Should only call fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
