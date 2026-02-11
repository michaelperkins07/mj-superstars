// ============================================================
// Top Performer - Emotional State Tracker Screen
// "Be your best self" — Track Confidence, Energy, and Morals
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { MoodAPI, TokenManager } from '../../services/api';
import {
  confidenceEmoji, confidenceLabel, confidenceColor, CONFIDENCE_PROMPTS,
  energyEmoji, energyLabel, energyColor, ENERGY_PROMPTS,
  moralsEmoji, moralsLabel, moralsColor, MORALS_PROMPTS,
  getRandomAffirmation
} from '../../utils/moodHelpers';
import { useToast } from '../shared/Toast';
import { Celebration } from '../animations';
import * as haptics from '../../services/haptics';

// ============================================================
// TRACKER CONFIGURATIONS
// ============================================================
const TRACKERS = [
  {
    id: 'confidence',
    name: 'Confidence',
    icon: '💪',
    field: 'confidence_level',
    description: 'Be confident, not cocky. How do you feel about yourself?',
    gradient: 'from-sky-600/20 to-cyan-600/20',
    border: 'border-sky-500/30',
    ringColor: 'ring-sky-500',
    getEmoji: confidenceEmoji,
    getLabel: confidenceLabel,
    getColor: confidenceColor,
    prompts: CONFIDENCE_PROMPTS
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: '⚡',
    field: 'energy_level',
    description: 'Be urgent, but pay close attention to detail.',
    gradient: 'from-amber-600/20 to-orange-600/20',
    border: 'border-amber-500/30',
    ringColor: 'ring-amber-500',
    getEmoji: energyEmoji,
    getLabel: energyLabel,
    getColor: energyColor,
    prompts: ENERGY_PROMPTS
  },
  {
    id: 'morals',
    name: 'Morals',
    icon: '🌕',
    field: 'morals_score',
    description: 'Are you living your values? No comparing. No judging.',
    gradient: 'from-violet-600/20 to-fuchsia-600/20',
    border: 'border-violet-500/30',
    ringColor: 'ring-violet-500',
    getEmoji: moralsEmoji,
    getLabel: moralsLabel,
    getColor: moralsColor,
    prompts: MORALS_PROMPTS
  }
];

// ============================================================
// SINGLE TRACKER CARD COMPONENT
// ============================================================
function TrackerCard({ tracker, value, onChange, expanded, onToggle }) {
  return (
    <div className={`bg-gradient-to-br ${tracker.gradient} ${tracker.border} border rounded-2xl overflow-hidden transition-all duration-300`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tracker.icon}</span>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{tracker.name}</p>
            <p className="text-slate-400 text-xs">{tracker.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <span className={`text-lg ${tracker.getColor(value)}`}>
              {tracker.getEmoji(value)}
            </span>
          )}
          <span className={`text-slate-400 text-lg transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1">
          <div className="flex justify-between gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => {
                  onChange(score);
                  try { haptics.selection(); } catch(e) {}
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
                  value === score
                    ? `bg-slate-800/80 ${tracker.ringColor} ring-2 scale-105`
                    : 'bg-slate-800/40 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-xl">{tracker.getEmoji(score)}</span>
                <span className={`text-[10px] font-medium ${
                  value === score ? tracker.getColor(score) : 'text-slate-500'
                }`}>
                  {tracker.getLabel(score)}
                </span>
              </button>
            ))}
          </div>
          {value && (
            <p className="text-slate-300 text-xs text-center italic mt-2">
              {tracker.prompts[value]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RECENT TRACKER HISTORY ROW
// ============================================================
function TrackerHistoryRow({ entry }) {
  return (
    <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {entry.confidence_level && (
          <div className="flex flex-col items-center">
            <span className="text-lg">{confidenceEmoji(entry.confidence_level)}</span>
            <span className="text-[9px] text-slate-500">Conf</span>
          </div>
        )}
        {entry.energy_level && (
          <div className="flex flex-col items-center">
            <span className="text-lg">{energyEmoji(entry.energy_level)}</span>
            <span className="text-[9px] text-slate-500">Energy</span>
          </div>
        )}
        {entry.morals_score && (
          <div className="flex flex-col items-center">
            <span className="text-lg">{moralsEmoji(entry.morals_score)}</span>
            <span className="text-[9px] text-slate-500">Morals</span>
          </div>
        )}
        {entry.reflection && (
          <p className="text-slate-400 text-xs line-clamp-1 max-w-[140px]">{entry.reflection}</p>
        )}
      </div>
      <span className="text-slate-500 text-xs whitespace-nowrap">
        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
}

// ============================================================
// MAIN TRACKER SCREEN
// ============================================================
function TrackerScreen({ onNavigateTo }) {
  const [confidence, setConfidence] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [morals, setMorals] = useState(null);
  const [reflection, setReflection] = useState('');
  const [expandedTracker, setExpandedTracker] = useState('confidence');
  const [recentEntries, setRecentEntries] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [affirmation, setAffirmation] = useState('');
  const { addToast } = useToast();
  const isGuest = !TokenManager.isAuthenticated();

  useEffect(() => {
    const loadHistory = async () => {
      if (isGuest) {
        const stored = localStorage.getItem('tp_tracker_history');
        if (stored) setRecentEntries(JSON.parse(stored));
        return;
      }
      try {
        const response = await MoodAPI.list({ limit: 10 });
        const moods = response.data || response.moods || response || [];
        // Filter to entries that have at least one tracker value
        const trackerEntries = moods.filter(m => m.confidence_level || m.energy_level || m.morals_score);
        setRecentEntries(trackerEntries);
      } catch (err) {
        console.error('Failed to load tracker history:', err);
      }
    };
    loadHistory();
  }, [isGuest]);

  const hasAnyValue = confidence || energy || morals;

  const submitTrackers = async () => {
    if (!hasAnyValue || loading) return;
    setLoading(true);

    // Generate an affirmation based on the lowest tracker
    const scores = [
      confidence && { tracker: 'confidence', score: confidence },
      energy && { tracker: 'energy', score: energy },
      morals && { tracker: 'morals', score: morals }
    ].filter(Boolean);

    const lowest = scores.reduce((a, b) => (a.score <= b.score ? a : b), scores[0]);
    setAffirmation(getRandomAffirmation(lowest.tracker, lowest.score));

    const entry = {
      mood_score: Math.round((scores.reduce((s, t) => s + t.score, 0) / scores.length)),
      confidence_level: confidence || undefined,
      energy_level: energy || undefined,
      morals_score: morals || undefined,
      reflection: reflection || undefined,
      source: 'tracker'
    };

    try {
      if (!isGuest) {
        await MoodAPI.log(entry.mood_score, entry);
      }

      const newEntry = { ...entry, created_at: new Date().toISOString() };
      const updated = [newEntry, ...recentEntries].slice(0, 30);
      localStorage.setItem('tp_tracker_history', JSON.stringify(updated));
      setRecentEntries(updated);

      // Celebration if all trackers are 4+
      if (scores.every(s => s.score >= 4)) {
        try { haptics.achievementUnlocked(); } catch(e) {}
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
        addToast('All trackers green! You\'re dialed in today.', 'success');
      } else {
        try { haptics.moodLogged(); } catch(e) {}
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setConfidence(null);
        setEnergy(null);
        setMorals(null);
        setReflection('');
        setExpandedTracker('confidence');
      }, 4000);
    } catch (err) {
      console.error('Failed to log trackers:', err);
      const newEntry = { ...entry, created_at: new Date().toISOString() };
      const updated = [newEntry, ...recentEntries].slice(0, 30);
      localStorage.setItem('tp_tracker_history', JSON.stringify(updated));
      setRecentEntries(updated);
      try { haptics.moodLogged(); } catch(e) {}
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setConfidence(null); setEnergy(null); setMorals(null); setReflection(''); }, 4000);
    } finally {
      setLoading(false);
    }
  };

  const toggleTracker = (id) => {
    setExpandedTracker(prev => prev === id ? null : id);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <Celebration active={showCelebration} />

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Be Your Best Self</h1>
        <p className="text-slate-400 text-sm mt-1">Track what matters. Confidence. Energy. Morals.</p>
      </div>

      {submitted ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl p-6 text-center my-6 border border-slate-700/50">
          <div className="flex justify-center gap-4 mb-4">
            {confidence && <span className="text-3xl">{confidenceEmoji(confidence)}</span>}
            {energy && <span className="text-3xl">{energyEmoji(energy)}</span>}
            {morals && <span className="text-3xl">{moralsEmoji(morals)}</span>}
          </div>
          <p className="text-white font-medium mb-2">Checked in.</p>
          <p className="text-slate-300 text-sm leading-relaxed">{affirmation}</p>
        </div>
      ) : (
        <div className="space-y-3 my-4">
          {TRACKERS.map((tracker) => {
            const value = tracker.id === 'confidence' ? confidence
              : tracker.id === 'energy' ? energy
              : morals;
            const setter = tracker.id === 'confidence' ? setConfidence
              : tracker.id === 'energy' ? setEnergy
              : setMorals;

            return (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                value={value}
                onChange={setter}
                expanded={expandedTracker === tracker.id}
                onToggle={() => toggleTracker(tracker.id)}
              />
            );
          })}

          {/* Reflection field — shows when morals tracker has a value */}
          {morals && (
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
              <label className="text-slate-300 text-xs font-medium block mb-2">
                Quick reflection — what's on your mind? (optional)
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Any judgments, comparisons, or self-talk to let go of?"
                rows={2}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-violet-500/50 placeholder-slate-500"
              />
            </div>
          )}

          <button
            onClick={submitTrackers}
            disabled={!hasAnyValue || loading}
            className="w-full bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white py-3.5 rounded-xl font-semibold transition-all text-sm"
          >
            {loading ? 'Logging...' : hasAnyValue ? 'Log my check-in' : 'Select at least one tracker above'}
          </button>
        </div>
      )}

      {/* Quick action: Talk to Coach */}
      {onNavigateTo && (
        <button
          onClick={() => onNavigateTo('chat')}
          className="w-full bg-gradient-to-r from-sky-900/40 to-violet-900/40 border border-sky-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between hover:from-sky-900/60 hover:to-violet-900/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Talk to Your Coach</p>
              <p className="text-slate-400 text-xs">Get personalized tips based on your check-in</p>
            </div>
          </div>
          <span className="text-slate-400 text-lg">›</span>
        </button>
      )}

      {/* Recent History */}
      {recentEntries.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Check-ins</h2>
          <div className="space-y-2">
            {recentEntries.slice(0, 7).map((entry, i) => (
              <TrackerHistoryRow key={i} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TrackerScreen;
