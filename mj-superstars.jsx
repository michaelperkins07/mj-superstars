import React, { useState, useRef, useEffect } from 'react';
import { Heart, Shield, Flame, Sun, Moon, Zap, MessageCircle, BookOpen, Phone, ChevronRight, Send, X, Check, AlertTriangle } from 'lucide-react';

const ENERGY_STATES = {
  depleted: { label: 'Depleted', color: 'bg-slate-400', icon: Moon, desc: 'Low energy. Micro steps only.' },
  stable: { label: 'Stable', color: 'bg-sky-400', icon: Shield, desc: 'Steady. Light steps work.' },
  engaged: { label: 'Engaged', color: 'bg-emerald-400', icon: Sun, desc: 'Energy present. Meaningful steps.' },
  driven: { label: 'Driven', color: 'bg-amber-400', icon: Flame, desc: 'High energy. Stretch with recovery.' }
};

const HABITS = [
  { id: 'self_love', name: 'Love for Self', icon: Heart, color: 'text-rose-400' },
  { id: 'empathy', name: 'Empathy for Others', icon: MessageCircle, color: 'text-sky-400' },
  { id: 'release', name: 'Release Hate & Remorse', icon: Shield, color: 'text-violet-400' },
  { id: 'growth', name: 'Challenge to Grow', icon: Zap, color: 'text-amber-400' }
];

const SCRIPTS = [
  { text: "Hey, quick one: how's your day going?", context: "Simple opener" },
  { text: "I'm trying to be more social. What's something you've been into lately?", context: "Vulnerable + curious" },
  { text: "No worries if you're busy. Just wanted to say hi.", context: "Low pressure" },
  { text: "I've got 5 minutes. Want to catch up real quick?", context: "Time-boxed" },
  { text: "I've got to run, but good talking with you.", context: "Graceful exit" }
];

const MICRO_ACTIONS = {
  depleted: [
    "One glass of water",
    "One minute of breathing",
    "Step outside for 30 seconds",
    "Write one honest sentence"
  ],
  stable: [
    "5-minute walk",
    "2-minute tidy",
    "Short shower reset",
    "Message yourself one kind truth"
  ],
  engaged: [
    "10-20 minute walk",
    "Complete one small avoided task",
    "Journal 5 lines",
    "Have a 2-5 minute real conversation"
  ],
  driven: [
    "Hard workout + recovery plan",
    "Tackle one meaningful responsibility",
    "Reach out to repair a relationship",
    "Bigger exposure with exit plan"
  ]
};

const detectEnergy = (text) => {
  const lower = text.toLowerCase();
  if (/can't|too tired|exhausted|nothing|empty|numb|don't care/i.test(lower)) return 'depleted';
  if (/let's go|ready|pumped|motivated|excited|crush|all caps/i.test(lower)) return 'driven';
  if (/want to|trying|working on|planning|goal/i.test(lower)) return 'engaged';
  return 'stable';
};

const detectOverlay = (text) => {
  const lower = text.toLowerCase();
  if (/kill myself|suicide|want to die|self harm|hurt myself|no reason to live/i.test(lower)) return 'crisis';
  if (/broken|worthless|hate myself|what's wrong with me|i always fail|i'm sorry for existing/i.test(lower)) return 'shame';
  if (/hate them|stupid|pissed|rage|idiots|everyone always|they never/i.test(lower)) return 'anger';
  if (/won't work|tried everything|pointless|whatever|yeah right/i.test(lower)) return 'cynicism';
  if (/they'll think|judged|awkward|don't know what to say|avoid|fear of rejection/i.test(lower)) return 'social_anxiety';
  if (/later|tomorrow|not now|once i|need perfect|can't start/i.test(lower)) return 'avoidance';
  return null;
};

const generateResponse = (text, energy, overlay) => {
  if (overlay === 'crisis') {
    return {
      message: "I hear you, and I'm really glad you're talking to me. What you're feeling is serious, and you deserve real support right now.\n\nPlease reach out to someone who can help:\n• Call or text 988 (Suicide & Crisis Lifeline)\n• Text HOME to 741741 (Crisis Text Line)\n• Call emergency services if you're in immediate danger\n\nI'm here with you, but I need you to take that step. Can you do that?",
      showCrisis: true
    };
  }

  let responses = [];

  if (overlay === 'shame') {
    responses = [
      "That sounds heavy. Let's slow this down.",
      "A rough moment isn't a verdict on who you are.",
      "What's one small thing you can do right now that treats you with respect?"
    ];
  } else if (overlay === 'anger') {
    responses = [
      "Sounds like something crossed a line for you.",
      "Anger usually shows up when something matters.",
      "What part of this is actually in your control right now?"
    ];
  } else if (overlay === 'cynicism') {
    responses = [
      "You don't have to believe in this.",
      "Let's test one tiny thing. 60 seconds. If it does nothing, we adjust.",
      "I'm not here to convince you. I'm here to help you run experiments."
    ];
  } else if (overlay === 'social_anxiety') {
    responses = [
      "Your brain is trying to keep you safe. That's not a flaw.",
      "What if we shrink this down to something so small it barely counts?",
      "I've got scripts you can copy-paste if that helps. No improvising required."
    ];
  } else if (overlay === 'avoidance') {
    responses = [
      "This feels like avoidance trying to protect you. That's okay.",
      "What's the smallest version of this? Like the first 30 seconds.",
      "We're not finishing. We're starting. Starting counts."
    ];
  } else {
    const energyResponses = {
      depleted: [
        "Today feels heavy. Let's not push.",
        "One small step is enough right now.",
        "What's the tiniest thing that would feel like respecting yourself?"
      ],
      stable: [
        "You're steady. One small rep keeps rhythm.",
        "What's one thing you can do today that your future self would thank you for?",
        "Consistency beats intensity. What's your one thing?"
      ],
      engaged: [
        "You've got energy. Let's use it cleanly.",
        "What's one way you can grow today?",
        "Good energy. Pick something meaningful."
      ],
      driven: [
        "I see the fire. Let's channel it.",
        "Grow, but stay clean. Control makes it sustainable.",
        "Big energy needs recovery planned in. What's the stretch and what's the rest?"
      ]
    };
    responses = energyResponses[energy];
  }

  return {
    message: responses[Math.floor(Math.random() * responses.length)],
    showCrisis: false
  };
};

export default function MJSuperstars() {
  const [messages, setMessages] = useState([
    { role: 'mj', text: "Hey. I'm MJ. I'm here to help you build daily habits that restore self-trust. No pressure. No judgment. Just small, honest steps.\n\nHow are you showing up today?" }
  ]);
  const [input, setInput] = useState('');
  const [energy, setEnergy] = useState('stable');
  const [showScripts, setShowScripts] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [todayHabits, setTodayHabits] = useState({});
  const [copiedScript, setCopiedScript] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const detectedEnergy = detectEnergy(userMessage);
    const overlay = detectOverlay(userMessage);

    setEnergy(detectedEnergy);

    const response = generateResponse(userMessage, detectedEnergy, overlay);

    setMessages(prev => [
      ...prev,
      { role: 'user', text: userMessage },
      { role: 'mj', text: response.message, showCrisis: response.showCrisis }
    ]);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyScript = (script, index) => {
    navigator.clipboard.writeText(script.text);
    setCopiedScript(index);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const toggleHabit = (habitId) => {
    setTodayHabits(prev => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  const EnergyIcon = ENERGY_STATES[energy].icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">MJ's Superstars</h1>
            <p className="text-sm text-slate-400">Daily habits. Honest steps.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${ENERGY_STATES[energy].color} bg-opacity-20 border border-current/20`}>
              <EnergyIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{ENERGY_STATES[energy].label}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Habit Tracker */}
        <div className="p-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Today's Habits</span>
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
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    completed
                      ? 'bg-slate-700/50 border-slate-600'
                      : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                  }`}
                  title={habit.name}
                >
                  <Icon className={`w-5 h-5 mx-auto ${completed ? habit.color : 'text-slate-500'}`} />
                  {completed && <Check className="w-3 h-3 mx-auto mt-1 text-emerald-400" />}
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
                {msg.role === 'mj' && (
                  <span className="text-xs font-medium text-slate-400 block mb-1">MJ</span>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.showCrisis && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200">
                      <a href="tel:988" className="underline font-medium">Call 988</a> or <a href="sms:741741?body=HOME" className="underline font-medium">Text HOME to 741741</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-2 flex gap-2">
          <button
            onClick={() => setShowScripts(!showScripts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showScripts ? 'bg-violet-600/30 text-violet-300' : 'bg-slate-700/30 text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Scripts
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showActions ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-700/30 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            Actions
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

        {/* Actions Panel */}
        {showActions && (
          <div className="mx-4 mb-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-300">
                {ENERGY_STATES[energy].label} Actions
              </span>
              <button onClick={() => setShowActions(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">{ENERGY_STATES[energy].desc}</p>
            <div className="space-y-1">
              {MICRO_ACTIONS[energy].map((action, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-700/30">
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                  <span className="text-sm text-slate-300">{action}</span>
                </div>
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
              onKeyPress={handleKeyPress}
              placeholder="How are you showing up today?"
              className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-slate-600 placeholder-slate-500"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
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
    </div>
  );
}
