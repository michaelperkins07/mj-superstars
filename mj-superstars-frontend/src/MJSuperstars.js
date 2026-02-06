// ============================================================
// MJ's Superstars - Main App Component
// Handles navigation between Auth, Onboarding, and Main App
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import { ConversationAPI, GuestAPI, TokenManager, MoodAPI, TaskAPI, ContentAPI, ProgressAPI } from './services/api';

// ============================================================
// ICONS (inline SVG for zero dependencies)
// ============================================================

const Icons = {
  Chat: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Mood: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Tasks: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Journal: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Profile: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Send: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Fire: () => <span className="text-lg">🔥</span>,
  Star: () => <span className="text-lg">⭐</span>,
  Settings: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

// ============================================================
// MOOD EMOJI HELPER
// ============================================================

const moodEmoji = (score) => {
  const emojis = ['😢', '😔', '😐', '🙂', '😄'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

const moodLabel = (score) => {
  const labels = ['Struggling', 'Down', 'Okay', 'Good', 'Great'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};

// ============================================================
// CHAT SCREEN
// ============================================================

function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMenuRef = useRef(null);

  const CHAT_STORAGE_KEY = 'mj_chat_history';
  const CONV_STORAGE_KEY = 'mj_conversation_id';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) { /* storage full - ignore */ }
    }
  }, [messages]);

  // Generate a time-aware welcome message
  const createWelcomeMessage = () => {
    const hour = new Date().getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];
    let greeting = 'Hey';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening';
    else greeting = 'Hey there, night owl';

    const profileData = localStorage.getItem('mj_user_profile');
    const guestName = profileData ? (JSON.parse(profileData).name || 'Friend') : 'Friend';
    const nameGreet = guestName !== 'Friend' ? `, ${guestName}` : '';

    return {
      id: 'welcome',
      role: 'assistant',
      content: `${greeting}${nameGreet}! 👋 Happy ${dayName}! I'm MJ, your personal wellness companion. I'm here to listen, support, and help you take small steps toward feeling your best. How are you doing today?`,
      timestamp: new Date().toISOString()
    };
  };

  // Clear chat history and start fresh
  const clearChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONV_STORAGE_KEY);
    setShowChatMenu(false);
    setMessages([createWelcomeMessage()]);
    // Reset conversation ID
    const hasToken = TokenManager.isAuthenticated();
    if (!hasToken) {
      const newId = 'guest-' + Date.now();
      setConversationId(newId);
      localStorage.setItem(CONV_STORAGE_KEY, newId);
    }
  };

  // Restore or start conversation on mount
  useEffect(() => {
    const initChat = async () => {
      const hasToken = TokenManager.isAuthenticated();

      // Try to restore saved chat history
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      const savedConvId = localStorage.getItem(CONV_STORAGE_KEY);

      if (hasToken) {
        try {
          const response = await ConversationAPI.create();
          setConversationId(response.conversation?.id || response.id);
          setIsGuestMode(false);
        } catch (err) {
          setIsGuestMode(true);
          setConversationId(savedConvId || 'guest-' + Date.now());
        }
      } else {
        setIsGuestMode(true);
        if (savedConvId) {
          setConversationId(savedConvId);
        } else {
          try {
            const response = await GuestAPI.createSession();
            const newId = response.session_id || response.conversation?.id || 'guest-' + Date.now();
            setConversationId(newId);
            localStorage.setItem(CONV_STORAGE_KEY, newId);
          } catch (err) {
            const newId = 'guest-' + Date.now();
            setConversationId(newId);
            localStorage.setItem(CONV_STORAGE_KEY, newId);
          }
        }
      }

      // Restore saved messages or show fresh welcome
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        } catch (e) { /* corrupted data - start fresh */ }
      }

      // No saved history — show welcome message
      setMessages([createWelcomeMessage()]);
    };
    initChat();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      let responseContent;

      if (isGuestMode) {
        // Guest mode - use guest chat endpoint with history + full user context
        const chatHistory = currentMessages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ role: m.role, content: m.content }));

        // Gather cross-tab context from localStorage
        const profileRaw = localStorage.getItem('mj_user_profile');
        const profileData = profileRaw ? JSON.parse(profileRaw) : {};
        const guestName = profileData.name || 'Friend';

        const moodsRaw = localStorage.getItem('mj_guest_moods');
        const recentMoods = moodsRaw ? JSON.parse(moodsRaw).slice(0, 5) : [];

        const tasksRaw = localStorage.getItem('mj_guest_tasks');
        const todayTasks = tasksRaw ? JSON.parse(tasksRaw) : [];

        const journalRaw = localStorage.getItem('mj_guest_journal');
        const recentJournal = journalRaw ? JSON.parse(journalRaw).slice(0, 3) : [];

        const response = await GuestAPI.sendMessage(
          input.trim(),
          chatHistory,
          guestName,
          conversationId,
          {
            profile: {
              interests: profileData.interests || [],
              struggles: profileData.struggles || [],
              communicationPref: profileData.communicationPref || 'friendly'
            },
            recentMoods,
            todayTasks,
            recentJournal
          }
        );
        responseContent = response.mj_response?.content || response.content || "I hear you. Tell me more about that.";
      } else {
        // Authenticated mode - use normal conversation API
        const response = await ConversationAPI.sendMessage(conversationId, input.trim());
        responseContent = response.mj_response?.content || response.message?.content || response.content || "I hear you. Tell me more about that.";
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment. 💙",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
              MJ
            </div>
            <div>
              <h2 className="text-white font-semibold">MJ</h2>
              <p className="text-xs text-emerald-400">Online • Ready to chat</p>
            </div>
          </div>
          {/* Chat Options Menu */}
          <div className="relative" ref={chatMenuRef}>
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="w-9 h-9 rounded-lg hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Chat options"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showChatMenu && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-xl shadow-lg border border-slate-600/50 py-1 min-w-[180px] z-50">
                <button
                  onClick={clearChat}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-600/50 flex items-center gap-2.5 transition-colors"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Talk to MJ..."
            rows={1}
            className="flex-1 bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MOOD SCREEN
// ============================================================

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
        // Load from localStorage for guest users
        const stored = localStorage.getItem('mj_guest_moods');
        if (stored) setRecentMoods(JSON.parse(stored));
        return;
      }
      try {
        const response = await MoodAPI.list();
        setRecentMoods(response.moods || response || []);
      } catch (err) {
        console.error('Failed to load moods:', err);
        // Fallback to localStorage
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
      // Always save to localStorage (backup for authenticated, primary for guest)
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
      // Save locally even if API fails
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
          {/* Mood Selector */}
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

      {/* Recent Moods */}
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

// ============================================================
// TASKS SCREEN
// ============================================================

function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const isGuest = !TokenManager.isAuthenticated();

  const saveTasksLocally = (taskList) => {
    localStorage.setItem('mj_guest_tasks', JSON.stringify(taskList));
  };

  useEffect(() => {
    const loadTasks = async () => {
      if (isGuest) {
        const stored = localStorage.getItem('mj_guest_tasks');
        if (stored) setTasks(JSON.parse(stored));
        setLoading(false);
        return;
      }
      try {
        const response = await TaskAPI.list();
        setTasks(response.tasks || response || []);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        const stored = localStorage.getItem('mj_guest_tasks');
        if (stored) setTasks(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (isGuest) {
      const localTask = { id: 'task_' + Date.now(), title: newTask.trim(), difficulty: 'small', status: 'pending', created_at: new Date().toISOString() };
      const updated = [localTask, ...tasks];
      setTasks(updated);
      saveTasksLocally(updated);
      setNewTask('');
      return;
    }
    try {
      const response = await TaskAPI.create({ title: newTask.trim(), difficulty: 'small' });
      setTasks(prev => [response.task || response, ...prev]);
      setNewTask('');
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const completeTask = async (taskId) => {
    if (isGuest) {
      const updated = tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t);
      setTasks(updated);
      saveTasksLocally(updated);
      return;
    }
    try {
      await TaskAPI.complete(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Today's Tasks</h1>
      <p className="text-slate-400 text-sm mb-6">Small steps lead to big changes</p>

      {/* Add Task */}
      <div className="flex gap-2 mb-6">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a new task..."
          className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400"
        />
        <button
          onClick={addTask}
          disabled={!newTask.trim()}
          className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white flex items-center justify-center transition-colors"
        >
          <Icons.Plus />
        </button>
      </div>

      {/* Pending Tasks */}
      <div className="space-y-2 mb-6">
        {pendingTasks.map((task) => (
          <div key={task.id} className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => completeTask(task.id)}
              className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-sky-500 flex items-center justify-center transition-colors shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">{task.title}</p>
              {task.difficulty && (
                <span className="text-xs text-slate-500 capitalize">{task.difficulty}</span>
              )}
            </div>
          </div>
        ))}
        {!loading && pendingTasks.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">All caught up! Add a task above.</p>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Completed <span className="text-sm text-emerald-400">({completedTasks.length})</span>
          </h2>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="bg-slate-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Icons.Check />
                </div>
                <p className="text-slate-500 text-sm line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// JOURNAL SCREEN
// ============================================================

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
      // Save to localStorage for guest users
      const stored = localStorage.getItem('mj_guest_journal') || '[]';
      const entries = JSON.parse(stored);
      entries.unshift({ id: 'j_' + Date.now(), content: entry.trim(), prompt_text: prompt, created_at: new Date().toISOString() });
      localStorage.setItem('mj_guest_journal', JSON.stringify(entries.slice(0, 50)));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEntry(''); setPrompt(prompts[Math.floor(Math.random() * prompts.length)]); }, 2000);
      return;
    }

    try {
      const { JournalAPI } = await import('./services/api');
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
      // Fallback: save locally anyway
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

      {/* Prompt Card */}
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

// ============================================================
// PROFILE SCREEN
// ============================================================

function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const [streaks, setStreaks] = useState(null);
  const isGuest = !TokenManager.isAuthenticated();

  useEffect(() => {
    const loadProgress = async () => {
      if (isGuest) {
        // Calculate local streaks from guest data
        const moods = JSON.parse(localStorage.getItem('mj_guest_moods') || '[]');
        const tasks = JSON.parse(localStorage.getItem('mj_guest_tasks') || '[]');
        const journal = JSON.parse(localStorage.getItem('mj_guest_journal') || '[]');
        setStreaks([
          { streak_type: 'mood_check_ins', current_streak: moods.length },
          { streak_type: 'tasks_completed', current_streak: tasks.filter(t => t.status === 'completed').length },
          { streak_type: 'journal_entries', current_streak: journal.length }
        ]);
        return;
      }
      try {
        const response = await ProgressAPI.getStreaks();
        setStreaks(response.streaks || response || []);
      } catch (err) {
        console.error('Failed to load streaks:', err);
      }
    };
    loadProgress();
  }, []);

  const displayName = profile?.display_name || profile?.name || user?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
          {displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-slate-400 text-sm">{user?.email || profile?.email}</p>
        </div>
      </div>

      {/* Streaks */}
      <div className="bg-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Icons.Fire /> Streaks
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {streaks && Array.isArray(streaks) && streaks.map((streak, i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{streak.current_streak || 0}</p>
              <p className="text-xs text-slate-400 capitalize mt-1">
                {(streak.streak_type || '').replace(/_/g, ' ')}
              </p>
            </div>
          ))}
          {(!streaks || streaks.length === 0) && (
            <p className="text-slate-500 text-sm col-span-2 text-center py-2">Start building your streaks!</p>
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-2">
        <button
          onClick={logout}
          className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors"
        >
          <Icons.Logout />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>

      <p className="text-center text-slate-600 text-xs mt-8">
        MJ's Superstars v1.0.0
      </p>
    </div>
  );
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================

function MJSuperstars() {
  const { isAuthenticated, profile, loading, user, setProfile, completeOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');

  // Handler for "Continue without account" - creates a guest profile
  const handleSkipAuth = () => {
    const guestProfile = {
      id: 'guest_' + Date.now(),
      name: 'Friend',
      isGuest: true,
      onboardingComplete: false,
      createdAt: new Date().toISOString()
    };
    setProfile(guestProfile);
  };

  // Handler for successful login/register
  const handleAuthSuccess = () => {
    // Auth context already updates state via login/register methods
    // This callback is for any additional post-auth logic
    console.log('Auth successful');
  };

  // Handler for onboarding completion
  const handleOnboardingComplete = async (onboardingData) => {
    try {
      await completeOnboarding(onboardingData);
    } catch (err) {
      // Even if server sync fails, local profile is updated
      console.error('Onboarding sync error:', err);
    }
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 animate-pulse">
            MJ
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onSkip={handleSkipAuth} onSuccess={handleAuthSuccess} />;
  }

  // Show onboarding if not completed
  const onboardingComplete = profile?.onboarding_completed || profile?.onboardingComplete || user?.onboarding_completed;
  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Main App with Tab Navigation
  const tabs = [
    { id: 'chat', label: 'Chat', icon: Icons.Chat },
    { id: 'mood', label: 'Mood', icon: Icons.Mood },
    { id: 'tasks', label: 'Tasks', icon: Icons.Tasks },
    { id: 'journal', label: 'Journal', icon: Icons.Journal },
    { id: 'profile', label: 'Profile', icon: Icons.Profile },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'chat': return <ChatScreen />;
      case 'mood': return <MoodScreen />;
      case 'tasks': return <TasksScreen />;
      case 'journal': return <JournalScreen />;
      case 'profile': return <ProfileScreen />;
      default: return <ChatScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col" style={{ height: '100dvh' }}>
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderScreen()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-slate-800/90 backdrop-blur border-t border-slate-700/50 px-2 pb-safe">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MJSuperstars;
