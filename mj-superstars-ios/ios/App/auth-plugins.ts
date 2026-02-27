/**
 * Apple and Google Sign In Plugin Interfaces
 * 
 * Use these interfaces in your TypeScript/JavaScript code
 * to interact with the native authentication plugins.
 */

// ============================================================
// Apple Sign In
// ============================================================

export interface AppleSignInResponse {
  response: {
    identityToken?: string;
    authorizationCode?: string;
    user: string;
    email?: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
    realUserStatus: 'likelyReal' | 'unknown' | 'unsupported';
  };
}

export interface AppleSignIn {
  /**
   * Authorize with Apple Sign In
   * Opens the Apple Sign In dialog
   */
  authorize(): Promise<AppleSignInResponse>;
}

// ============================================================
// Google Sign In
// ============================================================

export interface GoogleSignInInitOptions {
  clientId: string;
  serverClientId?: string;
}

export interface GoogleSignInResponse {
  response: {
    idToken?: string;
    accessToken: string;
    userId?: string;
    serverAuthCode?: string;
    profile?: {
      email?: string;
      name?: string;
      givenName?: string;
      familyName?: string;
      imageUrl?: string;
    };
  };
}

export interface GoogleSignIn {
  /**
   * Initialize Google Sign In with your client ID
   * Call this before using other methods
   */
  initialize(options: GoogleSignInInitOptions): Promise<void>;

  /**
   * Sign in with Google
   * Opens the Google Sign In dialog
   */
  signIn(): Promise<GoogleSignInResponse>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Restore previous sign in
   * Silently signs in if user was previously signed in
   */
  restorePreviousSignIn(): Promise<GoogleSignInResponse>;

  /**
   * Refresh the access token
   */
  refresh(): Promise<GoogleSignInResponse>;
}

// ============================================================
// Plugin Registration (for Capacitor)
// ============================================================

import { registerPlugin } from '@capacitor/core';

export const SignInWithApple = registerPlugin<AppleSignIn>('SignInWithApple');
export const GoogleSignIn = registerPlugin<GoogleSignIn>('GoogleSignIn');

// ============================================================
// Usage Examples
// ============================================================

/**
 * Example: Apple Sign In
 * 
 * async function signInWithApple() {
 *   try {
 *     const result = await SignInWithApple.authorize();
 *     console.log('Apple Sign In Success:', result);
 *     
 *     // Use result.response.identityToken to verify with your backend
 *     // result.response.email and fullName are only available on first sign-in
 *     
 *     return result;
 *   } catch (error) {
 *     console.error('Apple Sign In Error:', error);
 *     throw error;
 *   }
 * }
 */

/**
 * Example: Google Sign In
 * 
 * async function signInWithGoogle() {
 *   try {
 *     // 1. Initialize (do this once, e.g., in app initialization)
 *     await GoogleSignIn.initialize({
 *       clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
 *     });
 *     
 *     // 2. Sign in
 *     const result = await GoogleSignIn.signIn();
 *     console.log('Google Sign In Success:', result);
 *     
 *     // Use result.response.idToken to verify with your backend
 *     
 *     return result;
 *   } catch (error) {
 *     console.error('Google Sign In Error:', error);
 *     throw error;
 *   }
 * }
 */

/**
 * Example: Restore Previous Sign In (on app launch)
 * 
 * async function restoreSignIn() {
 *   try {
 *     await GoogleSignIn.initialize({
 *       clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
 *     });
 *     
 *     const result = await GoogleSignIn.restorePreviousSignIn();
 *     console.log('User already signed in:', result);
 *     return result;
 *   } catch (error) {
 *     console.log('No previous sign in found');
 *     // User needs to sign in manually
 *     return null;
 *   }
 * }
 */

/**
 * Example: Sign Out
 * 
 * async function signOut() {
 *   try {
 *     await GoogleSignIn.signOut();
 *     console.log('Signed out successfully');
 *   } catch (error) {
 *     console.error('Sign out error:', error);
 *   }
 * }
 */

/**
 * Example: Complete Auth Flow
 * 
 * class AuthService {
 *   async initialize() {
 *     await GoogleSignIn.initialize({
 *       clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
 *     });
 *     
 *     // Try to restore previous sign in
 *     try {
 *       const user = await GoogleSignIn.restorePreviousSignIn();
 *       return user;
 *     } catch {
 *       return null;
 *     }
 *   }
 *   
 *   async signInWithApple() {
 *     const result = await SignInWithApple.authorize();
 *     // Send result.response.identityToken to your backend
 *     return this.verifyWithBackend(result.response.identityToken);
 *   }
 *   
 *   async signInWithGoogle() {
 *     const result = await GoogleSignIn.signIn();
 *     // Send result.response.idToken to your backend
 *     return this.verifyWithBackend(result.response.idToken);
 *   }
 *   
 *   async signOut() {
 *     await GoogleSignIn.signOut();
 *     // Clear your app's auth state
 *   }
 *   
 *   private async verifyWithBackend(token: string) {
 *     // Implement your backend verification
 *     const response = await fetch('https://your-api.com/auth/verify', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ token })
 *     });
 *     return response.json();
 *   }
 * }
 */
