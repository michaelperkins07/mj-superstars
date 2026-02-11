// ==========================================================
// Top Performer - Main App Component
// Handles navigation between Auth, Onboarding, and Main App
// ==========================================================
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { lazyWithPreload, LoadingFallback } from './utils/performance';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import ChatScreen from './components/screens/ChatScreen';
import Icons from './components/shared/Icons';
import { init as initErrorTracking, SentryErrorBoundary } from './services/errorTracking';
import { initSubscription } from './services/subscription';
import { ToastProvider } from './components/shared/Toast';
import { NotificationPermissionModal } from './components/NotificationPermission';
import FeatureTour from './components/FeatureTour';
import { applyDeepLink } from './services/deepLinkRouter';

// Lazy-loaded screens (not needed on initial render)
const MoodScreen = lazyWithPreload(() => import('./components/screens/MoodScreen'));
const TasksScreen = lazyWithPreload(() => import('./components/screens/TasksScreen'));
const JournalScreen = lazyWithPreload(() => import('./components/screens/JournalScreen'));
const ExploreScreen = lazyWithPreload(() => import('./components/screens/ExploreScreen'));
const InsightsScreen = lazyWithPreload(() => import('./components/screens/InsightsScreen'));
const RitualsScreen = lazyWithPreload(() => import('./components/screens/RitualsScreen'));
const ProfileScreen = lazyWithPreload(() => import('./components/screens/ProfileScreen'));
const GamificationScreen = lazyWithPreload(() => import('./components/screens/GamificationScreen'));
const CommitmentsScreen = lazyWithPreload(() => import('./components/screens/CommitmentsScreen'));
const TrackerScreen = lazyWithPreload(() => import('./components/screens/TrackerScreen'));

// ==========================================================
// MAIN APP COMPONENT
// ==========================================================
function MJSuperstars() {
  const { isAuthenticated, profile, loading, user, setProfile, completeOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');

  // First-run flow state: notification prompt → feature tour
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const justOnboardedRef = useRef(false);

  useEffect(() => {
    initErrorTracking();
    initSubscription();

    // Listen for cross-screen navigation events (e.g., from ChatScreen upgrade prompt)
    const handleNavigate = (e) => setActiveTab(e.detail);
    window.addEventListener('mj-navigate', handleNavigate);

    // Listen for feature tour replay from ProfileScreen
    const handleShowTour = () => setShowFeatureTour(true);
    window.addEventListener('mj-show-tour', handleShowTour);

    return () => {
      window.removeEventListener('mj-navigate', handleNavigate);
      window.removeEventListener('mj-show-tour', handleShowTour);
    };
  }, []);

  // Handler for "Continue without account" - creates a guest profile
  const handleSkipAuth = () => {
    const guestProfile = {
      id: 'guest_' + Date.now(),
      name: 'Friend',
      isGuest: true,
      onboardingComplete: false,
      createdAt: new Date().toISOString()
    };
    setProfile(guestProfile);
  };

  // Handler for successful login/register
  const handleAuthSuccess = () => {
    console.log('Auth successful');
  };

  // Handler for onboarding completion
  const handleOnboardingComplete = async (onboardingData) => {
    try {
      await completeOnboarding(onboardingData);
      justOnboardedRef.current = true;
    } catch (err) {
      console.error('Onboarding sync error:', err);
    }
  };

  // Trigger first-run flow after onboarding completes
  useEffect(() => {
    if (justOnboardedRef.current && (profile?.onboarding_completed || profile?.onboardingComplete || user?.onboarding_completed)) {
      justOnboardedRef.current = false;
      // Short delay so the main app renders first
      const timer = setTimeout(() => {
        const alreadyPrompted = localStorage.getItem('mj_notification_prompted');
        if (!alreadyPrompted) {
          setShowNotifPrompt(true);
        } else {
          const tourSeen = localStorage.getItem('mj_feature_tour_seen');
          if (!tourSeen) setShowFeatureTour(true);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [profile, user]);

  // Apply any pending deep link navigation on first render
  useEffect(() => {
    applyDeepLink();
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 animate-pulse">
            TP
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password reset screen if URL contains reset token
  const isResetPasswordUrl = window.location.pathname.includes('reset-password') &&
    new URLSearchParams(window.location.search).get('token');

  if (isResetPasswordUrl) {
    return <AuthScreen onSkip={handleSkipAuth} onSuccess={handleAuthSuccess} showSkip={false} />;
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onSkip={handleSkipAuth} onSuccess={handleAuthSuccess} />;
  }

  // Show onboarding if not completed
  const onboardingComplete = profile?.onboarding_completed || profile?.onboardingComplete || user?.onboarding_completed;

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Main App with Tab Navigation
  const tabs = [
    { id: 'chat', label: 'Chat', icon: Icons.Chat },
    { id: 'commitments', label: '3 Pillars', icon: Icons.Pillars },
    { id: 'tracker', label: 'Check-In', icon: Icons.Tracker },
    { id: 'explore', label: 'Explore', icon: Icons.Explore },
    { id: 'journal', label: 'Journal', icon: Icons.Journal },
    { id: 'insights', label: 'Insights', icon: Icons.Insights },
    { id: 'profile', label: 'Profile', icon: Icons.Profile },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'chat': return <ChatScreen />;
      case 'commitments': return <CommitmentsScreen />;
      case 'tracker': return <TrackerScreen onNavigateTo={(tab) => setActiveTab(tab)} />;
      case 'mood': return <MoodScreen onNavigateTo={(tab) => setActiveTab(tab)} />;
      case 'rituals': return <RitualsScreen onNavigateTo={(tab) => setActiveTab(tab)} />;
      case 'explore': return <ExploreScreen onNavigateTo={(tab) => setActiveTab(tab)} />;
      case 'tasks': return <TasksScreen />;
      case 'journal': return <JournalScreen />;
      case 'insights': return <InsightsScreen onNavigateTo={(tab) => setActiveTab(tab)} />;
      case 'gamification': return <GamificationScreen onBack={() => setActiveTab('explore')} />;
      case 'profile': return <ProfileScreen />;
      default: return <ChatScreen />;
    }
  };

  return (
    <SentryErrorBoundary>
      <ToastProvider>
      <div className="bg-slate-900 flex flex-col" style={{ height: '100dvh', height: '100vh', maxHeight: '-webkit-fill-available' }}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <Suspense fallback={<LoadingFallback />}>
          {renderScreen()}
        </Suspense>
      </div>

      {/* Bottom Tab Bar — fixed to bottom with safe area padding */}
      <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur border-t border-slate-700/50 px-2 pb-safe">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* First-run flow: Notification Permission → Feature Tour */}
      {showNotifPrompt && (
        <NotificationPermissionModal
          onClose={() => {
            setShowNotifPrompt(false);
            const tourSeen = localStorage.getItem('mj_feature_tour_seen');
            if (!tourSeen) {
              setTimeout(() => setShowFeatureTour(true), 400);
            }
          }}
        />
      )}

      {showFeatureTour && (
        <FeatureTour onComplete={() => setShowFeatureTour(false)} />
      )}
    </div>
    </ToastProvider>
    </SentryErrorBoundary>
  );
}

export default MJSuperstars;