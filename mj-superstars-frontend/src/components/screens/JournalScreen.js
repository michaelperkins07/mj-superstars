// ============================================================
// MJ's Superstars - Journal Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { TokenManager } from '../../services/api';

function JournalScreen() {
  const [entry, setEntry] = useState('');
  const [saved, setSaved] = useState(false);
  const [prompt, setPrompt] = useState('');

  const prompts = [
    "What's on your mind right now?",
    "What are you grateful for today?",
    "What's one thing that went well recently?",
    "How did you handle a challenge today?",
    "What would make tomorrow a great day?",
    "Describe a moment that made you smile today.",
    "What's something you're looking forward to?",
  ];

  useEffect(() => {
    setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  }, []);

  const saveEntry = async () => {
    if (!entry.trim()) return;
    const isGuest = !TokenManager.isAuthenticated();

    if (isGuest) {
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const entries = JSON.parse(stored);
      entries.unshift({ id: 'j_' + Date.now(), content: entry.trim(), prompt_text: prompt, created_at: new Date().toISOString() });
      localStorage.setItem('mj_guest_journal', JSON.stringify(entries.slice(0, 50)));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEntry(''); setPrompt(prompts[Math.floor(Math.random() * prompts.length)]); }, 2000);
      return;
    }

    try {
      const { JournalAPI } = await import('../../services/api');
      await JournalAPI.create({
        content: entry.trim(),
        prompt_text: prompt,
        mood_score: 3
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setEntry('');
        setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
      }, 2000);
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const entries = JSON.parse(stored);
      entries.unshift({ id: 'j_' + Date.now(), content: entry.trim(), prompt_text: prompt, created_at: new Date().toISOString() });
      localStorage.setItem('mj_guest_journal', JSON.stringify(entries.slice(0, 50)));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEntry(''); setPrompt(prompts[Math.floor(Math.random() * prompts.length)]); }, 2000);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Journal</h1>
      <p className="text-slate-400 text-sm mb-6">A safe space for your thoughts</p>

      <div className="bg-gradient-to-br from-violet-600/20 to-sky-600/20 border border-violet-500/20 rounded-2xl p-5 mb-6">
        <p className="text-xs text-violet-400 font-medium mb-2">TODAY'S PROMPT</p>
        <p className="text-white text-lg leading-relaxed">{prompt}</p>
      </div>

      {saved ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <span className="text-4xl block mb-2">📝</span>
          <p className="text-emerald-400 font-medium">Entry saved!</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-4">
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Start writing..."
            rows={8}
            className="w-full bg-transparent text-white text-sm leading-relaxed resize-none outline-none placeholder-slate-500"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              {entry.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={saveEntry}
              disabled={!entry.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Save Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalScreen;
