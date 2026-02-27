/**
 * Sample Authentication Component
 * 
 * This file shows how to integrate Apple and Google Sign In
 * into your app. Adapt this code for your framework (React, Vue, Angular, etc.)
 */

import { SignInWithApple, GoogleSignIn } from './auth-plugins';

// ============================================================
// Configuration
// ============================================================

const GOOGLE_CLIENT_ID = 'YOUR-CLIENT-ID.apps.googleusercontent.com';

// ============================================================
// Authentication Service
// ============================================================

class AuthenticationService {
  private isInitialized = false;

  /**
   * Initialize the authentication service
   * Call this when your app starts
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Google Sign In
      await GoogleSignIn.initialize({
        clientId: GOOGLE_CLIENT_ID
      });

      // Try to restore previous Google Sign In
      try {
        const user = await GoogleSignIn.restorePreviousSignIn();
        console.log('User restored:', user);
        // Update your app state with the user
        return user;
      } catch (error) {
        console.log('No previous sign in to restore');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    }
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple() {
    try {
      const result = await SignInWithApple.authorize();
      console.log('Apple Sign In success:', result);

      // Extract the data you need
      const userData = {
        provider: 'apple',
        userId: result.response.user,
        email: result.response.email,
        name: result.response.fullName ? {
          firstName: result.response.fullName.givenName,
          lastName: result.response.fullName.familyName
        } : null,
        token: result.response.identityToken
      };

      // Send to your backend for verification
      await this.verifyWithBackend(userData);

      return userData;
    } catch (error: any) {
      console.error('Apple Sign In failed:', error);
      
      // Handle specific errors
      if (error.code === 'CANCELED') {
        throw new Error('Sign in was cancelled');
      }
      
      throw new Error('Failed to sign in with Apple');
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      const result = await GoogleSignIn.signIn();
      console.log('Google Sign In success:', result);

      // Extract the data you need
      const userData = {
        provider: 'google',
        userId: result.response.userId,
        email: result.response.profile?.email,
        name: {
          firstName: result.response.profile?.givenName,
          lastName: result.response.profile?.familyName,
          fullName: result.response.profile?.name
        },
        photo: result.response.profile?.imageUrl,
        token: result.response.idToken
      };

      // Send to your backend for verification
      await this.verifyWithBackend(userData);

      return userData;
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      // Sign out from Google
      await GoogleSignIn.signOut();
      
      // Clear your app's auth state
      // e.g., clear localStorage, reset state, etc.
      
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshToken() {
    try {
      const result = await GoogleSignIn.refresh();
      console.log('Token refreshed:', result);
      return result.response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Verify token with your backend
   * Replace this with your actual API call
   */
  private async verifyWithBackend(userData: any) {
    // Example API call to your backend
    const response = await fetch('https://your-api.com/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: userData.provider,
        token: userData.token,
        userId: userData.userId
      })
    });

    if (!response.ok) {
      throw new Error('Backend verification failed');
    }

    const data = await response.json();
    
    // Store your session token or JWT
    // localStorage.setItem('authToken', data.sessionToken);
    
    return data;
  }
}

// Create singleton instance
export const authService = new AuthenticationService();

// ============================================================
// React Example Component
// ============================================================

/**
 * React component with sign in buttons
 */

import React, { useState, useEffect } from 'react';

export function LoginComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Initialize on mount
  useEffect(() => {
    authService.initialize()
      .then(user => {
        if (user) {
          setUser(user);
        }
      })
      .catch(err => {
        console.error('Init error:', err);
      });
  }, []);

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = await authService.signInWithApple();
      setUser(userData);
      // Navigate to home screen or update app state
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = await authService.signInWithGoogle();
      setUser(userData);
      // Navigate to home screen or update app state
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (user) {
    return (
      <div className="user-profile">
        <h2>Welcome, {user.name?.firstName || user.email}!</h2>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1>Sign In</h1>
      
      {error && <div className="error">{error}</div>}
      
      <button 
        onClick={handleAppleSignIn}
        disabled={loading}
        className="apple-signin-button"
      >
        {loading ? 'Signing in...' : 'Sign in with Apple'}
      </button>
      
      <button 
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="google-signin-button"
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  );
}

// ============================================================
// Vue 3 Example Component
// ============================================================

/**
 * Vue 3 Composition API component
 */

/*
<template>
  <div class="login-container">
    <div v-if="user" class="user-profile">
      <h2>Welcome, {{ user.name?.firstName || user.email }}!</h2>
      <button @click="handleSignOut">Sign Out</button>
    </div>
    
    <div v-else>
      <h1>Sign In</h1>
      
      <div v-if="error" class="error">{{ error }}</div>
      
      <button 
        @click="handleAppleSignIn"
        :disabled="loading"
        class="apple-signin-button"
      >
        {{ loading ? 'Signing in...' : 'Sign in with Apple' }}
      </button>
      
      <button 
        @click="handleGoogleSignIn"
        :disabled="loading"
        class="google-signin-button"
      >
        {{ loading ? 'Signing in...' : 'Sign in with Google' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authService } from './auth-service';

const loading = ref(false);
const error = ref<string | null>(null);
const user = ref<any>(null);

onMounted(async () => {
  try {
    const restoredUser = await authService.initialize();
    if (restoredUser) {
      user.value = restoredUser;
    }
  } catch (err) {
    console.error('Init error:', err);
  }
});

const handleAppleSignIn = async () => {
  loading.value = true;
  error.value = null;

  try {
    const userData = await authService.signInWithApple();
    user.value = userData;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  loading.value = true;
  error.value = null;

  try {
    const userData = await authService.signInWithGoogle();
    user.value = userData;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleSignOut = async () => {
  try {
    await authService.signOut();
    user.value = null;
  } catch (err) {
    console.error('Sign out error:', err);
  }
};
</script>
*/

// ============================================================
// Angular Example Component
// ============================================================

/**
 * Angular component
 */

/*
import { Component, OnInit } from '@angular/core';
import { authService } from './auth-service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div *ngIf="user" class="user-profile">
        <h2>Welcome, {{ user.name?.firstName || user.email }}!</h2>
        <button (click)="handleSignOut()">Sign Out</button>
      </div>
      
      <div *ngIf="!user">
        <h1>Sign In</h1>
        
        <div *ngIf="error" class="error">{{ error }}</div>
        
        <button 
          (click)="handleAppleSignIn()"
          [disabled]="loading"
          class="apple-signin-button"
        >
          {{ loading ? 'Signing in...' : 'Sign in with Apple' }}
        </button>
        
        <button 
          (click)="handleGoogleSignIn()"
          [disabled]="loading"
          class="google-signin-button"
        >
          {{ loading ? 'Signing in...' : 'Sign in with Google' }}
        </button>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  loading = false;
  error: string | null = null;
  user: any = null;

  async ngOnInit() {
    try {
      const restoredUser = await authService.initialize();
      if (restoredUser) {
        this.user = restoredUser;
      }
    } catch (err) {
      console.error('Init error:', err);
    }
  }

  async handleAppleSignIn() {
    this.loading = true;
    this.error = null;

    try {
      const userData = await authService.signInWithApple();
      this.user = userData;
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async handleGoogleSignIn() {
    this.loading = true;
    this.error = null;

    try {
      const userData = await authService.signInWithGoogle();
      this.user = userData;
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async handleSignOut() {
    try {
      await authService.signOut();
      this.user = null;
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
}
*/

// ============================================================
// Vanilla JavaScript Example
// ============================================================

/**
 * Plain JavaScript implementation
 */

/*
// HTML
<div id="login-container">
  <div id="user-profile" style="display: none;">
    <h2 id="welcome-message"></h2>
    <button id="signout-btn">Sign Out</button>
  </div>
  
  <div id="login-form">
    <h1>Sign In</h1>
    <div id="error-message" style="display: none;"></div>
    <button id="apple-signin-btn">Sign in with Apple</button>
    <button id="google-signin-btn">Sign in with Google</button>
  </div>
</div>

// JavaScript
document.addEventListener('DOMContentLoaded', async () => {
  const appleBtn = document.getElementById('apple-signin-btn');
  const googleBtn = document.getElementById('google-signin-btn');
  const signoutBtn = document.getElementById('signout-btn');
  const errorDiv = document.getElementById('error-message');
  const loginForm = document.getElementById('login-form');
  const userProfile = document.getElementById('user-profile');
  const welcomeMsg = document.getElementById('welcome-message');

  // Initialize
  try {
    const user = await authService.initialize();
    if (user) {
      showUserProfile(user);
    }
  } catch (err) {
    console.error('Init error:', err);
  }

  // Apple Sign In
  appleBtn.addEventListener('click', async () => {
    try {
      appleBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      const user = await authService.signInWithApple();
      showUserProfile(user);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      appleBtn.disabled = false;
    }
  });

  // Google Sign In
  googleBtn.addEventListener('click', async () => {
    try {
      googleBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      const user = await authService.signInWithGoogle();
      showUserProfile(user);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      googleBtn.disabled = false;
    }
  });

  // Sign Out
  signoutBtn.addEventListener('click', async () => {
    try {
      await authService.signOut();
      loginForm.style.display = 'block';
      userProfile.style.display = 'none';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  });

  function showUserProfile(user) {
    welcomeMsg.textContent = `Welcome, ${user.name?.firstName || user.email}!`;
    loginForm.style.display = 'none';
    userProfile.style.display = 'block';
  }
});
*/
