// ============================================================
// MJ's Superstars - Journal Screen
// No one reads this but you. Be completely honest.
// ============================================================
import React, { useState, useEffect } from 'react';
import { TokenManager } from '../../services/api';
import { useToast } from '../shared/Toast';
import * as haptics from '../../services/haptics';

const PROMPTS = [
  "What's taking up the most space in your mind right now?",
  "What would you tell a friend who's going through what you're going through?",
  "What's one thing you keep putting off? Why?",
  "What are you grateful for today?",
  "What's one thing that went well recently?",
  "How did you handle a challenge today?",
  "What would make tomorrow a great day?",
  "Describe a moment that made you smile today.",
  "What's something you're looking forward to?",
  "If you could change one thing about today, what would it be?",
];

const SAVE_MESSAGES = [
  "Written down, it weighs a little less.",
  "Your words matter, even the messy ones.",
  "That took honesty. Respect.",
  "Getting it out of your head is the first step.",
  "You just did something most people never do.",
  "Clarity comes from writing, not thinking.",
];

function JournalScreen() {
  const [entry, setEntry] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [entryCount, setEntryCount] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    // Load entry count
    const stored = localStorage.getItem('mj_guest_journal') || '[]';
    try {
      const entries = JSON.parse(stored);
      setEntryCount(entries.length);
    } catch (e) {
      setEntryCount(0);
    }
  }, []);

  const shufflePrompt = () => {
    try { haptics.selection(); } catch(e) {}
    let newPrompt = prompt;
    while (newPrompt === prompt && PROMPTS.length > 1) {
      newPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    }
    setPrompt(newPrompt);
  };

  const saveEntry = async () => {
    if (!entry.trim()) return;
    try { haptics.journalSaved(); } catch(e) {}

    const isGuest = !TokenManager.isAuthenticated();

    const onSuccess = () => {
      const msg = SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)];
      setSaveMessage(msg);
      setSaved(true);
      const newCount = entryCount + 1;
      setEntryCount(newCount);

      // Milestone every 5 entries
      if (newCount > 0 && newCount % 5 === 0) {
        try { haptics.achievementUnlocked(); } catch(e) {}
        addToast(`${newCount} journal entries! You're building real self-awareness.`, 'heart');
      }

      setTimeout(() => {
        setSaved(false);
        setEntry('');
        setSaveMessage('');
        setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
      }, 2500);
    };

    if (isGuest) {
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const entries = JSON.parse(stored);
      entries.unshift({
        id: 'j_' + Date.now(),
        content: entry.trim(),
        prompt_text: prompt,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('mj_guest_journal', JSON.stringify(entries.slice(0, 50)));
      onSuccess();
      return;
    }

    try {
      const { JournalAPI } = await import('../../services/api');
      await JournalAPI.create({
        content: entry.trim(),
        prompt_text: prompt,
        mood_score: 3,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      // Fallback to local
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const entries = JSON.parse(stored);
      entries.unshift({
        id: 'j_' + Date.now(),
        content: entry.trim(),
        prompt_text: prompt,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('mj_guest_journal', JSON.stringify(entries.slice(0, 50)));
      onSuccess();
    }
  };

  const wordCount = entry.split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Journal</h1>
        {entryCount > 0 && (
          <span className="bg-violet-500/20 text-violet-400 text-xs font-medium px-2.5 py-1 rounded-full">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-6">
        No one reads this but you. Be completely honest.
      </p>

      {/* Prompt card with shuffle */}
      <div className="bg-gradient-to-br from-violet-600/20 to-sky-600/20 border border-violet-500/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-violet-400 font-medium">TODAY'S PROMPT</p>
          <button
            onClick={shufflePrompt}
            className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
          >
            {'🔄'} Shuffle
          </button>
        </div>
        <p className="text-white text-lg leading-relaxed">{prompt}</p>
      </div>

      {saved ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <span className="text-4xl block mb-2">{'✍️'}</span>
          <p className="text-emerald-400 font-medium">Saved.</p>
          <p className="text-slate-400 text-sm mt-1">{saveMessage}</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-4">
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Start writing... there's no wrong way to do this."
            rows={8}
            className="w-full bg-transparent text-white text-sm leading-relaxed resize-none outline-none placeholder-slate-500"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
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
