// ============================================================
// MJ's Superstars - Mood Screen
// Check in with yourself. No judgment. Just honesty.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { MoodAPI, TokenManager } from '../../services/api';
import { moodEmoji, moodLabel } from '../../utils/moodHelpers';
import { useToast } from '../shared/Toast';
import { Celebration } from '../animations';
import * as haptics from '../../services/haptics';

// Warm, non-preachy affirmations based on mood score
const AFFIRMATIONS = {
  1: [
    "Rough days don't last. You do.",
    "You showed up and checked in. That matters.",
    "Even on the hard days, you're still moving forward.",
    "Naming it is the first step to changing it."
  ],
  2: [
    "Not every day has to be great. Some just have to be gotten through.",
    "Checking in when it's tough takes courage.",
    "You're handling more than people realize.",
    "It's okay to not be okay. You're still here."
  ],
  3: [
    "Steady is underrated. You're doing fine.",
    "Middle ground is still solid ground.",
    "Not everything needs to be amazing. Sometimes okay is enough.",
    "Balance looks different every day. Today counts."
  ],
  4: [
    "That's the energy. Ride it.",
    "Good days deserve to be noticed too.",
    "Something's working. Keep doing that.",
    "You earned this feeling."
  ],
  5: [
    "Look at you. Genuinely thriving.",
    "Remember this feeling when the tough days come.",
    "You built this momentum. Own it.",
    "This is what taking care of yourself looks like."
  ]
};

function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [recentMoods, setRecentMoods] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [affirmation, setAffirmation] = useState('');
  const [streak, setStreak] = useState(0);
  const { addToast } = useToast();
  const isGuest = !TokenManager.isAuthenticated();

  // Calculate streak from mood history
  const calculateStreak = useCallback((moods) => {
    if (!moods || moods.length === 0) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < Math.min(moods.length, 60); i++) {
      const moodDate = new Date(moods[i].created_at);
      moodDate.setHours(0, 0, 0, 0);
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - count);

      if (moodDate.getTime() === targetDate.getTime()) {
        count++;
      } else if (moodDate.getTime() < targetDate.getTime()) {
        break;
      }
    }
    return count;
  }, []);

  useEffect(() => {
    const loadMoods = async () => {
      if (isGuest) {
        const stored = localStorage.getItem('mj_guest_moods');
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentMoods(parsed);
          setStreak(calculateStreak(parsed));
        }
        return;
      }
      try {
        const response = await MoodAPI.list();
        const moods = response.moods || response || [];
        setRecentMoods(moods);
        setStreak(calculateStreak(moods));
      } catch (err) {
        console.error('Failed to load moods:', err);
        const stored = localStorage.getItem('mj_guest_moods');
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentMoods(parsed);
          setStreak(calculateStreak(parsed));
        }
      }
    };
    loadMoods();
  }, [isGuest, calculateStreak]);

  const handleMoodSelect = (score) => {
    setSelectedMood(score);
    try { haptics.selection(); } catch(e) {}
  };

  const submitMood = async () => {
    if (!selectedMood || loading) return;
    setLoading(true);
    const newMood = { mood_score: selectedMood, note, created_at: new Date().toISOString() };

    // Pick a random affirmation for this mood
    const msgs = AFFIRMATIONS[selectedMood] || AFFIRMATIONS[3];
    setAffirmation(msgs[Math.floor(Math.random() * msgs.length)]);

    try {
      if (!isGuest) {
        await MoodAPI.log({
          mood_score: selectedMood,
          note: note || undefined,
          source: 'manual'
        });
      }

      const updated = [newMood, ...recentMoods].slice(0, 50);
      localStorage.setItem('mj_guest_moods', JSON.stringify(updated));
      setRecentMoods(updated);

      // Haptic + celebration based on mood
      if (selectedMood >= 4) {
        try { haptics.achievementUnlocked(); } catch(e) {}
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        try { haptics.moodLogged(); } catch(e) {}
      }

      // Update streak
      const newStreak = calculateStreak(updated);
      setStreak(newStreak);

      // Streak milestones
      if (newStreak > 0 && newStreak % 3 === 0) {
        try { haptics.streakMilestone(); } catch(e) {}
        addToast(`${newStreak}-day check-in streak! You're building a habit.`, 'streak');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSelectedMood(null);
        setNote('');
      }, 3000);
    } catch (err) {
      console.error('Failed to log mood:', err);
      // Still save locally as fallback
      const updated = [newMood, ...recentMoods].slice(0, 50);
      localStorage.setItem('mj_guest_moods', JSON.stringify(updated));
      setRecentMoods(updated);
      try { haptics.moodLogged(); } catch(e) {}
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setSelectedMood(null); setNote(''); }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <Celebration active={showCelebration} />

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Check in with yourself</h1>
        {streak > 1 && (
          <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-orange-400 text-xs font-semibold">{streak}</span>
          </div>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-6">No judgment. Just honesty. That's where growth starts.</p>

      {submitted ? (
        <div className="bg-slate-800 rounded-2xl p-6 text-center mb-6">
          <span className="text-5xl block mb-3">{moodEmoji(selectedMood || 3)}</span>
          <p className="text-white font-medium mb-2">Logged.</p>
          <p className="text-slate-300 text-sm leading-relaxed">{affirmation}</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => handleMoodSelect(score)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    selectedMood === score
                      ? 'bg-sky-600/20 ring-2 ring-sky-500 scale-110'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-3xl">{moodEmoji(score)}</span>
                  <span className={`text-xs ${selectedMood === score ? 'text-sky-400' : 'text-slate-400'}`}>
                    {moodLabel(score)}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's behind this feeling? (optional)"
              rows={3}
              className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400 mt-2"
            />

            <button
              onClick={submitMood}
              disabled={!selectedMood || loading}
              className="w-full mt-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? 'Logging...' : selectedMood ? 'Log how I feel' : 'Pick a mood above'}
            </button>
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold text-white mb-3">Recent</h2>
      <div className="space-y-2">
        {recentMoods.slice(0, 7).map((mood, i) => (
          <div key={i} className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{moodEmoji(mood.mood_score)}</span>
              <div>
                <p className="text-white text-sm font-medium">{moodLabel(mood.mood_score)}</p>
                {mood.note && <p className="text-slate-400 text-xs line-clamp-1">{mood.note}</p>}
              </div>
            </div>
            <span className="text-slate-500 text-xs">
              {new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
        {recentMoods.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">Your mood history will show up here once you start checking in.</p>
        )}
      </div>
    </div>
  );
}

export default MoodScreen;
