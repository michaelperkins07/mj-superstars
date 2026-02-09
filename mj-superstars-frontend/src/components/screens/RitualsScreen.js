import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as haptics from '../../services/haptics';
import { useToast } from '../shared/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { RitualAPI } from '../../services/api';

// Sub-component: Streak Badge
function StreakBadge({ count }) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-400/50 rounded-full"
    >
      <span className="text-xl">🔥</span>
      <span className="text-sm font-semibold text-orange-300">{count} day streak</span>
    </motion.div>
  );
}

// Sub-component: Emoji Mood Selector (1-5)
function MoodSelector({ value, onChange, label }) {
  const moods = [
    { emoji: '😢', label: 'Bad' },
    { emoji: '😔', label: 'Low' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '😄', label: 'Great' },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="flex justify-between gap-2">
        {moods.map((mood, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onChange(idx + 1);
              try {
                haptics.selection();
              } catch (e) {
                console.error('Haptics error:', e);
              }
            }}
            className={`flex-1 py-2 text-2xl rounded-lg transition-colors ${
              value === idx + 1
                ? 'bg-sky-400/30 ring-2 ring-sky-400'
                : 'bg-slate-700/30 hover:bg-slate-700/50'
            }`}
          >
            {mood.emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Sub-component: Sleep Readiness Scale (1-5)
function SleepReadinessScale({ value, onChange }) {
  const scales = [
    { emoji: '⚡', label: 'Wired' },
    { emoji: '😰', label: 'Anxious' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '😴', label: 'Drowsy' },
    { emoji: '💤', label: 'Ready' },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">Sleep Readiness</label>
      <div className="flex justify-between gap-2">
        {scales.map((scale, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onChange(idx + 1);
              try {
                haptics.selection();
              } catch (e) {
                console.error('Haptics error:', e);
              }
            }}
            className={`flex-1 py-2 text-2xl rounded-lg transition-colors ${
              value === idx + 1
                ? 'bg-violet-400/30 ring-2 ring-violet-400'
                : 'bg-slate-700/30 hover:bg-slate-700/50'
            }`}
          >
            {scale.emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Sub-component: Morning Ritual
function MorningRitual({ onComplete, existingData }) {
  const [intention, setIntention] = useState(existingData?.intention_text || '');
  const [focusWord, setFocusWord] = useState(existingData?.focus_word || '');
  const [mood, setMood] = useState(existingData?.mood_score || 0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!intention.trim()) {
      addToast('Please enter an intention', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      haptics.medium();

      if (user?.id) {
        // Authenticated mode
        await RitualAPI.setMorningIntention(intention, focusWord, mood);
      } else {
        // Guest mode - localStorage
        const existing = JSON.parse(localStorage.getItem('mj_morning_intentions') || '[]');
        const today = new Date().toISOString().split('T')[0];

        // Remove today's entry if exists
        const filtered = existing.filter(e => e.date !== today);

        const newEntry = {
          intention_text: intention,
          focus_word: focusWord,
          mood_score: mood,
          date: today,
          created_at: new Date().toISOString(),
          reflection: '',
          intention_met: null,
        };

        const updated = [newEntry, ...filtered].slice(0, 50);
        localStorage.setItem('mj_morning_intentions', JSON.stringify(updated));
      }

      addToast('Morning intention saved! 🌅', 'success');
      onComplete();
    } catch (error) {
      console.error('Error saving morning ritual:', error);
      addToast('Failed to save intention', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">What's your intention for today?</label>
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Set a meaningful intention for today..."
          className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 resize-none"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Focus word (optional)</label>
        <input
          type="text"
          value={focusWord}
          onChange={(e) => setFocusWord(e.target.value)}
          placeholder="e.g., Patience, Growth, Calm"
          className="w-full px-4 py-2 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
        />
      </div>

      <MoodSelector value={mood} onChange={setMood} label="How are you feeling?" />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-sky-400/20 to-cyan-400/20 border border-sky-400/50 rounded-lg font-semibold text-white hover:from-sky-400/30 hover:to-cyan-400/30 disabled:opacity-50 transition-all"
      >
        {isLoading ? 'Saving...' : 'Save Intention'}
      </motion.button>
    </motion.div>
  );
}

// Sub-component: Evening Ritual
function EveningRitual({ onComplete, existingData }) {
  const [wentWell, setWentWell] = useState(existingData?.went_well || '');
  const [letGo, setLetGo] = useState(existingData?.let_go || '');
  const [grateful, setGrateful] = useState(existingData?.grateful_for || '');
  const [tomorrowIntention, setTomorrowIntention] = useState(existingData?.tomorrow_intention || '');
  const [mood, setMood] = useState(existingData?.evening_mood || 0);
  const [sleep, setSleep] = useState(existingData?.sleep_readiness || 0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!wentWell.trim() || !grateful.trim()) {
      addToast('Please fill in what went well and what you are grateful for', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      haptics.medium();

      if (user?.id) {
        // Authenticated mode
        await RitualAPI.completeEvening({
          went_well: wentWell,
          let_go: letGo,
          grateful_for: grateful,
          tomorrow_intention: tomorrowIntention,
          evening_mood: mood,
          sleep_readiness: sleep,
        });
      } else {
        // Guest mode - localStorage
        const existing = JSON.parse(localStorage.getItem('mj_evening_reflections') || '[]');
        const today = new Date().toISOString().split('T')[0];

        // Remove today's entry if exists
        const filtered = existing.filter(e => e.date !== today);

        const newEntry = {
          went_well: wentWell,
          let_go: letGo,
          grateful_for: grateful,
          tomorrow_intention: tomorrowIntention,
          evening_mood: mood,
          sleep_readiness: sleep,
          date: today,
          created_at: new Date().toISOString(),
        };

        const updated = [newEntry, ...filtered].slice(0, 50);
        localStorage.setItem('mj_evening_reflections', JSON.stringify(updated));
      }

      addToast('Evening reflection completed! 🌙', 'success');
      onComplete();
    } catch (error) {
      console.error('Error saving evening ritual:', error);
      addToast('Failed to save reflection', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">What went well today?</label>
        <textarea
          value={wentWell}
          onChange={(e) => setWentWell(e.target.value)}
          placeholder="Share a moment or accomplishment from today..."
          className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">What can you let go of?</label>
        <textarea
          value={letGo}
          onChange={(e) => setLetGo(e.target.value)}
          placeholder="What worries or regrets can you release?"
          className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">What are you grateful for?</label>
        <textarea
          value={grateful}
          onChange={(e) => setGrateful(e.target.value)}
          placeholder="Three things, big or small..."
          className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Intention for tomorrow?</label>
        <textarea
          value={tomorrowIntention}
          onChange={(e) => setTomorrowIntention(e.target.value)}
          placeholder="What will you focus on tomorrow?"
          className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 resize-none"
          rows={3}
        />
      </div>

      <MoodSelector value={mood} onChange={setMood} label="How are you feeling?" />
      <SleepReadinessScale value={sleep} onChange={setSleep} />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-violet-400/20 to-purple-400/20 border border-violet-400/50 rounded-lg font-semibold text-white hover:from-violet-400/30 hover:to-purple-400/30 disabled:opacity-50 transition-all"
      >
        {isLoading ? 'Saving...' : 'Complete Reflection'}
      </motion.button>
    </motion.div>
  );
}

// Sub-component: Completed State
function CompletedState({ ritual, type }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (type === 'morning') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-sky-400/10 border border-sky-400/30 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <span className="text-sm text-sky-300 font-semibold">Morning intention set</span>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-sm text-slate-400">Intention</p>
          <p className="text-white font-medium mt-1">{ritual.intention_text}</p>
        </div>
        {ritual.focus_word && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-sm text-slate-400">Focus word</p>
            <p className="text-white font-medium mt-1">{ritual.focus_word}</p>
          </div>
        )}
        <p className="text-xs text-slate-400">{formatDate(ritual.created_at)}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-violet-400/10 border border-violet-400/30 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎉</span>
        <span className="text-sm text-violet-300 font-semibold">Evening reflection complete</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-700/30 rounded p-2">
          <p className="text-slate-400 text-xs">Went well</p>
          <p className="text-white mt-1 line-clamp-2">{ritual.went_well}</p>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <p className="text-slate-400 text-xs">Grateful for</p>
          <p className="text-white mt-1 line-clamp-2">{ritual.grateful_for}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">{formatDate(ritual.created_at)}</p>
    </motion.div>
  );
}

// Sub-component: History List
function HistoryList({ entries, type }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No {type} entries yet. Start building your ritual practice!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 5).map((entry, idx) => {
        const date = new Date(entry.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (type === 'morning') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-slate-400">{dateStr}</p>
                  <p className="text-sm text-white mt-1 line-clamp-2">{entry.intention_text}</p>
                </div>
                {entry.mood_score > 0 && <span className="text-lg">{"😢😔😐🙂😄"[entry.mood_score - 1]}</span>}
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-slate-400">{dateStr}</p>
                <p className="text-sm text-white mt-1 line-clamp-1">Well: {entry.went_well}</p>
              </div>
              {entry.evening_mood > 0 && <span className="text-lg">{"😢😔😐🙂😄"[entry.evening_mood - 1]}</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Main Component
export default function RitualsScreen({ onNavigateTo }) {
  const [activeTab, setActiveTab] = useState('morning');
  const [morningData, setMorningData] = useState(null);
  const [eveningData, setEveningData] = useState(null);
  const [morningHistory, setMorningHistory] = useState([]);
  const [eveningHistory, setEveningHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const currentHour = new Date().getHours();
  const suggestedTab = currentHour < 14 ? 'morning' : 'evening';

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && user?.id) {
        // Authenticated mode
        const today = new Date().toISOString().split('T')[0];
        const [morning, evening, morningHist, eveningHist] = await Promise.all([
          RitualAPI.getMorningToday(),
          RitualAPI.getEveningToday(),
          RitualAPI.getMorningHistory(),
          RitualAPI.getEveningHistory(),
        ]);

        setMorningData(morning);
        setEveningData(evening);
        setMorningHistory(morningHist || []);
        setEveningHistory(eveningHist || []);
        calculateStreak([...(morningHist || []), ...(eveningHist || [])]);
      } else {
        // Guest mode - localStorage
        const morningEntries = JSON.parse(localStorage.getItem('mj_morning_intentions') || '[]');
        const eveningEntries = JSON.parse(localStorage.getItem('mj_evening_reflections') || '[]');
        const today = new Date().toISOString().split('T')[0];

        const todayMorning = morningEntries.find(e => e.date === today);
        const todayEvening = eveningEntries.find(e => e.date === today);

        setMorningData(todayMorning || null);
        setEveningData(todayEvening || null);
        setMorningHistory(morningEntries);
        setEveningHistory(eveningEntries);
        calculateLocalStreak(morningEntries, eveningEntries);
      }
    } catch (error) {
      console.error('Error loading ritual data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLocalStreak = (morningEntries, eveningEntries) => {
    const allEntries = [...morningEntries, ...eveningEntries];
    if (allEntries.length === 0) {
      setStreak(0);
      return;
    }

    const sortedDates = [...new Set(allEntries.map(e => e.date))].sort().reverse();
    let currentStreak = 0;
    let expectedDate = new Date().toISOString().split('T')[0];

    for (const date of sortedDates) {
      if (date === expectedDate) {
        currentStreak++;
        expectedDate = new Date(new Date(expectedDate).getTime() - 86400000).toISOString().split('T')[0];
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  const calculateStreak = (entries) => {
    if (!entries || entries.length === 0) {
      setStreak(0);
      return;
    }

    const sortedDates = [...new Set(entries.map(e => e.date || e.created_at?.split('T')[0]))].sort().reverse();
    let currentStreak = 0;
    let expectedDate = new Date().toISOString().split('T')[0];

    for (const date of sortedDates) {
      if (date === expectedDate) {
        currentStreak++;
        expectedDate = new Date(new Date(expectedDate).getTime() - 86400000).toISOString().split('T')[0];
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  const handleRitualComplete = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          ✨
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-900 text-white p-4 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onNavigateTo && (
              <button
                onClick={() => { try { haptics.selection(); } catch(e) {} onNavigateTo('mood'); }}
                className="text-slate-400 hover:text-white transition-colors text-2xl"
              >
                ‹
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold">Daily Rituals</h1>
              <p className="text-sm text-slate-400">Build your practice</p>
            </div>
          </div>
          <div className="text-4xl">{currentHour < 14 ? '🌅' : '🌙'}</div>
        </div>

        {streak > 0 && <StreakBadge count={streak} />}
      </motion.div>

      {/* Tab Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-2 mb-6"
      >
        {['morning', 'evening'].map((tab) => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveTab(tab);
              try {
                haptics.selection();
              } catch (e) {
                console.error('Haptics error:', e);
              }
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
              activeTab === tab
                ? tab === 'morning'
                  ? 'bg-sky-400/20 border border-sky-400/50 text-sky-300'
                  : 'bg-violet-400/20 border border-violet-400/50 text-violet-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'morning' ? '🌅 Morning' : '🌙 Evening'}
            {tab === 'morning' && morningData && <span className="ml-1">✓</span>}
            {tab === 'evening' && eveningData && <span className="ml-1">✓</span>}
          </motion.button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'morning' ? (
          <motion.div key="morning" className="space-y-4">
            {morningData ? (
              <CompletedState ritual={morningData} type="morning" />
            ) : (
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-4">
                <MorningRitual onComplete={handleRitualComplete} existingData={morningData} />
              </div>
            )}

            {/* Morning History */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3"
            >
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <span className="font-semibold text-slate-300">Recent Morning Entries</span>
                <span className="text-xl">{showHistory ? '▼' : '▶'}</span>
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-slate-700/30"
                  >
                    <HistoryList entries={morningHistory} type="morning" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="evening" className="space-y-4">
            {eveningData ? (
              <CompletedState ritual={eveningData} type="evening" />
            ) : (
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-4">
                <EveningRitual onComplete={handleRitualComplete} existingData={eveningData} />
              </div>
            )}

            {/* Evening History */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3"
            >
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <span className="font-semibold text-slate-300">Recent Evening Entries</span>
                <span className="text-xl">{showHistory ? '▼' : '▶'}</span>
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-slate-700/30"
                  >
                    <HistoryList entries={eveningHistory} type="evening" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety space at bottom */}
      <div className="h-8" />
    </div>
  );
}
