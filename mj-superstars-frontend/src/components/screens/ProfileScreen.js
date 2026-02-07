// ============================================================
// MJ's Superstars - Profile Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ProgressAPI, GuestAPI, TokenManager } from '../../services/api';
import { Fire, Logout } from '../shared/Icons';

function ProfileScreen() {
  const { user, profile, logout, login } = useAuth();
  const [streaks, setStreaks] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const isGuest = !TokenManager.isAuthenticated();

  useEffect(() => {
    const loadProgress = async () => {
      if (isGuest) {
        const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
        const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
        const journal = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
        setStreaks([
          { streak_type: 'mood_check_ins', current_streak: moods.length },
          { streak_type: 'tasks_completed', current_streak: tasks.filter(t => t.status === 'completed').length },
          { streak_type: 'journal_entries', current_streak: journal.length }
        ]);
        return;
      }
      try {
        const response = await ProgressAPI.getStreaks();
        setStreaks(response.streaks || response || []);
      } catch (err) {
        console.error('Failed to load streaks:', err);
      }
    };
    loadProgress();
  }, []);

  const displayName = profile?.display_name || profile?.name || user?.display_name || user?.email?.split('@')[0] || 'User';

  const gatherGuestData = () => {
    const conversations = JSON.parse(localStorage.getItem('mj_conversations') || '[]');
    const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
    const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
    const journalEntries = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
    const profileData = JSON.parse(localStorage.getItem('mj_user_profile') || '{}');

    return {
      conversations,
      moods,
      tasks,
      journal_entries: journalEntries,
      profile: profileData,
      streaks: {
        current_streak: moods.length > 0 ? 1 : 0,
        longest_streak: moods.length > 0 ? 1 : 0,
        total_completions: moods.length
      }
    };
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    setUpgradeError('');

    if (upgradeForm.password !== upgradeForm.confirmPassword) {
      setUpgradeError('Passwords do not match');
      return;
    }
    if (upgradeForm.password.length < 8) {
      setUpgradeError('Password must be at least 8 characters');
      return;
    }

    setUpgradeLoading(true);
    try {
      const guestData = gatherGuestData();
      const response = await GuestAPI.migrateToAccount(
        upgradeForm.email,
        upgradeForm.password,
        displayName,
        guestData
      );

      setUpgradeSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setUpgradeError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
          {displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-slate-400 text-sm">{user?.email || profile?.email || (isGuest ? 'Guest User' : '')}</p>
        </div>
      </div>

      {isGuest && !showUpgrade && !upgradeSuccess && (
        <div className="bg-gradient-to-r from-sky-900/60 to-violet-900/60 border border-sky-500/30 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-1">Save your progress</h2>
          <p className="text-slate-300 text-sm mb-4">
            Create a free account to keep your chats, moods, and tasks safe across devices.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Create Free Account
          </button>
        </div>
      )}

      {isGuest && showUpgrade && !upgradeSuccess && (
        <div className="bg-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Create Your Account</h2>
          <form onSubmit={handleUpgrade} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={upgradeForm.email}
              onChange={e => setUpgradeForm({ ...upgradeForm, email: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={upgradeForm.password}
              onChange={e => setUpgradeForm({ ...upgradeForm, password: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              required
              minLength={8}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={upgradeForm.confirmPassword}
              onChange={e => setUpgradeForm({ ...upgradeForm, confirmPassword: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            {upgradeError && (
              <p className="text-red-400 text-sm">{upgradeError}</p>
            )}
            <button
              type="submit"
              disabled={upgradeLoading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white font-semibold rounded-xl py-3 transition-colors"
            >
              {upgradeLoading ? 'Creating account...' : 'Create Account & Save Data'}
            </button>
            <button
              type="button"
              onClick={() => setShowUpgrade(false)}
              className="w-full text-slate-400 text-sm py-2"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {upgradeSuccess && (
        <div className="bg-green-900/40 border border-green-500/30 rounded-2xl p-5 mb-6 text-center">
          <p className="text-green-400 font-semibold text-lg mb-1">Account Created!</p>
          <p className="text-slate-300 text-sm">Your data has been saved. Refreshing...</p>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Fire /> Streaks
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {streaks && Array.isArray(streaks) && streaks.map((streak, i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{streak.current_streak || 0}</p>
              <p className="text-xs text-slate-400 capitalize mt-1">
                {(streak.streak_type || '').replace(/_/g, ' ')}
              </p>
            </div>
          ))}
          {(!streaks || streaks.length === 0) && (
            <p className="text-slate-500 text-sm col-span-2 text-center py-2">Start building your streaks!</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {!isGuest && (
          <button
            onClick={logout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors"
          >
            <Logout />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        )}
      </div>

      <p className="text-center text-slate-600 text-xs mt-8">
        White Mike v1.0.0
      </p>
    </div>
  );
}

export default ProfileScreen;
