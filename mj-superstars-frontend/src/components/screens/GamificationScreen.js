// ============================================================
// Top Performer - Gamification & Social Hub
// XP, levels, challenges, milestones, achievements, login bonus
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamificationAPI, ProgressAPI, TokenManager } from '../../services/api';
import { useToast } from '../shared/Toast';
import { useHapticsHook } from '../../services/haptics';

// ============================================================
// LEVEL SYSTEM
// ============================================================
const LEVEL_THRESHOLDS = [
  { level: 1, min: 0, title: 'Newcomer', emoji: '🌱' },
  { level: 2, min: 50, title: 'Explorer', emoji: '🧭' },
  { level: 3, min: 150, title: 'Seeker', emoji: '🔍' },
  { level: 4, min: 350, title: 'Builder', emoji: '🧱' },
  { level: 5, min: 600, title: 'Warrior', emoji: '⚔️' },
  { level: 6, min: 1000, title: 'Champion', emoji: '🏆' },
  { level: 7, min: 1500, title: 'Legend', emoji: '👑' },
  { level: 8, min: 2500, title: 'Master', emoji: '🌟' },
  { level: 9, min: 5000, title: 'Sage', emoji: '🧙' },
  { level: 10, min: 10000, title: 'Superstar', emoji: '⭐' },
];

function getLevel(points) {
  let current = LEVEL_THRESHOLDS[0];
  for (const lvl of LEVEL_THRESHOLDS) {
    if (points >= lvl.min) current = lvl;
    else break;
  }
  const nextIdx = LEVEL_THRESHOLDS.findIndex(l => l.level === current.level) + 1;
  const next = LEVEL_THRESHOLDS[nextIdx] || null;
  const progress = next
    ? (points - current.min) / (next.min - current.min)
    : 1;
  return { ...current, next, progress: Math.min(1, progress), totalPoints: points };
}

// ============================================================
// ACHIEVEMENT BADGE DEFINITIONS
// ============================================================
const BADGE_DEFS = {
  first_mood: { name: 'First Check-In', emoji: '😊', desc: 'Logged your first mood' },
  first_journal: { name: 'Dear Diary', emoji: '📔', desc: 'Wrote your first journal entry' },
  first_task: { name: 'Task Starter', emoji: '✅', desc: 'Completed your first task' },
  streak_3: { name: '3-Day Streak', emoji: '🔥', desc: 'Kept a 3-day streak' },
  streak_7: { name: 'Week Warrior', emoji: '💪', desc: 'Kept a 7-day streak' },
  streak_14: { name: 'Fortnight Focus', emoji: '🎯', desc: '14 days straight' },
  streak_30: { name: 'Monthly Master', emoji: '🏅', desc: '30-day streak achieved' },
  points_100: { name: 'Century Club', emoji: '💯', desc: 'Earned 100 points' },
  points_500: { name: 'High Roller', emoji: '🎰', desc: 'Earned 500 points' },
  points_1000: { name: 'Grand Achiever', emoji: '🏆', desc: 'Earned 1,000 points' },
  level_5: { name: 'Halfway Hero', emoji: '⚔️', desc: 'Reached level 5' },
  level_10: { name: 'Superstar', emoji: '⭐', desc: 'Reached max level' },
  early_bird: { name: 'Early Bird', emoji: '🐦', desc: 'Logged before 7am' },
  night_owl: { name: 'Night Owl', emoji: '🦉', desc: 'Logged after 10pm' },
  comeback_king: { name: 'Comeback King', emoji: '👊', desc: 'Returned after time away' },
};

// ============================================================
// HELPER COMPONENTS
// ============================================================
function StatCard({ value, label, icon, color = 'sky' }) {
  const colors = {
    sky: 'from-sky-500/20 to-sky-600/20 border-sky-500/30 text-sky-400',
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400',
    violet: 'from-violet-500/20 to-violet-600/20 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3 text-center`}>
      <span className="text-xl">{icon}</span>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function SectionHeader({ title, icon, badge }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-semibold flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        {title}
      </h2>
      {badge && (
        <span className="bg-sky-500/20 text-sky-400 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
function GamificationScreen({ onBack }) {
  const { addToast } = useToast();
  const haptics = useHapticsHook();
  const isGuest = !TokenManager.isAuthenticated();

  const [gamData, setGamData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingLogin, setClaimingLogin] = useState(false);
  const [claimedLogin, setClaimedLogin] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState(null);
  const [joiningChallenge, setJoiningChallenge] = useState(null);
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    if (isGuest) {
      // Guest: show local stats
      const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
      const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
      const journal = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
      const guestPoints = (moods.length * 10) + (tasks.filter(t => t.status === 'completed').length * 15) + (journal.length * 20);
      setGamData({
        points: guestPoints,
        multiplier: 1.0,
        daily_login_streak: 0,
        challenges: [],
        milestones: [],
        multipliers: [],
        loginBonusClaimed: true, // guests don't get login bonus
      });
      setLoading(false);
      return;
    }

    try {
      const [summary, achievementsData] = await Promise.all([
        GamificationAPI.getSummary().catch(() => null),
        ProgressAPI.getAchievements(false).catch(() => []),
      ]);

      if (summary) {
        setGamData({
          points: summary.points || 0,
          multiplier: summary.current_multiplier || summary.multiplier || 1.0,
          daily_login_streak: summary.daily_login_streak || 0,
          challenges: summary.active_challenges || [],
          milestones: summary.unclaimed_milestones || [],
          multipliers: summary.active_multipliers || [],
          loginBonusClaimed: summary.login_bonus_claimed_today || false,
        });
      } else {
        setGamData({
          points: 0, multiplier: 1.0, daily_login_streak: 0,
          challenges: [], milestones: [], multipliers: [], loginBonusClaimed: true,
        });
      }

      const achList = Array.isArray(achievementsData) ? achievementsData
        : achievementsData?.achievements || [];
      setAchievements(achList);
    } catch (err) {
      console.error('[Gamification] Load error:', err);
      setGamData({
        points: 0, multiplier: 1.0, daily_login_streak: 0,
        challenges: [], milestones: [], multipliers: [], loginBonusClaimed: true,
      });
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handlers
  const handleClaimLogin = async () => {
    setClaimingLogin(true);
    try {
      const result = await GamificationAPI.claimLoginBonus();
      haptics.success();
      const bonus = result.bonus_points || result.points || 10;
      addToast(`+${bonus} XP — Daily login bonus!`, 'xp');
      setClaimedLogin(true);
      setGamData(prev => ({
        ...prev,
        points: (prev.points || 0) + bonus,
        loginBonusClaimed: true,
        daily_login_streak: (prev.daily_login_streak || 0) + 1,
      }));
    } catch (err) {
      addToast('Already claimed today!', 'info');
      setClaimedLogin(true);
    } finally {
      setClaimingLogin(false);
    }
  };

  const handleJoinChallenge = async (id) => {
    setJoiningChallenge(id);
    try {
      await GamificationAPI.joinChallenge(id);
      haptics.buttonPress();
      addToast('Challenge joined! Let\'s go!', 'streak');
      loadData();
    } catch (err) {
      addToast('Could not join challenge', 'warning');
    } finally {
      setJoiningChallenge(null);
    }
  };

  const handleClaimMilestone = async (id) => {
    setClaimingMilestone(id);
    try {
      const result = await GamificationAPI.claimMilestone(id);
      haptics.success();
      addToast(`Milestone claimed! +${result.points || 50} XP`, 'levelup');
      loadData();
    } catch (err) {
      addToast('Could not claim milestone', 'warning');
    } finally {
      setClaimingMilestone(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🏆</div>
          <p className="text-slate-400 text-sm">Loading your stats...</p>
        </div>
      </div>
    );
  }

  const level = getLevel(gamData?.points || 0);
  const earnedBadges = achievements.filter(a => a.earned_at);
  const allBadgeKeys = Object.keys(BADGE_DEFS);
  const earnedBadgeTypes = new Set(earnedBadges.map(a => a.achievement_type));

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      {/* Back button */}
      {onBack && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Your Progress</h1>
        </div>
      )}

      {/* ---- HEADER WITH LEVEL ---- */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/30 mb-3"
        >
          <span className="text-4xl">{level.emoji}</span>
        </motion.div>
        <h1 className="text-2xl font-bold text-white">
          Level {level.level} — {level.title}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {level.totalPoints.toLocaleString()} XP total
        </p>

        {/* Level progress bar */}
        {level.next && (
          <div className="mt-3 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Lvl {level.level}</span>
              <span>{Math.round(level.progress * 100)}%</span>
              <span>Lvl {level.next.level}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${level.progress * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-sky-500 to-violet-500 rounded-full"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {(level.next.min - level.totalPoints).toLocaleString()} XP to {level.next.title} {level.next.emoji}
            </p>
          </div>
        )}
      </div>

      {/* ---- QUICK STATS ---- */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <StatCard value={gamData.points} label="Total XP" icon="⚡" color="amber" />
        <StatCard value={`${gamData.multiplier}x`} label="Multiplier" icon="✨" color="violet" />
        <StatCard value={gamData.daily_login_streak} label="Login Streak" icon="🔥" color="orange" />
        <StatCard value={earnedBadges.length} label="Badges" icon="🏅" color="emerald" />
      </div>

      {/* ---- DAILY LOGIN BONUS ---- */}
      {!isGuest && !gamData.loginBonusClaimed && !claimedLogin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-xl">🎁</span> Daily Login Bonus
              </h3>
              <p className="text-amber-200/70 text-sm mt-1">
                Claim your daily XP bonus — streak: {gamData.daily_login_streak} days
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClaimLogin}
              disabled={claimingLogin}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
            >
              {claimingLogin ? '...' : 'Claim!'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Claimed confirmation */}
      {claimedLogin && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4 mb-4 text-center"
        >
          <span className="text-2xl">✅</span>
          <p className="text-emerald-300 font-semibold mt-1">Login bonus claimed!</p>
        </motion.div>
      )}

      {/* ---- ACTIVE MULTIPLIERS ---- */}
      {gamData.multipliers?.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <SectionHeader title="Active Boosts" icon="✨" badge={`${gamData.multiplier}x`} />
          <div className="space-y-2">
            {gamData.multipliers.map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-700/40 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {m.type === 'streak' ? '🔥' : m.type === 'comeback' ? '👊' : m.type === 'daily_login' ? '🎁' : '⚡'}
                  </span>
                  <span className="text-slate-300 text-sm capitalize">{(m.type || '').replace(/_/g, ' ')}</span>
                </div>
                <span className="text-amber-400 font-bold text-sm">{m.multiplier}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- FLASH CHALLENGES ---- */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <SectionHeader title="Flash Challenges" icon="⚡" badge={gamData.challenges?.length > 0 ? `${gamData.challenges.length} active` : null} />
        {gamData.challenges?.length > 0 ? (
          <div className="space-y-3">
            {gamData.challenges.map((ch) => {
              const progress = ch.progress || 0;
              const target = ch.target_count || ch.target || 1;
              const pct = Math.min(100, (progress / target) * 100);
              const isComplete = progress >= target;
              const isJoined = ch.joined || ch.user_joined;

              return (
                <div key={ch.id} className="bg-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium text-sm">{ch.name || ch.title}</h4>
                    <span className="text-amber-400 text-xs font-bold">{ch.reward_multiplier || ch.multiplier}x • {ch.reward_points || ch.points} XP</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{ch.description}</p>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">{progress}/{target}</span>
                    {!isJoined && !isComplete && (
                      <button
                        onClick={() => handleJoinChallenge(ch.id)}
                        disabled={joiningChallenge === ch.id}
                        className="text-sky-400 text-xs font-bold hover:text-sky-300"
                      >
                        {joiningChallenge === ch.id ? 'Joining...' : 'Join Challenge'}
                      </button>
                    )}
                    {isComplete && <span className="text-emerald-400 text-xs font-bold">Completed!</span>}
                    {isJoined && !isComplete && <span className="text-sky-400 text-xs">Active</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="text-3xl">🕐</span>
            <p className="text-slate-500 text-sm mt-2">No active challenges right now</p>
            <p className="text-slate-600 text-xs mt-1">New challenges drop daily — check back soon!</p>
          </div>
        )}
      </div>

      {/* ---- MILESTONES ---- */}
      {gamData.milestones?.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <SectionHeader title="Unclaimed Milestones" icon="🎉" badge={`${gamData.milestones.length}`} />
          <div className="space-y-2">
            {gamData.milestones.map((ms) => (
              <div key={ms.id} className="flex items-center justify-between bg-gradient-to-r from-violet-900/30 to-sky-900/30 border border-violet-500/20 rounded-xl p-3">
                <div>
                  <p className="text-white font-medium text-sm">{ms.milestone_type || ms.type}</p>
                  <p className="text-slate-400 text-xs">{ms.description || `Reached ${ms.value} ${ms.milestone_type}`}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleClaimMilestone(ms.id)}
                  disabled={claimingMilestone === ms.id}
                  className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  {claimingMilestone === ms.id ? '...' : 'Claim'}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- BADGES / ACHIEVEMENTS ---- */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <SectionHeader title="Badges" icon="🏅" badge={`${earnedBadges.length}/${allBadgeKeys.length}`} />
        <div className="grid grid-cols-4 gap-3">
          {(showAllBadges ? allBadgeKeys : allBadgeKeys.slice(0, 8)).map((key) => {
            const def = BADGE_DEFS[key];
            const earned = earnedBadgeTypes.has(key);
            return (
              <motion.div
                key={key}
                whileTap={{ scale: 0.95 }}
                className={`text-center p-2 rounded-xl ${
                  earned
                    ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-500/30'
                    : 'bg-slate-700/30 border border-slate-700/30 opacity-40'
                }`}
              >
                <span className="text-2xl">{def.emoji}</span>
                <p className={`text-[9px] mt-1 font-medium ${earned ? 'text-amber-200' : 'text-slate-500'}`}>
                  {def.name}
                </p>
              </motion.div>
            );
          })}
        </div>
        {allBadgeKeys.length > 8 && (
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            className="w-full mt-3 text-sky-400 text-sm font-medium"
          >
            {showAllBadges ? 'Show less' : `Show all ${allBadgeKeys.length} badges`}
          </button>
        )}
      </div>

      {/* ---- LEVEL ROADMAP ---- */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <SectionHeader title="Level Roadmap" icon="🗺️" />
        <div className="space-y-2">
          {LEVEL_THRESHOLDS.map((lvl) => {
            const reached = (gamData?.points || 0) >= lvl.min;
            const isCurrent = lvl.level === level.level;
            return (
              <div
                key={lvl.level}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  isCurrent ? 'bg-sky-500/15 border border-sky-500/30' : reached ? 'bg-slate-700/30' : 'opacity-40'
                }`}
              >
                <span className="text-lg w-8 text-center">{lvl.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-sky-300' : reached ? 'text-white' : 'text-slate-500'}`}>
                    Lvl {lvl.level} — {lvl.title}
                  </p>
                  <p className="text-xs text-slate-500">{lvl.min.toLocaleString()} XP</p>
                </div>
                {reached && <span className="text-emerald-400 text-sm">✓</span>}
                {isCurrent && <span className="text-sky-400 text-xs font-bold">YOU</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guest CTA */}
      {isGuest && (
        <div className="bg-gradient-to-r from-sky-900/40 to-violet-900/40 border border-sky-500/30 rounded-2xl p-5 mb-4 text-center">
          <span className="text-3xl">🏆</span>
          <h3 className="text-white font-semibold mt-2">Create an account to track your progress!</h3>
          <p className="text-slate-400 text-sm mt-1">
            Login bonuses, challenges, and badges require an account.
          </p>
        </div>
      )}

      <p className="text-center text-slate-600 text-xs mt-4 mb-8">
        Keep showing up — every action earns XP ⚡
      </p>
    </div>
  );
}

export default GamificationScreen;
