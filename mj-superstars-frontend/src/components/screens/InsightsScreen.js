import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as haptics from '../../services/haptics';
import { useToast } from '../shared/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { InsightsAPI, ProgressAPI } from '../../services/api';

// Helpers for guest data retrieval
const getMoodEntries = () => {
  try {
    const raw = localStorage.getItem('mj_mood_entries');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getTasks = () => {
  try {
    const raw = localStorage.getItem('mj_tasks');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getJournalEntries = () => {
  try {
    const raw = localStorage.getItem('mj_journal_entries');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getChatMessages = () => {
  try {
    const raw = localStorage.getItem('mj_chat_messages');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// Mood emoji helpers
const moodEmoji = (score) => {
  if (score <= 1) return '😔';
  if (score <= 2) return '😐';
  if (score <= 3) return '😐';
  if (score <= 4) return '😊';
  return '😄';
};

const getPeriodRange = (days) => {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end: now };
};

const filterDataByPeriod = (entries, days) => {
  const { start } = getPeriodRange(days);
  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp || entry.createdAt);
    return entryDate >= start;
  });
};

const calculateMoodStats = (entries) => {
  if (entries.length === 0) return { average: 0, highest: 0, lowest: 5 };
  const moods = entries.map((e) => e.mood || 3);
  const average = moods.reduce((a, b) => a + b, 0) / moods.length;
  return { average: parseFloat(average.toFixed(1)), highest: Math.max(...moods), lowest: Math.min(...moods), total: moods.length };
};

const groupByDay = (entries) => {
  const grouped = {};
  entries.forEach((entry) => {
    const date = new Date(entry.timestamp || entry.createdAt);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(entry.mood || 3);
  });
  return Object.entries(grouped).map(([day, moods]) => ({
    day, average: moods.reduce((a, b) => a + b, 0) / moods.length, count: moods.length,
  }));
};

// SVG Line Chart Component
const MoodTrendChart = ({ entries, days }) => {
  const moodData = useMemo(() => {
    if (entries.length === 0) return [];
    const grouped = {};
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp || entry.createdAt);
      const dayKey = date.toLocaleDateString('en-US');
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(entry.mood || 3);
    });
    return Object.entries(grouped)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, moods]) => ({ date, mood: moods.reduce((a, b) => a + b, 0) / moods.length }));
  }, [entries, days]);

  if (moodData.length === 0) {
    return (<div className="h-40 flex items-center justify-center text-slate-400">No mood data for this period</div>);
  }

  const padding = 40;
  const width = 300;
  const height = 200;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const min = 1;
  const max = 5;
  const range = max - min;

  const points = moodData.map((d, i) => {
    const x = moodData.length === 1 ? width / 2 : (i / (moodData.length - 1)) * chartWidth + padding;
    const y = height - padding - ((d.mood - min) / range) * chartHeight;
    return { x, y, mood: d.mood, date: d.date };
  });

  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 3;
    const cp2x = p.x - (p.x - prev.x) / 3;
    return `C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
  }).join(' ');

  const fillPathD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const avgMood = moodData.reduce((sum, d) => sum + d.mood, 0) / moodData.length;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(56, 189, 248)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(56, 189, 248)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[1, 2, 3, 4, 5].map((mood) => {
          const y = height - padding - ((mood - min) / range) * chartHeight;
          return (<line key={`grid-${mood}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgb(71, 85, 105)" strokeDasharray="4" opacity="0.3" />);
        })}
        <path d={fillPathD} fill="url(#moodGradient)" />
        <path d={pathD} stroke="rgb(56, 189, 248)" strokeWidth="2" fill="none" />
        {points.map((p, i) => (<circle key={`point-${i}`} cx={p.x} cy={p.y} r="4" fill="rgb(56, 189, 248)" stroke="rgb(15, 23, 42)" strokeWidth="2" />))}
        {[1, 2, 3, 4, 5].map((mood) => {
          const y = height - padding - ((mood - min) / range) * chartHeight;
          return (<text key={`label-${mood}`} x="10" y={y + 5} fontSize="12" fill="rgb(148, 163, 184)">{mood}</text>);
        })}
      </svg>
      <p className="text-center text-slate-300 text-sm mt-3">Your average mood: <span className="text-sky-400 font-semibold">{avgMood.toFixed(1)}</span></p>
    </div>
  );
};

// Weekly Summary Card
const WeeklySummaryCard = ({ moodCount, tasksDone, journalCount, chatCount }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4">This Week at a Glance</h3>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
        <div className="text-2xl mb-1">🎯</div>
        <div className="text-2xl font-bold text-sky-400">{moodCount}</div>
        <div className="text-xs text-slate-400 mt-1">Mood Logs</div>
      </div>
      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
        <div className="text-2xl mb-1">✅</div>
        <div className="text-2xl font-bold text-violet-400">{tasksDone}</div>
        <div className="text-xs text-slate-400 mt-1">Tasks Done</div>
      </div>
      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
        <div className="text-2xl mb-1">📝</div>
        <div className="text-2xl font-bold text-cyan-400">{journalCount}</div>
        <div className="text-xs text-slate-400 mt-1">Journal Entries</div>
      </div>
      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
        <div className="text-2xl mb-1">💬</div>
        <div className="text-2xl font-bold text-purple-400">{chatCount}</div>
        <div className="text-xs text-slate-400 mt-1">Chat Sessions</div>
      </div>
    </div>
  </motion.div>
);

// Best & Toughest Days Card
const DaysCard = ({ daysByMood }) => {
  const bestDay = daysByMood.length > 0 ? daysByMood.reduce((a, b) => (a.average > b.average ? a : b)) : null;
  const toughestDay = daysByMood.length > 0 ? daysByMood.reduce((a, b) => (a.average < b.average ? a : b)) : null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
      {bestDay && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-2">Best Day</div>
          <div className="text-2xl font-bold text-white mb-1">{bestDay.day}</div>
          <div className="text-3xl mb-2">{moodEmoji(Math.round(bestDay.average))}</div>
          <div className="text-xs text-slate-400">Mood: {bestDay.average.toFixed(1)}/5</div>
        </div>
      )}
      {toughestDay && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-2">Toughest Day</div>
          <div className="text-2xl font-bold text-white mb-1">{toughestDay.day}</div>
          <div className="text-3xl mb-2">{moodEmoji(Math.round(toughestDay.average))}</div>
          <div className="text-xs text-slate-400">Mood: {toughestDay.average.toFixed(1)}/5</div>
        </div>
      )}
    </motion.div>
  );
};

// Streaks Card
const StreaksCard = ({ moodCount, tasksDone, journalCount }) => {
  const streaks = [
    { label: 'Mood Logging', count: moodCount, emoji: '🎯' },
    { label: 'Task Completion', count: tasksDone, emoji: '✅' },
    { label: 'Journaling', count: journalCount, emoji: '📝' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Streaks & Activity</h3>
      <div className="space-y-3">
        {streaks.map((streak, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{streak.emoji}</span>
              <span className="text-slate-300">{streak.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{streak.count}</span>
              {streak.count > 5 && <span className="text-orange-400">🔥</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Empty State
const EmptyState = ({ onNavigateToMoods, onNavigateToJournal }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl p-6 border border-slate-700/50 text-center">
    <div className="text-4xl mb-3">📊</div>
    <h3 className="text-xl font-semibold text-white mb-2">Start Your Insights Journey</h3>
    <p className="text-slate-400 text-sm mb-6">Log your moods and journal entries to unlock personalized insights about your mental health patterns.</p>
    <div className="space-y-2">
      <button onClick={onNavigateToMoods} className="w-full bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-900 font-semibold py-2 px-4 rounded-lg transition">Start Logging Moods</button>
      <button onClick={onNavigateToJournal} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition">Write a Journal Entry</button>
    </div>
  </motion.div>
);

// Main Component
export default function InsightsScreen({ onNavigateTo }) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);

  const fetchAuthenticatedData = useCallback(async () => {
    try {
      setLoading(true);
      const [patterns, progress] = await Promise.all([
        InsightsAPI.getMoodPatterns(period),
        InsightsAPI.getProgressSummary(period <= 7 ? '7d' : period <= 30 ? '30d' : '90d'),
      ]);
      setApiData({ patterns, progress });
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAuthenticatedData();
    }
  }, [isAuthenticated, user, period, fetchAuthenticatedData]);

  const allMoodEntries = useMemo(() => getMoodEntries(), []);
  const periodMoodEntries = useMemo(() => filterDataByPeriod(allMoodEntries, period), [allMoodEntries, period]);
  const allTasks = useMemo(() => getTasks(), []);
  const periodTasks = useMemo(() => filterDataByPeriod(allTasks, period), [allTasks, period]);
  const completedTasks = useMemo(() => periodTasks.filter((t) => t.completed).length, [periodTasks]);
  const allJournalEntries = useMemo(() => getJournalEntries(), []);
  const periodJournalEntries = useMemo(() => filterDataByPeriod(allJournalEntries, period), [allJournalEntries, period]);
  const chatMessages = useMemo(() => getChatMessages(), []);
  const periodChatMessages = useMemo(() => filterDataByPeriod(chatMessages, period), [chatMessages, period]);
  const daysByMood = useMemo(() => groupByDay(periodMoodEntries), [periodMoodEntries]);
  const hasData = periodMoodEntries.length > 0 || completedTasks > 0 || periodJournalEntries.length > 0;

  const handlePeriodChange = useCallback((days) => {
    haptics.selection();
    setPeriod(days);
  }, []);

  const handleNavigateToMoods = useCallback(() => {
    haptics.selection();
    if (onNavigateTo) onNavigateTo('mood');
  }, [onNavigateTo]);

  const handleNavigateToJournal = useCallback(() => {
    haptics.selection();
    if (onNavigateTo) onNavigateTo('journal');
  }, [onNavigateTo]);

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Your Insights <span>✨</span></h1>
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <button key={days} onClick={() => handlePeriodChange(days)} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${period === days ? 'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{days}D</button>
            ))}
          </div>
        </div>
      </motion.div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border border-sky-400 border-t-transparent" />
            </motion.div>
          ) : !hasData ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState onNavigateToMoods={handleNavigateToMoods} onNavigateToJournal={handleNavigateToJournal} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <WeeklySummaryCard moodCount={periodMoodEntries.length} tasksDone={completedTasks} journalCount={periodJournalEntries.length} chatCount={Math.ceil(periodChatMessages.length / 10)} />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Mood Trend</h3>
                <MoodTrendChart entries={periodMoodEntries} days={period} />
              </motion.div>
              {daysByMood.length > 0 && <DaysCard daysByMood={daysByMood} />}
              <StreaksCard moodCount={periodMoodEntries.length} tasksDone={completedTasks} journalCount={periodJournalEntries.length} />
              {periodMoodEntries.length >= 7 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">What Helps Your Mood</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3"><div className="h-2 bg-sky-400 rounded" style={{ width: '85%' }} /><span className="text-sm text-slate-300">Journaling</span></div>
                    <div className="flex items-center gap-3"><div className="h-2 bg-violet-400 rounded" style={{ width: '72%' }} /><span className="text-sm text-slate-300">Task Completion</span></div>
                    <div className="flex items-center gap-3"><div className="h-2 bg-cyan-400 rounded" style={{ width: '68%' }} /><span className="text-sm text-slate-300">Chat Sessions</span></div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
