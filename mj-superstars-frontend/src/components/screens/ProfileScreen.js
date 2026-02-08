// ============================================================
// MJ's Superstars - Profile Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ProgressAPI, GuestAPI, TokenManager, EmailPrefsAPI } from '../../services/api';
import { Fire, Logout } from '../shared/Icons';

function ProfileScreen() {
  const { user, profile, logout, login } = useAuth();
  const [streaks, setStreaks] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);
  const [emailPrefsError, setEmailPrefsError] = useState('');
  const isGuest = !TokenManager.isAuthenticated();

  useEffect(() => {
    const loadEmailPrefs = async () => {
      if (!isGuest) {
        try {
          setEmailPrefsLoading(true);
          const prefs = await EmailPrefsAPI.get();
          setEmailPrefs(prefs || {
            weekly_digest: false,
            coaching_nudges: false,
            buddy_sharing: false,
            buddy_email: ''
          });
        } catch (err) {
          console.error('Failed to load email preferences:', err);
          setEmailPrefs({
            weekly_digest: false,
            coaching_nudges: false,
            buddy_sharing: false,
            buddy_email: ''
          });
        } finally {
          setEmailPrefsLoading(false);
        }
      }
    };
    loadEmailPrefs();
  }, [isGuest]);

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

  
  const handleEmailPrefsUpdate = async (key, value) => {
    const updatedPrefs = { ...emailPrefs, [key]: value };
    setEmailPrefs(updatedPrefs);
    
    setEmailPrefsSaving(true);
    setEmailPrefsError('');
    try {
      await EmailPrefsAPI.update(updatedPrefs);
    } catch (err) {
      setEmailPrefsError('Failed to save preferences');
      console.error('Failed to update email preferences:', err);
    } finally {
      setEmailPrefsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      await EmailPrefsAPI.sendTest();
      alert('Test email sent!');
    } catch (err) {
      setEmailPrefsError('Failed to send test email');
      console.error('Failed to send test email:', err);
    }
  };

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

      {!isGuest && (
        <div className="bg-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Email Preferences</h2>
          {emailPrefsError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
              {emailPrefsError}
            </div>
          )}
          
          {emailPrefsLoading ? (
            <p className="text-slate-400 text-sm">Loading preferences...</p>
          ) : emailPrefs ? (
            <div className="space-y-4">
              {/* Weekly Digest Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                <div>
                  <p className="text-white text-sm font-semibold">Weekly Digest</p>
                  <p className="text-slate-400 text-xs">Get a summary of your progress</p>
                </div>
                <button
                  onClick={() => handleEmailPrefsUpdate('weekly_digest', !emailPrefs.weekly_digest)}
                  disabled={emailPrefsSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailPrefs.weekly_digest ? 'bg-sky-500' : 'bg-slate-600'
                  } ${emailPrefsSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPrefs.weekly_digest ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Coaching Nudges Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                <div>
                  <p className="text-white text-sm font-semibold">Coaching Nudges</p>
                  <p className="text-slate-400 text-xs">Helpful reminders to stay consistent</p>
                </div>
                <button
                  onClick={() => handleEmailPrefsUpdate('coaching_nudges', !emailPrefs.coaching_nudges)}
                  disabled={emailPrefsSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailPrefs.coaching_nudges ? 'bg-sky-500' : 'bg-slate-600'
                  } ${emailPrefsSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPrefs.coaching_nudges ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Buddy Sharing Toggle */}
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-semibold">Buddy Sharing</p>
                    <p className="text-slate-400 text-xs">Share updates with an accountability buddy</p>
                  </div>
                  <button
                    onClick={() => handleEmailPrefsUpdate('buddy_sharing', !emailPrefs.buddy_sharing)}
                    disabled={emailPrefsSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      emailPrefs.buddy_sharing ? 'bg-sky-500' : 'bg-slate-600'
                    } ${emailPrefsSaving ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        emailPrefs.buddy_sharing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {emailPrefs.buddy_sharing && (
                  <input
                    type="email"
                    placeholder="Buddy's email address"
                    value={emailPrefs.buddy_email || ''}
                    onChange={e => handleEmailPrefsUpdate('buddy_email', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                )}
              </div>

              <button
                onClick={handleSendTestEmail}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 text-sm font-semibold transition-colors mt-2"
              >
                Send Test Email
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Fire /> Streaks
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(streaks || []).map((streak, i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{streak.current_streak || 0}</p>
              <p className="text-xs text-slate-400 capitalize mt-1">
                {(streak.streak_type || '').replace(/_/g, ' ')}
              </p>
            </div>
          ))}
          {(!(streaks && streaks.length > 0)) && (
            <p className="text-slate-500 text-sm col-span-2 text-center py-2">Start building your streaks!</p>
          )}
        </div>
      </div>

      {/* Legal Documents Section */}
      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-3">Legal</h2>
        <div className="space-y-2">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-center"
          >
            Privacy Policy
          </a>
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-center"
          >
            Terms of Service
          </a>
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
