// ============================================================
// MJ's Superstars - Buddy System UI Components
// Accountability partner interface
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useBuddy,
  useBuddyInvites,
  useBuddyActivity,
  BUDDY_STATUS,
  SHARING_LEVELS,
  QUICK_NUDGES,
  CELEBRATION_MESSAGES,
  CELEBRATION_TYPES
} from '../services/buddySystem';
import { useHapticsHook } from '../services/haptics';

// ============================================================
// BUDDY CARD (Dashboard Widget)
// ============================================================

export function BuddyCard({ onNavigate }) {
  const { buddy, hasBuddy, loading } = useBuddy();
  const { activity } = useBuddyActivity();
  const haptics = useHapticsHook();

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-16 bg-slate-700 rounded-xl" />
      </div>
    );
  }

  // No buddy - show invite prompt
  if (!hasBuddy) {
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          haptics.buttonPress();
          onNavigate?.('buddy-setup');
        }}
        className="w-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-5 border border-purple-500/30 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">🤝</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Find an Accountability Buddy</h3>
            <p className="text-slate-400 text-sm">
              Partner up for mutual support and motivation
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </motion.button>
    );
  }

  // Has buddy - show activity
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptics.buttonPress();
        onNavigate?.('buddy');
      }}
      className="w-full bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 text-left"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Your Buddy</h3>
        <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
          Active
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Buddy avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {buddy.name?.charAt(0) || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white font-medium truncate">{buddy.name || 'Your Buddy'}</div>
          <div className="text-slate-400 text-sm">
            {activity?.lastActivity
              ? `Last active ${formatTimeAgo(activity.lastActivity)}`
              : 'Connected'}
          </div>
        </div>

        {/* Quick stats */}
        <div className="text-right">
          {activity?.streak && (
            <div className="flex items-center gap-1 text-amber-400">
              <span className="text-lg">🔥</span>
              <span className="font-semibold">{activity.streak}</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// BUDDY SETUP FLOW
// ============================================================

export function BuddySetup({ onComplete, onClose }) {
  const [step, setStep] = useState('intro'); // intro, generate, enter
  const { myCode, generateCode, sendInvite, loading } = useBuddyInvites();
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(null);
  const haptics = useHapticsHook();

  const handleGenerateCode = async () => {
    haptics.buttonPress();
    await generateCode();
    setStep('generate');
  };

  const handleSendInvite = async () => {
    if (!inputCode.trim()) return;

    haptics.buttonPress();
    setError(null);

    try {
      await sendInvite(inputCode.trim());
      haptics.success();
      onComplete?.();
    } catch (err) {
      haptics.error();
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onClose} className="text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-white font-semibold">Accountability Buddy</h1>
        <div className="w-6" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🤝</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Better Together
            </h2>

            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Partner with a friend for mutual support, encouragement, and accountability on your wellness journey.
            </p>

            {/* Benefits */}
            <div className="bg-slate-800/50 rounded-2xl p-5 mb-8 text-left">
              <h3 className="text-white font-medium mb-4">With a buddy, you can:</h3>
              <ul className="space-y-3">
                {[
                  { icon: '🔥', text: 'Share streak progress' },
                  { icon: '💪', text: 'Send encouragement' },
                  { icon: '🎯', text: 'Set shared goals' },
                  { icon: '🎉', text: 'Celebrate wins together' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGenerateCode}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                Invite a Friend
              </button>

              <button
                onClick={() => setStep('enter')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                I Have an Invite Code
              </button>
            </div>
          </motion.div>
        )}

        {step === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Share Your Code
            </h2>

            <p className="text-slate-400 mb-8">
              Send this code to your friend to connect
            </p>

            {/* Code display */}
            <div className="bg-slate-800 rounded-2xl p-6 mb-6">
              <div className="text-4xl font-mono font-bold text-white tracking-widest mb-4">
                {myCode || '------'}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(myCode);
                  haptics.success();
                }}
                className="text-sky-400 text-sm font-medium flex items-center gap-2 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              Code expires in 24 hours
            </p>

            {/* Share options */}
            <div className="flex gap-3 justify-center mb-8">
              <button
                onClick={() => {
                  const text = `Join me on MJ's Superstars! Use my buddy code: ${myCode}`;
                  if (navigator.share) {
                    navigator.share({ text });
                  } else {
                    navigator.clipboard?.writeText(text);
                  }
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>

            <button
              onClick={() => setStep('enter')}
              className="text-slate-400 text-sm"
            >
              Or enter a code you received
            </button>
          </motion.div>
        )}

        {step === 'enter' && (
          <motion.div
            key="enter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Enter Buddy Code
            </h2>

            <p className="text-slate-400 mb-8">
              Enter the code your friend shared with you
            </p>

            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-purple-500 rounded-2xl px-6 py-4 text-white text-2xl text-center font-mono tracking-widest placeholder-slate-600 outline-none mb-4"
            />

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={handleSendInvite}
              disabled={inputCode.length < 6 || loading}
              className="w-full bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-4 rounded-xl transition-colors mb-4"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>

            <button
              onClick={() => setStep('intro')}
              className="text-slate-400 text-sm"
            >
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// BUDDY DASHBOARD
// ============================================================

export function BuddyDashboard({ onClose }) {
  const { buddy, sendNudge, celebrate } = useBuddy();
  const { activity, nudges } = useBuddyActivity();
  const [showNudges, setShowNudges] = useState(false);
  const haptics = useHapticsHook();

  const handleQuickNudge = async (nudge) => {
    haptics.messageSent();
    await sendNudge(nudge.message, 'quick');
  };

  const handleCelebrate = async () => {
    haptics.achievementUnlocked();
    await celebrate(CELEBRATION_TYPES.CUSTOM, {
      message: CELEBRATION_MESSAGES[CELEBRATION_TYPES.STREAK_MILESTONE][0]
    });
  };

  if (!buddy) {
    return <BuddySetup onClose={onClose} />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-lg p-4 flex items-center justify-between z-10">
        <button onClick={onClose} className="text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-semibold">Your Buddy</h1>
        <button className="text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Buddy Profile */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
            {buddy.name?.charAt(0) || '?'}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">{buddy.name || 'Your Buddy'}</h2>
          <p className="text-slate-400 text-sm mb-4">
            Connected {formatTimeAgo(buddy.connectedAt)}
          </p>

          {/* Stats comparison */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-400">🔥 {activity?.yourStreak || 0}</div>
              <div className="text-slate-400 text-xs">Your Streak</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-purple-400">🔥 {activity?.buddyStreak || 0}</div>
              <div className="text-slate-400 text-xs">Their Streak</div>
            </div>
          </div>
        </div>

        {/* Quick Nudges */}
        <div>
          <h3 className="text-white font-semibold mb-3">Send Encouragement</h3>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_NUDGES.map((nudge) => (
              <motion.button
                key={nudge.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickNudge(nudge)}
                className="bg-slate-800/50 hover:bg-slate-700/50 rounded-xl p-3 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">{nudge.emoji}</span>
                <span className="text-slate-400 text-xs truncate w-full text-center">{nudge.message.split(' ')[0]}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Celebrate Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCelebrate}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎉</span>
          Send Celebration
        </motion.button>

        {/* Recent Nudges */}
        {nudges.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3">Recent Messages</h3>
            <div className="space-y-2">
              {nudges.slice(0, 5).map((nudge, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">{nudge.emoji || '💬'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{nudge.message}</p>
                    <p className="text-slate-500 text-xs">{formatTimeAgo(nudge.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {activity?.recentActivity?.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3">Their Activity</h3>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              {activity.recentActivity.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{getActivityIcon(item.type)}</span>
                  <span className="text-slate-300 text-sm">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatTimeAgo(dateString) {
  if (!dateString) return 'recently';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type) {
  const icons = {
    mood_logged: '😊',
    streak_continued: '🔥',
    task_completed: '✅',
    journal_written: '📝',
    breathing_completed: '🧘',
    ritual_completed: '🌅'
  };
  return icons[type] || '✨';
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  BuddyCard,
  BuddySetup,
  BuddyDashboard
};
