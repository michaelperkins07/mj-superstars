// ============================================================
// MJ's Superstars - Mood Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { MoodAPI, TokenManager } from '../../services/api';
import { moodEmoji, moodLabel } from '../../utils/moodHelpers';

function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [recentMoods, setRecentMoods] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const isGuest = !TokenManager.isAuthenticated();

  useEffect(() => {
    const loadMoods = async () => {
      if (isGuest) {
        const stored = localStorage.getItem('mj_guest_moods');
        if (stored) setRecentMoods(JSON.parse(stored));
        return;
      }
      try {
        const response = await MoodAPI.list();
        setRecentMoods(response.moods || response || []);
      } catch (err) {
        console.error('Failed to load moods:', err);
        const stored = localStorage.getItem('mj_guest_moods');
        if (stored) setRecentMoods(JSON.parse(stored));
      }
    };
    loadMoods();
  }, []);

  const submitMood = async () => {
    if (!selectedMood || loading) return;
    setLoading(true);
    const newMood = { mood_score: selectedMood, note, created_at: new Date().toISOString() };
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
      setSubmitted(true);
      setRecentMoods(updated);
      setTimeout(() => {
        setSubmitted(false);
        setSelectedMood(null);
        setNote('');
      }, 2000);
    } catch (err) {
      console.error('Failed to log mood:', err);
      const updated = [newMood, ...recentMoods].slice(0, 50);
      localStorage.setItem('mj_guest_moods', JSON.stringify(updated));
      setSubmitted(true);
      setRecentMoods(updated);
      setTimeout(() => { setSubmitted(false); setSelectedMood(null); setNote(''); }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">How are you feeling?</h1>
      <p className="text-slate-400 text-sm mb-6">Track your mood to discover patterns over time</p>

      {submitted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center mb-6">
          <span className="text-4xl block mb-2">✨</span>
          <p className="text-emerald-400 font-medium">Mood logged! Keep it up!</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setSelectedMood(score)}
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
              placeholder="Add a note about how you're feeling..."
              rows={3}
              className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400 mt-2"
            />

            <button
              onClick={submitMood}
              disabled={!selectedMood || loading}
              className="w-full mt-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? 'Logging...' : 'Log Mood'}
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
          <p className="text-slate-500 text-sm text-center py-8">No mood entries yet. Start tracking above!</p>
        )}
      </div>
    </div>
  );
}

export default MoodScreen;
