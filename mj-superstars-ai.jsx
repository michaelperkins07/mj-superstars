import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Shield, Flame, Sun, Moon, Zap, MessageCircle, BookOpen, Send, X, Check, AlertTriangle, Settings, Key, Loader2, TrendingUp, Calendar, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';

// ============ CONSTANTS ============
const ENERGY_STATES = {
  depleted: { label: 'Depleted', color: 'bg-slate-400', textColor: 'text-slate-300', icon: Moon },
  stable: { label: 'Stable', color: 'bg-sky-400', textColor: 'text-sky-300', icon: Shield },
  engaged: { label: 'Engaged', color: 'bg-emerald-400', textColor: 'text-emerald-300', icon: Sun },
  driven: { label: 'Driven', color: 'bg-amber-400', textColor: 'text-amber-300', icon: Flame }
};

const HABITS = [
  { id: 'self_love', name: 'Love for Self', icon: Heart, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  { id: 'empathy', name: 'Empathy for Others', icon: MessageCircle, color: 'text-sky-400', bgColor: 'bg-sky-500/20' },
  { id: 'release', name: 'Release Hate & Remorse', icon: Shield, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  { id: 'growth', name: 'Challenge to Grow', icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-500/20' }
];

const SCRIPTS = [
  { text: "Hey, quick one: how's your day going?", context: "Simple opener" },
  { text: "I'm trying to be more social. What's something you've been into lately?", context: "Vulnerable + curious" },
  { text: "No worries if you're busy. Just wanted to say hi.", context: "Low pressure" },
  { text: "I've got 5 minutes. Want to catch up real quick?", context: "Time-boxed" },
  { text: "I've got to run, but good talking with you.", context: "Graceful exit" }
];

// ============ MJ SYSTEM PROMPT ============
const MJ_SYSTEM_PROMPT = `You are MJ, the calm, grounded, quietly motivating guide for "MJ's Superstars."

CORE IDENTITY:
- You help users build daily character habits that reduce depression, restore self-trust, and strengthen social, physical, and mental resilience.
- You are NOT a therapist or medical professional. You do not diagnose, prescribe, or provide medical advice.
- You support growth through listening, reflection, and small daily actions.
- Tone: steady, human, confident. Never cheesy. Never preachy. Never judgmental.

NORTH STAR - FOUR DAILY HABITS:
1) Love for self
2) Empathy for others
3) Release of hate and remorse
4) Challenge yourself to grow

ENERGY STATES (detect and adapt):
- Depleted: very short replies, flat tone, hopeless → micro steps only, soft pace
- Stable: neutral, responsive → light steps, steady rhythm
- Engaged: motivated, future-oriented → meaningful steps
- Driven: high confidence, intense → stretch with recovery planned

EMOTIONAL OVERLAYS (respond to strongest first):
Priority: Crisis > Shame > Anger > Cynicism > Social Anxiety > Avoidance

CRISIS (self-harm, suicide ideation):
- Pause all coaching immediately
- Express care, encourage immediate professional help
- Provide: "Call or text 988" (US), "Text HOME to 741741"
- Stay with them but don't attempt therapy

SHAME ("I'm broken", self-attack):
- Protect identity, separate person from moment
- "A moment isn't a verdict." "What's one small thing that treats you with respect?"

ANGER (sharp language, blame):
- Validate emotion without validating behavior
- "Sounds like something crossed a line." "What part is in your control right now?"

CYNICISM ("won't work", dismissive):
- Offer control not belief
- "You don't have to believe in this. Just test one small thing."

SOCIAL ANXIETY (fear of judgment, avoiding people):
- Normalize: "Your brain is trying to keep you safe."
- Shrink exposure, offer scripts, create exit plans
- Never say "just be confident"

AVOIDANCE ("I'll do it later", overplanning):
- Name gently: "This feels like avoidance trying to protect you."
- Shrink: "What's the first 30 seconds?"
- Time-box: "60 seconds only. Stop after."

RESPONSE RULES:
- Keep responses concise (2-4 sentences typically)
- One question or one tiny action per response
- Match energy state in language and expectations
- End with self-respect reinforcement when appropriate
- If user missed days: "Nothing broke. We adjust and continue."

NEVER:
- Argue with the user
- Shame the user
- Force large exposures
- Over-explain or lecture
- Use emojis excessively
- Be artificially positive

ALWAYS:
- Meet them where they are
- Protect their identity first
- Offer tiny, achievable steps
- Reinforce that showing up matters`;

// ============ STORAGE HELPERS ============
const STORAGE_KEYS = {
  API_KEY: 'mj_api_key',
  USER_PROFILE: 'mj_user_profile',
  CONVERSATIONS: 'mj_conversations',
  HABITS_LOG: 'mj_habits_log',
  INSIGHTS: 'mj_insights'
};

const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { console.error('Storage error:', e); }
  },
  remove: (key) => localStorage.removeItem(key)
};

// ============ API HELPER ============
const callClaude = async (apiKey, messages, userContext) => {
  const systemPrompt = `${MJ_SYSTEM_PROMPT}

USER CONTEXT (use to personalize):
${userContext}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'mj' ? 'assistant' : 'user',
        content: m.text
      }))
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.content[0].text;
};

// ============ COMPONENTS ============

// Onboarding Screen
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const testApiKey = async () => {
    setTesting(true);
    setError('');
    try {
      await callClaude(apiKey, [{ role: 'user', text: 'Hello' }], '');
      storage.set(STORAGE_KEYS.API_KEY, apiKey);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Invalid API key. Please check and try again.');
    }
    setTesting(false);
  };

  const finishOnboarding = () => {
    const profile = {
      name: name || 'Friend',
      createdAt: new Date().toISOString(),
      totalSessions: 0,
      streakDays: 0,
      lastActiveDate: null
    };
    storage.set(STORAGE_KEYS.USER_PROFILE, profile);
    storage.set(STORAGE_KEYS.HABITS_LOG, {});
    storage.set(STORAGE_KEYS.INSIGHTS, { energyPatterns: [], effectiveInterventions: [] });
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 mx-auto flex items-center justify-center">
              <span className="text-2xl font-bold text-white">MJ</span>
            </div>
            <div>
              <h1 className="text-2xl font-medium text-white mb-2">MJ's Superstars</h1>
              <p className="text-slate-400">Daily habits that restore self-trust.</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-3">
              {HABITS.map(h => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${h.bgColor} flex items-center justify-center`}>
                    <h.icon className={`w-4 h-4 ${h.color}`} />
                  </div>
                  <span className="text-sm text-slate-300">{h.name}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors"
            >
              Get Started
            </button>
            <p className="text-xs text-slate-500">
              Not a substitute for professional help. If you're in crisis, call 988.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <button onClick={() => setStep(0)} className="text-slate-500 hover:text-slate-300 text-sm">
              ← Back
            </button>
            <div>
              <h2 className="text-xl font-medium text-white mb-2">Connect to Claude</h2>
              <p className="text-slate-400 text-sm">
                MJ uses Claude AI for real conversations. You'll need an Anthropic API key.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-400 space-y-2">
              <p className="font-medium text-slate-300">Your key stays private:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Stored only in your browser's local storage</li>
                <li>Never sent to any server except Anthropic's API</li>
                <li>You can delete it anytime in Settings</li>
              </ul>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                Get an API key <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <button
              onClick={testApiKey}
              disabled={!apiKey || testing}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</> : 'Connect'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Connected</h2>
              <p className="text-slate-400 text-sm">One more thing — what should I call you?</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={finishOnboarding}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors"
            >
              Start with MJ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Modal
function SettingsModal({ profile, onClose, onReset, onUpdateProfile }) {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
  const totalHabitsCompleted = Object.values(habitsLog).reduce((sum, day) =>
    sum + Object.values(day).filter(Boolean).length, 0
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-medium">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Stats */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Your Progress</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-xl p-3">
                <div className="text-2xl font-bold text-sky-400">{profile.totalSessions}</div>
                <div className="text-xs text-slate-400">Sessions</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3">
                <div className="text-2xl font-bold text-emerald-400">{totalHabitsCompleted}</div>
                <div className="text-xs text-slate-400">Habits Completed</div>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">API Key</h3>
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl p-3">
              <Key className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">••••••••{storage.get(STORAGE_KEYS.API_KEY)?.slice(-8)}</span>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
            {!showConfirmReset ? (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Reset All Data
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-300">This will delete your API key, progress, and all conversations. Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="flex-1 py-2 bg-slate-700 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onReset}
                    className="flex-1 py-2 bg-red-600 rounded-xl text-sm"
                  >
                    Yes, Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">
            MJ's Superstars • Not a substitute for professional help
          </p>
        </div>
      </div>
    </div>
  );
}

// Main App
function MainApp({ profile, onReset }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [energy, setEnergy] = useState('stable');
  const [showScripts, setShowScripts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [todayHabits, setTodayHabits] = useState({});
  const [copiedScript, setCopiedScript] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const apiKey = storage.get(STORAGE_KEYS.API_KEY);

  // Get today's date key
  const getTodayKey = () => new Date().toISOString().split('T')[0];

  // Load today's habits on mount
  useEffect(() => {
    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    const today = getTodayKey();
    setTodayHabits(habitsLog[today] || {});
  }, []);

  // Initial greeting
  useEffect(() => {
    const greeting = profile.totalSessions === 0
      ? `Hey${profile.name !== 'Friend' ? ` ${profile.name}` : ''}. I'm MJ. Good to meet you.\n\nI'm here to help you build daily habits that restore self-trust. No pressure. No judgment. Just small, honest steps.\n\nHow are you showing up today?`
      : `Hey${profile.name !== 'Friend' ? ` ${profile.name}` : ''}. Good to see you back.\n\nHow are you today?`;

    setMessages([{ role: 'mj', text: greeting }]);
  }, [profile]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build user context for API
  const buildUserContext = useCallback(() => {
    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    const insights = storage.get(STORAGE_KEYS.INSIGHTS) || {};
    const today = getTodayKey();
    const todayCompleted = Object.entries(todayHabits).filter(([,v]) => v).map(([k]) => k);

    const recentDays = Object.keys(habitsLog).sort().slice(-7);
    const recentActivity = recentDays.map(day => {
      const completed = Object.entries(habitsLog[day] || {}).filter(([,v]) => v).length;
      return `${day}: ${completed}/4 habits`;
    }).join(', ');

    return `User name: ${profile.name}
Sessions completed: ${profile.totalSessions}
Today's habits completed: ${todayCompleted.length}/4 (${todayCompleted.join(', ') || 'none yet'})
Recent 7-day activity: ${recentActivity || 'New user'}
Current detected energy: ${energy}`;
  }, [profile, todayHabits, energy]);

  // Detect energy from text (client-side quick detection)
  const detectEnergy = (text) => {
    const lower = text.toLowerCase();
    if (/can't|too tired|exhausted|nothing|empty|numb|don't care|hopeless|barely/i.test(lower)) return 'depleted';
    if (/let's go|ready|pumped|motivated|excited|crush|fired up|energized/i.test(lower)) return 'driven';
    if (/want to|trying|working on|planning|goal|better|improve/i.test(lower)) return 'engaged';
    return 'stable';
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const detectedEnergy = detectEnergy(userMessage);
    setEnergy(detectedEnergy);
    setError('');

    const newMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await callClaude(apiKey, newMessages, buildUserContext());
      setMessages([...newMessages, { role: 'mj', text: response }]);

      // Update session count
      const updatedProfile = { ...profile, totalSessions: profile.totalSessions + 1, lastActiveDate: getTodayKey() };
      storage.set(STORAGE_KEYS.USER_PROFILE, updatedProfile);

      // Log energy pattern
      const insights = storage.get(STORAGE_KEYS.INSIGHTS) || { energyPatterns: [] };
      insights.energyPatterns.push({ date: new Date().toISOString(), energy: detectedEnergy });
      if (insights.energyPatterns.length > 100) insights.energyPatterns = insights.energyPatterns.slice(-100);
      storage.set(STORAGE_KEYS.INSIGHTS, insights);

    } catch (e) {
      setError(e.message || 'Failed to get response. Please try again.');
      setMessages(newMessages); // Keep user message
    }
    setLoading(false);
  };

  // Toggle habit
  const toggleHabit = (habitId) => {
    const updated = { ...todayHabits, [habitId]: !todayHabits[habitId] };
    setTodayHabits(updated);

    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    habitsLog[getTodayKey()] = updated;
    storage.set(STORAGE_KEYS.HABITS_LOG, habitsLog);
  };

  // Copy script
  const copyScript = (script, index) => {
    navigator.clipboard.writeText(script.text);
    setCopiedScript(index);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  // New conversation
  const newConversation = () => {
    const greeting = `Fresh start. How are you showing up right now?`;
    setMessages([{ role: 'mj', text: greeting }]);
  };

  const EnergyIcon = ENERGY_STATES[energy].icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
              <span className="text-sm font-bold">MJ</span>
            </div>
            <div>
              <h1 className="text-base font-medium">MJ's Superstars</h1>
              <div className={`flex items-center gap-1.5 text-xs ${ENERGY_STATES[energy].textColor}`}>
                <EnergyIcon className="w-3 h-3" />
                <span>{ENERGY_STATES[energy].label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newConversation}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
              title="New conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Habit Tracker */}
        <div className="p-3 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Today's Habits</span>
            <span className="text-xs text-slate-500">{Object.values(todayHabits).filter(Boolean).length}/4</span>
          </div>
          <div className="flex gap-2">
            {HABITS.map(habit => {
              const Icon = habit.icon;
              const completed = todayHabits[habit.id];
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex-1 p-2.5 rounded-lg border transition-all ${
                    completed
                      ? `${habit.bgColor} border-current/30`
                      : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                  }`}
                  title={habit.name}
                >
                  <Icon className={`w-4 h-4 mx-auto ${completed ? habit.color : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-sky-600/30 border border-sky-500/20'
                  : 'bg-slate-700/30 border border-slate-600/20'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/30 border border-slate-600/20 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scripts Toggle */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowScripts(!showScripts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showScripts ? 'bg-violet-600/30 text-violet-300' : 'bg-slate-700/30 text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Social Scripts
          </button>
        </div>

        {/* Scripts Panel */}
        {showScripts && (
          <div className="mx-4 mb-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-violet-300">Copy-Paste Scripts</span>
              <button onClick={() => setShowScripts(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {SCRIPTS.map((script, i) => (
                <button
                  key={i}
                  onClick={() => copyScript(script, i)}
                  className="w-full text-left p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-all group"
                >
                  <p className="text-sm text-slate-200">"{script.text}"</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{script.context}</span>
                    {copiedScript === i ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100">Click to copy</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-700/30 bg-slate-900/50">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="How are you showing up today?"
              className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-slate-600 placeholder-slate-500"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 rounded-xl bg-sky-600/80 hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Not a substitute for professional help. <a href="tel:988" className="underline">Crisis? Call 988</a>
          </p>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onReset={onReset}
        />
      )}
    </div>
  );
}

// Root App
export default function MJSuperstars() {
  const [profile, setProfile] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedProfile = storage.get(STORAGE_KEYS.USER_PROFILE);
    const savedKey = storage.get(STORAGE_KEYS.API_KEY);
    if (savedProfile && savedKey) {
      setProfile(savedProfile);
    }
    setInitialized(true);
  }, []);

  const handleReset = () => {
    Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
    setProfile(null);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!profile) {
    return <Onboarding onComplete={setProfile} />;
  }

  return <MainApp profile={profile} onReset={handleReset} />;
}
