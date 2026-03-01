// ============================================================
// MJ's Superstars - 3 Pillars Daily Commitment Screen
// Physical • Mental • Social — Every single day
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as haptics from '../../services/haptics';
import { useToast } from '../shared/Toast';
import { useAuth } from '../../contexts/AuthContext';

const PILLARS = [
  {
    id: 'physical',
    name: 'Physical',
    emoji: '💪',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500',
    accentColor: 'text-emerald-400',
    description: 'Move your body 30 minutes',
  },
  {
    id: 'mental',
    name: 'Mental',
    emoji: '🧠',
    color: 'sky',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500',
    accentColor: 'text-sky-400',
    description: 'Learn something new',
  },
  {
    id: 'social',
    name: 'Social',
    emoji: '🤝',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
    accentColor: 'text-amber-400',
    description: 'Connect with empathy',
  },
];

const COACH_QUOTES = [
  "Clear mind, clear path. Get uncomfortable today.",
  "Physical, Mental, Social — that's the whole game.",
  "Empathy isn't weakness. It's your superpower.",
  "You don't need motivation. You need commitment.",
  "The friction is where the growth lives.",
  "Move your body, feed your mind, connect your soul.",
  "Time to get uncomfortable, grow, and gain time back to live.",
  "Stay on the path and the money will follow you.",
];

// ============================================================
// GUEST MODE HELPERS
// ============================================================

const guestModeHelpers = {
  getTodayCommitments: () => {
    const key = `tp_daily_commitments_${new Date().toISOString().split('T')[0]}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : { physical: false, mental: false, social: false };
  },

  saveTodayCommitments: (commitments) => {
    const key = `tp_daily_commitments_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(key, JSON.stringify(commitments));
  },

  getCommitmentDetail: (pillarId) => {
    const key = `tp_commitment_${pillarId}_${new Date().toISOString().split('T')[0]}`;
    return localStorage.getItem(key);
  },

  saveCommitmentDetail: (pillarId, detail) => {
    const key = `tp_commitment_${pillarId}_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(key, detail);
  },

  getStreak: () => {
    return parseInt(localStorage.getItem('tp_streak') || '0');
  },

  setStreak: (count) => {
    localStorage.setItem('tp_streak', count.toString());
  },

  getClearMindScore: () => {
    return parseInt(localStorage.getItem('tp_clear_mind_score') || '0');
  },

  setClearMindScore: (score) => {
    localStorage.setItem('tp_clear_mind_score', Math.min(100, score).toString());
  },

  getWeeklyHistory: () => {
    const history = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `tp_daily_commitments_${dateStr}`;
      const stored = localStorage.getItem(key);
      history[dateStr] = stored ? JSON.parse(stored) : { physical: false, mental: false, social: false };
    }
    return history;
  },
};

// ============================================================
// PILLAR CARD COMPONENT
// ============================================================

function PillarCard({ pillar, isCompleted, detail, onComplete, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');

  const handleComplete = async () => {
    if (!activity.trim()) {
      alert('Please describe what you did');
      return;
    }

    await onComplete(pillar.id, activity, pillar.id === 'physical' ? duration : null);
    setIsExpanded(false);
    setActivity('');
    setDuration('');
  };

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`${pillar.bgColor} border-l-4 ${pillar.borderColor} rounded-xl p-4 mb-3`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pillar.emoji}</span>
            <div>
              <p className="font-semibold text-white">{pillar.name}</p>
              <p className="text-sm text-slate-400">{detail || 'Completed'}</p>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-${pillar.color}-400 to-${pillar.color}-600 flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${pillar.bgColor} border-l-4 ${pillar.borderColor} rounded-xl p-4 mb-3 cursor-pointer transition-all hover:shadow-lg`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {!isExpanded ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pillar.emoji}</span>
            <div>
              <p className="font-semibold text-white">{pillar.name}</p>
              <p className="text-sm text-slate-400">{pillar.description}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full border-2 ${pillar.borderColor}`} />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{pillar.emoji}</span>
            <p className="font-semibold text-white">{pillar.name}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">What did you do?</label>
              <textarea
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder={`e.g., "Ran 3 miles" or "${pillar.description}"`}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-${pillar.color}-500"
                rows={2}
              />
            </div>

            {pillar.id === 'physical' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duration (optional)</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., '30 minutes'"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsExpanded(false);
                  setActivity('');
                  setDuration('');
                }}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium text-sm hover:bg-slate-600 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isLoading || !activity.trim()}
                className={`flex-1 py-2 rounded-lg font-medium text-sm text-white transition-colors ${
                  isLoading || !activity.trim()
                    ? `bg-${pillar.color}-500/50 cursor-not-allowed`
                    : `bg-gradient-to-r from-${pillar.color}-500 to-${pillar.color}-600 hover:shadow-lg`
                }`}
              >
                {isLoading ? 'Completing...' : 'Complete'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================
// CELEBRATION COMPONENT
// ============================================================

function CelebrationOverlay({ onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm mx-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl mb-6 flex justify-center"
        >
          🧘‍♂️
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-2">Clear Mind Achieved!</h2>
        <p className="text-slate-300 mb-6">All three pillars completed. You're unstoppable today.</p>

        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block"
        >
          <p className="text-5xl mb-6">✨</p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDismiss}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          Continue
        </motion.button>
      </motion.div>

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
          }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            opacity: 0,
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
          }}
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
          }}
        >
          {['✨', '🎉', '⭐', '💫'][i % 4]}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CommitmentsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isGuestMode = !user?.id;

  const [commitments, setCommitments] = useState({ physical: false, mental: false, social: false });
  const [commitmentDetails, setCommitmentDetails] = useState({
    physical: '',
    mental: '',
    social: '',
  });
  const [streak, setStreak] = useState(0);
  const [clearMindScore, setClearMindScore] = useState(0);
  const [weeklyHistory, setWeeklyHistory] = useState({});
  const [loadingPillar, setLoadingPillar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [frictionChallenge, setFrictionChallenge] = useState(null);

  const dailyQuote = useMemo(() => {
    const today = new Date().getDate();
    return COACH_QUOTES[today % COACH_QUOTES.length];
  }, []);

  const allCompleted = useMemo(
    () => commitments.physical && commitments.mental && commitments.social,
    [commitments]
  );

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        if (isGuestMode) {
          // Guest mode: use localStorage
          const today = guestModeHelpers.getTodayCommitments();
          setCommitments(today);

          const details = {
            physical: guestModeHelpers.getCommitmentDetail('physical') || '',
            mental: guestModeHelpers.getCommitmentDetail('mental') || '',
            social: guestModeHelpers.getCommitmentDetail('social') || '',
          };
          setCommitmentDetails(details);

          const savedStreak = guestModeHelpers.getStreak();
          setStreak(savedStreak);

          const savedScore = guestModeHelpers.getClearMindScore();
          setClearMindScore(savedScore);

          const history = guestModeHelpers.getWeeklyHistory();
          setWeeklyHistory(history);

          // Mock friction challenge
          setFrictionChallenge({
            id: 1,
            title: 'Cold Shower Challenge',
            description: 'Take a 2-minute cold shower to activate your nervous system',
            emoji: '❄️',
          });
        } else {
          // API mode (to be wired later)
          // const data = await CommitmentAPI.getToday();
          // setCommitments(data.commitments);
          // setCommitmentDetails(data.details);
          // setStreak(data.streak);
          // setClearMindScore(data.clearMindScore);

          // const history = await CommitmentAPI.getHistory(7);
          // setWeeklyHistory(history);

          // const friction = await CommitmentAPI.getFriction();
          // setFrictionChallenge(friction);

          // For now, use mock data
          setCommitments({ physical: false, mental: false, social: false });
          setStreak(0);
          setClearMindScore(0);
          setWeeklyHistory({});
          setFrictionChallenge({
            id: 1,
            title: 'Cold Shower Challenge',
            description: 'Take a 2-minute cold shower',
            emoji: '❄️',
          });
        }
      } catch (error) {
        showToast('Error loading commitments', 'error');
        console.error('Failed to load commitments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isGuestMode, showToast]);

  // ============================================================
  // HANDLE PILLAR COMPLETION
  // ============================================================

  const handleCompletePillar = useCallback(
    async (pillarId, activity, duration) => {
      try {
        setLoadingPillar(pillarId);
        haptics.success();

        if (isGuestMode) {
          const updated = { ...commitments, [pillarId]: true };
          setCommitments(updated);
          guestModeHelpers.saveTodayCommitments(updated);

          const detailText = duration ? `${activity} (${duration})` : activity;
          setCommitmentDetails((prev) => ({ ...prev, [pillarId]: detailText }));
          guestModeHelpers.saveCommitmentDetail(pillarId, detailText);

          // Check if all completed
          if (updated.physical && updated.mental && updated.social) {
            const newScore = Math.min(100, clearMindScore + 20);
            setClearMindScore(newScore);
            guestModeHelpers.setClearMindScore(newScore);
            setShowCelebration(true);
          }

          showToast(`${PILLARS.find((p) => p.id === pillarId)?.name} commitment completed!`, 'success');
        } else {
          // API call (to be wired later)
          // await CommitmentAPI.completePillar(pillarId, { activity, duration });
          // Then reload data

          const updated = { ...commitments, [pillarId]: true };
          setCommitments(updated);

          if (updated.physical && updated.mental && updated.social) {
            setShowCelebration(true);
          }

          showToast(`${PILLARS.find((p) => p.id === pillarId)?.name} commitment completed!`, 'success');
        }
      } catch (error) {
        showToast('Failed to save commitment', 'error');
        console.error('Failed to complete pillar:', error);
      } finally {
        setLoadingPillar(null);
      }
    },
    [commitments, clearMindScore, isGuestMode, showToast]
  );

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 text-white p-4 pb-20 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-900 text-white p-4 pb-20">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold mb-1">3 Pillars</h1>
            <p className="text-slate-400 text-sm">Physical • Mental • Social</p>
          </div>

          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-full px-4 py-2 flex items-center gap-2"
            >
              <span className="text-xl">🔥</span>
              <span className="font-bold">{streak}</span>
            </motion.div>
          )}
        </div>

        {/* Clear Mind Score Ring */}
        <div className="mt-6 flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="4" />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - clearMindScore / 100)}`}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-400">{clearMindScore}%</span>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-sm">Clear Mind</p>
            <p className="text-slate-400 text-xs">Daily Score</p>
          </div>
        </div>
      </motion.div>

      {/* PILLAR CARDS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.1 }} className="mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-300 mb-3">Today's Commitments</h2>
        </div>

        {PILLARS.map((pillar) => (
          <PillarCard
            key={pillar.id}
            pillar={pillar}
            isCompleted={commitments[pillar.id]}
            detail={commitmentDetails[pillar.id]}
            onComplete={handleCompletePillar}
            isLoading={loadingPillar === pillar.id}
          />
        ))}
      </motion.div>

      {/* FRICTION CHALLENGE */}
      {frictionChallenge && !allCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">⚡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Today's Push</h3>
              <p className="text-sm text-slate-400 mt-1">{frictionChallenge.description}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2 rounded-lg bg-slate-700 text-white font-medium text-sm hover:bg-slate-600 transition-colors"
          >
            Accept Challenge
          </motion.button>
        </motion.div>
      )}

      {/* WEEKLY OVERVIEW */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Weekly Overview</h3>
        <div className="flex gap-2 justify-between">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            const dateStr = date.toISOString().split('T')[0];
            const dayData = weeklyHistory[dateStr] || { physical: false, mental: false, social: false };
            const allDone = dayData.physical && dayData.mental && dayData.social;

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`flex-1 aspect-square rounded-lg flex items-center justify-center ${
                  allDone ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/50' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold text-slate-300 mb-1">{day}</div>
                  <div className="flex gap-1 justify-center">
                    {PILLARS.map((pillar) => (
                      <motion.div
                        key={pillar.id}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          dayData[pillar.id] ? `bg-${pillar.color}-500` : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  {allDone && <span className="text-xs text-emerald-400 mt-1">✓</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* COACH MIKE QUOTE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-amber-500"
      >
        <p className="text-sm text-slate-300 italic">"{dailyQuote}"</p>
        <p className="text-xs text-slate-500 mt-2">— Coach Mike</p>
      </motion.div>

      {/* CELEBRATION OVERLAY */}
      <AnimatePresence>
        {showCelebration && <CelebrationOverlay onDismiss={() => setShowCelebration(false)} />}
      </AnimatePresence>
    </div>
  );
}
