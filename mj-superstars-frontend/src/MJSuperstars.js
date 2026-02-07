// ============================================================
// MJ's Superstars - Main App Component
// Handles navigation between Auth, Onboarding, and Main App
// ============================================================

import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import ChatScreen from './components/screens/ChatScreen';
import MoodScreen from './components/screens/MoodScreen';
import TasksScreen from './components/screens/TasksScreen';
import JournalScreen from './components/screens/JournalScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import Icons from './components/shared/Icons';

// ============================================================
// MAIN APP COMPONENT
// ============================================================

function MJSuperstars() {
  const { isAuthenticated, profile, loading, user, setProfile, completeOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');

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
    } catch (err) {
      console.error('Onboarding sync error:', err);
    }
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 animate-pulse">
            MJ
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
    { id: 'mood', label: 'Mood', icon: Icons.Mood },
    { id: 'tasks', label: 'Tasks', icon: Icons.Tasks },
    { id: 'journal', label: 'Journal', icon: Icons.Journal },
    { id: 'profile', label: 'Profile', icon: Icons.Profile },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'chat': return <ChatScreen />;
      case 'mood': return <MoodScreen />;
      case 'tasks': return <TasksScreen />;
      case 'journal': return <JournalScreen />;
      case 'profile': return <ProfileScreen />;
      default: return <ChatScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col" style={{ height: '100dvh' }}>
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderScreen()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-slate-800/90 backdrop-blur border-t border-slate-700/50 px-2 pb-safe">
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
    </div>
  );
}

export default MJSuperstars;
