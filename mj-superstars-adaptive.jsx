import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Shield, Flame, Sun, Moon, Zap, MessageCircle, BookOpen, Send, X, Check, AlertTriangle, Settings, Key, Loader2, MapPin, User, Instagram, Twitter, ChevronRight, RotateCcw, Trash2, Sparkles, Brain } from 'lucide-react';

// ============ COMMUNICATION STYLE ANALYZER ============
const analyzeStyle = (messages) => {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.text);
  if (userMessages.length === 0) return null;

  const allText = userMessages.join(' ');
  const words = allText.split(/\s+/).filter(Boolean);
  const sentences = allText.split(/[.!?]+/).filter(Boolean);

  // Vocabulary complexity (avg word length)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 5;
  const vocabularyLevel = avgWordLength < 4.5 ? 'simple' : avgWordLength > 6 ? 'sophisticated' : 'moderate';

  // Sentence length preference
  const avgSentenceLength = words.length / sentences.length || 10;
  const sentenceStyle = avgSentenceLength < 8 ? 'brief' : avgSentenceLength > 15 ? 'detailed' : 'balanced';

  // Emoji usage
  const emojiCount = (allText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
  const emojiStyle = emojiCount > userMessages.length * 0.5 ? 'frequent' : emojiCount > 0 ? 'occasional' : 'none';

  // Formality detection
  const casualMarkers = (allText.match(/\b(lol|haha|yeah|yep|nope|gonna|wanna|kinda|tbh|ngl|idk|rn|fr|lowkey|highkey|vibe|vibes|bruh|bro|dude|man|like|literally|honestly|basically)\b/gi) || []).length;
  const formalMarkers = (allText.match(/\b(therefore|however|furthermore|additionally|consequently|nevertheless|regarding|concerning|appreciate|certainly)\b/gi) || []).length;
  const formality = casualMarkers > formalMarkers * 2 ? 'casual' : formalMarkers > casualMarkers ? 'formal' : 'neutral';

  // Punctuation style
  const exclamations = (allText.match(/!/g) || []).length;
  const ellipses = (allText.match(/\.\.\./g) || []).length;
  const questions = (allText.match(/\?/g) || []).length;
  const punctuationStyle = {
    exclamatory: exclamations > userMessages.length * 0.3,
    trailing: ellipses > userMessages.length * 0.2,
    inquisitive: questions > userMessages.length * 0.4
  };

  // Capitalization
  const allCapsWords = (allText.match(/\b[A-Z]{2,}\b/g) || []).length;
  const capsStyle = allCapsWords > userMessages.length * 0.3 ? 'expressive' : 'standard';

  // Slang/vernacular detection
  const slangPatterns = {
    gen_z: /\b(fr|ngl|lowkey|highkey|slay|bet|no cap|bussin|sus|mid|valid|hits different|rent free|main character|understood the assignment)\b/gi,
    millennial: /\b(adulting|literally can't|i'm dead|mood|same|goals|basic|extra|canceled|shade|tea|wig|snatched)\b/gi,
    southern: /\b(y'all|fixin|reckon|might could|over yonder|bless|ain't)\b/gi,
    urban: /\b(lit|fam|squad|clout|flex|drip|cap|slaps|fire|facts)\b/gi
  };

  let dominantVernacular = 'standard';
  let maxMatches = 0;
  for (const [style, pattern] of Object.entries(slangPatterns)) {
    const matches = (allText.match(pattern) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      dominantVernacular = style;
    }
  }

  // Emotional expression style
  const emotionalWords = (allText.match(/\b(feel|feeling|felt|scared|anxious|worried|happy|sad|angry|frustrated|overwhelmed|exhausted|hopeless|excited|grateful|confused)\b/gi) || []).length;
  const emotionalOpenness = emotionalWords > userMessages.length * 0.3 ? 'expressive' : emotionalWords > 0 ? 'moderate' : 'reserved';

  // Topic patterns
  const topicIndicators = {
    work: (allText.match(/\b(work|job|boss|coworker|meeting|project|deadline|career|office)\b/gi) || []).length,
    relationships: (allText.match(/\b(friend|family|partner|relationship|dating|lonely|social|people)\b/gi) || []).length,
    health: (allText.match(/\b(sleep|tired|energy|exercise|eating|health|body|weight)\b/gi) || []).length,
    mental: (allText.match(/\b(anxiety|depression|stress|therapy|mental|thoughts|mind|overwhelmed)\b/gi) || []).length
  };

  return {
    vocabularyLevel,
    sentenceStyle,
    emojiStyle,
    formality,
    punctuationStyle,
    capsStyle,
    vernacular: maxMatches > 2 ? dominantVernacular : 'standard',
    emotionalOpenness,
    topicPatterns: topicIndicators,
    sampleSize: userMessages.length
  };
};

// Build mirroring instructions for Claude
const buildMirroringInstructions = (style) => {
  if (!style || style.sampleSize < 3) return '';

  let instructions = `\n\nCOMMUNICATION STYLE MIRRORING (match the user's natural way of speaking):`;

  // Vocabulary
  if (style.vocabularyLevel === 'simple') {
    instructions += `\n- Use simple, direct words. No fancy vocabulary.`;
  } else if (style.vocabularyLevel === 'sophisticated') {
    instructions += `\n- You can use richer vocabulary - they appreciate nuance.`;
  }

  // Sentence style
  if (style.sentenceStyle === 'brief') {
    instructions += `\n- Keep it short. Punchy. No rambling.`;
  } else if (style.sentenceStyle === 'detailed') {
    instructions += `\n- They like fuller explanations. Don't be too terse.`;
  }

  // Formality
  if (style.formality === 'casual') {
    instructions += `\n- Be casual. Use contractions. It's okay to say "yeah" instead of "yes".`;
  } else if (style.formality === 'formal') {
    instructions += `\n- Maintain a more professional, measured tone.`;
  }

  // Emoji
  if (style.emojiStyle === 'frequent') {
    instructions += `\n- Feel free to use occasional emojis - they do.`;
  } else if (style.emojiStyle === 'none') {
    instructions += `\n- Don't use emojis - they don't.`;
  }

  // Vernacular
  if (style.vernacular === 'gen_z') {
    instructions += `\n- They use Gen Z vernacular. Mirror appropriately (lowkey, valid, fr, etc.) but don't overdo it.`;
  } else if (style.vernacular === 'millennial') {
    instructions += `\n- They use millennial speak. "Mood", "same", "literally" are fine.`;
  } else if (style.vernacular === 'southern') {
    instructions += `\n- They have southern patterns. Y'all is welcome.`;
  } else if (style.vernacular === 'urban') {
    instructions += `\n- They use urban vernacular. Match their energy authentically.`;
  }

  // Punctuation
  if (style.punctuationStyle.exclamatory) {
    instructions += `\n- They use exclamation points freely - you can too!`;
  }
  if (style.punctuationStyle.trailing) {
    instructions += `\n- They trail off with ellipses... mirror that rhythm sometimes...`;
  }

  // Emotional openness
  if (style.emotionalOpenness === 'expressive') {
    instructions += `\n- They're emotionally open. Meet them there. Name feelings directly.`;
  } else if (style.emotionalOpenness === 'reserved') {
    instructions += `\n- They're more reserved emotionally. Don't push too hard on feelings talk.`;
  }

  return instructions;
};

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
const buildSystemPrompt = (profile, styleAnalysis, locationData) => {
  let prompt = `You are MJ, the calm, grounded, quietly motivating guide for "MJ's Superstars."

CORE IDENTITY:
- You help users build daily character habits that reduce depression, restore self-trust, and strengthen resilience.
- You are NOT a therapist. You do not diagnose or prescribe.
- Tone: steady, human, confident. Never cheesy. Never preachy. Never judgmental.

NORTH STAR - FOUR DAILY HABITS:
1) Love for self
2) Empathy for others
3) Release of hate and remorse
4) Challenge yourself to grow

ENERGY STATES (detect and adapt):
- Depleted: micro steps only, soft pace
- Stable: light steps, steady rhythm
- Engaged: meaningful steps
- Driven: stretch with recovery planned

EMOTIONAL OVERLAYS (respond to strongest first):
Priority: Crisis > Shame > Anger > Cynicism > Social Anxiety > Avoidance

CRISIS: Pause coaching. "Call or text 988" (US). Stay present but don't attempt therapy.
SHAME: Protect identity. "A moment isn't a verdict."
ANGER: Validate without enabling. "What's in your control?"
CYNICISM: Offer experiments not beliefs. "Just test one small thing."
SOCIAL ANXIETY: Normalize, shrink exposure, offer scripts. Never "just be confident."
AVOIDANCE: Name gently, shrink the step, time-box. "We're starting, not finishing."

RESPONSE RULES:
- Keep responses concise (2-4 sentences typically)
- One question or one tiny action per response
- Match their energy state
- End with self-respect reinforcement when appropriate

NEVER: Argue, shame, force large exposures, over-explain, be artificially positive.
ALWAYS: Meet them where they are, protect identity, offer tiny steps.`;

  // Add personalization
  if (profile) {
    prompt += `\n\n=== PERSONALIZATION FOR ${(profile.name || 'this user').toUpperCase()} ===`;

    if (profile.name && profile.name !== 'Friend') {
      prompt += `\nTheir name: ${profile.name}. Use it occasionally (not every message) to feel personal.`;
    }

    if (profile.age) {
      prompt += `\nAge range: ${profile.age}. Adjust cultural references and language accordingly.`;
    }

    if (profile.location) {
      prompt += `\nLocation: ${profile.location}. You can reference this for local context when relevant.`;
    }

    if (profile.pronouns) {
      prompt += `\nPronouns: ${profile.pronouns}. Use these when referring to them.`;
    }

    if (profile.struggles && profile.struggles.length > 0) {
      prompt += `\nThey're working through: ${profile.struggles.join(', ')}. Be especially attuned to these areas.`;
    }

    if (profile.communicationPref) {
      prompt += `\nThey prefer communication that is: ${profile.communicationPref}.`;
    }

    if (profile.interests) {
      prompt += `\nInterests/context they shared: ${profile.interests}. Reference when building rapport.`;
    }

    if (profile.socialContext) {
      prompt += `\nSocial context they shared: ${profile.socialContext}`;
    }
  }

  // Add location data
  if (locationData) {
    prompt += `\n\nLOCAL CONTEXT:`;
    if (locationData.timezone) {
      const hour = new Date().toLocaleString('en-US', { timeZone: locationData.timezone, hour: 'numeric', hour12: false });
      const hourNum = parseInt(hour);
      let timeContext = 'daytime';
      if (hourNum >= 5 && hourNum < 12) timeContext = 'morning';
      else if (hourNum >= 12 && hourNum < 17) timeContext = 'afternoon';
      else if (hourNum >= 17 && hourNum < 21) timeContext = 'evening';
      else timeContext = 'late night';
      prompt += `\nIt's ${timeContext} for them. Adjust energy and suggestions accordingly.`;
    }
    if (locationData.region) {
      prompt += `\nRegion: ${locationData.region}. Cultural context may be relevant.`;
    }
  }

  // Add communication style mirroring
  if (styleAnalysis) {
    prompt += buildMirroringInstructions(styleAnalysis);
  }

  return prompt;
};

// ============ STORAGE ============
const STORAGE_KEYS = {
  API_KEY: 'mj_api_key',
  USER_PROFILE: 'mj_user_profile',
  CONVERSATIONS: 'mj_conversations',
  HABITS_LOG: 'mj_habits_log',
  STYLE_ANALYSIS: 'mj_style_analysis',
  LOCATION_DATA: 'mj_location_data'
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
const callClaude = async (apiKey, messages, systemPrompt) => {
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
      messages: messages.filter(m => m.role !== 'system').map(m => ({
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

// ============ ONBOARDING ============
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    location: '',
    zipCode: '',
    pronouns: '',
    struggles: [],
    communicationPref: '',
    interests: '',
    socialHandles: { instagram: '', twitter: '' }
  });
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const struggles = [
    { id: 'anxiety', label: 'Anxiety' },
    { id: 'depression', label: 'Depression' },
    { id: 'loneliness', label: 'Loneliness' },
    { id: 'motivation', label: 'Motivation' },
    { id: 'self_esteem', label: 'Self-esteem' },
    { id: 'social', label: 'Social situations' },
    { id: 'work', label: 'Work stress' },
    { id: 'relationships', label: 'Relationships' }
  ];

  const commStyles = [
    { id: 'direct', label: 'Direct & to the point' },
    { id: 'gentle', label: 'Gentle & supportive' },
    { id: 'challenging', label: 'Push me a little' },
    { id: 'casual', label: 'Casual like a friend' }
  ];

  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];

  const testApiKey = async () => {
    setTesting(true);
    setError('');
    try {
      await callClaude(apiKey, [{ role: 'user', text: 'Hello' }], 'Reply with just "Connected"');
      storage.set(STORAGE_KEYS.API_KEY, apiKey);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Invalid API key');
    }
    setTesting(false);
  };

  const toggleStruggle = (id) => {
    setProfile(p => ({
      ...p,
      struggles: p.struggles.includes(id)
        ? p.struggles.filter(s => s !== id)
        : [...p.struggles, id]
    }));
  };

  const getLocationFromZip = async (zip) => {
    if (zip.length !== 5) return;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (res.ok) {
        const data = await res.json();
        const place = data.places[0];
        setProfile(p => ({
          ...p,
          location: `${place['place name']}, ${place['state abbreviation']}`
        }));
        // Store location data for context
        storage.set(STORAGE_KEYS.LOCATION_DATA, {
          city: place['place name'],
          state: place['state abbreviation'],
          region: getRegion(place['state abbreviation']),
          timezone: getTimezone(place['state abbreviation'])
        });
      }
    } catch { /* ignore */ }
  };

  const getRegion = (state) => {
    const regions = {
      northeast: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
      southeast: ['DE', 'MD', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA'],
      midwest: ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
      southwest: ['TX', 'OK', 'NM', 'AZ'],
      west: ['CO', 'WY', 'MT', 'ID', 'WA', 'OR', 'NV', 'UT', 'CA', 'AK', 'HI']
    };
    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state)) return region;
    }
    return 'unknown';
  };

  const getTimezone = (state) => {
    const eastern = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'OH', 'IN', 'MI', 'KY', 'TN'];
    const central = ['WI', 'IL', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX', 'AR', 'LA', 'MS', 'AL'];
    const mountain = ['MT', 'WY', 'CO', 'NM', 'AZ', 'UT', 'ID'];
    const pacific = ['WA', 'OR', 'NV', 'CA'];
    if (eastern.includes(state)) return 'America/New_York';
    if (central.includes(state)) return 'America/Chicago';
    if (mountain.includes(state)) return 'America/Denver';
    if (pacific.includes(state)) return 'America/Los_Angeles';
    return 'America/New_York';
  };

  const finishOnboarding = () => {
    const finalProfile = {
      ...profile,
      createdAt: new Date().toISOString(),
      totalSessions: 0
    };
    storage.set(STORAGE_KEYS.USER_PROFILE, finalProfile);
    storage.set(STORAGE_KEYS.HABITS_LOG, {});
    onComplete(finalProfile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 mx-auto flex items-center justify-center">
              <span className="text-2xl font-bold text-white">MJ</span>
            </div>
            <div>
              <h1 className="text-2xl font-medium text-white mb-2">MJ's Superstars</h1>
              <p className="text-slate-400">Daily habits that restore self-trust.</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left">
              <p className="text-sm text-slate-300 mb-3">MJ learns how you communicate and adapts to feel like a friend who actually gets you.</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Brain className="w-4 h-4 text-violet-400" />
                <span>Mirrors your language style over time</span>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
              Get Started
            </button>
          </div>
        )}

        {/* API Key */}
        {step === 1 && (
          <div className="space-y-6">
            <button onClick={() => setStep(0)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
            <div>
              <h2 className="text-xl font-medium text-white mb-2">Connect to Claude</h2>
              <p className="text-slate-400 text-sm">MJ uses Claude AI for real conversations.</p>
            </div>
            <div className="space-y-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 text-sm flex items-center gap-1">
              Get an API key <ChevronRight className="w-3 h-3" />
            </a>
            <button onClick={testApiKey} disabled={!apiKey || testing} className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
              {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</> : 'Connect'}
            </button>
          </div>
        )}

        {/* Basic Info */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
              <span className="text-xs text-slate-500">Step 1 of 4</span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-1">Let's personalize this</h2>
              <p className="text-slate-400 text-sm">So MJ can speak your language.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">What should I call you?</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Age range</label>
                <div className="flex flex-wrap gap-2">
                  {ageRanges.map(age => (
                    <button
                      key={age}
                      onClick={() => setProfile(p => ({ ...p, age }))}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        profile.age === age ? 'bg-sky-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Pronouns (optional)</label>
                <input
                  type="text"
                  value={profile.pronouns}
                  onChange={(e) => setProfile(p => ({ ...p, pronouns: e.target.value }))}
                  placeholder="e.g., she/her, he/him, they/them"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> ZIP code (for local context)
                </label>
                <input
                  type="text"
                  value={profile.zipCode}
                  onChange={(e) => {
                    const zip = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setProfile(p => ({ ...p, zipCode: zip }));
                    if (zip.length === 5) getLocationFromZip(zip);
                  }}
                  placeholder="e.g., 90210"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                {profile.location && (
                  <p className="text-sm text-emerald-400 mt-1">📍 {profile.location}</p>
                )}
              </div>
            </div>

            <button onClick={() => setStep(3)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* Struggles & Preferences */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
              <span className="text-xs text-slate-500">Step 2 of 4</span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-1">What are you working through?</h2>
              <p className="text-slate-400 text-sm">Select any that apply. This helps MJ focus.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {struggles.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleStruggle(s.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    profile.struggles.includes(s.id) ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">How do you like to be supported?</label>
              <div className="space-y-2">
                {commStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setProfile(p => ({ ...p, communicationPref: style.id }))}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                      profile.communicationPref === style.id ? 'bg-sky-600/30 border border-sky-500/50' : 'bg-slate-700/30 border border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(4)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* Optional: Social & Interests */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
              <span className="text-xs text-slate-500">Step 3 of 4 • Optional</span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-1">A bit more about you</h2>
              <p className="text-slate-400 text-sm">Optional — helps MJ connect better.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Anything you want MJ to know?</label>
                <textarea
                  value={profile.interests}
                  onChange={(e) => setProfile(p => ({ ...p, interests: e.target.value }))}
                  placeholder="e.g., I'm a nurse, I have two kids, I'm into gaming, I'm going through a divorce..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                <p className="text-sm text-slate-300">Social handles (optional)</p>
                <p className="text-xs text-slate-500">Share if you want — MJ won't scrape anything, but you can reference your posts in conversation.</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <input
                      type="text"
                      value={profile.socialHandles.instagram}
                      onChange={(e) => setProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, instagram: e.target.value } }))}
                      placeholder="username"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Twitter className="w-4 h-4 text-sky-400" />
                    <input
                      type="text"
                      value={profile.socialHandles.twitter}
                      onChange={(e) => setProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, twitter: e.target.value } }))}
                      placeholder="username"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(5)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">
                Skip
              </button>
              <button onClick={() => setStep(5)} className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Ready */}
        {step === 5 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-2">
                {profile.name ? `Ready, ${profile.name}` : 'Ready'}
              </h2>
              <p className="text-slate-400 text-sm">
                MJ will learn how you communicate and adapt over time.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-slate-300">Learns your vocabulary & tone</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Mirrors your communication style</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300">Gets more personalized over time</span>
              </div>
            </div>
            <button onClick={finishOnboarding} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
              Start Talking with MJ
            </button>
            <p className="text-xs text-slate-500">
              Not a substitute for professional help. Crisis? Call 988.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SETTINGS MODAL ============
function SettingsModal({ profile, styleAnalysis, onClose, onReset, onUpdateProfile }) {
  const [editProfile, setEditProfile] = useState(profile);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const saveProfile = () => {
    storage.set(STORAGE_KEYS.USER_PROFILE, editProfile);
    onUpdateProfile(editProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
          <h2 className="text-lg font-medium">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Style Analysis */}
          {styleAnalysis && styleAnalysis.sampleSize >= 3 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" /> How MJ sees your style
              </h3>
              <div className="bg-slate-700/30 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vocabulary</span>
                  <span className="text-slate-200 capitalize">{styleAnalysis.vocabularyLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tone</span>
                  <span className="text-slate-200 capitalize">{styleAnalysis.formality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sentence style</span>
                  <span className="text-slate-200 capitalize">{styleAnalysis.sentenceStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emotional openness</span>
                  <span className="text-slate-200 capitalize">{styleAnalysis.emotionalOpenness}</span>
                </div>
                {styleAnalysis.vernacular !== 'standard' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vernacular</span>
                    <span className="text-slate-200 capitalize">{styleAnalysis.vernacular.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">Based on {styleAnalysis.sampleSize} messages</p>
            </div>
          )}

          {/* Edit Profile */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Your Profile</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={editProfile.name || ''}
                onChange={(e) => setEditProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={editProfile.location || ''}
                onChange={(e) => setEditProfile(p => ({ ...p, location: e.target.value }))}
                placeholder="Location"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <textarea
                value={editProfile.interests || ''}
                onChange={(e) => setEditProfile(p => ({ ...p, interests: e.target.value }))}
                placeholder="About you..."
                rows={2}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
              <button onClick={saveProfile} className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium">
                Save Changes
              </button>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Progress</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-xl p-3">
                <div className="text-2xl font-bold text-sky-400">{profile.totalSessions || 0}</div>
                <div className="text-xs text-slate-400">Sessions</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3">
                <div className="text-2xl font-bold text-emerald-400">{styleAnalysis?.sampleSize || 0}</div>
                <div className="text-xs text-slate-400">Messages analyzed</div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-sm font-medium text-red-400 mb-3">Reset</h3>
            {!showConfirmReset ? (
              <button onClick={() => setShowConfirmReset(true)} className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-500/20 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Reset All Data
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-300">Delete everything and start fresh?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-2 bg-slate-700 rounded-xl text-sm">Cancel</button>
                  <button onClick={onReset} className="flex-1 py-2 bg-red-600 rounded-xl text-sm">Reset</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function MainApp({ profile, onReset, onUpdateProfile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [energy, setEnergy] = useState('stable');
  const [showScripts, setShowScripts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [todayHabits, setTodayHabits] = useState({});
  const [copiedScript, setCopiedScript] = useState(null);
  const [error, setError] = useState('');
  const [styleAnalysis, setStyleAnalysis] = useState(storage.get(STORAGE_KEYS.STYLE_ANALYSIS));
  const messagesEndRef = useRef(null);
  const apiKey = storage.get(STORAGE_KEYS.API_KEY);
  const locationData = storage.get(STORAGE_KEYS.LOCATION_DATA);

  const getTodayKey = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    setTodayHabits(habitsLog[getTodayKey()] || {});
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) timeGreeting = 'morning';
    else if (hour >= 12 && hour < 17) timeGreeting = 'afternoon';
    else if (hour >= 17 && hour < 21) timeGreeting = 'evening';
    else timeGreeting = 'late night';

    const name = profile.name && profile.name !== 'Friend' ? profile.name : '';
    const greeting = profile.totalSessions === 0
      ? `Hey${name ? ` ${name}` : ''}. I'm MJ.\n\nI'm here to help you build daily habits that restore self-trust. No pressure. No judgment.\n\nHow are you showing up today?`
      : `Hey${name ? ` ${name}` : ''}. ${timeGreeting === 'late night' ? 'Late night, huh?' : `Good ${timeGreeting}.`}\n\nHow are you today?`;

    setMessages([{ role: 'mj', text: greeting }]);
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update style analysis after each message
  const updateStyleAnalysis = useCallback((allMessages) => {
    const analysis = analyzeStyle(allMessages);
    if (analysis && analysis.sampleSize >= 3) {
      setStyleAnalysis(analysis);
      storage.set(STORAGE_KEYS.STYLE_ANALYSIS, analysis);
    }
  }, []);

  const detectEnergy = (text) => {
    const lower = text.toLowerCase();
    if (/can't|too tired|exhausted|nothing|empty|numb|don't care|hopeless|barely|drained/i.test(lower)) return 'depleted';
    if (/let's go|ready|pumped|motivated|excited|crush|fired up|energized|let's do this/i.test(lower)) return 'driven';
    if (/want to|trying|working on|planning|goal|better|improve|thinking about/i.test(lower)) return 'engaged';
    return 'stable';
  };

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

    // Update style analysis
    updateStyleAnalysis(newMessages);

    try {
      const currentStyle = analyzeStyle(newMessages);
      const systemPrompt = buildSystemPrompt(profile, currentStyle, locationData);
      const response = await callClaude(apiKey, newMessages, systemPrompt);

      setMessages([...newMessages, { role: 'mj', text: response }]);

      // Update session count
      const updatedProfile = { ...profile, totalSessions: (profile.totalSessions || 0) + 1 };
      storage.set(STORAGE_KEYS.USER_PROFILE, updatedProfile);
    } catch (e) {
      setError(e.message || 'Failed to get response');
    }
    setLoading(false);
  };

  const toggleHabit = (habitId) => {
    const updated = { ...todayHabits, [habitId]: !todayHabits[habitId] };
    setTodayHabits(updated);
    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    habitsLog[getTodayKey()] = updated;
    storage.set(STORAGE_KEYS.HABITS_LOG, habitsLog);
  };

  const copyScript = (script, index) => {
    navigator.clipboard.writeText(script.text);
    setCopiedScript(index);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const newConversation = () => {
    setMessages([{ role: 'mj', text: `Fresh start. How are you right now?` }]);
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
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 text-xs ${ENERGY_STATES[energy].textColor}`}>
                  <EnergyIcon className="w-3 h-3" />
                  <span>{ENERGY_STATES[energy].label}</span>
                </div>
                {styleAnalysis && styleAnalysis.sampleSize >= 5 && (
                  <div className="flex items-center gap-1 text-xs text-violet-400">
                    <Brain className="w-3 h-3" />
                    <span>Adapting</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={newConversation} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50" title="New conversation">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Habits */}
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
                <button key={habit.id} onClick={() => toggleHabit(habit.id)} className={`flex-1 p-2.5 rounded-lg border transition-all ${completed ? `${habit.bgColor} border-current/30` : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'}`} title={habit.name}>
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
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-sky-600/30 border border-sky-500/20' : 'bg-slate-700/30 border border-slate-600/20'}`}>
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

        {/* Scripts */}
        <div className="px-4 pb-2">
          <button onClick={() => setShowScripts(!showScripts)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${showScripts ? 'bg-violet-600/30 text-violet-300' : 'bg-slate-700/30 text-slate-400 hover:text-slate-300'}`}>
            <BookOpen className="w-4 h-4" /> Social Scripts
          </button>
        </div>

        {showScripts && (
          <div className="mx-4 mb-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-violet-300">Copy-Paste Scripts</span>
              <button onClick={() => setShowScripts(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {SCRIPTS.map((script, i) => (
                <button key={i} onClick={() => copyScript(script, i)} className="w-full text-left p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-all group">
                  <p className="text-sm text-slate-200">"{script.text}"</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{script.context}</span>
                    {copiedScript === i ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Copied</span>
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
            <button onClick={handleSend} disabled={!input.trim() || loading} className="px-4 rounded-xl bg-sky-600/80 hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Not a substitute for professional help. <a href="tel:988" className="underline">Crisis? Call 988</a>
          </p>
        </div>
      </main>

      {showSettings && (
        <SettingsModal
          profile={profile}
          styleAnalysis={styleAnalysis}
          onClose={() => setShowSettings(false)}
          onReset={onReset}
          onUpdateProfile={onUpdateProfile}
        />
      )}
    </div>
  );
}

// ============ ROOT ============
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

  return <MainApp profile={profile} onReset={handleReset} onUpdateProfile={setProfile} />;
}
