// ============================================================
// MJ's Superstars - Explore Hub Screen
// ============================================================
// Discovery hub: Quick Coping Tools, Daily Content, Gamification,
// Social, Photos, Rituals. Designed to work for both guests and
// authenticated users with graceful degradation.

import React, { useState, useEffect } from 'react';
import { ContentAPI, GamificationAPI, SocialAPI, RitualAPI, TokenManager } from '../../services/api';
import { useToast } from '../shared/Toast';
import * as haptics from '../../services/haptics';

// ============================================================
// QUICK COPING EXERCISES (works without auth)
// ============================================================
const QUICK_EXERCISES = [
  {
    id: 'breath_4_7_8',
    name: '4-7-8 Breathing',
    emoji: '🌬️',
    duration: '1 min',
    color: 'from-sky-500/20 to-cyan-500/20',
    border: 'border-sky-500/30',
    accent: 'text-sky-400',
    steps: [
      { text: 'Breathe in through your nose', time: 4 },
      { text: 'Hold your breath', time: 7 },
      { text: 'Exhale slowly through your mouth', time: 8 },
    ],
    rounds: 3
  },
  {
    id: 'grounding_5_4_3_2_1',
    name: '5-4-3-2-1 Grounding',
    emoji: '🌍',
    duration: '2 min',
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    steps: [
      { text: 'Notice 5 things you can SEE', time: 15 },
      { text: 'Notice 4 things you can TOUCH', time: 12 },
      { text: 'Notice 3 things you can HEAR', time: 10 },
      { text: 'Notice 2 things you can SMELL', time: 8 },
      { text: 'Notice 1 thing you can TASTE', time: 6 },
    ],
    rounds: 1
  },
  {
    id: 'body_scan',
    name: 'Quick Body Scan',
    emoji: '🧘',
    duration: '2 min',
    color: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
    steps: [
      { text: 'Close your eyes. Take a deep breath', time: 8 },
      { text: 'Notice tension in your forehead — relax it', time: 8 },
      { text: 'Unclench your jaw', time: 6 },
      { text: 'Drop your shoulders away from your ears', time: 8 },
      { text: 'Unclench your hands', time: 6 },
      { text: 'Take one more slow, deep breath', time: 8 },
    ],
    rounds: 1
  },
  {
    id: 'cold_water',
    name: 'Cold Water Reset',
    emoji: '💧',
    duration: '30 sec',
    color: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    steps: [
      { text: 'Run cold water over your wrists', time: 15 },
      { text: 'Take slow, deep breaths while you do this', time: 15 },
    ],
    rounds: 1
  }
];

// ============================================================
// GUIDED EXERCISE COMPONENT
// ============================================================
function GuidedExercise({ exercise, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(exercise.steps[0].time);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { addToast } = useToast();

  const totalSteps = exercise.steps.length;
  const step = exercise.steps[currentStep];

  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Move to next step
      haptics.light();
      if (currentStep < totalSteps - 1) {
        setCurrentStep(prev => prev + 1);
        setTimeLeft(exercise.steps[currentStep + 1].time);
      } else if (currentRound < exercise.rounds) {
        setCurrentRound(prev => prev + 1);
        setCurrentStep(0);
        setTimeLeft(exercise.steps[0].time);
      } else {
        setIsRunning(false);
        setIsComplete(true);
        haptics.success();
        addToast('Nice work. That took real effort.', 'success');
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, currentStep, currentRound]);

  const progress = isComplete ? 100 :
    ((currentRound - 1) * totalSteps + currentStep) / (exercise.rounds * totalSteps) * 100 +
    ((exercise.steps[currentStep]?.time - timeLeft) / (exercise.steps[currentStep]?.time || 1)) * (100 / (exercise.rounds * totalSteps));

  if (isComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 px-6">
        <div className="text-6xl mb-6">✨</div>
        <h2 className="text-2xl font-bold text-white mb-2">Done.</h2>
        <p className="text-slate-400 text-center mb-8">
          You just did something most people won't — you stopped and took care of yourself.
        </p>
        <button
          onClick={onClose}
          className="bg-sky-500 hover:bg-sky-400 text-white rounded-xl px-8 py-3 font-semibold transition-colors"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        {exercise.rounds > 1 && (
          <span className="text-slate-500 text-sm">Round {currentRound}/{exercise.rounds}</span>
        )}
      </div>

      {/* Exercise Title */}
      <div className="text-center mb-4">
        <span className="text-4xl">{exercise.emoji}</span>
        <h2 className="text-xl font-bold text-white mt-2">{exercise.name}</h2>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-12">
        <div
          className="bg-gradient-to-r from-sky-400 to-emerald-400 h-1.5 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-white text-xl text-center font-medium mb-8 leading-relaxed">
          {step.text}
        </p>

        {/* Timer Circle */}
        <div className="w-28 h-28 rounded-full border-4 border-sky-500/30 flex items-center justify-center mb-8">
          <span className="text-4xl font-bold text-white">{timeLeft}</span>
        </div>

        {!isRunning && !isComplete && (
          <button
            onClick={() => { setIsRunning(true); haptics.selection(); }}
            className="bg-sky-500 hover:bg-sky-400 text-white rounded-xl px-10 py-3 font-semibold transition-colors"
          >
            {currentStep === 0 && currentRound === 1 ? 'Start' : 'Resume'}
          </button>
        )}
        {isRunning && (
          <button
            onClick={() => setIsRunning(false)}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-10 py-3 font-semibold transition-colors"
          >
            Pause
          </button>
        )}
      </div>

      {/* Step indicator dots */}
      <div className="flex justify-center gap-2 mt-4">
        {exercise.steps.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx < currentStep ? 'bg-sky-400' : idx === currentStep ? 'bg-white' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPLORE SCREEN
// ============================================================
function ExploreScreen() {
  const { addToast } = useToast();
  const isGuest = !TokenManager.isAuthenticated();

  // View state
  const [activeExercise, setActiveExercise] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Content state
  const [dailyQuote, setDailyQuote] = useState(null);
  const [challenges, setChallenges] = useState([]);

  // Gamification state
  const [gamData, setGamData] = useState(null);
  const [gamLoading, setGamLoading] = useState(false);

  // Rituals state
  const [ritualsData, setRitualsData] = useState(null);
  const [ritualsLoading, setRitualsLoading] = useState(false);

  // Social state
  const [socialData, setSocialData] = useState(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);

  // Load lightweight content on mount (quotes work without auth)
  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    try {
      const data = await ContentAPI.getQuotes('motivation', 1);
      if (data?.quotes?.length > 0) {
        setDailyQuote(data.quotes[0]);
      }
    } catch (err) {
      // Quotes are non-critical, silent fail
      setDailyQuote({
        quote: "You're already doing the hardest part — showing up.",
        author: "MJ"
      });
    }
  };

  const loadChallenges = async () => {
    if (isGuest) return;
    try {
      const data = await ContentAPI.getChallenges(null, 3);
      setChallenges(data?.challenges || []);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
  };

  const loadGamification = async () => {
    if (isGuest) return;
    setGamLoading(true);
    try {
      const [summary, challenges, milestones] = await Promise.all([
        GamificationAPI.getSummary(),
        GamificationAPI.getChallenges(),
        GamificationAPI.getMilestones()
      ]);
      setGamData({
        summary: summary || { level: 1, xp: 0, streak: 0, xp_multiplier: 1, level_name: 'Sparked' },
        challenges: challenges || [],
        milestones: milestones || []
      });
    } catch (err) {
      console.error('Failed to load gamification:', err);
      setGamData({
        summary: { level: 1, xp: 0, streak: 0, xp_multiplier: 1, level_name: 'Sparked' },
        challenges: [],
        milestones: []
      });
    } finally {
      setGamLoading(false);
    }
  };

  const loadRituals = async () => {
    if (isGuest) return;
    setRitualsLoading(true);
    try {
      const rituals = await RitualAPI.list();
      setRitualsData(rituals || []);
    } catch (err) {
      console.error('Failed to load rituals:', err);
      setRitualsData([]);
    } finally {
      setRitualsLoading(false);
    }
  };

  const loadSocial = async () => {
    if (isGuest) return;
    setSocialLoading(true);
    try {
      const feed = await SocialAPI.getFeed(1);
      setSocialData(feed || { posts: [] });
    } catch (err) {
      console.error('Failed to load social:', err);
      setSocialData({ posts: [] });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleExpandSection = (section) => {
    haptics.selection();
    setExpandedSection(section);
    // Lazy load data
    if (section === 'gamification' && !gamData) loadGamification();
    if (section === 'rituals' && !ritualsData) loadRituals();
    if (section === 'social' && !socialData) loadSocial();
    if (section === 'challenges') loadChallenges();
  };

  const handleStartExercise = (exercise) => {
    haptics.medium();
    setActiveExercise(exercise);
  };

  // Get flame level
  const getFlameLevel = (streak) => {
    if (streak === 0) return { name: 'Cold', emoji: '❄️', gradient: 'from-blue-400 to-cyan-500' };
    if (streak < 5) return { name: 'Sparked', emoji: '✨', gradient: 'from-amber-300 to-yellow-400' };
    if (streak < 15) return { name: 'Warm', emoji: '🔥', gradient: 'from-orange-400 to-amber-500' };
    if (streak < 30) return { name: 'Hot', emoji: '🌶️', gradient: 'from-red-500 to-orange-600' };
    return { name: 'Legendary', emoji: '⚡', gradient: 'from-purple-500 to-pink-600' };
  };

  // ========== GUIDED EXERCISE VIEW ==========
  if (activeExercise) {
    return (
      <GuidedExercise
        exercise={activeExercise}
        onClose={() => setActiveExercise(null)}
      />
    );
  }

  // ========== EXPANDED SECTION VIEWS ==========

  // --- Gamification Expanded ---
  if (expandedSection === 'gamification') {
    if (isGuest) {
      return (
        <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
          <BackButton onClick={() => setExpandedSection(null)} title="Gamification" />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-xl font-bold text-white mb-2">Level Up Your Journey</h2>
            <p className="text-slate-400 text-center text-sm mb-6 px-4">
              Create an account to earn XP, unlock achievements, and track your streaks.
            </p>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 w-full max-w-xs">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400">Daily streaks</span>
                <span className="text-amber-400">🔥 Earn rewards</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400">XP & levels</span>
                <span className="text-violet-400">⚡ Track growth</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Challenges</span>
                <span className="text-sky-400">🏆 Compete</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const flame = getFlameLevel(gamData?.summary?.streak || 0);
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setExpandedSection(null)} title="Gamification Hub" />

        {gamLoading ? (
          <LoadingState />
        ) : (
          <>
            {/* Flame Level */}
            <div className={`bg-gradient-to-br ${flame.gradient} rounded-2xl p-6 mb-6 text-white`}>
              <div className="text-center">
                <div className="text-5xl mb-2">{flame.emoji}</div>
                <h2 className="text-2xl font-bold">{flame.name}</h2>
                <p className="text-sm opacity-80 mb-4">Current Streak Level</p>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.streak || 0}</p>
                    <p className="text-xs opacity-75">Day Streak</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.level || 1}</p>
                    <p className="text-xs opacity-75">Level</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.xp || 0}</p>
                    <p className="text-xs opacity-75">XP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold text-sm">Experience</span>
                <span className="text-sky-400 text-sm font-bold">{gamData?.summary?.xp_multiplier || 1}x boost</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-sky-400 to-violet-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((gamData?.summary?.xp || 0) % 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Challenges */}
            <h3 className="text-white font-bold text-lg mb-3">Active Challenges</h3>
            {gamData?.challenges?.length > 0 ? (
              <div className="space-y-3 mb-6">
                {gamData.challenges.slice(0, 5).map((c, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-semibold text-sm">{c.name || `Challenge ${idx + 1}`}</h4>
                      <span className="text-violet-400 text-xs font-bold">{c.reward_xp || 100} XP</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{c.description || 'Complete to earn rewards'}</p>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${Math.min((c.progress || 0) / (c.target || 1) * 100, 100)}%` }} />
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{c.progress || 0}/{c.target || 10}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No active challenges yet" sub="Check back soon!" className="mb-6" />
            )}

            {/* Milestones */}
            <h3 className="text-white font-bold text-lg mb-3">Milestones</h3>
            {gamData?.milestones?.length > 0 ? (
              <div className="space-y-3 pb-20">
                {gamData.milestones.slice(0, 5).map((m, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{m.name}</h4>
                      <p className="text-slate-400 text-xs">{m.description}</p>
                    </div>
                    {m.claimable && (
                      <button
                        onClick={async () => {
                          try {
                            await GamificationAPI.claimMilestone(m.id);
                            haptics.success();
                            addToast('Milestone claimed!', 'streak');
                            loadGamification();
                          } catch (err) {
                            console.error('Claim failed:', err);
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2 text-xs font-semibold"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No milestones yet" sub="Keep going — they'll unlock!" />
            )}
          </>
        )}
      </div>
    );
  }

  // --- Rituals Expanded ---
  if (expandedSection === 'rituals') {
    if (isGuest) {
      return (
        <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
          <BackButton onClick={() => setExpandedSection(null)} title="Daily Rituals" />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🌅</div>
            <h2 className="text-xl font-bold text-white mb-2">Build Better Habits</h2>
            <p className="text-slate-400 text-center text-sm mb-4 px-4">
              Create an account to set up daily rituals and track your consistency.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setExpandedSection(null)} title="Daily Rituals" />
        {ritualsLoading ? (
          <LoadingState />
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4">Check off your daily practices</p>
            {ritualsData?.length > 0 ? (
              <div className="space-y-3 pb-20">
                {ritualsData.map((ritual, idx) => {
                  const completed = ritual.completed_today || false;
                  return (
                    <div key={idx} className={`rounded-xl p-4 border transition-all ${
                      completed ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-slate-800 border-slate-700/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            try {
                              haptics.light();
                              await RitualAPI.complete(ritual.id);
                              haptics.success();
                              addToast('Ritual complete!', 'success');
                              loadRituals();
                            } catch (err) {
                              console.error('Failed:', err);
                            }
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                          }`}
                        >
                          {completed && <span className="text-white text-xs">✓</span>}
                        </button>
                        <div>
                          <h4 className={`font-semibold text-sm ${completed ? 'text-emerald-300 line-through' : 'text-white'}`}>
                            {ritual.name}
                          </h4>
                          <p className="text-slate-400 text-xs">{ritual.description || 'Daily practice'}</p>
                        </div>
                      </div>
                      {ritual.current_streak > 0 && (
                        <div className="flex items-center gap-1 mt-2 ml-9">
                          <span className="text-amber-400">🔥</span>
                          <span className="text-amber-400 font-bold text-xs">{ritual.current_streak} day streak</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No rituals set up yet" sub="Rituals help build lasting habits" />
            )}
          </>
        )}
      </div>
    );
  }

  // --- Social Expanded ---
  if (expandedSection === 'social') {
    if (isGuest) {
      return (
        <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
          <BackButton onClick={() => setExpandedSection(null)} title="Community" />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-xl font-bold text-white mb-2">You're Not Alone</h2>
            <p className="text-slate-400 text-center text-sm px-4">
              Create an account to share your journey and connect with others.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setExpandedSection(null)} title="Community" />
        {socialLoading ? (
          <LoadingState />
        ) : (
          <>
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-3 font-semibold mb-4 hover:from-sky-400 hover:to-blue-500 transition-all"
            >
              Share Your Journey
            </button>

            {showPostForm && (
              <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 mb-3 resize-none"
                  rows="3"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowPostForm(false)} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!postContent.trim()) return;
                      try {
                        await SocialAPI.createPost({ content: postContent, post_type: 'update' });
                        haptics.success();
                        addToast('Posted!', 'success');
                        setPostContent('');
                        setShowPostForm(false);
                        loadSocial();
                      } catch (err) {
                        addToast('Could not post right now', 'warning');
                      }
                    }}
                    className="flex-1 bg-sky-500 text-white rounded-lg py-2 text-sm font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}

            {socialData?.posts?.length > 0 ? (
              <div className="space-y-4 pb-20">
                {socialData.posts.map((post, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {post.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{post.user_name || 'User'}</p>
                        <p className="text-slate-500 text-xs">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now'}</p>
                      </div>
                    </div>
                    <p className="text-slate-200 text-sm mb-3">{post.content}</p>
                    <div className="flex gap-4 pt-2 border-t border-slate-700/30">
                      <button
                        onClick={async () => {
                          try { await SocialAPI.likePost(post.id, 'like'); haptics.light(); loadSocial(); } catch(e) {}
                        }}
                        className="text-slate-400 hover:text-sky-400 text-sm transition-colors"
                      >
                        👍 {post.likes_count || 0}
                      </button>
                      <button
                        onClick={async () => {
                          try { await SocialAPI.likePost(post.id, 'fire'); haptics.light(); loadSocial(); } catch(e) {}
                        }}
                        className="text-slate-400 hover:text-orange-400 text-sm transition-colors"
                      >
                        🔥 {post.fire_count || 0}
                      </button>
                      <button
                        onClick={async () => {
                          try { await SocialAPI.likePost(post.id, 'heart'); haptics.light(); loadSocial(); } catch(e) {}
                        }}
                        className="text-slate-400 hover:text-pink-400 text-sm transition-colors"
                      >
                        ❤️ {post.heart_count || 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No posts yet" sub="Be the first to share!" />
            )}
          </>
        )}
      </div>
    );
  }

  // --- Challenges Expanded ---
  if (expandedSection === 'challenges') {
    if (isGuest) {
      return (
        <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
          <BackButton onClick={() => setExpandedSection(null)} title="Challenges" />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-white mb-2">Challenge Yourself</h2>
            <p className="text-slate-400 text-center text-sm px-4">
              Create an account to join challenges and push your growth.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setExpandedSection(null)} title="Challenges" />
        {challenges.length > 0 ? (
          <div className="space-y-3 pb-20">
            {challenges.map((c, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">
                    {c.emoji || '🏆'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{c.title || c.name || 'Challenge'}</h3>
                    <p className="text-slate-400 text-xs mt-1">{c.description || ''}</p>
                    {c.difficulty && (
                      <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
                      </span>
                    )}
                    {c.xp_reward && (
                      <span className="inline-block mt-2 ml-2 text-xs font-semibold text-amber-400">+{c.xp_reward} XP</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No challenges available right now" sub="Check back soon for new challenges!" />
        )}
      </div>
    );
  }

  // ========== MAIN HUB VIEW ==========
  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-white mb-1">Explore</h1>
      <p className="text-slate-400 text-sm mb-6">Tools and practices to help you feel better right now</p>

      {/* ---- SECTION 1: Quick Coping Tools (works for everyone) ---- */}
      <div className="mb-6">
        <h2 className="text-white font-bold text-base mb-3">Quick Reset</h2>
        <p className="text-slate-400 text-xs mb-3">Guided exercises when you need them most</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_EXERCISES.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => handleStartExercise(exercise)}
              className={`bg-gradient-to-br ${exercise.color} border ${exercise.border} rounded-xl p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-transform`}
            >
              <div className="text-2xl mb-2">{exercise.emoji}</div>
              <h3 className="text-white font-semibold text-sm">{exercise.name}</h3>
              <p className="text-slate-400 text-xs mt-1">{exercise.duration}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ---- SECTION 2: Daily Quote ---- */}
      {dailyQuote && (
        <div className="mb-6 bg-slate-800/50 rounded-xl p-5 border border-slate-700/30">
          <p className="text-white text-sm italic leading-relaxed">"{dailyQuote.quote}"</p>
          {dailyQuote.author && (
            <p className="text-slate-500 text-xs mt-2">— {dailyQuote.author}</p>
          )}
          <button
            onClick={() => { loadQuote(); haptics.selection(); }}
            className="text-sky-400 text-xs mt-3 hover:text-sky-300 transition-colors"
          >
            ↻ New quote
          </button>
        </div>
      )}

      {/* ---- SECTION 3: Feature Cards Grid ---- */}
      <h2 className="text-white font-bold text-base mb-3">Your Journey</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Gamification */}
        <button
          onClick={() => handleExpandSection('gamification')}
          className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-4 text-left hover:border-violet-400/50 transition-all"
        >
          <div className="text-2xl mb-2">🎮</div>
          <h3 className="text-white font-bold text-sm">Level Up</h3>
          <p className="text-slate-400 text-xs mt-1">XP, streaks, achievements</p>
          {!isGuest && gamData?.summary && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-amber-400 text-sm">🔥</span>
              <span className="text-amber-400 text-xs font-bold">{gamData.summary.streak || 0}</span>
            </div>
          )}
        </button>

        {/* Rituals */}
        <button
          onClick={() => handleExpandSection('rituals')}
          className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 rounded-xl p-4 text-left hover:border-amber-300/50 transition-all"
        >
          <div className="text-2xl mb-2">🌅</div>
          <h3 className="text-white font-bold text-sm">Rituals</h3>
          <p className="text-slate-400 text-xs mt-1">Daily practices</p>
          {!isGuest && ritualsData && (
            <p className="text-amber-400 text-xs font-bold mt-2">{ritualsData.length} active</p>
          )}
        </button>

        {/* Social */}
        <button
          onClick={() => handleExpandSection('social')}
          className="bg-gradient-to-br from-sky-400/20 to-blue-500/20 border border-sky-400/30 rounded-xl p-4 text-left hover:border-sky-300/50 transition-all"
        >
          <div className="text-2xl mb-2">👥</div>
          <h3 className="text-white font-bold text-sm">Community</h3>
          <p className="text-slate-400 text-xs mt-1">Share your journey</p>
        </button>

        {/* Challenges */}
        <button
          onClick={() => handleExpandSection('challenges')}
          className="bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-400/30 rounded-xl p-4 text-left hover:border-emerald-300/50 transition-all"
        >
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="text-white font-bold text-sm">Challenges</h3>
          <p className="text-slate-400 text-xs mt-1">Push yourself</p>
        </button>
      </div>

      {/* ---- SECTION 4: Pro Tip ---- */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
        <p className="text-slate-300 text-sm">
          <span className="text-amber-400 font-bold">Tip:</span> The breathing exercises above work even when everything feels overwhelming. Start there.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function BackButton({ onClick, title }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onClick} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-xl font-bold text-white">{title}</h1>
    </div>
  );
}

function LoadingState() {
  return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;
}

function EmptyState({ message, sub, className = '' }) {
  return (
    <div className={`bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30 ${className}`}>
      <p className="text-slate-400 text-sm">{message}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default ExploreScreen;
