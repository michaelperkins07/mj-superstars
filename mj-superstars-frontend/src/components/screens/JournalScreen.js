// ============================================================
// MJ's Superstars - Journal Screen
// No one reads this but you. Be completely honest.
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { JournalAPI, TokenManager } from '../../services/api';
import { useToast } from '../shared/Toast';
import * as haptics from '../../services/haptics';

// ============================================================
// Constants
// ============================================================
const GUEST_PROMPTS = [
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

const PROMPT_CATEGORIES = [
  { id: 'reflection', label: 'Reflect', emoji: '\u{1FA9E}' },
  { id: 'gratitude', label: 'Gratitude', emoji: '\u{1F64F}' },
  { id: 'growth', label: 'Growth', emoji: '\u{1F331}' },
  { id: 'emotions', label: 'Emotions', emoji: '\u{1F4AD}' },
  { id: 'future', label: 'Future', emoji: '\u{1F52E}' },
];

// ============================================================
// Sub-components
// ============================================================
function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="text-sky-400 text-sm mb-4 flex items-center gap-1">
      {'\u2190'} Back
    </button>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
        <p className="text-xl font-bold text-white">{stats.total_entries || 0}</p>
        <p className="text-xs text-slate-400">Entries</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
        <p className="text-xl font-bold text-violet-400">{stats.current_streak || 0}</p>
        <p className="text-xs text-slate-400">Day Streak</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
        <p className="text-xl font-bold text-sky-400">{stats.total_words ? Number(stats.total_words).toLocaleString() : 0}</p>
        <p className="text-xs text-slate-400">Words</p>
      </div>
    </div>
  );
}

function EntryCard({ entry, onClick }) {
  const date = new Date(entry.created_at);
  const timeAgo = getTimeAgo(date);
  const preview = entry.content.length > 120
    ? entry.content.substring(0, 120) + '...'
    : entry.content;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 mb-3 hover:border-violet-500/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {entry.mood_score && (
            <span className="text-sm">{getMoodEmoji(entry.mood_score)}</span>
          )}
          <span className="text-xs text-slate-400">{timeAgo}</span>
        </div>
        <span className="text-xs text-slate-500">{entry.word_count || countWords(entry.content)} words</span>
      </div>
      {entry.prompt_text && (
        <p className="text-xs text-violet-400/70 mb-1 italic">{entry.prompt_text}</p>
      )}
      <p className="text-sm text-slate-300 leading-relaxed">{preview}</p>
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {entry.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ============================================================
// Helpers
// ============================================================
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + 'd ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMoodEmoji(score) {
  const emojis = { 1: '\u{1F614}', 2: '\u{1F615}', 3: '\u{1F610}', 4: '\u{1F642}', 5: '\u{1F60A}' };
  return emojis[score] || '';
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// ============================================================
// Main Component
// ============================================================
function JournalScreen() {
  const { addToast } = useToast();
  const isGuest = !TokenManager.isAuthenticated();
  const textareaRef = useRef(null);

  // View state
  const [view, setView] = useState('home'); // home | write | read
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Write state
  const [entry, setEntry] = useState('');
  const [title, setTitle] = useState('');
  const [moodScore, setMoodScore] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [promptCategory, setPromptCategory] = useState('reflection');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Data state
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  // ============================================================
  // Load data on mount
  // ============================================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (isGuest) {
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      try {
        const parsed = JSON.parse(stored);
        setEntries(parsed);
        setTotal(parsed.length);
        setStats({
          total_entries: parsed.length,
          total_words: parsed.reduce((sum, e) => sum + countWords(e.content), 0),
          current_streak: 0,
        });
      } catch (e) {
        setEntries([]);
      }
      setPrompt(GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)]);
      setLoading(false);
      return;
    }

    try {
      const [entriesRes, statsRes] = await Promise.all([
        JournalAPI.list({ limit: 20 }),
        JournalAPI.getStats().catch(() => null),
      ]);
      setEntries(entriesRes.entries || []);
      setTotal(entriesRes.total || 0);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Failed to load journal:', err);
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      try { setEntries(JSON.parse(stored)); } catch (e) { setEntries([]); }
    }

    // Load AI prompt
    try {
      const promptRes = await JournalAPI.generatePrompt(promptCategory);
      if (promptRes.prompt) setPrompt(promptRes.prompt);
      else setPrompt(GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)]);
    } catch (e) {
      setPrompt(GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)]);
    }

    setLoading(false);
  };

  // ============================================================
  // Load more entries (pagination)
  // ============================================================
  const loadMoreEntries = async () => {
    if (isGuest || loadingMore || entries.length >= total) return;
    setLoadingMore(true);
    try {
      const res = await JournalAPI.list({ limit: 20, offset: entries.length });
      setEntries(prev => [...prev, ...(res.entries || [])]);
    } catch (err) {
      console.error('Failed to load more:', err);
    }
    setLoadingMore(false);
  };

  // ============================================================
  // Shuffle / change prompt
  // ============================================================
  const shufflePrompt = async () => {
    try { haptics.selection(); } catch(e) {}
    if (isGuest) {
      let newPrompt = prompt;
      while (newPrompt === prompt && GUEST_PROMPTS.length > 1) {
        newPrompt = GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)];
      }
      setPrompt(newPrompt);
      return;
    }
    try {
      const res = await JournalAPI.generatePrompt(promptCategory);
      if (res.prompt) setPrompt(res.prompt);
    } catch (e) {
      let newPrompt = prompt;
      while (newPrompt === prompt) {
        newPrompt = GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)];
      }
      setPrompt(newPrompt);
    }
  };

  const changeCategory = async (catId) => {
    setPromptCategory(catId);
    try { haptics.selection(); } catch(e) {}
    if (!isGuest) {
      try {
        const res = await JournalAPI.generatePrompt(catId);
        if (res.prompt) setPrompt(res.prompt);
      } catch (e) {
        setPrompt(GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)]);
      }
    } else {
      setPrompt(GUEST_PROMPTS[Math.floor(Math.random() * GUEST_PROMPTS.length)]);
    }
  };

  // ============================================================
  // Save entry
  // ============================================================
  const saveEntry = async () => {
    if (!entry.trim() || saving) return;
    setSaving(true);
    try { haptics.medium(); } catch(e) {}

    const entryData = {
      content: entry.trim(),
      title: title.trim() || null,
      prompt_text: prompt || null,
      mood_score: moodScore || null,
    };

    const onSuccess = () => {
      const msg = SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)];
      setSaveMessage(msg);
      setSaved(true);
      try { haptics.success(); } catch(e) {}

      const wc = countWords(entry);
      if (stats) {
        setStats(prev => ({
          ...prev,
          total_entries: (parseInt(prev.total_entries) || 0) + 1,
          total_words: (parseInt(prev.total_words) || 0) + wc,
        }));
      }
      setTotal(prev => prev + 1);

      const newTotal = (parseInt(stats?.total_entries) || 0) + 1;
      if (newTotal > 0 && newTotal % 5 === 0) {
        try { haptics.success(); } catch(e) {}
        addToast(newTotal + ' journal entries! You\'re building real self-awareness.', 'heart');
      }

      setTimeout(() => {
        setSaved(false);
        setEntry('');
        setTitle('');
        setMoodScore(null);
        setSaveMessage('');
        setSaving(false);
        setView('home');
        loadData();
      }, 2000);
    };

    if (isGuest) {
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const localEntries = JSON.parse(stored);
      localEntries.unshift({
        id: 'j_' + Date.now(),
        content: entryData.content,
        title: entryData.title,
        prompt_text: entryData.prompt_text,
        mood_score: entryData.mood_score,
        word_count: countWords(entry),
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('mj_guest_journal', JSON.stringify(localEntries.slice(0, 50)));
      onSuccess();
      return;
    }

    try {
      await JournalAPI.create(entryData);
      onSuccess();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const localEntries = JSON.parse(stored);
      localEntries.unshift({
        id: 'j_' + Date.now(),
        content: entryData.content,
        title: entryData.title,
        prompt_text: entryData.prompt_text,
        mood_score: entryData.mood_score,
        word_count: countWords(entry),
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('mj_guest_journal', JSON.stringify(localEntries.slice(0, 50)));
      onSuccess();
    }
  };

  // ============================================================
  // Delete entry
  // ============================================================
  const deleteEntry = async (entryToDelete) => {
    try { haptics.selection(); } catch(e) {}
    if (isGuest) {
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const localEntries = JSON.parse(stored).filter(e => e.id !== entryToDelete.id);
      localStorage.setItem('mj_guest_journal', JSON.stringify(localEntries));
      setEntries(localEntries);
      setTotal(localEntries.length);
      setView('home');
      addToast('Entry deleted', 'check');
      return;
    }
    try {
      await JournalAPI.delete(entryToDelete.id);
      setEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
      setTotal(prev => prev - 1);
      setView('home');
      addToast('Entry deleted', 'check');
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
      addToast('Failed to delete entry', 'error');
    }
  };

  // ============================================================
  // Navigate
  // ============================================================
  const openWrite = () => {
    setEntry('');
    setTitle('');
    setMoodScore(null);
    setSaved(false);
    setView('write');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const openEntry = (e) => {
    setSelectedEntry(e);
    setView('read');
  };

  const wordCount = entry.split(/\s+/).filter(Boolean).length;

  // ============================================================
  // RENDER: Loading
  // ============================================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading your journal...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Read single entry
  // ============================================================
  if (view === 'read' && selectedEntry) {
    const date = new Date(selectedEntry.created_at);
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setView('home')} />
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500">
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {' \u00B7 '}{selectedEntry.word_count || countWords(selectedEntry.content)} words
            </p>
          </div>
          {selectedEntry.mood_score && (
            <span className="text-2xl">{getMoodEmoji(selectedEntry.mood_score)}</span>
          )}
        </div>

        {selectedEntry.title && (
          <h2 className="text-xl font-bold text-white mb-3">{selectedEntry.title}</h2>
        )}

        {selectedEntry.prompt_text && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-violet-400 mb-1">Prompt</p>
            <p className="text-sm text-slate-300 italic">{selectedEntry.prompt_text}</p>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>
        </div>

        {selectedEntry.tags && selectedEntry.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {selectedEntry.tags.map(tag => (
              <span key={tag} className="text-xs bg-violet-500/15 text-violet-400 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => deleteEntry(selectedEntry)}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Delete this entry
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER: Write new entry
  // ============================================================
  if (view === 'write') {
    if (saved) {
      return (
        <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center max-w-sm">
              <span className="text-4xl block mb-3">{'\u270D\uFE0F'}</span>
              <p className="text-emerald-400 font-semibold text-lg">Saved.</p>
              <p className="text-slate-400 text-sm mt-2">{saveMessage}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <BackButton onClick={() => setView('home')} />

        {/* Prompt card */}
        <div className="bg-gradient-to-br from-violet-600/20 to-sky-600/20 border border-violet-500/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-violet-400 font-medium">PROMPT</p>
            <button
              onClick={shufflePrompt}
              className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
            >
              {'\u{1F504}'} New prompt
            </button>
          </div>
          <p className="text-white text-base leading-relaxed mb-3">{prompt}</p>
          {/* Category chips */}
          <div className="flex gap-2 flex-wrap">
            {PROMPT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => changeCategory(cat.id)}
                className={
                  'text-xs px-2.5 py-1 rounded-full transition-colors ' +
                  (promptCategory === cat.id
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:border-violet-500/30')
                }
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-slate-400">How are you feeling?</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(score => (
              <button
                key={score}
                onClick={() => { setMoodScore(score === moodScore ? null : score); try { haptics.selection(); } catch(e) {} }}
                className={
                  'text-xl transition-transform ' +
                  (moodScore === score ? 'scale-125' : 'opacity-40 hover:opacity-70')
                }
              >
                {getMoodEmoji(score)}
              </button>
            ))}
          </div>
        </div>

        {/* Title (optional) */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-slate-800/50 text-white text-sm rounded-xl px-4 py-2.5 mb-3 outline-none border border-slate-700/40 focus:border-violet-500/40 placeholder-slate-500"
        />

        {/* Text area */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <textarea
            ref={textareaRef}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Start writing... there's no wrong way to do this."
            rows={10}
            className="w-full bg-transparent text-white text-sm leading-relaxed resize-none outline-none placeholder-slate-500"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <button
              onClick={saveEntry}
              disabled={!entry.trim() || saving}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Home (entry list + write CTA)
  // ============================================================
  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Journal</h1>
        <button
          onClick={openWrite}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <span className="text-base">+</span> New Entry
        </button>
      </div>
      <p className="text-slate-400 text-sm mb-5">
        No one reads this but you. Be completely honest.
      </p>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Today's prompt as write CTA */}
      <button
        onClick={openWrite}
        className="w-full text-left bg-gradient-to-br from-violet-600/15 to-sky-600/15 border border-violet-500/20 rounded-2xl p-4 mb-6 hover:border-violet-500/40 transition-colors"
      >
        <p className="text-xs text-violet-400 font-medium mb-1">TODAY'S PROMPT</p>
        <p className="text-white text-base leading-relaxed">{prompt}</p>
        <p className="text-xs text-sky-400 mt-2">Tap to start writing {'\u2192'}</p>
      </button>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">{'\u{1F4D6}'}</span>
          <p className="text-slate-400 font-medium">Your journal is empty</p>
          <p className="text-slate-500 text-sm mt-1">
            Your first entry is the hardest. After that, it gets easier.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Recent Entries ({total})
          </p>
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onClick={() => openEntry(e)} />
          ))}
          {entries.length < total && (
            <button
              onClick={loadMoreEntries}
              className="w-full text-center text-sm text-violet-400 hover:text-violet-300 py-3 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load more entries'}
            </button>
          )}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
        <p className="text-xs text-slate-400">
          <span className="text-violet-400 font-medium">Tip:</span>{' '}
          Journaling is brain exercise. Even 2 sentences counts as a rep.
        </p>
      </div>
    </div>
  );
}

export default JournalScreen;
