// ============================================================
// MJ's Superstars - Profile Screen (Enhanced)
// Shows onboarding personalization, streaks, settings
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ProgressAPI, GuestAPI, TokenManager, EmailPrefsAPI, UserAPI } from '../../services/api';
import { Fire, Logout } from '../shared/Icons';
import { useHapticsHook } from '../../services/haptics';
import NotificationSettings from '../NotificationSettings';
import { Paywall } from '../Paywall';
import { useSubscription } from '../../services/subscription';

// ============================================================
// CONSTANTS
// ============================================================
const STRUGGLES_MAP = {
  anxiety: { label: 'Anxiety & Worry', emoji: '😰' },
  motivation: { label: 'Staying Motivated', emoji: '😩' },
  confidence: { label: 'Self-Confidence', emoji: '🪞' },
  stress: { label: 'Stress & Burnout', emoji: '🔥' },
  relationships: { label: 'Relationships', emoji: '💔' },
  focus: { label: 'Focus & Discipline', emoji: '🎯' },
  sleep: { label: 'Sleep & Rest', emoji: '😴' },
  emotions: { label: 'Managing Emotions', emoji: '🌊' },
};

const GOALS_MAP = {
  calm: { label: 'Feel Calmer Daily', emoji: '🧘' },
  habits: { label: 'Build Better Habits', emoji: '📈' },
  confidence: { label: 'Boost Confidence', emoji: '💪' },
  mindset: { label: 'Stronger Mindset', emoji: '🧠' },
  health: { label: 'Improve Health', emoji: '❤️' },
  journal: { label: 'Reflect & Journal', emoji: '📓' },
  relationships: { label: 'Better Relationships', emoji: '🤝' },
  growth: { label: 'Personal Growth', emoji: '🌱' },
};

const COMM_STYLES_MAP = {
  real_talk: { label: 'Real Talk', desc: 'Keep it 100 — direct, no sugarcoating', emoji: '🎤' },
  gentle: { label: 'Gentle & Supportive', desc: 'Patient, encouraging, soft approach', emoji: '🤗' },
  coach: { label: 'Coach Mode', desc: 'Push me, hold me accountable', emoji: '🏆' },
  mix: { label: 'Mix It Up', desc: 'Read the room — adapt to what I need', emoji: '🎭' },
};

// ============================================================
// HELPER COMPONENTS
// ============================================================
function SectionCard({ title, icon, children, onEdit, editLabel }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sky-400 text-xs font-medium hover:text-sky-300 transition-colors"
          >
            {editLabel || 'Edit'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({ label, emoji, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-sky-500' : 'bg-slate-600'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ============================================================
// EDIT MODALS
// ============================================================
function EditModal({ title, isOpen, onClose, onSave, saving, children }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="relative bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
          {children}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-3 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
function ProfileScreen() {
  const { user, profile, logout, login, setProfile, updateProfile, updateCommunicationStyle } = useAuth();
  const haptics = useHapticsHook();
  const { isPremium, isOnTrial, daysRemaining, subscription, manage } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
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
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Edit modal states
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingStruggles, setEditingStruggles] = useState(false);
  const [editStruggles, setEditStruggles] = useState([]);
  const [editingGoals, setEditingGoals] = useState(false);
  const [editGoals, setEditGoals] = useState([]);
  const [editingCommStyle, setEditingCommStyle] = useState(false);
  const [editCommStyle, setEditCommStyle] = useState('');
  const [saving, setSaving] = useState(false);

  const isGuest = !TokenManager.isAuthenticated();

  // Derived profile data
  const displayName = profile?.preferred_name || profile?.name || user?.display_name || user?.email?.split('@')[0] || 'User';
  const challenges = profile?.challenges || profile?.struggles || [];
  const goals = profile?.goals || [];
  const commStyle = profile?.communication_preference || profile?.communicationPref || 'mix';

  // Load email prefs
  useEffect(() => {
    if (!isGuest) {
      setEmailPrefsLoading(true);
      EmailPrefsAPI.get()
        .then(prefs => setEmailPrefs(prefs || { weekly_digest: false, coaching_nudges: false, buddy_sharing: false, buddy_email: '' }))
        .catch(() => setEmailPrefs({ weekly_digest: false, coaching_nudges: false, buddy_sharing: false, buddy_email: '' }))
        .finally(() => setEmailPrefsLoading(false));
    }
  }, [isGuest]);

  // Load streaks
  useEffect(() => {
    if (isGuest) {
      const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
      const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
      const journal = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
      setStreaks([
        { streak_type: 'mood_check_ins', current_streak: moods.length },
        { streak_type: 'tasks_completed', current_streak: tasks.filter(t => t.status === 'completed').length },
        { streak_type: 'journal_entries', current_streak: journal.length },
      ]);
    } else {
      ProgressAPI.getStreaks()
        .then(response => setStreaks(response.streaks || response || []))
        .catch(() => {});
    }
  }, [isGuest]);

  // ---- SAVE HANDLERS ----
  const saveProfileField = useCallback(async (updates) => {
    setSaving(true);
    try {
      // Always update local profile
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      localStorage.setItem('mj_user_profile', JSON.stringify(updatedProfile));

      // If authenticated, also push to server
      if (!isGuest) {
        try {
          await UserAPI.updateProfile(updates);
        } catch (err) {
          console.error('Failed to sync profile update:', err);
        }
      }
      haptics.buttonPress();
    } finally {
      setSaving(false);
    }
  }, [profile, setProfile, isGuest, haptics]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) return;
    await saveProfileField({ preferred_name: editName.trim(), name: editName.trim() });
    setEditingName(false);
  }, [editName, saveProfileField]);

  const handleSaveStruggles = useCallback(async () => {
    await saveProfileField({ challenges: editStruggles });
    setEditingStruggles(false);
  }, [editStruggles, saveProfileField]);

  const handleSaveGoals = useCallback(async () => {
    await saveProfileField({ goals: editGoals });
    setEditingGoals(false);
  }, [editGoals, saveProfileField]);

  const handleSaveCommStyle = useCallback(async () => {
    await saveProfileField({ communication_preference: editCommStyle });
    if (!isGuest) {
      try { await updateCommunicationStyle({ style: editCommStyle }); } catch (e) {}
    }
    setEditingCommStyle(false);
  }, [editCommStyle, saveProfileField, isGuest, updateCommunicationStyle]);

  // ---- EMAIL PREFS ----
  const handleEmailPrefsUpdate = async (key, value) => {
    const updatedPrefs = { ...emailPrefs, [key]: value };
    setEmailPrefs(updatedPrefs);
    setEmailPrefsSaving(true);
    setEmailPrefsError('');
    try {
      await EmailPrefsAPI.update(updatedPrefs);
    } catch (err) {
      setEmailPrefsError('Failed to save preferences');
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
    }
  };

  // ---- GUEST UPGRADE ----
  const gatherGuestData = () => {
    const conversations = JSON.parse(localStorage.getItem('mj_conversations') || '[]');
    const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
    const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
    const journalEntries = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
    const profileData = JSON.parse(localStorage.getItem('mj_user_profile') || '{}');
    return {
      conversations, moods, tasks,
      journal_entries: journalEntries,
      profile: profileData,
      streaks: { current_streak: moods.length > 0 ? 1 : 0, longest_streak: moods.length > 0 ? 1 : 0, total_completions: moods.length },
    };
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    setUpgradeError('');
    if (upgradeForm.password !== upgradeForm.confirmPassword) { setUpgradeError('Passwords do not match'); return; }
    if (upgradeForm.password.length < 8) { setUpgradeError('Password must be at least 8 characters'); return; }
    setUpgradeLoading(true);
    try {
      await GuestAPI.migrateToAccount(upgradeForm.email, upgradeForm.password, displayName, gatherGuestData());
      setUpgradeSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setUpgradeError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  // ---- CHIP TOGGLE HELPERS ----
  const toggleItem = (arr, id) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  // ============================================================
  // RENDER
  // ============================================================

  // Sub-view: Notification Settings
  if (showNotificationSettings) {
    return <NotificationSettings onBack={() => setShowNotificationSettings(false)} />;
  }

  // Sub-view: Paywall
  if (showPaywall) {
    return (
      <Paywall
        onClose={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
        trigger="profile"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-500/20">
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-slate-400 text-sm">
            {user?.email || profile?.email || (isGuest ? 'Guest User' : '')}
          </p>
        </div>
        <button
          onClick={() => { setEditName(displayName); setEditingName(true); }}
          className="text-sky-400 text-xs font-medium"
        >
          Edit
        </button>
      </div>

      {/* ---- GUEST UPGRADE ---- */}
      {isGuest && !showUpgrade && !upgradeSuccess && (
        <div className="bg-gradient-to-r from-sky-900/60 to-violet-900/60 border border-sky-500/30 rounded-2xl p-5 mb-4">
          <h2 className="text-white font-semibold mb-1">Save your progress</h2>
          <p className="text-slate-300 text-sm mb-4">Create a free account to keep your data safe across devices.</p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Create Free Account
          </button>
        </div>
      )}
      {isGuest && showUpgrade && !upgradeSuccess && (
        <div className="bg-slate-800 rounded-2xl p-5 mb-4">
          <h2 className="text-white font-semibold mb-4">Create Your Account</h2>
          <form onSubmit={handleUpgrade} className="space-y-3">
            <input type="email" placeholder="Email address" value={upgradeForm.email}
              onChange={e => setUpgradeForm({ ...upgradeForm, email: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" required />
            <input type="password" placeholder="Password (8+ characters)" value={upgradeForm.password}
              onChange={e => setUpgradeForm({ ...upgradeForm, password: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" required minLength={8} />
            <input type="password" placeholder="Confirm password" value={upgradeForm.confirmPassword}
              onChange={e => setUpgradeForm({ ...upgradeForm, confirmPassword: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" required />
            {upgradeError && <p className="text-red-400 text-sm">{upgradeError}</p>}
            <button type="submit" disabled={upgradeLoading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white font-semibold rounded-xl py-3 transition-colors">
              {upgradeLoading ? 'Creating account...' : 'Create Account & Save Data'}
            </button>
            <button type="button" onClick={() => setShowUpgrade(false)} className="w-full text-slate-400 text-sm py-2">Cancel</button>
          </form>
        </div>
      )}
      {upgradeSuccess && (
        <div className="bg-green-900/40 border border-green-500/30 rounded-2xl p-5 mb-4 text-center">
          <p className="text-green-400 font-semibold text-lg mb-1">Account Created!</p>
          <p className="text-slate-300 text-sm">Your data has been saved. Refreshing...</p>
        </div>
      )}

      {/* ---- MY FOCUS (Struggles) ---- */}
      {challenges.length > 0 && (
        <SectionCard
          title="What I'm Working Through"
          icon="💭"
          onEdit={() => { setEditStruggles([...challenges]); setEditingStruggles(true); }}
        >
          <div className="flex flex-wrap gap-2">
            {challenges.map(id => {
              const item = STRUGGLES_MAP[id];
              return item ? (
                <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-slate-700/60 text-slate-200 border border-slate-600/30">
                  <span>{item.emoji}</span> {item.label}
                </span>
              ) : null;
            })}
          </div>
        </SectionCard>
      )}

      {/* ---- MY GOALS ---- */}
      {goals.length > 0 && (
        <SectionCard
          title="What I'm Building"
          icon="🎯"
          onEdit={() => { setEditGoals([...goals]); setEditingGoals(true); }}
        >
          <div className="flex flex-wrap gap-2">
            {goals.map(id => {
              const item = GOALS_MAP[id];
              return item ? (
                <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-slate-700/60 text-slate-200 border border-slate-600/30">
                  <span>{item.emoji}</span> {item.label}
                </span>
              ) : null;
            })}
          </div>
        </SectionCard>
      )}

      {/* ---- COMMUNICATION STYLE ---- */}
      {commStyle && COMM_STYLES_MAP[commStyle] && (
        <SectionCard
          title="How MJ Talks to Me"
          icon="🗣️"
          onEdit={() => { setEditCommStyle(commStyle); setEditingCommStyle(true); }}
        >
          <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl p-3">
            <span className="text-2xl">{COMM_STYLES_MAP[commStyle].emoji}</span>
            <div>
              <p className="text-white text-sm font-semibold">{COMM_STYLES_MAP[commStyle].label}</p>
              <p className="text-slate-400 text-xs">{COMM_STYLES_MAP[commStyle].desc}</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ---- STREAKS ---- */}
      <SectionCard title="Streaks" icon={<Fire />}>
        <div className="grid grid-cols-3 gap-3">
          {(streaks || []).map((streak, i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{streak.current_streak || 0}</p>
              <p className="text-[10px] text-slate-400 capitalize mt-1">
                {(streak.streak_type || '').replace(/_/g, ' ')}
              </p>
            </div>
          ))}
          {(!streaks || streaks.length === 0) && (
            <p className="text-slate-500 text-sm col-span-3 text-center py-2">Start building your streaks!</p>
          )}
        </div>
      </SectionCard>

      {/* ---- SUBSCRIPTION STATUS ---- */}
      <SectionCard title="Subscription" icon="⭐">
        {isPremium ? (
          <div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-900/40 to-violet-900/40 border border-sky-500/20 rounded-xl p-4 mb-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">Premium Active</p>
                <p className="text-slate-400 text-xs">
                  {isOnTrial
                    ? `Free trial • ${daysRemaining || '?'} days remaining`
                    : subscription?.productId?.includes('yearly') ? 'Yearly plan' : 'Monthly plan'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => { haptics.buttonPress(); manage(); }}
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            >
              Manage Subscription
            </button>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-3">
              Unlock unlimited conversations, all coping tools, extended insights, and more.
            </p>
            <button
              onClick={() => { haptics.buttonPress(); setShowPaywall(true); }}
              className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>✨</span> Upgrade to Premium
            </button>
          </div>
        )}
      </SectionCard>

      {/* ---- EMAIL PREFERENCES (authenticated only) ---- */}
      {!isGuest && (
        <SectionCard title="Email Preferences" icon="✉️">
          {emailPrefsError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">{emailPrefsError}</div>
          )}
          {emailPrefsLoading ? (
            <p className="text-slate-400 text-sm">Loading preferences...</p>
          ) : emailPrefs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm font-semibold">Weekly Digest</p>
                  <p className="text-slate-400 text-xs">Get a summary of your progress</p>
                </div>
                <Toggle value={emailPrefs.weekly_digest} onChange={v => handleEmailPrefsUpdate('weekly_digest', v)} disabled={emailPrefsSaving} />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm font-semibold">Coaching Nudges</p>
                  <p className="text-slate-400 text-xs">Helpful reminders to stay consistent</p>
                </div>
                <Toggle value={emailPrefs.coaching_nudges} onChange={v => handleEmailPrefsUpdate('coaching_nudges', v)} disabled={emailPrefsSaving} />
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-semibold">Buddy Sharing</p>
                    <p className="text-slate-400 text-xs">Share updates with an accountability buddy</p>
                  </div>
                  <Toggle value={emailPrefs.buddy_sharing} onChange={v => handleEmailPrefsUpdate('buddy_sharing', v)} disabled={emailPrefsSaving} />
                </div>
                {emailPrefs.buddy_sharing && (
                  <input type="email" placeholder="Buddy's email address" value={emailPrefs.buddy_email || ''}
                    onChange={e => handleEmailPrefsUpdate('buddy_email', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                )}
              </div>
              <button onClick={handleSendTestEmail}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 text-sm font-semibold transition-colors">
                Send Test Email
              </button>
            </div>
          ) : null}
        </SectionCard>
      )}

      {/* ---- NOTIFICATION SETTINGS ---- */}
      <SectionCard title="Notifications" icon="🔔">
        <p className="text-slate-400 text-sm mb-3">
          Customize check-in reminders, streak alerts, and gentle nudges.
        </p>
        <button
          onClick={() => { haptics.buttonPress(); setShowNotificationSettings(true); }}
          className="w-full bg-slate-700/50 hover:bg-slate-700 text-sky-400 rounded-xl px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between"
        >
          <span>Manage Notifications</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </SectionCard>

      {/* ---- LEGAL ---- */}
      <SectionCard title="Legal" icon="📋">
        <div className="space-y-2">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer"
            className="block w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-center">
            Privacy Policy
          </a>
          <a href="/terms-of-service" target="_blank" rel="noopener noreferrer"
            className="block w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-center">
            Terms of Service
          </a>
        </div>
      </SectionCard>

      {/* ---- SIGN OUT ---- */}
      {!isGuest && (
        <button
          onClick={logout}
          className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors mb-4"
        >
          <Logout />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      )}

      <p className="text-center text-slate-600 text-xs mt-4 mb-8">White Mike v1.0.0</p>

      {/* ============================================================ */}
      {/* EDIT MODALS                                                   */}
      {/* ============================================================ */}

      {/* ---- Edit Name Modal ---- */}
      <EditModal title="Update Your Name" isOpen={editingName} onClose={() => setEditingName(false)} onSave={handleSaveName} saving={saving}>
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="What should MJ call you?"
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-sky-500"
          autoFocus
        />
      </EditModal>

      {/* ---- Edit Struggles Modal ---- */}
      <EditModal title="What You're Working Through" isOpen={editingStruggles} onClose={() => setEditingStruggles(false)} onSave={handleSaveStruggles} saving={saving}>
        <p className="text-slate-400 text-sm mb-4">Select all that apply — you can change these anytime.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STRUGGLES_MAP).map(([id, item]) => (
            <Chip
              key={id}
              label={item.label}
              emoji={item.emoji}
              selected={editStruggles.includes(id)}
              onClick={() => { haptics.selection(); setEditStruggles(toggleItem(editStruggles, id)); }}
            />
          ))}
        </div>
      </EditModal>

      {/* ---- Edit Goals Modal ---- */}
      <EditModal title="What You're Building" isOpen={editingGoals} onClose={() => setEditingGoals(false)} onSave={handleSaveGoals} saving={saving}>
        <p className="text-slate-400 text-sm mb-4">Pick your goals — MJ will help you stay on track.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GOALS_MAP).map(([id, item]) => (
            <Chip
              key={id}
              label={item.label}
              emoji={item.emoji}
              selected={editGoals.includes(id)}
              onClick={() => { haptics.selection(); setEditGoals(toggleItem(editGoals, id)); }}
            />
          ))}
        </div>
      </EditModal>

      {/* ---- Edit Communication Style Modal ---- */}
      <EditModal title="How Should MJ Talk to You?" isOpen={editingCommStyle} onClose={() => setEditingCommStyle(false)} onSave={handleSaveCommStyle} saving={saving}>
        <div className="space-y-3">
          {Object.entries(COMM_STYLES_MAP).map(([id, item]) => (
            <button
              key={id}
              onClick={() => { haptics.selection(); setEditCommStyle(id); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                editCommStyle === id
                  ? 'bg-sky-500/15 border-sky-500/50 text-white'
                  : 'bg-slate-700/40 border-slate-600/30 text-slate-300'
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${editCommStyle === id ? 'text-sky-300' : 'text-white'}`}>{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </EditModal>
    </div>
  );
}

export default ProfileScreen;
