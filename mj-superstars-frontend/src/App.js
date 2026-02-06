// ============================================================
// MJ's Superstars - App Root with Provider Wrappers
// This file wraps the main app with Auth and Data contexts
// ============================================================

import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

// Import the main app component from the full JSX file
// In production, this would be properly split into components
import MJSuperstars from './MJSuperstars';

// Error tracking with Sentry
import { SentryErrorBoundary, errors as sentryErrors } from './services/errorTracking';

// Environment configuration
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
  isDev: process.env.NODE_ENV === 'development'
};

// Error Boundary for graceful error handling (with Sentry integration)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    // Report to Sentry with component stack
    const eventId = sentryErrors.uiError(error, 'AppRoot');
    this.setState({ eventId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md text-center">
            <div className="text-4xl mb-4">😔</div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-400 mb-6">
              MJ hit a bump. Let's try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Refresh App
            </button>
            {this.state.eventId && (
              <p className="mt-4 text-xs text-slate-500">
                Error ID: {this.state.eventId}
              </p>
            )}
            {config.isDev && this.state.error && (
              <pre className="mt-4 text-left text-xs text-red-400 bg-slate-900 p-4 rounded overflow-auto max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network Status Indicator
function NetworkIndicator() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-center py-2 text-sm z-50">
      📡 You're offline. Changes will sync when you reconnect.
    </div>
  );
}

// Main App Component with all providers
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <NetworkIndicator />
          <MJSuperstars />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
