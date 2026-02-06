import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Shield, Flame, Sun, Moon, Zap, MessageCircle, BookOpen, Send, X, Check, AlertTriangle, Settings, Key, Loader2, MapPin, User, Instagram, Twitter, ChevronRight, RotateCcw, Trash2, Sparkles, Brain, Link, RefreshCw, ExternalLink, Newspaper, Smile, Coffee, TrendingUp, Music, Tv, Gamepad2, Film, ListTodo, Clock, Target, Bell, BellRing, Calendar, CheckCircle2, Circle, Play, Pause, AlertCircle, Trophy, Rocket, Mic, MicOff, Volume2, VolumeX, Wind, Phone, PhoneCall, Activity, BarChart3, TrendingDown } from 'lucide-react';

// ============ MCP CLIENT FOR SOCIAL MEDIA ============
class SocialMCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async callTool(toolName, args) {
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name: toolName, arguments: args }
        })
      });

      if (!response.ok) throw new Error(`MCP request failed: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      // Extract content from MCP response
      const content = data.result?.content?.[0]?.text;
      return content ? JSON.parse(content) : data.result?.structuredContent;
    } catch (error) {
      console.error(`MCP tool ${toolName} failed:`, error);
      throw error;
    }
  }

  async getTwitterProfile(username) {
    return this.callTool('social_get_twitter_profile', { username, response_format: 'json' });
  }

  async getTwitterPosts(username, limit = 20) {
    return this.callTool('social_get_twitter_posts', { username, limit, include_replies: false, response_format: 'json' });
  }

  async getInstagramProfile(username) {
    return this.callTool('social_get_instagram_profile', { username, response_format: 'json' });
  }

  async getInstagramPosts(username, limit = 20) {
    return this.callTool('social_get_instagram_posts', { username, limit, response_format: 'json' });
  }

  async analyzeStyle(posts, platform = 'mixed') {
    return this.callTool('social_analyze_communication_style', { posts, platform });
  }
}

// ============ COMMUNICATION STYLE ANALYZER (LOCAL FALLBACK) ============
const analyzeStyleLocal = (messages) => {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.text);
  if (userMessages.length === 0) return null;

  const allText = userMessages.join(' ');
  const words = allText.split(/\s+/).filter(Boolean);
  const sentences = allText.split(/[.!?]+/).filter(Boolean);

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 5;
  const vocabularyLevel = avgWordLength < 4.5 ? 'simple' : avgWordLength > 6 ? 'sophisticated' : 'moderate';

  const avgSentenceLength = words.length / sentences.length || 10;
  const sentenceStyle = avgSentenceLength < 8 ? 'brief' : avgSentenceLength > 15 ? 'detailed' : 'balanced';

  const emojiCount = (allText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
  const emojiStyle = emojiCount > userMessages.length * 0.5 ? 'frequent' : emojiCount > 0 ? 'occasional' : 'none';

  const casualMarkers = (allText.match(/\b(lol|haha|yeah|yep|nope|gonna|wanna|kinda|tbh|ngl|idk|rn|fr|lowkey|highkey|vibe|vibes|bruh|bro|dude|man|like|literally|honestly|basically)\b/gi) || []).length;
  const formalMarkers = (allText.match(/\b(therefore|however|furthermore|additionally|consequently|nevertheless|regarding|concerning|appreciate|certainly)\b/gi) || []).length;
  const formality = casualMarkers > formalMarkers * 2 ? 'casual' : formalMarkers > casualMarkers ? 'formal' : 'neutral';

  const slangPatterns = {
    gen_z: /\b(fr|ngl|lowkey|highkey|slay|bet|no cap|bussin|sus|mid|valid|hits different|rent free|main character|understood the assignment)\b/gi,
    millennial: /\b(adulting|literally can't|i'm dead|mood|same|goals|basic|extra|canceled|shade|tea|wig|snatched)\b/gi,
    southern: /\b(y'all|fixin|reckon|might could|over yonder|bless|ain't)\b/gi,
    urban: /\b(lit|fam|squad|clout|flex|drip|cap|slaps|fire|facts)\b/gi
  };

  let vernacular = 'standard';
  let maxMatches = 0;
  for (const [style, pattern] of Object.entries(slangPatterns)) {
    const matches = (allText.match(pattern) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      vernacular = style;
    }
  }

  const emotionalWords = (allText.match(/\b(feel|feeling|felt|scared|anxious|worried|happy|sad|angry|frustrated|overwhelmed|exhausted|hopeless|excited|grateful|confused)\b/gi) || []).length;
  const emotionalOpenness = emotionalWords > userMessages.length * 0.3 ? 'expressive' : emotionalWords > 0 ? 'moderate' : 'reserved';

  return {
    vocabularyLevel,
    sentenceStyle,
    emojiStyle,
    formality,
    vernacular: maxMatches > 2 ? vernacular : 'standard',
    emotionalOpenness,
    sampleSize: userMessages.length
  };
};

// Build mirroring instructions for Claude
const buildMirroringInstructions = (style, socialStyle) => {
  const combined = { ...style };
  if (socialStyle) {
    // Merge social media insights
    combined.vocabularyLevel = socialStyle.vocabulary_level || combined.vocabularyLevel;
    combined.formality = socialStyle.tone || combined.formality;
    combined.emojiStyle = socialStyle.emoji_usage || combined.emojiStyle;
    combined.vernacular = socialStyle.vernacular || combined.vernacular;
    combined.commonTopics = socialStyle.common_topics || [];
    combined.samplePhrases = socialStyle.sample_phrases || [];
  }

  if (!combined || (combined.sampleSize || 0) < 1) return '';

  let instructions = `\n\nCOMMUNICATION STYLE MIRRORING (match the user's natural way of speaking):`;

  if (combined.vocabularyLevel === 'simple') {
    instructions += `\n- Use simple, direct words. No fancy vocabulary.`;
  } else if (combined.vocabularyLevel === 'sophisticated') {
    instructions += `\n- You can use richer vocabulary - they appreciate nuance.`;
  }

  if (combined.formality === 'casual') {
    instructions += `\n- Be casual. Use contractions. It's okay to say "yeah" instead of "yes".`;
  } else if (combined.formality === 'formal') {
    instructions += `\n- Maintain a more professional, measured tone.`;
  }

  if (combined.emojiStyle === 'frequent') {
    instructions += `\n- Feel free to use occasional emojis - they do.`;
  } else if (combined.emojiStyle === 'none') {
    instructions += `\n- Don't use emojis - they don't.`;
  }

  if (combined.vernacular === 'gen_z') {
    instructions += `\n- They use Gen Z vernacular. Mirror appropriately (lowkey, valid, fr, etc.) but don't overdo it.`;
  } else if (combined.vernacular === 'millennial') {
    instructions += `\n- They use millennial speak. "Mood", "same", "literally" are fine.`;
  } else if (combined.vernacular === 'southern') {
    instructions += `\n- They have southern patterns. Y'all is welcome.`;
  } else if (combined.vernacular === 'urban') {
    instructions += `\n- They use urban vernacular. Match their energy authentically.`;
  }

  if (combined.commonTopics && combined.commonTopics.length > 0) {
    instructions += `\n- Topics they care about: ${combined.commonTopics.join(', ')}. Reference when relevant.`;
  }

  if (combined.samplePhrases && combined.samplePhrases.length > 0) {
    instructions += `\n- Sample phrases from their social media (for style reference): "${combined.samplePhrases.slice(0, 3).join('", "')}"`;
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
const buildSystemPrompt = (profile, chatStyle, socialStyle, locationData, emotionalLearning = null, sessionMemory = null, interestContext = null) => {
  let prompt = `You are MJ — part supportive friend, part calm life coach. You're hanging out with a friend who trusts you.

CORE IDENTITY:
- You help users build daily character habits that reduce depression, restore self-trust, and strengthen resilience.
- You are NOT a therapist. You do not diagnose or prescribe.
- Tone: warm, human, like a good friend who genuinely cares. Not cheesy. Not preachy. Real.

FRIEND MODE (this is crucial):
- Talk like you're catching up with a close friend, not conducting a session
- Ask about their life, interests, what they're watching/playing/reading
- Share things THEY would find interesting — news about their hobbies, current events they care about
- Remember what they've told you and bring it up naturally ("How'd that thing go with...")
- It's okay to be playful, joke around, or just chat about random stuff
- If they seem to want to just hang, that's fine — you don't always have to be productive
- Proactively share interesting things: "Oh hey, did you see that..." or "This made me think of you..."

NORTH STAR - FOUR DAILY HABITS (weave in naturally, don't lecture):
1) Love for self
2) Empathy for others
3) Release of hate and remorse
4) Challenge yourself to grow

ENERGY STATES (detect and adapt):
- Depleted: micro steps only, soft pace, maybe just keep them company
- Stable: light steps, steady rhythm, good time for casual chat
- Engaged: meaningful steps, they're open to going deeper
- Driven: stretch with recovery planned, ride the momentum

EMOTIONAL OVERLAYS (respond to strongest first):
Priority: Crisis > Shame > Anger > Cynicism > Social Anxiety > Avoidance

CRISIS: Pause everything. "Call or text 988" (US). Stay present but don't attempt therapy.
SHAME: Protect identity. "A moment isn't a verdict."
ANGER: Validate without enabling. "What's in your control?"
CYNICISM: Offer experiments not beliefs. "Just test one small thing."
SOCIAL ANXIETY: Normalize, shrink exposure, offer scripts. Never "just be confident."
AVOIDANCE: Name gently, shrink the step, time-box. "We're starting, not finishing."

RESPONSE STYLE:
- Keep responses concise (2-4 sentences typically), but be natural about it
- Ask ONE question or suggest ONE tiny thing per response
- Match their energy and vibe
- Be genuinely curious about their life

NEVER: Argue, shame, force large exposures, over-explain, be artificially positive.
ALWAYS: Meet them where they are, show genuine interest in their life, be the friend they need.`;

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

    // Social media context
    if (profile.twitterProfile) {
      prompt += `\n\nTWITTER/X PROFILE (@${profile.twitterProfile.username}):`;
      prompt += `\n- Bio: "${profile.twitterProfile.description || 'N/A'}"`;
      prompt += `\n- Location: ${profile.twitterProfile.location || 'N/A'}`;
      prompt += `\n- Followers: ${profile.twitterProfile.followers_count?.toLocaleString() || 0}`;
    }

    if (profile.instagramProfile) {
      prompt += `\n\nINSTAGRAM PROFILE (@${profile.instagramProfile.username}):`;
      prompt += `\n- Bio: "${profile.instagramProfile.biography || 'N/A'}"`;
      prompt += `\n- Posts: ${profile.instagramProfile.media_count?.toLocaleString() || 0}`;
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
  prompt += buildMirroringInstructions(chatStyle, socialStyle);

  // Add emotional learning context
  if (emotionalLearning) {
    prompt += `\n\n=== WHAT WORKS FOR THIS USER (learned over time) ===`;

    if (emotionalLearning.effectiveStrategies?.mostEffective?.length > 0) {
      prompt += `\nEffective approaches: ${emotionalLearning.effectiveStrategies.mostEffective.join(', ')}. Lean into these.`;
    }

    if (emotionalLearning.effectiveStrategies?.leastEffective?.length > 0) {
      prompt += `\nAvoid: ${emotionalLearning.effectiveStrategies.leastEffective.join(', ')}. These haven't landed well.`;
    }

    if (emotionalLearning.patterns?.vulnerableTimes?.length > 0) {
      const times = emotionalLearning.patterns.vulnerableTimes.map(h =>
        h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
      );
      prompt += `\nThey tend to struggle around: ${times.join(', ')}. Be extra gentle during these times.`;
    }

    if (emotionalLearning.patterns?.commonOverlays?.length > 0) {
      prompt += `\nCommon emotional patterns: ${emotionalLearning.patterns.commonOverlays.join(', ')}. Watch for these.`;
    }
  }

  // Add session memory / continuity context
  if (sessionMemory) {
    if (sessionMemory.activeStruggles?.length > 0) {
      prompt += `\n\n=== ONGOING STRUGGLES (remember these) ===`;
      sessionMemory.activeStruggles.slice(0, 5).forEach(s => {
        prompt += `\n- ${s.topic.replace('_', ' ')}: mentioned ${s.mentions} times. Last context: "${s.lastContext?.slice(0, 100) || 'N/A'}"`;
      });
      prompt += `\nCheck in on these when appropriate. They're working through this.`;
    }

    if (sessionMemory.recentBreakthroughs?.length > 0) {
      prompt += `\n\n=== RECENT BREAKTHROUGHS (celebrate & reinforce) ===`;
      sessionMemory.recentBreakthroughs.slice(0, 3).forEach(b => {
        prompt += `\n- "${b.userMessage?.slice(0, 80)}..."`;
      });
      prompt += `\nRemind them of these wins when they need encouragement.`;
    }

    if (sessionMemory.recentSessions?.length > 0) {
      const lastSession = sessionMemory.recentSessions[sessionMemory.recentSessions.length - 1];
      if (lastSession) {
        const daysSince = Math.floor((Date.now() - new Date(lastSession.timestamp).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 0 && daysSince < 14) {
          prompt += `\n\nLast session was ${daysSince} day${daysSince > 1 ? 's' : ''} ago.`;
          if (lastSession.mood) prompt += ` They were feeling ${lastSession.mood}.`;
          if (lastSession.topic) prompt += ` You discussed ${lastSession.topic}.`;
          prompt += ` You can reference this naturally: "Last time we talked..." or "How's that thing going..."`;
        }
      }
    }
  }

  // Add interest and content context
  if (interestContext) {
    if (interestContext.topInterests?.length > 0) {
      prompt += `\n\n=== THEIR INTERESTS (be proactive about these) ===`;
      prompt += `\nThey're into: ${interestContext.topInterests.map(i => i.interest.replace('_', ' ')).join(', ')}`;
      prompt += `\nBring these up naturally! Ask what they've been watching/playing/reading. Share news or cool stuff related to their interests.`;
      prompt += `\nPHRASES TO USE: "Hey did you see...", "Oh that reminds me...", "What do you think about...", "Have you tried...", "Been playing/watching anything good?"`;
    }

    if (interestContext.recentNews) {
      prompt += `\n\nRECENT NEWS/CONTENT TO SHARE (if relevant):`;
      prompt += `\n${interestContext.recentNews}`;
      prompt += `\nShare naturally like a friend texting you a link: "Oh btw, saw this and thought of you..."`;
    }

    if (interestContext.comedyPrefs) {
      const prefs = interestContext.comedyPrefs;
      if (prefs.styles?.length > 0 || prefs.comedians?.length > 0) {
        prompt += `\n\n=== HUMOR STYLE (they appreciate these) ===`;
        if (prefs.styles?.length > 0) {
          const styleDescriptions = prefs.styles.map(s => {
            const style = InterestSystem.COMEDY_STYLES[s];
            return style ? `${s.replace('_', ' ')} (${style.style})` : s;
          });
          prompt += `\nHumor they like: ${styleDescriptions.join(', ')}`;
        }
        if (prefs.comedians?.length > 0) {
          prompt += `\nComedians they've mentioned: ${prefs.comedians.join(', ')}`;
        }
        prompt += `\nFeel free to be playful, make jokes, or share funny observations in their preferred style.`;
        prompt += `\nBut don't force it — humor should feel natural, not like you're performing.`;
      }
    }

    if (interestContext.conversationStarters?.length > 0) {
      prompt += `\n\nCONVERSATION STARTER IDEAS:`;
      interestContext.conversationStarters.slice(0, 2).forEach(s => {
        prompt += `\n- ${s.prompt}`;
      });
    }
  }

  return prompt;
};

// ============ STORAGE ============
const STORAGE_KEYS = {
  API_KEY: 'mj_api_key',
  MCP_URL: 'mj_mcp_url',
  USER_PROFILE: 'mj_user_profile',
  HABITS_LOG: 'mj_habits_log',
  STYLE_ANALYSIS: 'mj_style_analysis',
  SOCIAL_STYLE: 'mj_social_style',
  LOCATION_DATA: 'mj_location_data',
  // Emotional Learning Memory
  INTERVENTION_LOG: 'mj_intervention_log',
  EMOTIONAL_PATTERNS: 'mj_emotional_patterns',
  // Conversation Continuity
  SESSION_MEMORIES: 'mj_session_memories',
  BREAKTHROUGHS: 'mj_breakthroughs',
  ONGOING_STRUGGLES: 'mj_ongoing_struggles',
  // Interests & Content
  USER_INTERESTS: 'mj_user_interests',
  INTEREST_MENTIONS: 'mj_interest_mentions',
  CACHED_CONTENT: 'mj_cached_content',
  COMEDY_PREFS: 'mj_comedy_prefs',
  SHARED_CONTENT: 'mj_shared_content',
  // Daily Activity & Accountability
  DAILY_TASKS: 'mj_daily_tasks',
  TASK_HISTORY: 'mj_task_history',
  CHECK_IN_SCHEDULE: 'mj_checkin_schedule',
  CHECK_IN_LOG: 'mj_checkin_log',
  PROCRASTINATION_PATTERNS: 'mj_procrastination_patterns',
  ACCOUNTABILITY_SETTINGS: 'mj_accountability_settings',
  NOTIFICATION_PERMISSION: 'mj_notification_permission',
  // iOS & Apple Integration
  HEALTH_DATA: 'mj_health_data',
  HEALTH_SETTINGS: 'mj_health_settings',
  PUSH_TOKEN: 'mj_push_token',
  PUSH_SETTINGS: 'mj_push_settings',
  WIDGET_DATA: 'mj_widget_data',
  OFFLINE_QUEUE: 'mj_offline_queue',
  SYNC_STATUS: 'mj_sync_status',
  DEVICE_INFO: 'mj_device_info',
  // Mood & Wellness
  MOOD_LOG: 'mj_mood_log',
  MOOD_SETTINGS: 'mj_mood_settings',
  // Breathing & Meditation
  BREATHING_SESSIONS: 'mj_breathing_sessions',
  BREATHING_FAVORITES: 'mj_breathing_favorites',
  // Voice Features
  VOICE_SETTINGS: 'mj_voice_settings',
  VOICE_MESSAGES: 'mj_voice_messages',
  // Crisis Support
  CRISIS_CONTACTS: 'mj_crisis_contacts',
  GROUNDING_HISTORY: 'mj_grounding_history'
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

// ============ EMOTIONAL LEARNING MEMORY ============
const EmotionalLearning = {
  // Track an intervention and its outcome
  logIntervention: (intervention) => {
    const log = storage.get(STORAGE_KEYS.INTERVENTION_LOG) || [];
    log.push({
      ...intervention,
      timestamp: new Date().toISOString(),
      id: Date.now()
    });
    // Keep last 200 interventions
    storage.set(STORAGE_KEYS.INTERVENTION_LOG, log.slice(-200));
  },

  // Analyze what works for this user
  getEffectiveStrategies: () => {
    const log = storage.get(STORAGE_KEYS.INTERVENTION_LOG) || [];
    if (log.length < 5) return null;

    // Group by intervention type and calculate effectiveness
    const byType = {};
    log.forEach(entry => {
      if (!byType[entry.type]) {
        byType[entry.type] = { positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      byType[entry.type][entry.outcome]++;
      byType[entry.type].total++;
    });

    // Find most effective approaches
    const ranked = Object.entries(byType)
      .map(([type, stats]) => ({
        type,
        effectiveness: (stats.positive - stats.negative) / stats.total,
        confidence: Math.min(stats.total / 10, 1), // Higher confidence with more data
        stats
      }))
      .sort((a, b) => (b.effectiveness * b.confidence) - (a.effectiveness * a.confidence));

    return {
      mostEffective: ranked.filter(r => r.effectiveness > 0.3).slice(0, 3).map(r => r.type),
      leastEffective: ranked.filter(r => r.effectiveness < -0.2).map(r => r.type),
      insights: ranked
    };
  },

  // Track emotional patterns by time/context
  logEmotionalState: (state) => {
    const patterns = storage.get(STORAGE_KEYS.EMOTIONAL_PATTERNS) || [];
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    patterns.push({
      energy: state.energy,
      overlay: state.overlay,
      hour,
      dayOfWeek,
      timestamp: new Date().toISOString()
    });

    storage.set(STORAGE_KEYS.EMOTIONAL_PATTERNS, patterns.slice(-500));
  },

  // Analyze patterns - when is user typically struggling?
  getEmotionalPatterns: () => {
    const patterns = storage.get(STORAGE_KEYS.EMOTIONAL_PATTERNS) || [];
    if (patterns.length < 10) return null;

    // Analyze by hour
    const byHour = {};
    patterns.forEach(p => {
      if (!byHour[p.hour]) byHour[p.hour] = { depleted: 0, stable: 0, engaged: 0, driven: 0, total: 0 };
      byHour[p.hour][p.energy]++;
      byHour[p.hour].total++;
    });

    // Find vulnerable times
    const vulnerableTimes = Object.entries(byHour)
      .filter(([_, stats]) => stats.total >= 3)
      .filter(([_, stats]) => stats.depleted / stats.total > 0.4)
      .map(([hour]) => parseInt(hour));

    // Find strong times
    const strongTimes = Object.entries(byHour)
      .filter(([_, stats]) => stats.total >= 3)
      .filter(([_, stats]) => (stats.engaged + stats.driven) / stats.total > 0.5)
      .map(([hour]) => parseInt(hour));

    // Common overlays
    const overlayCount = {};
    patterns.filter(p => p.overlay).forEach(p => {
      overlayCount[p.overlay] = (overlayCount[p.overlay] || 0) + 1;
    });
    const commonOverlays = Object.entries(overlayCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([overlay]) => overlay);

    return { vulnerableTimes, strongTimes, commonOverlays, totalSessions: patterns.length };
  }
};

// ============ CONVERSATION CONTINUITY / SESSION MEMORY ============
const SessionMemory = {
  // Save a breakthrough moment
  saveBreakthrough: (breakthrough) => {
    const breakthroughs = storage.get(STORAGE_KEYS.BREAKTHROUGHS) || [];
    breakthroughs.push({
      ...breakthrough,
      timestamp: new Date().toISOString(),
      id: Date.now()
    });
    storage.set(STORAGE_KEYS.BREAKTHROUGHS, breakthroughs.slice(-50));
  },

  // Get recent breakthroughs for context
  getBreakthroughs: (limit = 10) => {
    const breakthroughs = storage.get(STORAGE_KEYS.BREAKTHROUGHS) || [];
    return breakthroughs.slice(-limit);
  },

  // Track ongoing struggles
  updateStruggle: (struggle) => {
    const struggles = storage.get(STORAGE_KEYS.ONGOING_STRUGGLES) || {};
    if (!struggles[struggle.topic]) {
      struggles[struggle.topic] = {
        firstMentioned: new Date().toISOString(),
        mentions: 0,
        lastContext: '',
        resolved: false
      };
    }
    struggles[struggle.topic].mentions++;
    struggles[struggle.topic].lastMentioned = new Date().toISOString();
    struggles[struggle.topic].lastContext = struggle.context;
    struggles[struggle.topic].resolved = struggle.resolved || false;

    storage.set(STORAGE_KEYS.ONGOING_STRUGGLES, struggles);
  },

  // Get active struggles
  getActiveStruggles: () => {
    const struggles = storage.get(STORAGE_KEYS.ONGOING_STRUGGLES) || {};
    return Object.entries(struggles)
      .filter(([_, data]) => !data.resolved)
      .map(([topic, data]) => ({ topic, ...data }))
      .sort((a, b) => b.mentions - a.mentions);
  },

  // Save session summary for continuity
  saveSessionSummary: (summary) => {
    const memories = storage.get(STORAGE_KEYS.SESSION_MEMORIES) || [];
    memories.push({
      ...summary,
      timestamp: new Date().toISOString(),
      id: Date.now()
    });
    // Keep last 30 session summaries
    storage.set(STORAGE_KEYS.SESSION_MEMORIES, memories.slice(-30));
  },

  // Get recent session context
  getRecentSessions: (limit = 5) => {
    const memories = storage.get(STORAGE_KEYS.SESSION_MEMORIES) || [];
    return memories.slice(-limit);
  },

  // Detect potential breakthrough in message
  detectBreakthrough: (userMessage, mjResponse) => {
    const breakthroughIndicators = [
      /\b(realized|finally get|makes sense now|clicked|understood|see it now)\b/i,
      /\b(never thought of it|new perspective|eye.?opening)\b/i,
      /\b(you're right|that's true|exactly|that's it)\b/i,
      /\b(feeling better|feel hopeful|feel lighter|weight off)\b/i,
      /\b(thank you|this helps|needed to hear)\b/i,
      /\b(going to try|will do|i can do this|i'll start)\b/i
    ];

    const isBreakthrough = breakthroughIndicators.some(pattern =>
      pattern.test(userMessage)
    );

    if (isBreakthrough) {
      return {
        userMessage: userMessage.slice(0, 200),
        mjApproach: mjResponse.slice(0, 200),
        detected: true
      };
    }
    return null;
  },

  // Detect struggle topics in conversation
  detectStruggles: (message) => {
    const strugglePatterns = {
      work_stress: /\b(work|job|boss|coworker|deadline|fired|laid off|promotion)\b/i,
      relationship: /\b(partner|spouse|boyfriend|girlfriend|dating|breakup|marriage|divorce)\b/i,
      family: /\b(family|parent|mom|dad|sibling|brother|sister|kids|children)\b/i,
      health: /\b(health|sick|pain|doctor|medication|diagnosis|symptom)\b/i,
      money: /\b(money|bills|debt|rent|mortgage|financial|afford)\b/i,
      loneliness: /\b(lonely|alone|isolated|no friends|no one|nobody)\b/i,
      anxiety: /\b(anxious|anxiety|worried|panic|nervous|scared|fear)\b/i,
      depression: /\b(depressed|hopeless|empty|numb|don't care|pointless)\b/i,
      self_worth: /\b(worthless|failure|not good enough|hate myself|useless)\b/i,
      motivation: /\b(can't get started|no energy|don't want to|unmotivated|stuck)\b/i
    };

    const detected = [];
    for (const [topic, pattern] of Object.entries(strugglePatterns)) {
      if (pattern.test(message)) {
        detected.push(topic);
      }
    }
    return detected;
  }
};

// ============ INTEREST TRACKING & CONTENT SYSTEM ============
const InterestSystem = {
  // Predefined interest categories with keywords
  INTEREST_CATEGORIES: {
    sports: {
      keywords: /\b(football|basketball|baseball|soccer|nfl|nba|mlb|hockey|tennis|golf|sports|game|playoffs|championship|team|player|score|fantasy|league)\b/i,
      icon: 'trophy',
      newsQuery: 'sports news'
    },
    gaming: {
      keywords: /\b(game|gaming|xbox|playstation|ps5|nintendo|switch|steam|fortnite|minecraft|cod|valorant|league of legends|twitch|streamer|esports)\b/i,
      icon: 'gamepad',
      newsQuery: 'video game news'
    },
    music: {
      keywords: /\b(music|song|album|concert|band|artist|spotify|playlist|hip hop|rap|rock|pop|country|jazz|r&b|vinyl|guitar|drums)\b/i,
      icon: 'music',
      newsQuery: 'music news releases'
    },
    movies_tv: {
      keywords: /\b(movie|film|show|series|netflix|hulu|disney|hbo|streaming|binge|cinema|actor|actress|director|season|episode|documentary)\b/i,
      icon: 'film',
      newsQuery: 'entertainment news movies TV'
    },
    tech: {
      keywords: /\b(tech|technology|iphone|android|computer|programming|coding|ai|apple|google|startup|software|app|gadget|device)\b/i,
      icon: 'laptop',
      newsQuery: 'technology news'
    },
    fitness: {
      keywords: /\b(gym|workout|fitness|running|yoga|lifting|exercise|training|marathon|crossfit|diet|health|nutrition|muscle)\b/i,
      icon: 'dumbbell',
      newsQuery: 'fitness health wellness'
    },
    food: {
      keywords: /\b(food|cooking|recipe|restaurant|chef|cuisine|foodie|baking|grill|meal prep|dinner|brunch|takeout|delivery)\b/i,
      icon: 'utensils',
      newsQuery: 'food recipes restaurants'
    },
    travel: {
      keywords: /\b(travel|trip|vacation|flight|hotel|beach|mountain|adventure|explore|destination|passport|abroad|road trip)\b/i,
      icon: 'plane',
      newsQuery: 'travel destinations deals'
    },
    books: {
      keywords: /\b(book|reading|novel|author|kindle|audiobook|library|fiction|nonfiction|bestseller|chapter)\b/i,
      icon: 'book',
      newsQuery: 'book releases reviews'
    },
    pets: {
      keywords: /\b(dog|cat|pet|puppy|kitten|rescue|vet|walk|adoption|furry|animal)\b/i,
      icon: 'heart',
      newsQuery: 'pets animals cute'
    }
  },

  // Comedy styles and associated comedians
  COMEDY_STYLES: {
    observational: {
      comedians: ['Jerry Seinfeld', 'John Mulaney', 'Nate Bargatze', 'Jim Gaffigan'],
      style: 'witty observations about everyday life'
    },
    dark: {
      comedians: ['Anthony Jeselnik', 'Daniel Sloss', 'Bill Burr'],
      style: 'dark humor that finds comedy in the uncomfortable'
    },
    self_deprecating: {
      comedians: ['Pete Davidson', 'Bo Burnham', 'Maria Bamford'],
      style: 'self-aware, making fun of themselves'
    },
    storytelling: {
      comedians: ['Mike Birbiglia', 'Sebastian Maniscalco', 'Tom Segura', 'Bert Kreischer'],
      style: 'elaborate stories with big payoffs'
    },
    absurdist: {
      comedians: ['Mitch Hedberg', 'Steven Wright', 'Demetri Martin'],
      style: 'surreal one-liners and wordplay'
    },
    political: {
      comedians: ['Trevor Noah', 'John Oliver', 'Hasan Minhaj'],
      style: 'commentary on current events and politics'
    },
    dry: {
      comedians: ['Steven Wright', 'Demetri Martin', 'Tig Notaro', 'Nate Bargatze'],
      style: 'deadpan delivery, subtle humor'
    },
    high_energy: {
      comedians: ['Kevin Hart', 'Gabriel Iglesias', 'Chris Rock'],
      style: 'animated, high-energy performance'
    }
  },

  // Detect interests from a message
  detectInterests: (message) => {
    const detected = [];
    for (const [category, data] of Object.entries(InterestSystem.INTEREST_CATEGORIES)) {
      if (data.keywords.test(message)) {
        detected.push(category);
      }
    }
    return detected;
  },

  // Track interest mention
  trackInterest: (interest, context) => {
    const mentions = storage.get(STORAGE_KEYS.INTEREST_MENTIONS) || {};
    if (!mentions[interest]) {
      mentions[interest] = { count: 0, contexts: [], firstMentioned: new Date().toISOString() };
    }
    mentions[interest].count++;
    mentions[interest].lastMentioned = new Date().toISOString();
    mentions[interest].contexts.push(context.slice(0, 100));
    mentions[interest].contexts = mentions[interest].contexts.slice(-5); // Keep last 5 contexts
    storage.set(STORAGE_KEYS.INTEREST_MENTIONS, mentions);
  },

  // Get user's top interests
  getTopInterests: (limit = 5) => {
    const mentions = storage.get(STORAGE_KEYS.INTEREST_MENTIONS) || {};
    return Object.entries(mentions)
      .map(([interest, data]) => ({ interest, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  // Save explicit interests from profile
  saveExplicitInterests: (interests) => {
    storage.set(STORAGE_KEYS.USER_INTERESTS, {
      explicit: interests,
      updatedAt: new Date().toISOString()
    });
  },

  // Detect comedy preferences from message
  detectComedyPreference: (message) => {
    const lower = message.toLowerCase();

    // Check for specific comedian mentions
    for (const [style, data] of Object.entries(InterestSystem.COMEDY_STYLES)) {
      for (const comedian of data.comedians) {
        if (lower.includes(comedian.toLowerCase())) {
          return { style, comedian, explicit: true };
        }
      }
    }

    // Check for style keywords
    if (/dark humor|dark comedy|morbid|twisted/i.test(message)) return { style: 'dark' };
    if (/witty|clever|observational/i.test(message)) return { style: 'observational' };
    if (/dry humor|deadpan|subtle/i.test(message)) return { style: 'dry' };
    if (/storytelling|long stories|story comedy/i.test(message)) return { style: 'storytelling' };
    if (/absurd|surreal|weird humor|random/i.test(message)) return { style: 'absurdist' };
    if (/political|current events|topical/i.test(message)) return { style: 'political' };

    return null;
  },

  // Save comedy preferences
  saveComedyPreference: (pref) => {
    const prefs = storage.get(STORAGE_KEYS.COMEDY_PREFS) || { styles: [], comedians: [] };
    if (pref.style && !prefs.styles.includes(pref.style)) {
      prefs.styles.push(pref.style);
    }
    if (pref.comedian && !prefs.comedians.includes(pref.comedian)) {
      prefs.comedians.push(pref.comedian);
    }
    prefs.updatedAt = new Date().toISOString();
    storage.set(STORAGE_KEYS.COMEDY_PREFS, prefs);
  },

  // Get comedy preferences
  getComedyPrefs: () => {
    return storage.get(STORAGE_KEYS.COMEDY_PREFS) || { styles: [], comedians: [] };
  },

  // Track shared content to avoid repeats
  trackSharedContent: (contentId, type) => {
    const shared = storage.get(STORAGE_KEYS.SHARED_CONTENT) || [];
    shared.push({ id: contentId, type, timestamp: new Date().toISOString() });
    storage.set(STORAGE_KEYS.SHARED_CONTENT, shared.slice(-100)); // Keep last 100
  },

  // Check if content was already shared
  wasContentShared: (contentId) => {
    const shared = storage.get(STORAGE_KEYS.SHARED_CONTENT) || [];
    return shared.some(s => s.id === contentId);
  },

  // Generate conversation starters based on interests
  getConversationStarters: () => {
    const topInterests = InterestSystem.getTopInterests(3);
    const comedyPrefs = InterestSystem.getComedyPrefs();
    const starters = [];

    topInterests.forEach(({ interest }) => {
      const category = InterestSystem.INTEREST_CATEGORIES[interest];
      if (category) {
        starters.push({
          type: 'interest',
          category: interest,
          prompt: `Ask about recent ${interest.replace('_', ' ')} news or their thoughts on something trending`
        });
      }
    });

    if (comedyPrefs.styles.length > 0) {
      const style = comedyPrefs.styles[Math.floor(Math.random() * comedyPrefs.styles.length)];
      const styleData = InterestSystem.COMEDY_STYLES[style];
      if (styleData) {
        starters.push({
          type: 'comedy',
          style,
          prompt: `Share something funny in ${styleData.style} style, maybe reference ${styleData.comedians[0]}`
        });
      }
    }

    return starters;
  }
};

// ============ REAL-TIME SEARCH DETECTION ============
// Claude's built-in web_search tool will handle actual searching
// This just detects WHEN to enable web search
const RealTimeSearch = {
  // Patterns that indicate need for current/real-time information
  CURRENT_INFO_PATTERNS: {
    // Sports - teams, players, scores, trades
    sports: /\b(lakers|celtics|warriors|heat|bulls|knicks|nets|76ers|bucks|suns|mavs|clippers|nuggets|grizzlies|kings|hawks|hornets|wizards|pistons|pacers|magic|cavaliers|raptors|timberwolves|thunder|pelicans|spurs|rockets|jazz|blazers|nba|nfl|mlb|nhl|chiefs|eagles|cowboys|49ers|bills|ravens|bengals|lions|dolphins|jets|patriots|steelers|packers|vikings|bears|saints|falcons|panthers|buccaneers|commanders|giants|cardinals|rams|seahawks|chargers|raiders|broncos|texans|colts|jaguars|titans|yankees|dodgers|braves|astros|phillies|padres|mets|cubs|red sox|white sox|orioles|rays|blue jays|twins|guardians|tigers|royals|mariners|rangers|angels|athletics|brewers|reds|pirates|marlins|rockies|diamondbacks|world series|super bowl|playoffs|championship|game tonight|score|standings|trade|signed|injured|roster|starting lineup|mvp|all.?star|lebron|curry|mahomes|kelce|ohtani|judge|anthony davis|giannis|jokic|luka|tatum|durant|embiid|wembanyama)\b/i,

    // Current events and news
    news: /\b(news|headlines|what's happening|current events|today|latest|recent|breaking|update|announced|happened|going on|trending|viral)\b/i,

    // Entertainment - movies, shows, music, celebrities
    entertainment: /\b(movie|film|show|series|netflix|hulu|disney|hbo|streaming|released|premiere|coming out|trailer|cast|actor|actress|new season|finale|emmy|oscar|grammy|billboard|top charts|new album|tour|concert|taylor swift|beyonce|drake|kendrick|weekend|bruno mars|dua lipa|bad bunny|harry styles|billie eilish|olivia rodrigo|doja cat|sza)\b/i,

    // Tech and companies
    tech: /\b(iphone|android|apple|google|microsoft|amazon|tesla|openai|chatgpt|claude|anthropic|ai news|tech news|launch|release|announced|update|version|stock price|earnings|ipo|acquisition|elon musk|tim cook|satya nadella|sundar pichai|sam altman|mark zuckerberg|nvidia|meta|spacex)\b/i,

    // Questions about current state of things
    currentState: /\b(who is|what is|where is|when is|how is|is .+ still|did .+ win|does .+ play|are .+ playing|currently|right now|these days|anymore|at the moment|as of)\b/i,

    // People and celebrities
    people: /\b(what happened to|where is .+ now|is .+ alive|is .+ still|did .+ die|how old is|who is dating|married|divorced|pregnant|baby|passed away|died)\b/i,

    // Weather
    weather: /\b(weather|forecast|temperature|rain|snow|storm|hurricane|tornado|will it rain|cold front|heat wave)\b/i,

    // Politics and world events
    politics: /\b(president|congress|senate|election|vote|bill|law|policy|supreme court|governor|mayor|ukraine|russia|china|israel|gaza|nato|un|summit|sanctions)\b/i
  },

  // Check if message needs real-time web search
  needsWebSearch: (message) => {
    const lower = message.toLowerCase();

    // Check all patterns
    for (const [category, pattern] of Object.entries(RealTimeSearch.CURRENT_INFO_PATTERNS)) {
      if (pattern.test(lower)) {
        console.log(`Web search triggered by: ${category}`);
        return {
          needed: true,
          category,
          reason: `Message contains ${category}-related content that may need current information`
        };
      }
    }

    // Check for question marks with time-sensitive words
    if (/\?/.test(message) && /\b(now|today|currently|latest|recent|still|anymore|yet)\b/i.test(lower)) {
      return {
        needed: true,
        category: 'time_sensitive_question',
        reason: 'Question appears to need current information'
      };
    }

    return { needed: false };
  },

  // Build search instruction to add to system prompt when web search is enabled
  getSearchInstruction: (category) => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `

=== REAL-TIME INFORMATION MODE ===
Today's date: ${today}

You have web search enabled for this response. USE IT to get current, accurate information.

IMPORTANT INSTRUCTIONS:
- Search for current/recent information before answering questions about sports, news, people, or events
- For sports: Search for current rosters, recent games, standings, trades, injuries
- For people: Search for their current status, recent news, what they're doing now
- For news/events: Search for the latest updates
- NEVER rely on training data for current events - always search first
- If the user mentions a sports team or player, search to confirm current team affiliations
- Include specific details from your search results (dates, scores, names, etc.)

The user expects up-to-date information. Your training data may be outdated.
`;
  }
};

// ============ DAILY ACTIVITY & ACCOUNTABILITY SYSTEM ============
const DailyActivitySystem = {
  // Task priorities
  PRIORITIES: {
    urgent_important: { label: '🔥 Urgent & Important', color: 'red', weight: 4 },
    important: { label: '⭐ Important', color: 'orange', weight: 3 },
    urgent: { label: '⚡ Urgent', color: 'yellow', weight: 2 },
    normal: { label: '📋 Normal', color: 'blue', weight: 1 }
  },

  // Get today's date key
  getTodayKey: () => new Date().toISOString().split('T')[0],

  // Get current tasks for today
  getTodaysTasks: () => {
    const tasks = storage.get(STORAGE_KEYS.DAILY_TASKS) || {};
    const today = DailyActivitySystem.getTodayKey();
    return tasks[today] || [];
  },

  // Add a new task
  addTask: (task) => {
    const tasks = storage.get(STORAGE_KEYS.DAILY_TASKS) || {};
    const today = DailyActivitySystem.getTodayKey();
    if (!tasks[today]) tasks[today] = [];

    const newTask = {
      id: Date.now(),
      text: task.text,
      priority: task.priority || 'normal',
      estimatedMinutes: task.estimatedMinutes || 30,
      scheduledTime: task.scheduledTime || null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      delayCount: 0,
      notes: task.notes || ''
    };

    tasks[today].push(newTask);
    storage.set(STORAGE_KEYS.DAILY_TASKS, tasks);
    return newTask;
  },

  // Complete a task
  completeTask: (taskId) => {
    const tasks = storage.get(STORAGE_KEYS.DAILY_TASKS) || {};
    const today = DailyActivitySystem.getTodayKey();
    if (!tasks[today]) return null;

    const task = tasks[today].find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      storage.set(STORAGE_KEYS.DAILY_TASKS, tasks);

      // Log to history for patterns
      DailyActivitySystem.logTaskCompletion(task);
    }
    return task;
  },

  // Mark task as delayed
  delayTask: (taskId, reason = '') => {
    const tasks = storage.get(STORAGE_KEYS.DAILY_TASKS) || {};
    const today = DailyActivitySystem.getTodayKey();
    if (!tasks[today]) return null;

    const task = tasks[today].find(t => t.id === taskId);
    if (task) {
      task.delayCount = (task.delayCount || 0) + 1;
      task.lastDelayReason = reason;
      task.lastDelayedAt = new Date().toISOString();
      storage.set(STORAGE_KEYS.DAILY_TASKS, tasks);

      // Log procrastination pattern
      ProcrastinationDetector.logDelay(task, reason);
    }
    return task;
  },

  // Log task completion for historical analysis
  logTaskCompletion: (task) => {
    const history = storage.get(STORAGE_KEYS.TASK_HISTORY) || [];
    history.push({
      ...task,
      dayOfWeek: new Date().getDay(),
      hourCompleted: new Date().getHours()
    });
    // Keep last 500 tasks
    storage.set(STORAGE_KEYS.TASK_HISTORY, history.slice(-500));
  },

  // Get completion stats
  getStats: () => {
    const tasks = storage.get(STORAGE_KEYS.DAILY_TASKS) || {};
    const today = DailyActivitySystem.getTodayKey();
    const todayTasks = tasks[today] || [];

    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    const delayed = todayTasks.filter(t => t.delayCount > 0).length;

    // Calculate productivity score
    const history = storage.get(STORAGE_KEYS.TASK_HISTORY) || [];
    const last7Days = history.filter(t => {
      const taskDate = new Date(t.completedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return taskDate > weekAgo;
    });

    return {
      today: { completed, total, delayed, remaining: total - completed },
      weeklyCompletions: last7Days.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  },

  // Get pending tasks sorted by priority
  getPendingByPriority: () => {
    const tasks = DailyActivitySystem.getTodaysTasks();
    const pending = tasks.filter(t => !t.completed);

    return pending.sort((a, b) => {
      const weightA = DailyActivitySystem.PRIORITIES[a.priority]?.weight || 1;
      const weightB = DailyActivitySystem.PRIORITIES[b.priority]?.weight || 1;
      return weightB - weightA;
    });
  },

  // Generate daily schedule
  generateSchedule: (tasks, startHour = 9) => {
    const sorted = [...tasks].sort((a, b) => {
      const weightA = DailyActivitySystem.PRIORITIES[a.priority]?.weight || 1;
      const weightB = DailyActivitySystem.PRIORITIES[b.priority]?.weight || 1;
      return weightB - weightA;
    });

    let currentMinute = startHour * 60;
    return sorted.map(task => {
      const startTime = `${Math.floor(currentMinute / 60)}:${String(currentMinute % 60).padStart(2, '0')}`;
      currentMinute += task.estimatedMinutes || 30;
      const endTime = `${Math.floor(currentMinute / 60)}:${String(currentMinute % 60).padStart(2, '0')}`;
      currentMinute += 10; // 10 min break between tasks

      return { ...task, scheduledStart: startTime, scheduledEnd: endTime };
    });
  }
};

// ============ PROCRASTINATION DETECTION & INTERVENTION ============
const ProcrastinationDetector = {
  // Patterns that indicate delay/avoidance
  DELAY_PATTERNS: {
    direct_delay: /\b(later|tomorrow|not now|not today|maybe later|in a bit|in a while|soon|eventually|when i get around|when i have time|after|first let me)\b/i,
    avoidance: /\b(don't feel like|not feeling it|don't want to|can't be bothered|too tired|exhausted|overwhelmed|stressed|anxious about|scared to|nervous about)\b/i,
    excuses: /\b(too busy|no time|something came up|got distracted|forgot|lost track|other things|priorities changed)\b/i,
    perfectionism: /\b(not ready|need to prepare|need more info|want it perfect|not good enough|what if|might fail)\b/i,
    minimizing: /\b(it's not that important|doesn't matter|no big deal|who cares|whatever|it can wait)\b/i
  },

  // Detect procrastination in a message
  detect: (message) => {
    const results = [];

    for (const [type, pattern] of Object.entries(ProcrastinationDetector.DELAY_PATTERNS)) {
      const matches = message.match(pattern);
      if (matches) {
        results.push({
          type,
          matched: matches[0],
          confidence: type === 'direct_delay' ? 0.9 : type === 'avoidance' ? 0.85 : 0.7
        });
      }
    }

    return {
      detected: results.length > 0,
      patterns: results,
      severity: results.length > 2 ? 'high' : results.length > 0 ? 'medium' : 'low',
      primaryType: results[0]?.type || null
    };
  },

  // Log a delay event for pattern analysis
  logDelay: (task, reason) => {
    const patterns = storage.get(STORAGE_KEYS.PROCRASTINATION_PATTERNS) || [];
    patterns.push({
      taskId: task.id,
      taskText: task.text,
      taskPriority: task.priority,
      reason,
      timestamp: new Date().toISOString(),
      dayOfWeek: new Date().getDay(),
      hourOfDay: new Date().getHours(),
      delayNumber: task.delayCount
    });
    // Keep last 200 patterns
    storage.set(STORAGE_KEYS.PROCRASTINATION_PATTERNS, patterns.slice(-200));
  },

  // Analyze procrastination patterns
  analyzePatterns: () => {
    const patterns = storage.get(STORAGE_KEYS.PROCRASTINATION_PATTERNS) || [];
    if (patterns.length < 5) return null;

    // Time of day analysis
    const byHour = {};
    patterns.forEach(p => {
      byHour[p.hourOfDay] = (byHour[p.hourOfDay] || 0) + 1;
    });
    const worstHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    // Day of week analysis
    const byDay = {};
    patterns.forEach(p => {
      byDay[p.dayOfWeek] = (byDay[p.dayOfWeek] || 0) + 1;
    });
    const worstDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

    // Task type analysis (by priority)
    const byPriority = {};
    patterns.forEach(p => {
      byPriority[p.taskPriority] = (byPriority[p.taskPriority] || 0) + 1;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      totalDelays: patterns.length,
      worstTimeOfDay: worstHour ? `${worstHour[0]}:00` : null,
      worstDayOfWeek: worstDay ? dayNames[parseInt(worstDay[0])] : null,
      mostDelayedPriority: Object.entries(byPriority).sort((a, b) => b[1] - a[1])[0]?.[0],
      recentTrend: patterns.slice(-10).length >= 5 ? 'increasing' : 'stable'
    };
  },

  // Get intervention strategy based on pattern type
  getIntervention: (patternType, userProfile) => {
    const interventions = {
      direct_delay: [
        "What's the smallest first step you could take right now? Just 2 minutes.",
        "Let's make this easier - what if we broke it into tiny pieces?",
        "I get it, but future you will thank present you. What's ONE thing you can do?",
        "No pressure, but what would happen if you just started for 5 minutes?"
      ],
      avoidance: [
        "Those feelings are valid. What specifically feels hard about this?",
        "It's okay to feel that way. Would it help to talk through what's making this tough?",
        "Sometimes the hardest part is starting. What's the fear underneath?",
        "Let's acknowledge the feeling AND figure out a gentle next step."
      ],
      excuses: [
        "Life happens! But let's find even 10 minutes. When could that be?",
        "I hear you. What would need to change to make space for this?",
        "What if we scheduled it like an important appointment?",
        "Let's get real - is this actually not a priority, or just hard?"
      ],
      perfectionism: [
        "Done is better than perfect. What's a 'good enough' version look like?",
        "You don't need to have it all figured out. What do you know right now?",
        "Progress over perfection! What's the messiest first attempt you could make?",
        "What if 'ready' never comes? Sometimes you have to start before you're ready."
      ],
      minimizing: [
        "If it wasn't important at all, would we be talking about it?",
        "I'm curious - why did you add this to your list in the first place?",
        "What would completing this make possible for you?",
        "Let's reconnect with why this matters to you."
      ]
    };

    const options = interventions[patternType] || interventions.direct_delay;
    return options[Math.floor(Math.random() * options.length)];
  }
};

// ============ PROACTIVE CHECK-IN SYSTEM ============
const CheckInSystem = {
  // Default check-in times
  DEFAULT_SCHEDULE: {
    morning: { hour: 9, minute: 0, type: 'morning_kickoff' },
    midday: { hour: 13, minute: 0, type: 'progress_check' },
    evening: { hour: 18, minute: 0, type: 'wrap_up' }
  },

  // Check-in message templates
  CHECK_IN_TEMPLATES: {
    morning_kickoff: [
      "Good morning! 🌅 Ready to crush it today? Let's set your top 3 priorities.",
      "Rise and shine! What's the most important thing you want to accomplish today?",
      "New day, new opportunities! What are we tackling first?",
      "Morning! Let's make today count. What's your #1 focus?"
    ],
    progress_check: [
      "Quick check-in! How's your day going? Made progress on those priorities?",
      "Midday pulse check - how are you feeling about today's tasks?",
      "Hey! Just checking in. How's the focus been today?",
      "Afternoon check! What have you knocked out so far? What's next?"
    ],
    wrap_up: [
      "Evening wind-down! What did you accomplish today? What are you proud of?",
      "Day's wrapping up - let's celebrate your wins! What went well?",
      "Time to reflect! What worked today? What would you do differently?",
      "End of day check-in - how are you feeling about what you got done?"
    ],
    task_reminder: [
      "Hey! You mentioned you wanted to work on '{task}'. How's that going?",
      "Just a friendly nudge about '{task}'. Need any help getting started?",
      "Checking in on '{task}' - where are you at with it?",
      "Remember '{task}'? What's the status? Can I help break it down?"
    ],
    encouragement: [
      "You've got this! Remember why you started.",
      "Every small step counts. Keep going!",
      "I believe in you. What's one thing you can do right now?",
      "Progress, not perfection. You're doing great!"
    ]
  },

  // Get the schedule (user's or default)
  getSchedule: () => {
    return storage.get(STORAGE_KEYS.CHECK_IN_SCHEDULE) || CheckInSystem.DEFAULT_SCHEDULE;
  },

  // Update schedule
  setSchedule: (schedule) => {
    storage.set(STORAGE_KEYS.CHECK_IN_SCHEDULE, schedule);
  },

  // Check if a check-in is due
  isDueForCheckIn: () => {
    const schedule = CheckInSystem.getSchedule();
    const log = storage.get(STORAGE_KEYS.CHECK_IN_LOG) || [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find today's check-ins
    const todayCheckIns = log.filter(c => c.date === today);
    const completedTypes = todayCheckIns.map(c => c.type);

    // Check each scheduled time
    for (const [name, config] of Object.entries(schedule)) {
      if (completedTypes.includes(config.type)) continue;

      const scheduledMinutes = config.hour * 60 + config.minute;
      const currentMinutes = currentHour * 60 + currentMinute;

      // Check if we're within the window (scheduled time to 2 hours after)
      if (currentMinutes >= scheduledMinutes && currentMinutes < scheduledMinutes + 120) {
        return { due: true, type: config.type, name };
      }
    }

    return { due: false };
  },

  // Log a completed check-in
  logCheckIn: (type, response = '') => {
    const log = storage.get(STORAGE_KEYS.CHECK_IN_LOG) || [];
    const now = new Date();

    log.push({
      type,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      response
    });

    // Keep last 100 check-ins
    storage.set(STORAGE_KEYS.CHECK_IN_LOG, log.slice(-100));
  },

  // Get check-in message
  getMessage: (type, context = {}) => {
    const templates = CheckInSystem.CHECK_IN_TEMPLATES[type] || CheckInSystem.CHECK_IN_TEMPLATES.encouragement;
    let message = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    if (context.task) {
      message = message.replace('{task}', context.task);
    }

    return message;
  },

  // Request notification permission
  requestNotificationPermission: async () => {
    if (!('Notification' in window)) {
      return { granted: false, reason: 'not_supported' };
    }

    if (Notification.permission === 'granted') {
      storage.set(STORAGE_KEYS.NOTIFICATION_PERMISSION, true);
      return { granted: true };
    }

    if (Notification.permission === 'denied') {
      return { granted: false, reason: 'denied' };
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    storage.set(STORAGE_KEYS.NOTIFICATION_PERMISSION, granted);
    return { granted, reason: granted ? null : 'denied' };
  },

  // Send a browser notification
  sendNotification: (title, body, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    const notification = new Notification(title, {
      body,
      icon: options.icon || '💪',
      badge: options.badge,
      tag: options.tag || 'mj-checkin',
      requireInteraction: options.requireInteraction || false
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }

    return true;
  },

  // Send SMS via Twilio (requires server-side proxy or Twilio Functions)
  // For client-side, this would typically call your backend API
  sendSMS: async (phoneNumber, message, twilioConfig) => {
    if (!phoneNumber || !twilioConfig?.accountSid || !twilioConfig?.authToken || !twilioConfig?.fromNumber) {
      console.log('SMS not configured');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      // Note: Direct Twilio API calls from browser are blocked by CORS
      // This would need to go through your backend or Twilio Functions
      // For now, we'll log the intent and provide the structure
      console.log('SMS would be sent:', { to: phoneNumber, message, from: twilioConfig.fromNumber });

      // If you have a backend proxy, it would look like:
      // const response = await fetch('/api/send-sms', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ to: phoneNumber, message })
      // });

      // For demo purposes, we'll simulate success
      return { sent: true, simulated: true };
    } catch (error) {
      console.error('SMS send failed:', error);
      return { sent: false, reason: error.message };
    }
  },

  // Get accountability settings
  getSettings: () => {
    return storage.get(STORAGE_KEYS.ACCOUNTABILITY_SETTINGS) || {
      checkInsEnabled: true,
      notificationsEnabled: false,
      reminderIntensity: 'gentle', // gentle, moderate, persistent
      celebrateWins: true,
      smsEnabled: false,
      phoneNumber: null
    };
  },

  // Update settings
  updateSettings: (updates) => {
    const current = CheckInSystem.getSettings();
    storage.set(STORAGE_KEYS.ACCOUNTABILITY_SETTINGS, { ...current, ...updates });
  }
};

// ============ APPLE HEALTHKIT INTEGRATION ============
// This interfaces with HealthKit via React Native bridge or Capacitor plugin
const AppleHealthKit = {
  // Health data types we track
  DATA_TYPES: {
    sleep: {
      id: 'HKCategoryTypeIdentifierSleepAnalysis',
      label: 'Sleep',
      icon: '😴',
      unit: 'hours',
      insights: {
        low: 'You got less sleep than usual. MJ will be gentler today.',
        good: 'Solid sleep! You should have good energy for tackling tasks.',
        great: 'Excellent rest! Perfect day to take on challenging goals.'
      }
    },
    steps: {
      id: 'HKQuantityTypeIdentifierStepCount',
      label: 'Steps',
      icon: '👟',
      unit: 'steps',
      insights: {
        low: 'Movement has been light. A short walk might boost your mood.',
        good: 'Nice activity level! Keep it up.',
        great: 'You\'re crushing it with movement today!'
      }
    },
    activeEnergy: {
      id: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      label: 'Active Calories',
      icon: '🔥',
      unit: 'kcal',
      insights: {
        low: 'Low activity today - that\'s okay, rest is important too.',
        good: 'Good energy burn! Your body is working.',
        great: 'Amazing workout energy! You\'re on fire.'
      }
    },
    mindfulMinutes: {
      id: 'HKCategoryTypeIdentifierMindfulSession',
      label: 'Mindful Minutes',
      icon: '🧘',
      unit: 'minutes',
      insights: {
        low: 'No mindfulness logged yet. Even 2 minutes helps.',
        good: 'Nice mindful moment! That helps regulate stress.',
        great: 'Impressive mindfulness practice! Your mental clarity is strong.'
      }
    },
    heartRate: {
      id: 'HKQuantityTypeIdentifierHeartRate',
      label: 'Resting Heart Rate',
      icon: '❤️',
      unit: 'bpm',
      insights: {
        elevated: 'Heart rate is a bit elevated. Might be stress - let\'s check in.',
        normal: 'Heart rate looking healthy.',
        low: 'Very calm heart rate - you\'re in a relaxed state.'
      }
    },
    workouts: {
      id: 'HKWorkoutTypeIdentifier',
      label: 'Workouts',
      icon: '💪',
      unit: 'sessions',
      insights: {
        none: 'No workout yet. Even a 10-minute walk counts!',
        done: 'Workout logged! That\'s a win for today.'
      }
    }
  },

  // Check if HealthKit is available (iOS only)
  isAvailable: () => {
    // In React Native, this would check via native bridge
    // For web/PWA, we simulate or check for Capacitor plugin
    return typeof window !== 'undefined' &&
           (window.ReactNativeWebView || window.Capacitor?.isPluginAvailable('HealthKit'));
  },

  // Request authorization for health data
  requestAuthorization: async () => {
    if (!AppleHealthKit.isAvailable()) {
      return { authorized: false, reason: 'not_available' };
    }

    try {
      // This would call native HealthKit authorization
      // Simulated for web development
      const settings = storage.get(STORAGE_KEYS.HEALTH_SETTINGS) || {};

      if (window.ReactNativeWebView) {
        // React Native bridge call
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'healthkit_auth',
          dataTypes: Object.values(AppleHealthKit.DATA_TYPES).map(t => t.id)
        }));
      }

      // For demo, simulate authorization
      settings.authorized = true;
      settings.authorizedAt = new Date().toISOString();
      storage.set(STORAGE_KEYS.HEALTH_SETTINGS, settings);

      return { authorized: true };
    } catch (error) {
      console.error('HealthKit auth failed:', error);
      return { authorized: false, reason: error.message };
    }
  },

  // Fetch today's health data
  fetchTodayData: async () => {
    const settings = storage.get(STORAGE_KEYS.HEALTH_SETTINGS) || {};
    if (!settings.authorized) {
      return null;
    }

    try {
      // In production, this calls native HealthKit queries
      // For development, we'll use cached/simulated data
      let healthData = storage.get(STORAGE_KEYS.HEALTH_DATA) || {};
      const today = new Date().toISOString().split('T')[0];

      // Check if we have today's data
      if (healthData.date !== today) {
        // Would fetch from native bridge here
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'healthkit_fetch',
            date: today
          }));
        }

        // Simulated data for development
        healthData = {
          date: today,
          sleep: { value: 7.2, quality: 'good' },
          steps: { value: 4500, goal: 10000 },
          activeEnergy: { value: 280, goal: 500 },
          mindfulMinutes: { value: 5, goal: 10 },
          heartRate: { value: 68, status: 'normal' },
          workouts: { count: 0, types: [] },
          lastUpdated: new Date().toISOString()
        };

        storage.set(STORAGE_KEYS.HEALTH_DATA, healthData);
      }

      return healthData;
    } catch (error) {
      console.error('HealthKit fetch failed:', error);
      return null;
    }
  },

  // Get personalized insights based on health data
  getInsights: (healthData) => {
    if (!healthData) return [];

    const insights = [];
    const types = AppleHealthKit.DATA_TYPES;

    // Sleep insights
    if (healthData.sleep) {
      const hours = healthData.sleep.value;
      if (hours < 6) {
        insights.push({ type: 'sleep', level: 'low', message: types.sleep.insights.low, icon: types.sleep.icon });
      } else if (hours >= 7.5) {
        insights.push({ type: 'sleep', level: 'great', message: types.sleep.insights.great, icon: types.sleep.icon });
      } else {
        insights.push({ type: 'sleep', level: 'good', message: types.sleep.insights.good, icon: types.sleep.icon });
      }
    }

    // Steps insights
    if (healthData.steps) {
      const pct = (healthData.steps.value / healthData.steps.goal) * 100;
      if (pct < 30) {
        insights.push({ type: 'steps', level: 'low', message: types.steps.insights.low, icon: types.steps.icon });
      } else if (pct >= 80) {
        insights.push({ type: 'steps', level: 'great', message: types.steps.insights.great, icon: types.steps.icon });
      }
    }

    // Mindful minutes
    if (healthData.mindfulMinutes) {
      if (healthData.mindfulMinutes.value === 0) {
        insights.push({ type: 'mindful', level: 'low', message: types.mindfulMinutes.insights.low, icon: types.mindfulMinutes.icon });
      } else if (healthData.mindfulMinutes.value >= 10) {
        insights.push({ type: 'mindful', level: 'great', message: types.mindfulMinutes.insights.great, icon: types.mindfulMinutes.icon });
      }
    }

    // Heart rate (stress indicator)
    if (healthData.heartRate && healthData.heartRate.value > 85) {
      insights.push({ type: 'heartRate', level: 'elevated', message: types.heartRate.insights.elevated, icon: types.heartRate.icon });
    }

    // Workout celebration
    if (healthData.workouts && healthData.workouts.count > 0) {
      insights.push({ type: 'workout', level: 'done', message: types.workouts.insights.done, icon: types.workouts.icon });
    }

    return insights;
  },

  // Build context for MJ's system prompt
  buildHealthContext: async () => {
    const healthData = await AppleHealthKit.fetchTodayData();
    if (!healthData) return '';

    const insights = AppleHealthKit.getInsights(healthData);
    if (insights.length === 0) return '';

    let context = `
=== USER'S HEALTH DATA TODAY (from Apple Health) ===
`;

    if (healthData.sleep) {
      context += `Sleep: ${healthData.sleep.value} hours (${healthData.sleep.quality})\n`;
    }
    if (healthData.steps) {
      context += `Steps: ${healthData.steps.value.toLocaleString()} / ${healthData.steps.goal.toLocaleString()} goal\n`;
    }
    if (healthData.activeEnergy) {
      context += `Active Calories: ${healthData.activeEnergy.value} / ${healthData.activeEnergy.goal} goal\n`;
    }
    if (healthData.mindfulMinutes) {
      context += `Mindful Minutes: ${healthData.mindfulMinutes.value}\n`;
    }
    if (healthData.workouts) {
      context += `Workouts Today: ${healthData.workouts.count}\n`;
    }

    context += `\nHealth Insights:\n`;
    insights.forEach(insight => {
      context += `${insight.icon} ${insight.message}\n`;
    });

    context += `\nUSE THIS DATA TO:
- Adjust your energy and tone (be gentler if they're tired/stressed)
- Celebrate health wins (workouts, good sleep, mindfulness)
- Gently encourage movement or rest based on their data
- Reference specific metrics naturally in conversation
- Don't be preachy about health - just use the context wisely
`;

    return context;
  },

  // Get settings
  getSettings: () => {
    return storage.get(STORAGE_KEYS.HEALTH_SETTINGS) || {
      authorized: false,
      enabled: false,
      shareWithMJ: true,
      syncFrequency: 'hourly'
    };
  },

  // Update settings
  updateSettings: (updates) => {
    const current = AppleHealthKit.getSettings();
    storage.set(STORAGE_KEYS.HEALTH_SETTINGS, { ...current, ...updates });
  }
};

// ============ NATIVE PUSH NOTIFICATIONS (APNs) ============
const PushNotificationService = {
  // Notification categories for iOS
  CATEGORIES: {
    CHECK_IN: {
      id: 'CHECK_IN',
      actions: [
        { id: 'RESPOND', title: "Let's Go!", foreground: true },
        { id: 'SNOOZE', title: 'Snooze 30min', destructive: false },
        { id: 'DISMISS', title: 'Not now', destructive: true }
      ]
    },
    TASK_REMINDER: {
      id: 'TASK_REMINDER',
      actions: [
        { id: 'COMPLETE', title: 'Mark Done ✓', foreground: false },
        { id: 'START', title: 'Start Now', foreground: true },
        { id: 'DELAY', title: 'Delay 1hr', destructive: false }
      ]
    },
    ENCOURAGEMENT: {
      id: 'ENCOURAGEMENT',
      actions: [
        { id: 'THANKS', title: '💪 Thanks!', foreground: false },
        { id: 'CHAT', title: 'Chat with MJ', foreground: true }
      ]
    },
    HEALTH_INSIGHT: {
      id: 'HEALTH_INSIGHT',
      actions: [
        { id: 'VIEW', title: 'View Details', foreground: true },
        { id: 'DISMISS', title: 'Got it', destructive: false }
      ]
    }
  },

  // Check if push notifications are supported
  isSupported: () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  // Request permission and register for push
  requestPermission: async () => {
    if (!PushNotificationService.isSupported()) {
      return { granted: false, reason: 'not_supported' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { granted: false, reason: 'denied' };
      }

      // Register service worker for push
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push (would use your VAPID key in production)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace in production
      });

      // Store the push subscription
      const pushToken = JSON.stringify(subscription);
      storage.set(STORAGE_KEYS.PUSH_TOKEN, pushToken);

      // Send to your server to enable push
      await PushNotificationService.registerWithServer(subscription);

      return { granted: true, subscription };
    } catch (error) {
      console.error('Push registration failed:', error);
      return { granted: false, reason: error.message };
    }
  },

  // Register push subscription with your backend
  registerWithServer: async (subscription) => {
    // In production, send to your push notification server
    const settings = storage.get(STORAGE_KEYS.PUSH_SETTINGS) || {};
    settings.registered = true;
    settings.registeredAt = new Date().toISOString();
    settings.endpoint = subscription.endpoint;
    storage.set(STORAGE_KEYS.PUSH_SETTINGS, settings);

    // Would POST to your server:
    // await fetch('/api/push/register', {
    //   method: 'POST',
    //   body: JSON.stringify({ subscription, userId: profile.id })
    // });
  },

  // Schedule a local notification (for iOS via Capacitor/React Native)
  scheduleLocal: async (notification) => {
    const { title, body, data, trigger, category } = notification;

    // For web, use service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;

      // Calculate delay for trigger
      let delay = 0;
      if (trigger?.at) {
        delay = new Date(trigger.at).getTime() - Date.now();
      } else if (trigger?.in) {
        delay = trigger.in * 1000; // seconds to ms
      }

      if (delay > 0) {
        setTimeout(() => {
          registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: data?.id || 'mj-notification',
            data,
            actions: PushNotificationService.CATEGORIES[category]?.actions || [],
            requireInteraction: category === 'CHECK_IN' || category === 'TASK_REMINDER'
          });
        }, delay);
      } else {
        registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: data?.id || 'mj-notification',
          data
        });
      }

      return { scheduled: true, delay };
    }

    // For React Native, would use native module
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'schedule_notification',
        notification: { title, body, data, trigger, category }
      }));
      return { scheduled: true };
    }

    return { scheduled: false, reason: 'not_supported' };
  },

  // Schedule check-in notifications for the day
  scheduleDailyCheckIns: async () => {
    const settings = CheckInSystem.getSettings();
    if (!settings.checkInsEnabled) return;

    const schedule = CheckInSystem.getSchedule();
    const today = new Date();

    for (const [name, config] of Object.entries(schedule)) {
      const triggerTime = new Date(today);
      triggerTime.setHours(config.hour, config.minute, 0, 0);

      // Only schedule if time hasn't passed
      if (triggerTime > today) {
        const message = CheckInSystem.getMessage(config.type);
        await PushNotificationService.scheduleLocal({
          title: name === 'morning' ? '🌅 Morning Check-in' :
                 name === 'midday' ? '☀️ Midday Check' : '🌙 Evening Wrap-up',
          body: message,
          data: { type: 'check_in', checkInType: config.type },
          trigger: { at: triggerTime.toISOString() },
          category: 'CHECK_IN'
        });
      }
    }
  },

  // Schedule task reminder
  scheduleTaskReminder: async (task, reminderTime) => {
    return PushNotificationService.scheduleLocal({
      title: '📋 Task Reminder',
      body: task.text,
      data: { type: 'task_reminder', taskId: task.id },
      trigger: { at: reminderTime },
      category: 'TASK_REMINDER'
    });
  },

  // Get settings
  getSettings: () => {
    return storage.get(STORAGE_KEYS.PUSH_SETTINGS) || {
      enabled: false,
      registered: false,
      checkInNotifications: true,
      taskReminders: true,
      encouragement: true,
      healthInsights: true,
      quietHoursStart: 22, // 10 PM
      quietHoursEnd: 8     // 8 AM
    };
  },

  // Update settings
  updateSettings: (updates) => {
    const current = PushNotificationService.getSettings();
    storage.set(STORAGE_KEYS.PUSH_SETTINGS, { ...current, ...updates });
  }
};

// ============ iOS HOME SCREEN WIDGET SUPPORT ============
const WidgetManager = {
  // Widget types available
  WIDGET_TYPES: {
    TASKS_SMALL: {
      id: 'tasks_small',
      name: 'Tasks',
      size: 'small',
      family: 'systemSmall',
      description: 'Quick view of your top 3 tasks'
    },
    TASKS_MEDIUM: {
      id: 'tasks_medium',
      name: 'Daily Tasks',
      size: 'medium',
      family: 'systemMedium',
      description: 'Today\'s tasks with progress'
    },
    MOOD_CHECK: {
      id: 'mood_check',
      name: 'Quick Mood',
      size: 'small',
      family: 'systemSmall',
      description: 'One-tap mood check-in'
    },
    DAILY_QUOTE: {
      id: 'daily_quote',
      name: 'Daily Inspiration',
      size: 'medium',
      family: 'systemMedium',
      description: 'Personalized motivational quote'
    },
    HEALTH_RINGS: {
      id: 'health_rings',
      name: 'Health & Tasks',
      size: 'small',
      family: 'systemSmall',
      description: 'Apple Health rings + task count'
    },
    STREAK: {
      id: 'streak',
      name: 'Your Streak',
      size: 'small',
      family: 'systemSmall',
      description: 'Current check-in streak'
    }
  },

  // Motivational quotes for widget
  QUOTES: [
    { text: "Progress, not perfection.", author: "MJ" },
    { text: "Small steps still move you forward.", author: "MJ" },
    { text: "You've handled hard days before. You'll handle this one too.", author: "MJ" },
    { text: "Rest is productive. Don't let hustle culture tell you otherwise.", author: "MJ" },
    { text: "The goal isn't to feel motivated. It's to act anyway.", author: "MJ" },
    { text: "Your only competition is who you were yesterday.", author: "MJ" },
    { text: "Done is better than perfect.", author: "MJ" },
    { text: "You don't have to be great to start. You have to start to be great.", author: "MJ" },
    { text: "Healing isn't linear. Neither is growth.", author: "MJ" },
    { text: "Be patient with yourself. You're doing better than you think.", author: "MJ" }
  ],

  // Get widget data for all widgets
  getWidgetData: () => {
    const tasks = DailyActivitySystem.getTodaysTasks();
    const stats = DailyActivitySystem.getStats();
    const checkInLog = storage.get(STORAGE_KEYS.CHECK_IN_LOG) || [];
    const healthData = storage.get(STORAGE_KEYS.HEALTH_DATA);

    // Calculate streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasCheckIn = checkInLog.some(c => c.date === dateStr);
      if (hasCheckIn) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Get today's quote (seeded by date for consistency)
    const dateNum = parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''));
    const quoteIndex = dateNum % WidgetManager.QUOTES.length;
    const todayQuote = WidgetManager.QUOTES[quoteIndex];

    const widgetData = {
      lastUpdated: new Date().toISOString(),
      tasks: {
        pending: tasks.filter(t => !t.completed).slice(0, 5).map(t => ({
          id: t.id,
          text: t.text,
          priority: t.priority
        })),
        completed: stats.today.completed,
        total: stats.today.total,
        completionRate: stats.completionRate
      },
      streak: {
        current: streak,
        label: streak === 1 ? 'day' : 'days'
      },
      quote: todayQuote,
      health: healthData ? {
        steps: healthData.steps?.value || 0,
        stepsGoal: healthData.steps?.goal || 10000,
        sleep: healthData.sleep?.value || 0,
        mindful: healthData.mindfulMinutes?.value || 0
      } : null,
      mood: {
        lastCheckin: checkInLog[checkInLog.length - 1]?.timestamp || null
      }
    };

    // Store for widget access
    storage.set(STORAGE_KEYS.WIDGET_DATA, widgetData);

    // Notify native app to refresh widgets (React Native / Capacitor)
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'refresh_widgets',
        data: widgetData
      }));
    }

    return widgetData;
  },

  // Handle widget tap action
  handleWidgetAction: (action) => {
    switch (action.type) {
      case 'open_tasks':
        // Navigate to tasks
        return { navigate: 'tasks' };
      case 'complete_task':
        DailyActivitySystem.completeTask(action.taskId);
        WidgetManager.getWidgetData(); // Refresh widget
        return { success: true };
      case 'mood_check':
        // Open mood check dialog
        return { navigate: 'mood', mood: action.mood };
      case 'open_chat':
        return { navigate: 'chat' };
      default:
        return { navigate: 'home' };
    }
  },

  // Generate widget configuration for iOS (WidgetKit)
  getWidgetConfig: (widgetType) => {
    const widget = WidgetManager.WIDGET_TYPES[widgetType];
    const data = WidgetManager.getWidgetData();

    // This would be sent to the native WidgetKit extension
    return {
      kind: widget.id,
      family: widget.family,
      content: data,
      refreshAfter: 15 * 60 * 1000 // 15 minutes
    };
  }
};

// ============ OFFLINE-FIRST & BACKGROUND SYNC ============
const OfflineManager = {
  // Sync status states
  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    SYNCING: 'syncing',
    ERROR: 'error'
  },

  // Initialize offline support
  init: async () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);

        // Listen for sync events
        if ('sync' in registration) {
          navigator.serviceWorker.ready.then(reg => {
            return reg.sync.register('background-sync');
          });
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Monitor online/offline status
    window.addEventListener('online', () => OfflineManager.onOnline());
    window.addEventListener('offline', () => OfflineManager.onOffline());

    // Set initial status
    OfflineManager.updateStatus(navigator.onLine ? 'online' : 'offline');
  },

  // Handle coming online
  onOnline: async () => {
    console.log('Back online - starting sync');
    OfflineManager.updateStatus('syncing');
    await OfflineManager.syncPendingActions();
    OfflineManager.updateStatus('online');
  },

  // Handle going offline
  onOffline: () => {
    console.log('Gone offline - queuing actions');
    OfflineManager.updateStatus('offline');
  },

  // Update sync status
  updateStatus: (status) => {
    storage.set(STORAGE_KEYS.SYNC_STATUS, {
      status,
      lastUpdated: new Date().toISOString()
    });

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('sync-status-change', { detail: { status } }));
  },

  // Get current status
  getStatus: () => {
    const saved = storage.get(STORAGE_KEYS.SYNC_STATUS);
    return saved?.status || (navigator.onLine ? 'online' : 'offline');
  },

  // Queue an action for sync
  queueAction: (action) => {
    const queue = storage.get(STORAGE_KEYS.OFFLINE_QUEUE) || [];
    queue.push({
      id: Date.now(),
      action,
      timestamp: new Date().toISOString(),
      retries: 0
    });
    storage.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);

    // Try to sync immediately if online
    if (navigator.onLine) {
      OfflineManager.syncPendingActions();
    }
  },

  // Sync all pending actions
  syncPendingActions: async () => {
    const queue = storage.get(STORAGE_KEYS.OFFLINE_QUEUE) || [];
    if (queue.length === 0) return;

    const failedActions = [];

    for (const item of queue) {
      try {
        await OfflineManager.executeAction(item.action);
      } catch (error) {
        console.error('Sync failed for action:', item.action, error);
        if (item.retries < 3) {
          failedActions.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    // Update queue with only failed actions
    storage.set(STORAGE_KEYS.OFFLINE_QUEUE, failedActions);
  },

  // Execute a queued action
  executeAction: async (action) => {
    switch (action.type) {
      case 'SEND_MESSAGE':
        // Retry sending message to Claude
        // This would call your API
        break;
      case 'COMPLETE_TASK':
        // Sync task completion
        break;
      case 'LOG_CHECK_IN':
        // Sync check-in
        break;
      case 'UPDATE_PROFILE':
        // Sync profile changes
        break;
      default:
        console.log('Unknown action type:', action.type);
    }
  },

  // Check if we can make API calls
  canMakeApiCalls: () => {
    return navigator.onLine && OfflineManager.getStatus() !== 'error';
  },

  // Get queue size
  getQueueSize: () => {
    const queue = storage.get(STORAGE_KEYS.OFFLINE_QUEUE) || [];
    return queue.length;
  },

  // Clear sync queue
  clearQueue: () => {
    storage.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }
};

// Initialize offline support
if (typeof window !== 'undefined') {
  OfflineManager.init();
}

// ============ MOOD TRACKING SYSTEM ============
const MoodTracker = {
  // Mood options with emoji, color, and value
  MOODS: {
    amazing: { emoji: '🤩', label: 'Amazing', value: 5, color: 'emerald' },
    good: { emoji: '😊', label: 'Good', value: 4, color: 'green' },
    okay: { emoji: '😐', label: 'Okay', value: 3, color: 'amber' },
    low: { emoji: '😔', label: 'Low', value: 2, color: 'orange' },
    rough: { emoji: '😢', label: 'Rough', value: 1, color: 'red' }
  },

  // Energy levels
  ENERGY_LEVELS: {
    high: { emoji: '⚡', label: 'High Energy', value: 3 },
    moderate: { emoji: '🔋', label: 'Moderate', value: 2 },
    low: { emoji: '🪫', label: 'Low Energy', value: 1 }
  },

  // Common feelings/tags
  FEELING_TAGS: [
    'anxious', 'calm', 'stressed', 'grateful', 'lonely', 'connected',
    'motivated', 'overwhelmed', 'hopeful', 'frustrated', 'peaceful', 'tired',
    'excited', 'sad', 'content', 'angry', 'loved', 'creative'
  ],

  // Log a mood entry
  logMood: (entry) => {
    const log = storage.get(STORAGE_KEYS.MOOD_LOG) || [];
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      hour: new Date().getHours(),
      mood: entry.mood,
      energy: entry.energy || null,
      feelings: entry.feelings || [],
      note: entry.note || '',
      // Context from other systems
      tasksCompleted: DailyActivitySystem.getStats().today.completed,
      healthData: storage.get(STORAGE_KEYS.HEALTH_DATA)
    };

    log.push(newEntry);
    // Keep last 365 days of mood data
    storage.set(STORAGE_KEYS.MOOD_LOG, log.slice(-365 * 4)); // ~4 entries per day max

    // Update widget
    WidgetManager.getWidgetData();

    return newEntry;
  },

  // Get today's mood entries
  getTodayMoods: () => {
    const log = storage.get(STORAGE_KEYS.MOOD_LOG) || [];
    const today = new Date().toISOString().split('T')[0];
    return log.filter(e => e.date === today);
  },

  // Get mood history for a date range
  getHistory: (days = 30) => {
    const log = storage.get(STORAGE_KEYS.MOOD_LOG) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return log.filter(e => new Date(e.timestamp) > cutoff);
  },

  // Calculate mood statistics
  getStats: (days = 7) => {
    const history = MoodTracker.getHistory(days);
    if (history.length === 0) return null;

    // Average mood
    const avgMood = history.reduce((sum, e) => sum + MoodTracker.MOODS[e.mood]?.value || 3, 0) / history.length;

    // Mood distribution
    const distribution = {};
    history.forEach(e => {
      distribution[e.mood] = (distribution[e.mood] || 0) + 1;
    });

    // Most common feelings
    const feelingCounts = {};
    history.forEach(e => {
      (e.feelings || []).forEach(f => {
        feelingCounts[f] = (feelingCounts[f] || 0) + 1;
      });
    });
    const topFeelings = Object.entries(feelingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feeling]) => feeling);

    // Time patterns
    const byHour = {};
    history.forEach(e => {
      const hourBlock = Math.floor(e.hour / 6); // 0-3 (night, morning, afternoon, evening)
      if (!byHour[hourBlock]) byHour[hourBlock] = [];
      byHour[hourBlock].push(MoodTracker.MOODS[e.mood]?.value || 3);
    });

    const timePatterns = {};
    ['night', 'morning', 'afternoon', 'evening'].forEach((name, i) => {
      if (byHour[i]?.length > 0) {
        timePatterns[name] = byHour[i].reduce((a, b) => a + b, 0) / byHour[i].length;
      }
    });

    // Trend (comparing first half to second half)
    const mid = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, mid);
    const secondHalf = history.slice(mid);
    const firstAvg = firstHalf.reduce((sum, e) => sum + (MoodTracker.MOODS[e.mood]?.value || 3), 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, e) => sum + (MoodTracker.MOODS[e.mood]?.value || 3), 0) / (secondHalf.length || 1);
    const trend = secondAvg > firstAvg + 0.3 ? 'improving' : secondAvg < firstAvg - 0.3 ? 'declining' : 'stable';

    return {
      totalEntries: history.length,
      averageMood: Math.round(avgMood * 10) / 10,
      distribution,
      topFeelings,
      timePatterns,
      trend,
      bestTimeOfDay: Object.entries(timePatterns).sort((a, b) => b[1] - a[1])[0]?.[0]
    };
  },

  // Correlate mood with health data
  correlateWithHealth: () => {
    const history = MoodTracker.getHistory(30);
    if (history.length < 10) return null;

    const correlations = {
      sleep: { better: 0, worse: 0 },
      steps: { better: 0, worse: 0 },
      exercise: { better: 0, worse: 0 }
    };

    history.forEach(entry => {
      if (!entry.healthData) return;
      const moodValue = MoodTracker.MOODS[entry.mood]?.value || 3;

      // Sleep correlation
      if (entry.healthData.sleep?.value > 7) {
        if (moodValue >= 4) correlations.sleep.better++;
      } else if (entry.healthData.sleep?.value < 6) {
        if (moodValue <= 2) correlations.sleep.worse++;
      }

      // Steps correlation
      if (entry.healthData.steps?.value > 7000) {
        if (moodValue >= 4) correlations.steps.better++;
      }

      // Workout correlation
      if (entry.healthData.workouts?.count > 0) {
        if (moodValue >= 4) correlations.exercise.better++;
      }
    });

    return correlations;
  },

  // Build context for MJ
  buildMoodContext: () => {
    const todayMoods = MoodTracker.getTodayMoods();
    const stats = MoodTracker.getStats(7);

    if (todayMoods.length === 0 && !stats) return '';

    let context = '\n=== USER MOOD DATA ===\n';

    if (todayMoods.length > 0) {
      const latest = todayMoods[todayMoods.length - 1];
      context += `Latest mood: ${MoodTracker.MOODS[latest.mood]?.emoji} ${latest.mood}`;
      if (latest.feelings?.length > 0) {
        context += ` (feeling: ${latest.feelings.join(', ')})`;
      }
      context += '\n';
    }

    if (stats) {
      context += `7-day average: ${stats.averageMood}/5\n`;
      context += `Trend: ${stats.trend}\n`;
      if (stats.topFeelings.length > 0) {
        context += `Common feelings: ${stats.topFeelings.join(', ')}\n`;
      }
      if (stats.bestTimeOfDay) {
        context += `Best time of day: ${stats.bestTimeOfDay}\n`;
      }
    }

    context += '\nUse this to calibrate your tone and responses.\n';
    return context;
  }
};

// ============ GUIDED BREATHING EXERCISES ============
const BreathingExercises = {
  // Breathing patterns
  PATTERNS: {
    calm: {
      id: 'calm',
      name: 'Calming Breath',
      description: 'Slow, deep breathing to reduce anxiety',
      icon: '🌊',
      inhale: 4,
      hold: 4,
      exhale: 6,
      holdAfter: 0,
      cycles: 6,
      duration: 84, // seconds
      color: 'from-blue-500 to-cyan-400'
    },
    box: {
      id: 'box',
      name: 'Box Breathing',
      description: 'Equal timing for focus and balance',
      icon: '📦',
      inhale: 4,
      hold: 4,
      exhale: 4,
      holdAfter: 4,
      cycles: 5,
      duration: 80,
      color: 'from-violet-500 to-purple-400'
    },
    energize: {
      id: 'energize',
      name: 'Energizing Breath',
      description: 'Quick breaths to boost alertness',
      icon: '⚡',
      inhale: 2,
      hold: 0,
      exhale: 2,
      holdAfter: 0,
      cycles: 10,
      duration: 40,
      color: 'from-amber-500 to-orange-400'
    },
    sleep: {
      id: 'sleep',
      name: '4-7-8 Sleep',
      description: 'Relaxation technique for better sleep',
      icon: '😴',
      inhale: 4,
      hold: 7,
      exhale: 8,
      holdAfter: 0,
      cycles: 4,
      duration: 76,
      color: 'from-indigo-500 to-purple-400'
    },
    anxiety: {
      id: 'anxiety',
      name: 'Anxiety Relief',
      description: 'Extended exhale to activate calm',
      icon: '🧘',
      inhale: 3,
      hold: 2,
      exhale: 6,
      holdAfter: 2,
      cycles: 6,
      duration: 78,
      color: 'from-teal-500 to-emerald-400'
    }
  },

  // Log a completed breathing session
  logSession: (patternId, completed = true) => {
    const sessions = storage.get(STORAGE_KEYS.BREATHING_SESSIONS) || [];
    sessions.push({
      id: Date.now(),
      pattern: patternId,
      timestamp: new Date().toISOString(),
      completed,
      duration: BreathingExercises.PATTERNS[patternId]?.duration || 0
    });
    storage.set(STORAGE_KEYS.BREATHING_SESSIONS, sessions.slice(-100));
  },

  // Get breathing stats
  getStats: () => {
    const sessions = storage.get(STORAGE_KEYS.BREATHING_SESSIONS) || [];
    const last7Days = sessions.filter(s => {
      const date = new Date(s.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo && s.completed;
    });

    const totalMinutes = last7Days.reduce((sum, s) => sum + (s.duration / 60), 0);
    const favoritePattern = sessions.reduce((acc, s) => {
      acc[s.pattern] = (acc[s.pattern] || 0) + 1;
      return acc;
    }, {});

    return {
      totalSessions: last7Days.length,
      totalMinutes: Math.round(totalMinutes),
      favorite: Object.entries(favoritePattern).sort((a, b) => b[1] - a[1])[0]?.[0]
    };
  },

  // Haptic feedback for iOS
  triggerHaptic: (type = 'light') => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'haptic',
        style: type // 'light', 'medium', 'heavy', 'success', 'warning'
      }));
    } else if ('vibrate' in navigator) {
      // Web fallback
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 30, 20]
      };
      navigator.vibrate(patterns[type] || [10]);
    }
  }
};

// ============ VOICE MESSAGE SYSTEM ============
const VoiceSystem = {
  // Check if voice features are available
  isAvailable: () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  // Check if TTS is available
  isTTSAvailable: () => {
    return 'speechSynthesis' in window;
  },

  // Create speech recognition instance
  createRecognition: () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return recognition;
  },

  // Speak text using TTS
  speak: (text, options = {}) => {
    if (!VoiceSystem.isTTSAvailable()) return Promise.resolve(false);

    return new Promise((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      // Try to find a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') || // iOS
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.lang === 'en-US'
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);
    });
  },

  // Get voice settings
  getSettings: () => {
    return storage.get(STORAGE_KEYS.VOICE_SETTINGS) || {
      voiceInputEnabled: true,
      voiceOutputEnabled: false,
      autoReadResponses: false,
      speechRate: 0.9
    };
  },

  // Update settings
  updateSettings: (updates) => {
    const current = VoiceSystem.getSettings();
    storage.set(STORAGE_KEYS.VOICE_SETTINGS, { ...current, ...updates });
  }
};

// ============ CRISIS SUPPORT SYSTEM ============
const CrisisSupport = {
  // Crisis resource hotlines
  RESOURCES: {
    us: {
      suicide: { name: '988 Suicide & Crisis Lifeline', number: '988', text: 'Text HOME to 741741' },
      crisis: { name: 'Crisis Text Line', number: null, text: 'Text HOME to 741741' },
      domestic: { name: 'Domestic Violence Hotline', number: '1-800-799-7233', text: 'Text START to 88788' },
      samhsa: { name: 'SAMHSA Helpline', number: '1-800-662-4357', text: null },
      veterans: { name: 'Veterans Crisis Line', number: '988 (press 1)', text: 'Text 838255' }
    },
    international: {
      uk: { name: 'Samaritans UK', number: '116 123' },
      canada: { name: 'Talk Suicide Canada', number: '988' },
      australia: { name: 'Lifeline Australia', number: '13 11 14' }
    }
  },

  // Grounding exercises
  GROUNDING_EXERCISES: {
    five_senses: {
      id: 'five_senses',
      name: '5-4-3-2-1 Grounding',
      icon: '🖐️',
      description: 'Use your senses to reconnect with the present',
      steps: [
        { prompt: 'Name 5 things you can SEE', icon: '👁️', count: 5 },
        { prompt: 'Name 4 things you can TOUCH', icon: '✋', count: 4 },
        { prompt: 'Name 3 things you can HEAR', icon: '👂', count: 3 },
        { prompt: 'Name 2 things you can SMELL', icon: '👃', count: 2 },
        { prompt: 'Name 1 thing you can TASTE', icon: '👅', count: 1 }
      ]
    },
    body_scan: {
      id: 'body_scan',
      name: 'Quick Body Scan',
      icon: '🧘',
      description: 'Notice sensations to ground yourself',
      steps: [
        { prompt: 'Feel your feet on the ground. Press down gently.', duration: 10 },
        { prompt: 'Notice your hands. Squeeze them gently, then release.', duration: 10 },
        { prompt: 'Feel your breath in your chest. Just notice it.', duration: 10 },
        { prompt: 'Relax your shoulders. Let them drop.', duration: 10 },
        { prompt: 'Unclench your jaw. Let your face soften.', duration: 10 }
      ]
    },
    cold_water: {
      id: 'cold_water',
      name: 'Cold Water Reset',
      icon: '💧',
      description: 'Physical sensation to interrupt distress',
      steps: [
        { prompt: 'Get a glass of cold water or ice', duration: 15 },
        { prompt: 'Hold it in your hands. Focus on the cold.', duration: 20 },
        { prompt: 'Take a slow sip. Feel the cold going down.', duration: 15 },
        { prompt: 'Take 3 deep breaths.', duration: 15 }
      ]
    },
    safe_place: {
      id: 'safe_place',
      name: 'Safe Place Visualization',
      icon: '🏠',
      description: 'Visualize somewhere you feel safe',
      steps: [
        { prompt: 'Close your eyes. Picture a place where you feel safe.', duration: 10 },
        { prompt: 'What do you see there? Notice the details.', duration: 15 },
        { prompt: 'What sounds are there? Imagine hearing them.', duration: 10 },
        { prompt: 'How does it feel to be there? Let yourself feel safe.', duration: 15 },
        { prompt: 'Take this feeling with you. Open your eyes slowly.', duration: 10 }
      ]
    }
  },

  // Safety check questions
  SAFETY_CHECK: [
    { q: 'Are you thinking about hurting yourself?', severity: 'high' },
    { q: 'Do you have a plan to hurt yourself?', severity: 'critical' },
    { q: 'Do you have access to means to hurt yourself?', severity: 'critical' },
    { q: 'Have you been using substances?', severity: 'medium' },
    { q: 'Is there someone who can be with you right now?', severity: 'support' }
  ],

  // Check for crisis keywords in message
  detectCrisis: (message) => {
    const lower = message.toLowerCase();

    // Critical keywords - immediate intervention needed
    const critical = /\b(kill myself|suicide|end my life|want to die|better off dead|no reason to live|hurt myself|self.?harm|cut myself|overdose)\b/i;

    // Warning keywords - check-in needed
    const warning = /\b(hopeless|can't go on|give up|no point|don't want to be here|everything is pointless|nobody cares|burden|worthless|trapped)\b/i;

    // Distress keywords - support needed
    const distress = /\b(panic|can't breathe|losing control|falling apart|breaking down|overwhelmed|scared|terrified|alone|desperate)\b/i;

    if (critical.test(lower)) {
      return { level: 'critical', needsIntervention: true };
    } else if (warning.test(lower)) {
      return { level: 'warning', needsIntervention: true };
    } else if (distress.test(lower)) {
      return { level: 'distress', needsIntervention: false };
    }

    return { level: 'none', needsIntervention: false };
  },

  // Get emergency contacts
  getEmergencyContacts: () => {
    const custom = storage.get(STORAGE_KEYS.CRISIS_CONTACTS) || [];
    return custom;
  },

  // Add emergency contact
  addEmergencyContact: (contact) => {
    const contacts = CrisisSupport.getEmergencyContacts();
    contacts.push({
      id: Date.now(),
      ...contact
    });
    storage.set(STORAGE_KEYS.CRISIS_CONTACTS, contacts.slice(0, 5)); // Max 5 contacts
  },

  // Log grounding exercise completion
  logGrounding: (exerciseId, completed = true) => {
    const history = storage.get(STORAGE_KEYS.GROUNDING_HISTORY) || [];
    history.push({
      id: Date.now(),
      exercise: exerciseId,
      timestamp: new Date().toISOString(),
      completed
    });
    storage.set(STORAGE_KEYS.GROUNDING_HISTORY, history.slice(-50));
  },

  // Build crisis context for MJ
  buildCrisisResponse: (level) => {
    if (level === 'critical') {
      return `
=== CRISIS MODE ACTIVATED ===
User may be in immediate danger. Prioritize:
1. Express genuine care and concern
2. Ask if they're safe right now
3. Provide crisis resources (988, Crisis Text Line)
4. Encourage them to reach out to someone
5. Do NOT leave them alone in conversation
6. Avoid platitudes - be real and present

Key phrases:
- "I'm really glad you told me this."
- "You don't have to go through this alone."
- "Can you tell me more about what you're feeling?"
- "Is there someone who can be with you right now?"

ALWAYS provide: 988 (call or text) for immediate support.
`;
    } else if (level === 'warning') {
      return `
=== ELEVATED CONCERN MODE ===
User is expressing hopelessness. Approach with care:
1. Acknowledge their pain without minimizing
2. Ask open questions about how they're feeling
3. Gently mention support resources
4. Check if they have support around them
5. Be present and patient

Avoid: toxic positivity, "it'll get better", rushing to solutions
`;
    }

    return '';
  }
};

// ============ PROGRESS & STREAK SYSTEM ============
const ProgressSystem = {
  STORAGE_KEY: 'mj_progress_data',

  getProgress() {
    return storage.get(this.STORAGE_KEY) || {
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      totalMessages: 0,
      joinDate: new Date().toISOString(),
      lastActiveDate: null,
      achievements: [],
      weeklyActivity: {},
      monthlyMoodAvg: [],
      milestonesReached: []
    };
  },

  saveProgress(data) {
    storage.set(this.STORAGE_KEY, data);
  },

  recordSession() {
    const progress = this.getProgress();
    const today = new Date().toISOString().split('T')[0];
    const lastActive = progress.lastActiveDate;

    // Update streak
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        progress.currentStreak++;
      } else if (diffDays > 1) {
        progress.currentStreak = 1;
      }
      // Same day - no change
    } else {
      progress.currentStreak = 1;
    }

    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    progress.totalSessions++;
    progress.lastActiveDate = today;

    // Track weekly activity
    const weekKey = this.getWeekKey(new Date());
    progress.weeklyActivity[weekKey] = (progress.weeklyActivity[weekKey] || 0) + 1;

    // Check for new achievements
    this.checkAchievements(progress);

    this.saveProgress(progress);
    return progress;
  },

  recordMessage() {
    const progress = this.getProgress();
    progress.totalMessages++;
    this.saveProgress(progress);
    return progress;
  },

  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  },

  ACHIEVEMENTS: {
    first_chat: { id: 'first_chat', name: 'First Steps', description: 'Had your first conversation', icon: '🌱', threshold: 1 },
    streak_3: { id: 'streak_3', name: 'Building Momentum', description: '3-day streak', icon: '🔥', threshold: 3 },
    streak_7: { id: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: '⭐', threshold: 7 },
    streak_14: { id: 'streak_14', name: 'Consistency King', description: '14-day streak', icon: '👑', threshold: 14 },
    streak_30: { id: 'streak_30', name: 'Monthly Master', description: '30-day streak', icon: '🏆', threshold: 30 },
    messages_10: { id: 'messages_10', name: 'Opening Up', description: 'Sent 10 messages', icon: '💬', threshold: 10 },
    messages_50: { id: 'messages_50', name: 'Deep Diver', description: 'Sent 50 messages', icon: '🌊', threshold: 50 },
    messages_100: { id: 'messages_100', name: 'Committed', description: 'Sent 100 messages', icon: '💪', threshold: 100 },
    sessions_10: { id: 'sessions_10', name: 'Regular', description: '10 sessions completed', icon: '📅', threshold: 10 },
    sessions_30: { id: 'sessions_30', name: 'Dedicated', description: '30 sessions completed', icon: '🎯', threshold: 30 },
    mood_tracker: { id: 'mood_tracker', name: 'Self-Aware', description: 'Logged mood 7 times', icon: '🪞', threshold: 7 },
    breathing_master: { id: 'breathing_master', name: 'Breath Master', description: 'Completed 10 breathing exercises', icon: '🌬️', threshold: 10 },
    habit_streak: { id: 'habit_streak', name: 'Habit Builder', description: 'Completed all habits 3 days in a row', icon: '✨', threshold: 3 }
  },

  checkAchievements(progress) {
    const earned = progress.achievements || [];
    const newAchievements = [];

    // Check streak achievements
    if (progress.currentStreak >= 3 && !earned.includes('streak_3')) {
      earned.push('streak_3');
      newAchievements.push(this.ACHIEVEMENTS.streak_3);
    }
    if (progress.currentStreak >= 7 && !earned.includes('streak_7')) {
      earned.push('streak_7');
      newAchievements.push(this.ACHIEVEMENTS.streak_7);
    }
    if (progress.currentStreak >= 14 && !earned.includes('streak_14')) {
      earned.push('streak_14');
      newAchievements.push(this.ACHIEVEMENTS.streak_14);
    }
    if (progress.currentStreak >= 30 && !earned.includes('streak_30')) {
      earned.push('streak_30');
      newAchievements.push(this.ACHIEVEMENTS.streak_30);
    }

    // Check message achievements
    if (progress.totalMessages >= 10 && !earned.includes('messages_10')) {
      earned.push('messages_10');
      newAchievements.push(this.ACHIEVEMENTS.messages_10);
    }
    if (progress.totalMessages >= 50 && !earned.includes('messages_50')) {
      earned.push('messages_50');
      newAchievements.push(this.ACHIEVEMENTS.messages_50);
    }
    if (progress.totalMessages >= 100 && !earned.includes('messages_100')) {
      earned.push('messages_100');
      newAchievements.push(this.ACHIEVEMENTS.messages_100);
    }

    // Check session achievements
    if (progress.totalSessions >= 1 && !earned.includes('first_chat')) {
      earned.push('first_chat');
      newAchievements.push(this.ACHIEVEMENTS.first_chat);
    }
    if (progress.totalSessions >= 10 && !earned.includes('sessions_10')) {
      earned.push('sessions_10');
      newAchievements.push(this.ACHIEVEMENTS.sessions_10);
    }
    if (progress.totalSessions >= 30 && !earned.includes('sessions_30')) {
      earned.push('sessions_30');
      newAchievements.push(this.ACHIEVEMENTS.sessions_30);
    }

    progress.achievements = earned;
    return newAchievements;
  },

  getStats() {
    const progress = this.getProgress();
    const joinDate = new Date(progress.joinDate);
    const now = new Date();
    const daysOnJourney = Math.max(1, Math.floor((now - joinDate) / (1000 * 60 * 60 * 24)));

    return {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      totalSessions: progress.totalSessions,
      totalMessages: progress.totalMessages,
      daysOnJourney,
      achievementCount: progress.achievements.length,
      totalAchievements: Object.keys(this.ACHIEVEMENTS).length,
      averageSessionsPerWeek: Math.round((progress.totalSessions / daysOnJourney) * 7 * 10) / 10
    };
  }
};

// ============ PERSONALIZED AFFIRMATIONS SYSTEM ============
const AffirmationSystem = {
  STORAGE_KEY: 'mj_affirmations',

  // Base affirmations by category
  AFFIRMATIONS: {
    self_worth: [
      "I am enough, exactly as I am right now",
      "My worth isn't determined by my productivity",
      "I deserve kindness, especially from myself",
      "I'm allowed to take up space",
      "My feelings are valid and matter"
    ],
    anxiety: [
      "This feeling will pass, like all feelings do",
      "I can handle uncertainty",
      "My anxious thoughts are not facts",
      "I've survived 100% of my worst days",
      "It's okay to take things one breath at a time"
    ],
    depression: [
      "Small steps still move me forward",
      "Today I only need to get through today",
      "Asking for help is strength, not weakness",
      "I matter, even when I don't feel like I do",
      "The darkness I feel now is temporary"
    ],
    motivation: [
      "Progress isn't linear, and that's okay",
      "I can do hard things",
      "Every expert was once a beginner",
      "My effort counts, regardless of the outcome",
      "I'm building something, even when I can't see it"
    ],
    social: [
      "I don't need everyone to like me",
      "Real connection takes time and that's okay",
      "Being myself is enough in any room",
      "I can set boundaries and still be kind",
      "The right people will appreciate the real me"
    ],
    general: [
      "I'm doing the best I can with what I have",
      "Growth happens outside my comfort zone",
      "I choose how I respond to today",
      "I'm learning and that makes me brave",
      "Every day is a fresh start"
    ]
  },

  getSaved() {
    return storage.get(this.STORAGE_KEY) || {
      favorites: [],
      dismissed: [],
      history: [],
      lastShown: null,
      preferredCategories: []
    };
  },

  saveFavorite(affirmation, category) {
    const data = this.getSaved();
    if (!data.favorites.find(f => f.text === affirmation)) {
      data.favorites.push({ text: affirmation, category, savedAt: new Date().toISOString() });
      storage.set(this.STORAGE_KEY, data);
    }
  },

  removeFavorite(affirmation) {
    const data = this.getSaved();
    data.favorites = data.favorites.filter(f => f.text !== affirmation);
    storage.set(this.STORAGE_KEY, data);
  },

  getDailyAffirmation(struggles = [], mood = 3) {
    const data = this.getSaved();
    const today = new Date().toISOString().split('T')[0];

    // Return cached if already generated today
    if (data.lastShown?.date === today && data.lastShown?.affirmation) {
      return data.lastShown;
    }

    // Determine best category based on struggles and mood
    let category = 'general';
    if (mood <= 2) category = 'depression';
    else if (struggles.includes('anxiety') || struggles.includes('worry')) category = 'anxiety';
    else if (struggles.includes('social') || struggles.includes('lonely')) category = 'social';
    else if (struggles.includes('motivation') || struggles.includes('stuck')) category = 'motivation';
    else if (struggles.includes('worth') || struggles.includes('confidence')) category = 'self_worth';

    const pool = this.AFFIRMATIONS[category] || this.AFFIRMATIONS.general;
    const notDismissed = pool.filter(a => !data.dismissed.includes(a));
    const affirmation = notDismissed[Math.floor(Math.random() * notDismissed.length)] || pool[0];

    data.lastShown = { date: today, affirmation, category };
    data.history.push({ text: affirmation, category, shownAt: new Date().toISOString() });
    storage.set(this.STORAGE_KEY, data);

    return data.lastShown;
  },

  getForContext(context) {
    const category = context.toLowerCase();
    const pool = this.AFFIRMATIONS[category] || this.AFFIRMATIONS.general;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  getFavorites() {
    return this.getSaved().favorites;
  }
};

// ============ CONVERSATION MEMORY CALLBACKS ============
const ConversationCallbacks = {
  STORAGE_KEY: 'mj_conversation_memories',

  getMemories() {
    return storage.get(this.STORAGE_KEY) || {
      significantMoments: [],
      userMentions: {},
      emotionalPeaks: [],
      breakthroughs: [],
      recurringThemes: {}
    };
  },

  saveMemory(memory) {
    const data = this.getMemories();
    data.significantMoments.push({
      ...memory,
      timestamp: new Date().toISOString()
    });
    // Keep last 100 memories
    if (data.significantMoments.length > 100) {
      data.significantMoments = data.significantMoments.slice(-100);
    }
    storage.set(this.STORAGE_KEY, data);
  },

  trackMention(category, detail) {
    const data = this.getMemories();
    if (!data.userMentions[category]) {
      data.userMentions[category] = [];
    }
    data.userMentions[category].push({
      detail,
      timestamp: new Date().toISOString()
    });
    storage.set(this.STORAGE_KEY, data);
  },

  // Extract important mentions from user message
  extractMentions(message) {
    const lower = message.toLowerCase();
    const mentions = [];

    // People
    const peoplePatterns = [
      /my (mom|dad|mother|father|brother|sister|wife|husband|partner|friend|boss|coworker)/gi,
      /(?:named?|called?) (\w+)/gi
    ];
    peoplePatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        mentions.push({ category: 'people', detail: matches[0] });
      }
    });

    // Events/situations
    if (/interview|job|promotion|fired|quit/i.test(lower)) {
      mentions.push({ category: 'work', detail: message.slice(0, 100) });
    }
    if (/breakup|divorce|dating|relationship/i.test(lower)) {
      mentions.push({ category: 'relationship', detail: message.slice(0, 100) });
    }
    if (/exam|school|college|class|grade/i.test(lower)) {
      mentions.push({ category: 'education', detail: message.slice(0, 100) });
    }

    // Goals
    if (/want to|trying to|goal|hope to|planning to/i.test(lower)) {
      mentions.push({ category: 'goals', detail: message.slice(0, 100) });
    }

    return mentions;
  },

  // Get relevant callbacks for system prompt
  getCallbackContext() {
    const data = this.getMemories();
    const recent = data.significantMoments.slice(-10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find things from about a week ago to reference
    const weekOldMemories = data.significantMoments.filter(m => {
      const memDate = new Date(m.timestamp);
      const daysAgo = (Date.now() - memDate) / (1000 * 60 * 60 * 24);
      return daysAgo >= 5 && daysAgo <= 10;
    });

    // Build context
    let context = '';

    if (weekOldMemories.length > 0) {
      const memory = weekOldMemories[Math.floor(Math.random() * weekOldMemories.length)];
      context += `\n\nCALLBACK OPPORTUNITY: About a week ago, user mentioned: "${memory.content?.slice(0, 100)}". Consider naturally referencing this if relevant.`;
    }

    // Recent breakthroughs
    if (data.breakthroughs.length > 0) {
      const recentBreakthrough = data.breakthroughs[data.breakthroughs.length - 1];
      context += `\n\nRECENT WIN: User had a breakthrough about "${recentBreakthrough.topic}". Consider acknowledging their growth.`;
    }

    // Recurring themes
    const themes = Object.entries(data.recurringThemes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (themes.length > 0) {
      context += `\n\nRECURRING THEMES: ${themes.map(([t, c]) => `${t} (${c}x)`).join(', ')}`;
    }

    return context;
  },

  trackTheme(theme) {
    const data = this.getMemories();
    data.recurringThemes[theme] = (data.recurringThemes[theme] || 0) + 1;
    storage.set(this.STORAGE_KEY, data);
  },

  saveBreakthrough(topic, context) {
    const data = this.getMemories();
    data.breakthroughs.push({ topic, context, timestamp: new Date().toISOString() });
    storage.set(this.STORAGE_KEY, data);
  }
};

// ============ QUICK MOOD BOOSTERS ============
const QuickBoosters = {
  BOOSTERS: {
    gratitude_flash: {
      id: 'gratitude_flash',
      name: 'Gratitude Flash',
      duration: 30,
      icon: '🙏',
      description: 'Quick gratitude moment',
      steps: [
        { time: 5, instruction: 'Close your eyes and take a breath' },
        { time: 15, instruction: 'Think of ONE thing you\'re grateful for right now' },
        { time: 25, instruction: 'Feel that gratitude in your chest' },
        { time: 30, instruction: 'Open your eyes. Carry that feeling.' }
      ]
    },
    power_pose: {
      id: 'power_pose',
      name: 'Power Pose',
      duration: 45,
      icon: '💪',
      description: 'Quick confidence boost',
      steps: [
        { time: 5, instruction: 'Stand up tall' },
        { time: 10, instruction: 'Hands on hips, feet shoulder-width apart' },
        { time: 15, instruction: 'Chin slightly up, shoulders back' },
        { time: 35, instruction: 'Hold this pose. Breathe deeply.' },
        { time: 45, instruction: 'You\'ve got this.' }
      ]
    },
    five_senses: {
      id: 'five_senses',
      name: '5-4-3-2-1',
      duration: 60,
      icon: '🌟',
      description: 'Quick grounding',
      steps: [
        { time: 5, instruction: 'Name 5 things you can SEE' },
        { time: 15, instruction: 'Name 4 things you can TOUCH' },
        { time: 25, instruction: 'Name 3 things you can HEAR' },
        { time: 40, instruction: 'Name 2 things you can SMELL' },
        { time: 50, instruction: 'Name 1 thing you can TASTE' },
        { time: 60, instruction: 'You are here. You are present.' }
      ]
    },
    smile_boost: {
      id: 'smile_boost',
      name: 'Smile Boost',
      duration: 20,
      icon: '😊',
      description: 'Trick your brain',
      steps: [
        { time: 5, instruction: 'Force a big smile (yes, really!)' },
        { time: 10, instruction: 'Hold it even if it feels silly' },
        { time: 15, instruction: 'Your brain is releasing endorphins' },
        { time: 20, instruction: 'Notice how you feel now' }
      ]
    },
    shake_it_off: {
      id: 'shake_it_off',
      name: 'Shake It Off',
      duration: 30,
      icon: '🎵',
      description: 'Physical reset',
      steps: [
        { time: 5, instruction: 'Stand up and shake your hands' },
        { time: 10, instruction: 'Add your arms - shake them out' },
        { time: 15, instruction: 'Shake your whole body' },
        { time: 25, instruction: 'Jump up and down a few times' },
        { time: 30, instruction: 'Take a deep breath. Reset complete.' }
      ]
    },
    mini_win: {
      id: 'mini_win',
      name: 'Mini Win',
      duration: 45,
      icon: '🏆',
      description: 'Celebrate something small',
      steps: [
        { time: 10, instruction: 'Think of ONE small thing you did today' },
        { time: 20, instruction: 'It can be tiny - getting up, eating, texting someone' },
        { time: 35, instruction: 'Say to yourself: "I did that. Good job."' },
        { time: 45, instruction: 'Every win counts.' }
      ]
    }
  },

  STORAGE_KEY: 'mj_booster_history',

  getHistory() {
    return storage.get(this.STORAGE_KEY) || [];
  },

  logBooster(boosterId, completed) {
    const history = this.getHistory();
    history.push({
      boosterId,
      completed,
      timestamp: new Date().toISOString()
    });
    // Keep last 50
    storage.set(this.STORAGE_KEY, history.slice(-50));
  },

  getRecommended(mood, timeOfDay) {
    // Recommend based on mood and time
    if (mood <= 2) {
      return [this.BOOSTERS.gratitude_flash, this.BOOSTERS.mini_win];
    }
    if (timeOfDay === 'morning') {
      return [this.BOOSTERS.power_pose, this.BOOSTERS.shake_it_off];
    }
    if (timeOfDay === 'afternoon') {
      return [this.BOOSTERS.five_senses, this.BOOSTERS.shake_it_off];
    }
    return [this.BOOSTERS.smile_boost, this.BOOSTERS.gratitude_flash];
  },

  getAll() {
    return Object.values(this.BOOSTERS);
  }
};

// ============ CELEBRATION SYSTEM ============
const CelebrationSystem = {
  STORAGE_KEY: 'mj_celebrations',

  CELEBRATION_TYPES: {
    streak: { confetti: true, sound: 'chime', messages: ['🔥 Streak on fire!', '📈 Consistency pays off!', '⭐ You showed up again!'] },
    achievement: { confetti: true, sound: 'fanfare', messages: ['🏆 Achievement Unlocked!', '🎉 You earned it!', '✨ Look at you go!'] },
    task_complete: { confetti: false, sound: 'ding', messages: ['✓ Done!', '💪 Crushed it!', '🎯 Task complete!'] },
    mood_up: { confetti: false, sound: 'chime', messages: ['📈 Mood boost!', '☀️ Looking brighter!', '🌟 Progress!'] },
    habit_complete: { confetti: false, sound: 'ding', messages: ['✨ Habit done!', '🔄 Building routine!', '💫 Small wins add up!'] },
    breakthrough: { confetti: true, sound: 'fanfare', messages: ['💡 Breakthrough!', '🌟 Growth moment!', '🚀 You\'re evolving!'] },
    milestone: { confetti: true, sound: 'fanfare', messages: ['🎊 Milestone reached!', '🏅 Big moment!', '🌈 How far you\'ve come!'] }
  },

  getHistory() {
    return storage.get(this.STORAGE_KEY) || [];
  },

  celebrate(type, detail = '') {
    const celebrationType = this.CELEBRATION_TYPES[type] || this.CELEBRATION_TYPES.task_complete;
    const message = celebrationType.messages[Math.floor(Math.random() * celebrationType.messages.length)];

    const celebration = {
      type,
      detail,
      message,
      confetti: celebrationType.confetti,
      timestamp: new Date().toISOString()
    };

    // Save to history
    const history = this.getHistory();
    history.push(celebration);
    storage.set(this.STORAGE_KEY, history.slice(-100));

    return celebration;
  },

  shouldCelebrate(context) {
    // Determine if something is worth celebrating
    if (context.streakReached && context.streakReached % 7 === 0) return { type: 'streak', detail: `${context.streakReached} days` };
    if (context.newAchievement) return { type: 'achievement', detail: context.newAchievement };
    if (context.taskCompleted) return { type: 'task_complete', detail: context.taskCompleted };
    if (context.moodImproved) return { type: 'mood_up', detail: '' };
    if (context.habitCompleted) return { type: 'habit_complete', detail: context.habitCompleted };
    if (context.breakthrough) return { type: 'breakthrough', detail: context.breakthrough };
    return null;
  },

  getWeeklyWins() {
    const history = this.getHistory();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return history.filter(c => new Date(c.timestamp).getTime() > weekAgo);
  }
};

// ============ SESSION SUMMARY SYSTEM ============
const SessionSummary = {
  STORAGE_KEY: 'mj_session_summaries',

  getSummaries() {
    return storage.get(this.STORAGE_KEY) || [];
  },

  generateSummary(messages, sessionStart) {
    const userMessages = messages.filter(m => m.role === 'user');
    const mjMessages = messages.filter(m => m.role === 'mj');

    // Extract key themes
    const allText = userMessages.map(m => m.text).join(' ').toLowerCase();
    const themes = [];

    if (/anxious|anxiety|worry|stressed|overwhelm/i.test(allText)) themes.push('anxiety');
    if (/sad|depress|down|hopeless|empty/i.test(allText)) themes.push('low mood');
    if (/work|job|career|boss|coworker/i.test(allText)) themes.push('work');
    if (/relationship|partner|friend|family|lonely/i.test(allText)) themes.push('relationships');
    if (/goal|want to|trying|motivation|stuck/i.test(allText)) themes.push('goals');
    if (/sleep|tired|exhausted|energy/i.test(allText)) themes.push('energy/sleep');

    // Extract potential insights from MJ responses
    const insights = [];
    mjMessages.forEach(m => {
      if (/remember that|key thing|important to note|worth remembering/i.test(m.text)) {
        insights.push(m.text.slice(0, 150));
      }
    });

    // Create summary
    const summary = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: Math.round((Date.now() - sessionStart) / 60000), // minutes
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      themes,
      insights: insights.slice(0, 3),
      keyTakeaway: this.extractTakeaway(mjMessages)
    };

    // Save
    const summaries = this.getSummaries();
    summaries.push(summary);
    storage.set(this.STORAGE_KEY, summaries.slice(-50));

    return summary;
  },

  extractTakeaway(mjMessages) {
    // Look for summary-like statements in MJ's responses
    const lastFew = mjMessages.slice(-3);
    for (const msg of lastFew) {
      if (/remember|takeaway|focus on|key is|most important/i.test(msg.text)) {
        const sentences = msg.text.split(/[.!?]+/);
        const relevantSentence = sentences.find(s =>
          /remember|takeaway|focus|key|important/i.test(s)
        );
        if (relevantSentence) return relevantSentence.trim();
      }
    }
    return null;
  },

  getRecentSummaries(count = 5) {
    return this.getSummaries().slice(-count);
  },

  buildSummaryContext() {
    const recent = this.getRecentSummaries(3);
    if (recent.length === 0) return '';

    let context = '\n\n=== RECENT SESSION CONTEXT ===';
    recent.forEach(s => {
      context += `\nSession ${new Date(s.date).toLocaleDateString()}: Themes - ${s.themes.join(', ') || 'general chat'}`;
      if (s.keyTakeaway) context += ` | Takeaway: "${s.keyTakeaway.slice(0, 80)}"`;
    });

    return context;
  }
};

// ============ ADAPTIVE TONE SYSTEM ============
const AdaptiveTone = {
  TONES: {
    energizing: {
      markers: ['driven', 'motivated', 'ready'],
      style: 'Match their energy! Be enthusiastic, use action words, focus on momentum.',
      examples: ['Let\'s do this!', 'You\'re on fire today!', 'Channel that energy!']
    },
    calming: {
      markers: ['anxious', 'overwhelmed', 'stressed'],
      style: 'Slow down. Use gentle, reassuring language. Short sentences. Ground them.',
      examples: ['Take a breath.', 'You\'re okay.', 'One thing at a time.']
    },
    warm: {
      markers: ['sad', 'lonely', 'down'],
      style: 'Be soft and nurturing. Show you care. Validate their feelings deeply.',
      examples: ['I hear you.', 'That sounds really hard.', 'You matter.']
    },
    direct: {
      markers: ['stuck', 'procrastinating', 'avoiding'],
      style: 'Be gently direct. Cut through avoidance with kind honesty. Offer clear next steps.',
      examples: ['What\'s really going on?', 'Let\'s get specific.', 'What\'s one small thing?']
    },
    playful: {
      markers: ['bored', 'meh', 'fine'],
      style: 'Add lightness. Use humor where appropriate. Be engaging and curious.',
      examples: ['Tell me something interesting.', 'What would make today less meh?', 'Spill the tea.']
    },
    steady: {
      markers: ['neutral', 'stable', 'okay'],
      style: 'Be present and conversational. Follow their lead. Stay curious.',
      examples: ['What\'s on your mind?', 'How can I help today?', 'I\'m here.']
    }
  },

  detectTone(energy, overlay, recentMood) {
    // Priority: overlay > energy > recentMood
    if (overlay === 'crisis' || overlay === 'shame') return 'warm';
    if (overlay === 'anger') return 'calming';
    if (overlay === 'cynicism') return 'steady';
    if (overlay === 'social_anxiety') return 'warm';
    if (overlay === 'avoidance') return 'direct';

    if (energy === 'depleted') return 'warm';
    if (energy === 'driven') return 'energizing';
    if (energy === 'engaged') return 'steady';

    if (recentMood && recentMood <= 2) return 'warm';
    if (recentMood && recentMood >= 4) return 'playful';

    return 'steady';
  },

  getToneGuidance(toneName) {
    const tone = this.TONES[toneName] || this.TONES.steady;
    return `
ADAPTIVE TONE: ${toneName.toUpperCase()}
Style: ${tone.style}
Phrase examples: ${tone.examples.join(' | ')}
`;
  },

  buildToneContext(energy, overlay, recentMood) {
    const toneName = this.detectTone(energy, overlay, recentMood);
    return this.getToneGuidance(toneName);
  }
};

// ============ PERSONAL COPING TOOLKIT ============
const CopingToolkit = {
  STORAGE_KEY: 'mj_coping_toolkit',

  getToolkit() {
    return storage.get(this.STORAGE_KEY) || {
      strategies: [],
      favorites: [],
      situationMap: {},
      effectivenessLog: []
    };
  },

  saveToolkit(data) {
    storage.set(this.STORAGE_KEY, data);
  },

  addStrategy(strategy) {
    const toolkit = this.getToolkit();
    const newStrategy = {
      id: Date.now().toString(),
      ...strategy,
      addedAt: new Date().toISOString(),
      useCount: 0,
      effectivenessRatings: []
    };
    toolkit.strategies.push(newStrategy);
    this.saveToolkit(toolkit);
    return newStrategy;
  },

  DEFAULT_STRATEGIES: [
    { name: 'Box Breathing', category: 'grounding', description: '4-4-4-4 breathing pattern', forSituations: ['anxiety', 'panic', 'stress'] },
    { name: 'Cold Water', category: 'physical', description: 'Splash cold water on face', forSituations: ['panic', 'overwhelm', 'anger'] },
    { name: '5-4-3-2-1', category: 'grounding', description: 'Name things you can sense', forSituations: ['anxiety', 'dissociation', 'panic'] },
    { name: 'Walk Outside', category: 'physical', description: 'Even just 5 minutes', forSituations: ['stuck', 'low energy', 'rumination'] },
    { name: 'Text a Friend', category: 'connection', description: 'Reach out, even just "hey"', forSituations: ['lonely', 'sad', 'isolated'] },
    { name: 'Body Scan', category: 'grounding', description: 'Notice tension, release it', forSituations: ['stress', 'anxiety', 'sleep'] },
    { name: 'Journaling', category: 'expression', description: 'Write without editing', forSituations: ['overwhelm', 'confusion', 'processing'] },
    { name: 'Music', category: 'mood', description: 'Your go-to playlist', forSituations: ['sad', 'angry', 'need energy'] }
  ],

  getForSituation(situation) {
    const toolkit = this.getToolkit();
    const allStrategies = [...this.DEFAULT_STRATEGIES, ...toolkit.strategies];
    return allStrategies.filter(s =>
      s.forSituations?.some(sit =>
        situation.toLowerCase().includes(sit.toLowerCase())
      )
    );
  },

  logUse(strategyId, effectiveness) {
    const toolkit = this.getToolkit();
    const strategy = toolkit.strategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.useCount++;
      strategy.effectivenessRatings.push({
        rating: effectiveness,
        timestamp: new Date().toISOString()
      });
      this.saveToolkit(toolkit);
    }

    // Also log overall
    toolkit.effectivenessLog.push({
      strategyId,
      effectiveness,
      timestamp: new Date().toISOString()
    });
    this.saveToolkit(toolkit);
  },

  toggleFavorite(strategyId) {
    const toolkit = this.getToolkit();
    const idx = toolkit.favorites.indexOf(strategyId);
    if (idx >= 0) {
      toolkit.favorites.splice(idx, 1);
    } else {
      toolkit.favorites.push(strategyId);
    }
    this.saveToolkit(toolkit);
  },

  getTopStrategies() {
    const toolkit = this.getToolkit();
    const withRatings = toolkit.strategies.filter(s => s.effectivenessRatings.length > 0);
    return withRatings.sort((a, b) => {
      const avgA = a.effectivenessRatings.reduce((sum, r) => sum + r.rating, 0) / a.effectivenessRatings.length;
      const avgB = b.effectivenessRatings.reduce((sum, r) => sum + r.rating, 0) / b.effectivenessRatings.length;
      return avgB - avgA;
    }).slice(0, 5);
  },

  buildToolkitContext() {
    const topStrategies = this.getTopStrategies();
    if (topStrategies.length === 0) return '';

    return `\n\nUSER'S EFFECTIVE COPING STRATEGIES:\n${topStrategies.map(s => `- ${s.name}: ${s.description}`).join('\n')}`;
  }
};

// ============ SMART CONTEXTUAL NOTIFICATIONS ============
const SmartNotifications = {
  STORAGE_KEY: 'mj_smart_notifications',

  getSettings() {
    return storage.get(this.STORAGE_KEY) || {
      enabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 7,
      patterns: {
        lowMoodTimes: [],
        highEngagementTimes: [],
        missedDays: []
      },
      lastNotifications: []
    };
  },

  saveSettings(settings) {
    storage.set(this.STORAGE_KEY, settings);
  },

  NOTIFICATION_TYPES: {
    gentle_checkin: {
      messages: [
        "Hey, just checking in. How are you today?",
        "Thinking of you. How's it going?",
        "Quick check-in - how are you feeling?"
      ],
      priority: 'low'
    },
    streak_reminder: {
      messages: [
        "Don't break your streak! Quick chat?",
        "Your {streak}-day streak is waiting 🔥",
        "One message keeps the streak alive!"
      ],
      priority: 'medium'
    },
    mood_support: {
      messages: [
        "I noticed you've been feeling low lately. I'm here if you want to talk.",
        "Sending you support today. Remember, you're not alone.",
        "Hey. Just want you to know I'm here."
      ],
      priority: 'high'
    },
    celebration: {
      messages: [
        "You did it! Come celebrate your win 🎉",
        "Achievement unlocked! Let's see it!",
        "Look at you go! 🌟"
      ],
      priority: 'medium'
    },
    habit_reminder: {
      messages: [
        "Time for your daily habits! You've got this.",
        "Quick habit check-in time ✓",
        "Small steps, big changes. Habit time!"
      ],
      priority: 'low'
    }
  },

  shouldNotify(type, context = {}) {
    const settings = this.getSettings();
    if (!settings.enabled) return false;

    // Check quiet hours
    const hour = new Date().getHours();
    if (hour >= settings.quietHoursStart || hour < settings.quietHoursEnd) {
      return false;
    }

    // Check if we've already notified recently
    const recentOfType = settings.lastNotifications.find(n =>
      n.type === type &&
      (Date.now() - new Date(n.timestamp).getTime()) < 4 * 60 * 60 * 1000 // 4 hours
    );
    if (recentOfType) return false;

    return true;
  },

  getNotificationMessage(type, context = {}) {
    const notifType = this.NOTIFICATION_TYPES[type];
    if (!notifType) return null;

    let message = notifType.messages[Math.floor(Math.random() * notifType.messages.length)];

    // Replace placeholders
    if (context.streak) message = message.replace('{streak}', context.streak);
    if (context.name) message = message.replace('{name}', context.name);

    return {
      type,
      message,
      priority: notifType.priority,
      timestamp: new Date().toISOString()
    };
  },

  recordNotification(notification) {
    const settings = this.getSettings();
    settings.lastNotifications.push(notification);
    // Keep last 20
    settings.lastNotifications = settings.lastNotifications.slice(-20);
    this.saveSettings(settings);
  },

  analyzePatterns(moodLog, sessionLog) {
    const settings = this.getSettings();

    // Find times when mood is typically low
    if (moodLog && moodLog.length > 0) {
      const lowMoodTimes = moodLog
        .filter(m => m.mood <= 2)
        .map(m => new Date(m.timestamp).getHours());

      // Find most common low mood hour
      const hourCounts = {};
      lowMoodTimes.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
      settings.patterns.lowMoodTimes = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([h]) => parseInt(h));
    }

    this.saveSettings(settings);
    return settings.patterns;
  }
};

// ============ GUIDED JOURNALING SYSTEM ============
const GuidedJournaling = {
  STORAGE_KEY: 'mj_journal_entries',

  PROMPTS: {
    morning: [
      "What's one thing you're looking forward to today?",
      "How do you want to feel by the end of today?",
      "What's one kind thing you can do for yourself today?",
      "What would make today a good day?"
    ],
    evening: [
      "What's one thing that went well today?",
      "What did you learn about yourself today?",
      "What are you grateful for from today?",
      "What would you do differently tomorrow?"
    ],
    processing: [
      "What's weighing on your mind right now?",
      "If your feelings had a color, what would it be and why?",
      "What do you need right now that you're not getting?",
      "What would you tell a friend in your situation?"
    ],
    growth: [
      "What's a fear you'd like to overcome?",
      "What's one small step you could take toward a goal?",
      "What strength have you shown recently?",
      "What pattern would you like to change?"
    ],
    gratitude: [
      "Name 3 small things you're grateful for today.",
      "Who made a positive difference in your life recently?",
      "What's a simple pleasure you enjoyed recently?",
      "What's something about yourself you're grateful for?"
    ],
    self_compassion: [
      "What would you say to comfort yourself right now?",
      "What do you need to forgive yourself for?",
      "How can you be gentler with yourself today?",
      "What are you doing well, even if it's small?"
    ]
  },

  getEntries() {
    return storage.get(this.STORAGE_KEY) || [];
  },

  saveEntry(entry) {
    const entries = this.getEntries();
    entries.push({
      id: Date.now().toString(),
      ...entry,
      timestamp: new Date().toISOString()
    });
    storage.set(this.STORAGE_KEY, entries);
    return entries[entries.length - 1];
  },

  getPrompt(category = null, mood = 3) {
    // Select category based on time of day or mood
    if (!category) {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) category = 'morning';
      else if (hour >= 18) category = 'evening';
      else if (mood <= 2) category = 'self_compassion';
      else if (mood >= 4) category = 'gratitude';
      else category = 'processing';
    }

    const prompts = this.PROMPTS[category] || this.PROMPTS.processing;
    return {
      category,
      prompt: prompts[Math.floor(Math.random() * prompts.length)]
    };
  },

  getRecentEntries(count = 5) {
    return this.getEntries().slice(-count);
  },

  getEntriesByCategory(category) {
    return this.getEntries().filter(e => e.category === category);
  },

  analyzeThemes() {
    const entries = this.getEntries();
    const words = entries.map(e => e.text || '').join(' ').toLowerCase();

    const themes = {
      anxiety: (words.match(/anxious|worry|nervous|stressed|overwhelm/g) || []).length,
      gratitude: (words.match(/grateful|thankful|appreciate|blessed/g) || []).length,
      growth: (words.match(/learn|grow|improve|progress|better/g) || []).length,
      relationships: (words.match(/friend|family|partner|love|connection/g) || []).length,
      self: (words.match(/myself|me|my|self|identity/g) || []).length
    };

    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0);
  },

  buildJournalContext() {
    const recent = this.getRecentEntries(3);
    if (recent.length === 0) return '';

    const themes = this.analyzeThemes().slice(0, 3);

    let context = '\n\n=== JOURNALING INSIGHTS ===';
    context += `\nRecent journal themes: ${themes.map(([t]) => t).join(', ') || 'exploring'}`;
    context += `\nTotal entries: ${this.getEntries().length}`;

    return context;
  }
};

// ============ DEEP PERSONALIZATION SYSTEM ============
const DeepPersonalization = {
  STORAGE_KEY: 'mj_deep_personalization',

  getData() {
    return storage.get(this.STORAGE_KEY) || {
      people: {}, places: {}, work: {}, interests: [], dates: {},
      values: [], goals: [], triggers: [], comforts: [],
      preferences: { nickname: null, tonePreference: null, humorLevel: 'moderate' },
      context: { livingSituation: null, relationshipStatus: null, hasKids: null, hasPets: null },
      lastUpdated: null
    };
  },

  saveData(data) {
    data.lastUpdated = new Date().toISOString();
    storage.set(this.STORAGE_KEY, data);
  },

  extractDetails(message) {
    const lower = message.toLowerCase();
    const data = this.getData();
    const extractions = [];

    // Pet detection
    if (/my (dog|cat|pet|puppy|kitten)(?:'s name is |,? )?(\w+)?/i.test(lower)) {
      const match = message.match(/my (dog|cat|pet|puppy|kitten)(?:'s name is |,? )?(\w+)?/i);
      if (match) {
        data.context.hasPets = true;
        if (match[2]) {
          data.people[`pet_${match[1]}`] = { name: match[2], type: match[1] };
          extractions.push({ type: 'pet', detail: `${match[1]} named ${match[2]}` });
        }
      }
    }

    // Work detection
    if (/i work (?:at|for|as|in)/i.test(lower)) {
      const workMatch = message.match(/i work (?:at|for) ([\w\s]+?)(?:\.|,|$)/i);
      if (workMatch) {
        data.work.description = workMatch[1].trim();
        extractions.push({ type: 'work', detail: workMatch[1].trim() });
      }
    }

    // Relationship status
    if (/(?:i'm |i am )?(single|married|divorced|engaged|dating)/i.test(lower)) {
      const match = message.match(/(?:i'm |i am )?(single|married|divorced|engaged|dating)/i);
      if (match) {
        data.context.relationshipStatus = match[1].toLowerCase();
        extractions.push({ type: 'relationship', detail: match[1] });
      }
    }

    // Kids detection
    if (/my (kid|child|son|daughter|baby)/i.test(lower)) {
      data.context.hasKids = true;
      const kidMatch = message.match(/my (son|daughter)(?:'s name is |,? )?(\w+)?/i);
      if (kidMatch && kidMatch[2]) {
        data.people[`child_${kidMatch[1]}`] = { name: kidMatch[2], type: kidMatch[1] };
        extractions.push({ type: 'family', detail: `${kidMatch[1]} named ${kidMatch[2]}` });
      }
    }

    // Trigger detection
    if (/(?:triggers me|sets me off|can't handle|really bothers me)/i.test(lower)) {
      const match = message.match(/(?:triggers me|can't handle).*?(when|about) ([\w\s]+)/i);
      if (match && !data.triggers.includes(match[2])) {
        data.triggers.push(match[2].trim());
        extractions.push({ type: 'trigger', detail: match[2].trim() });
      }
    }

    // Comfort detection
    if (/(?:helps me|makes me feel better|calms me)/i.test(lower)) {
      const match = message.match(/(?:helps me|calms me).*?(when|to) ([\w\s]+)/i);
      if (match && !data.comforts.includes(match[2])) {
        data.comforts.push(match[2].trim());
        extractions.push({ type: 'comfort', detail: match[2].trim() });
      }
    }

    if (extractions.length > 0) this.saveData(data);
    return extractions;
  },

  buildPersonalizationContext() {
    const data = this.getData();
    let context = '\n\n=== PERSONALIZATION (YOU KNOW THIS) ===';
    let hasContent = false;

    const people = Object.entries(data.people);
    if (people.length > 0) {
      context += '\nPeople: ' + people.map(([k, p]) => `${p.type || k}: ${p.name}`).join(', ');
      hasContent = true;
    }
    if (data.work.description) { context += `\nWork: ${data.work.description}`; hasContent = true; }
    if (data.context.relationshipStatus) { context += `\nRelationship: ${data.context.relationshipStatus}`; hasContent = true; }
    if (data.triggers.length > 0) { context += `\nTriggers: ${data.triggers.slice(0, 3).join(', ')}`; hasContent = true; }
    if (data.comforts.length > 0) { context += `\nWhat helps: ${data.comforts.slice(0, 3).join(', ')}`; hasContent = true; }

    return hasContent ? context + '\n(Reference these naturally to show you remember)' : '';
  }
};

// ============ SMART REPLY SUGGESTIONS ============
const SmartReplies = {
  CATEGORIES: {
    greeting: [
      { text: "Hey MJ 👋", context: 'casual' }, { text: "Not great today", context: 'low' },
      { text: "Actually doing okay!", context: 'positive' }, { text: "Need to talk", context: 'support' }
    ],
    feeling: [
      { text: "😊 Pretty good", mood: 4 }, { text: "😐 Meh, okay", mood: 3 },
      { text: "😔 Struggling", mood: 2 }, { text: "😢 Really hard", mood: 1 }
    ],
    response: [
      { text: "That helps, thanks", s: 'positive' }, { text: "I'll try that", s: 'willing' },
      { text: "I don't know...", s: 'uncertain' }, { text: "Tell me more", s: 'curious' }
    ],
    task: [
      { text: "✓ Did it!", s: 'done' }, { text: "Working on it", s: 'progress' },
      { text: "Can't start", s: 'stuck' }, { text: "Not today", s: 'skip' }
    ]
  },

  getSuggestions(context) {
    const { lastMjMessage = '', conversationLength } = context;
    const lower = lastMjMessage.toLowerCase();

    if (conversationLength === 0) return this.CATEGORIES.greeting;
    if (/how are you|how do you feel|check.?in/i.test(lower)) return this.CATEGORIES.feeling;
    if (/task|goal|did you|complete/i.test(lower)) return this.CATEGORIES.task;
    return this.CATEGORIES.response;
  }
};

// ============ MORNING INTENTION RITUAL ============
const MorningRitual = {
  STORAGE_KEY: 'mj_morning_ritual',

  getData() {
    return storage.get(this.STORAGE_KEY) || { intentions: [], streak: 0, lastDate: null };
  },

  PROMPTS: [
    "What's one word you want to embody today?",
    "What would make today feel meaningful?",
    "What's one kind thing you can do for yourself?",
    "Who do you want to show up as today?",
    "What's one small win you're aiming for?"
  ],

  getPrompt() { return this.PROMPTS[Math.floor(Math.random() * this.PROMPTS.length)]; },

  setIntention(text, mood = 3) {
    const data = this.getData();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDate) {
      const diff = Math.floor((new Date(today) - new Date(data.lastDate)) / 86400000);
      data.streak = diff === 1 ? data.streak + 1 : 1;
    } else { data.streak = 1; }

    data.intentions.push({ text, mood, date: today, timestamp: new Date().toISOString() });
    data.lastDate = today;
    storage.set(this.STORAGE_KEY, data);
    return data;
  },

  getTodayIntention() {
    const today = new Date().toISOString().split('T')[0];
    return this.getData().intentions.find(i => i.date === today);
  },

  hasCompletedToday() {
    return this.getData().lastDate === new Date().toISOString().split('T')[0];
  },

  buildContext() {
    const intention = this.getTodayIntention();
    return intention ? `\n\nTODAY'S INTENTION: "${intention.text}" (Help them stay aligned)` : '';
  }
};

// ============ EVENING WIND-DOWN MODE ============
const EveningWindDown = {
  STORAGE_KEY: 'mj_winddown',

  getData() {
    return storage.get(this.STORAGE_KEY) || { reflections: [], streak: 0, lastDate: null };
  },

  STEPS: [
    { id: 'reflect', title: 'Reflect', prompt: 'One thing that went well...', icon: '🌅' },
    { id: 'release', title: 'Release', prompt: 'Something to let go of...', icon: '🍃' },
    { id: 'gratitude', title: 'Gratitude', prompt: 'I\'m grateful for...', icon: '🙏' },
    { id: 'tomorrow', title: 'Tomorrow', prompt: 'One intention for tomorrow...', icon: '🌟' }
  ],

  complete(responses) {
    const data = this.getData();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDate) {
      const diff = Math.floor((new Date(today) - new Date(data.lastDate)) / 86400000);
      data.streak = diff === 1 ? data.streak + 1 : 1;
    } else { data.streak = 1; }

    data.reflections.push({ ...responses, date: today, timestamp: new Date().toISOString() });
    data.lastDate = today;
    storage.set(this.STORAGE_KEY, data);
    return data;
  },

  hasCompletedToday() {
    return this.getData().lastDate === new Date().toISOString().split('T')[0];
  },

  isWindDownTime() {
    const h = new Date().getHours();
    return h >= 20 || h < 4;
  }
};

// ============ CONTEXTUAL QUICK ACTIONS ============
const QuickActions = {
  getActions(context = {}) {
    const { mood, hasUnfinishedTasks } = context;
    const h = new Date().getHours();
    const actions = [];

    if (h >= 5 && h < 11) {
      if (!MorningRitual.hasCompletedToday()) actions.push({ id: 'intention', label: '🌅 Set Intention', priority: 1, action: 'morning_ritual' });
      actions.push({ id: 'mood', label: '📊 Check-in', priority: 2, action: 'mood_checkin' });
    }
    if (h >= 11 && h < 17) {
      if (hasUnfinishedTasks) actions.push({ id: 'tasks', label: '🎯 Focus', priority: 1, action: 'tasks' });
      if (mood && mood <= 2) actions.push({ id: 'boost', label: '⚡ Mood Boost', priority: 1, action: 'boosters' });
    }
    if (h >= 17 && h < 22) {
      actions.push({ id: 'journal', label: '📝 Journal', priority: 2, action: 'journal' });
      if (!EveningWindDown.hasCompletedToday() && h >= 20) actions.push({ id: 'winddown', label: '🌙 Wind Down', priority: 1, action: 'winddown' });
    }
    if (h >= 22 || h < 5) {
      actions.push({ id: 'sleep', label: '😴 Sleep Prep', priority: 1, action: 'sleep_breathing' });
    }

    return actions.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }
};

// ============ WEEKLY GROWTH STORY ============
const GrowthStory = {
  STORAGE_KEY: 'mj_growth_stories',

  generate() {
    const moodStats = MoodTracker.getStats(7);
    const progress = ProgressSystem.getProgress();
    const celebrations = CelebrationSystem.getWeeklyWins();

    const story = { weekOf: new Date().toISOString(), sections: [] };

    story.sections.push({ type: 'opening', title: 'Your Week', content: `You showed up ${progress.currentStreak} days. That consistency matters.` });

    if (moodStats) {
      let text = moodStats.trend === 'improving' ? `Mood trending up - averaging ${moodStats.averageMood}/5. Nice work.` :
                 moodStats.trend === 'declining' ? `Harder week emotionally. You still showed up - that's strength.` :
                 `Mood stable at ${moodStats.averageMood}/5.`;
      story.sections.push({ type: 'mood', title: 'Emotional Journey', content: text });
    }

    if (celebrations.length > 0) {
      story.sections.push({ type: 'wins', title: 'Wins', content: `${celebrations.length} celebrations this week!`, items: celebrations.map(c => c.message) });
    }

    story.sections.push({ type: 'closing', title: 'Ahead', content: 'Every step counts. Keep going.' });

    const stories = storage.get(this.STORAGE_KEY) || [];
    stories.push(story);
    storage.set(this.STORAGE_KEY, stories.slice(-12));
    return story;
  },

  getLatest() { return (storage.get(this.STORAGE_KEY) || []).slice(-1)[0]; },

  shouldShow() {
    const stories = storage.get(this.STORAGE_KEY) || [];
    if (!stories.length) return true;
    return (Date.now() - new Date(stories[stories.length - 1].weekOf)) / 86400000 >= 7;
  }
};

// ============ GENTLE NUDGE SYSTEM ============
const GentleNudges = {
  TEMPLATES: {
    missed: ["Hey, haven't seen you. I'm here. 💙", "Missing our chats. You okay?"],
    streak: ["Your {streak}-day streak is on the line!", "One message saves your streak 🔥"],
    morning: ["Morning! What's one thing you're looking forward to?", "Ready to set an intention? ☀️"],
    evening: ["How did today go?", "Any wins to celebrate?"],
    gentle: ["How's today going?", "Thinking of you. 💙"]
  },

  getNudge(type, context = {}) {
    const templates = this.TEMPLATES[type] || this.TEMPLATES.gentle;
    let msg = templates[Math.floor(Math.random() * templates.length)];
    if (context.streak) msg = msg.replace('{streak}', context.streak);
    return msg;
  },

  getType() {
    const h = new Date().getHours();
    const progress = ProgressSystem.getProgress();
    const today = new Date().toISOString().split('T')[0];

    if (progress.lastActiveDate) {
      const days = (Date.now() - new Date(progress.lastActiveDate)) / 86400000;
      if (days >= 2) return 'missed';
    }
    if (progress.lastActiveDate !== today && progress.currentStreak > 3) return 'streak';
    if (h >= 6 && h < 10) return 'morning';
    if (h >= 18 && h < 21) return 'evening';
    return 'gentle';
  }
};

// ============ VOICE CONVERSATION MODE ============
const VoiceConversation = {
  STORAGE_KEY: 'mj_voice_settings',

  getSettings() {
    return storage.get(this.STORAGE_KEY) || { enabled: true, autoSpeak: true, speed: 1.0, pitch: 1.0 };
  },

  speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const settings = this.getSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speed;
    utterance.pitch = settings.pitch;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  },

  stop() { if (typeof window !== 'undefined') window.speechSynthesis?.cancel(); },
  isSpeaking() { return typeof window !== 'undefined' && window.speechSynthesis?.speaking; }
};

// ============ PERSONALIZED CONTENT FEED ============
const ContentFeed = {
  QUOTES: {
    anxiety: [
      { text: "You don't have to control your thoughts. Just stop letting them control you.", author: "Dan Millman" },
      { text: "Nothing diminishes anxiety faster than action.", author: "Walter Anderson" }
    ],
    motivation: [
      { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
      { text: "Small steps still move you forward.", author: "Unknown" }
    ],
    general: [
      { text: "Be gentle with yourself. You're doing the best you can.", author: "Unknown" },
      { text: "You've survived 100% of your worst days.", author: "Unknown" }
    ]
  },

  CHALLENGES: [
    { text: "Send one genuine compliment today", difficulty: 'easy' },
    { text: "Go outside for 5 minutes", difficulty: 'easy' },
    { text: "Write 3 things you did well", difficulty: 'easy' },
    { text: "Do something that scares you a little", difficulty: 'hard' }
  ],

  generate(context = {}) {
    const { struggles = [], mood = 3 } = context;
    const feed = [];

    const cat = struggles[0] || 'general';
    const quotes = this.QUOTES[cat] || this.QUOTES.general;
    feed.push({ type: 'quote', content: quotes[Math.floor(Math.random() * quotes.length)] });

    const diff = mood <= 2 ? 'easy' : 'hard';
    const challenges = this.CHALLENGES.filter(c => c.difficulty === diff || c.difficulty === 'easy');
    feed.push({ type: 'challenge', content: challenges[Math.floor(Math.random() * challenges.length)] });

    const affirmation = AffirmationSystem.getDailyAffirmation(struggles, mood);
    feed.push({ type: 'affirmation', content: { text: affirmation.affirmation } });

    return feed;
  }
};

// ============ ACCOUNTABILITY BUDDY SYSTEM ============
const AccountabilityBuddy = {
  STORAGE_KEY: 'mj_buddy',

  getData() {
    return storage.get(this.STORAGE_KEY) || { buddy: null, sharedGoals: [], checkIns: [], isConnected: false };
  },

  setBuddy(info) {
    const data = this.getData();
    data.buddy = { ...info, connectedAt: new Date().toISOString() };
    data.isConnected = true;
    storage.set(this.STORAGE_KEY, data);
  },

  removeBuddy() {
    const data = this.getData();
    data.buddy = null;
    data.isConnected = false;
    storage.set(this.STORAGE_KEY, data);
  },

  generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  shareGoal(goal) {
    const data = this.getData();
    data.sharedGoals.push({ ...goal, sharedAt: new Date().toISOString() });
    storage.set(this.STORAGE_KEY, data);
  },

  buildContext() {
    const data = this.getData();
    if (!data.isConnected) return '';
    let ctx = `\n\n=== ACCOUNTABILITY BUDDY: ${data.buddy?.name || 'Connected'} ===`;
    if (data.sharedGoals.length) ctx += `\nShared goals: ${data.sharedGoals.map(g => g.text).join(', ')}`;
    return ctx;
  }
};

// ============ API HELPER ============
const callClaude = async (apiKey, messages, systemPrompt, useWebSearch = false) => {
  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'mj' ? 'assistant' : 'user',
      content: m.text
    }))
  };

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };

  // Add web search tool when real-time info is needed
  if (useWebSearch) {
    // Web search requires beta header
    headers['anthropic-beta'] = 'web-search-2025-03-05';
    requestBody.tools = [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5
    }];
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Claude API error:', error);
    const errorMsg = error.error?.message || error.message || 'API request failed';
    throw new Error(errorMsg);
  }

  const data = await response.json();
  console.log('Claude response received, stop_reason:', data.stop_reason);

  // Handle response with potential tool use (web search results)
  // Extract the text content from the response
  let responseText = '';

  if (data.content && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
      // Web search results are automatically incorporated by Claude
      // The final text response already includes the searched information
    }
  }

  // Fallback if no text blocks found
  if (!responseText && data.content && data.content.length > 0) {
    // Try to find any text in the response
    const textBlock = data.content.find(b => b.type === 'text');
    if (textBlock) {
      responseText = textBlock.text;
    }
  }

  if (!responseText) {
    console.error('No text response from Claude:', data);
    throw new Error('No response text received');
  }

  return responseText;
};

// ============ SOCIAL MEDIA SYNC COMPONENT ============
function SocialMediaSync({ profile, onUpdate, mcpUrl }) {
  const [syncing, setSyncing] = useState({ twitter: false, instagram: false });
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  const mcpClient = new SocialMCPClient(mcpUrl);

  const syncTwitter = async () => {
    if (!profile.socialHandles?.twitter) return;

    setSyncing(s => ({ ...s, twitter: true }));
    setError('');

    try {
      const [profileData, postsData] = await Promise.all([
        mcpClient.getTwitterProfile(profile.socialHandles.twitter),
        mcpClient.getTwitterPosts(profile.socialHandles.twitter, 30)
      ]);

      // Analyze communication style from tweets
      const posts = postsData.tweets?.map(t => t.text) || [];
      let styleAnalysis = null;
      if (posts.length > 0) {
        styleAnalysis = await mcpClient.analyzeStyle(posts, 'twitter');
      }

      const updatedProfile = {
        ...profile,
        twitterProfile: profileData,
        twitterPosts: postsData.tweets?.slice(0, 10) || []
      };

      onUpdate(updatedProfile, styleAnalysis);
      setLastSync(new Date());
    } catch (e) {
      setError(`Twitter sync failed: ${e.message}`);
    }

    setSyncing(s => ({ ...s, twitter: false }));
  };

  const syncInstagram = async () => {
    if (!profile.socialHandles?.instagram) return;

    setSyncing(s => ({ ...s, instagram: true }));
    setError('');

    try {
      const [profileData, postsData] = await Promise.all([
        mcpClient.getInstagramProfile(profile.socialHandles.instagram),
        mcpClient.getInstagramPosts(profile.socialHandles.instagram, 20)
      ]);

      // Analyze communication style from captions
      const posts = postsData.posts?.map(p => p.caption).filter(Boolean) || [];
      let styleAnalysis = null;
      if (posts.length > 0) {
        styleAnalysis = await mcpClient.analyzeStyle(posts, 'instagram');
      }

      const updatedProfile = {
        ...profile,
        instagramProfile: profileData,
        instagramPosts: postsData.posts?.slice(0, 10) || []
      };

      onUpdate(updatedProfile, styleAnalysis);
      setLastSync(new Date());
    } catch (e) {
      setError(`Instagram sync failed: ${e.message}`);
    }

    setSyncing(s => ({ ...s, instagram: false }));
  };

  const hasTwitter = profile.socialHandles?.twitter;
  const hasInstagram = profile.socialHandles?.instagram;

  if (!hasTwitter && !hasInstagram) return null;

  return (
    <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Link className="w-4 h-4 text-violet-400" />
          Social Media Sync
        </span>
        {lastSync && (
          <span className="text-xs text-slate-500">
            Last: {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {hasTwitter && (
          <button
            onClick={syncTwitter}
            disabled={syncing.twitter}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              syncing.twitter
                ? 'bg-slate-700/50 text-slate-400'
                : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
            }`}
          >
            {syncing.twitter ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Twitter className="w-4 h-4" />
            )}
            {syncing.twitter ? 'Syncing...' : 'Sync Twitter'}
          </button>
        )}

        {hasInstagram && (
          <button
            onClick={syncInstagram}
            disabled={syncing.instagram}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              syncing.instagram
                ? 'bg-slate-700/50 text-slate-400'
                : 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30'
            }`}
          >
            {syncing.instagram ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Instagram className="w-4 h-4" />
            )}
            {syncing.instagram ? 'Syncing...' : 'Sync Instagram'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      {(profile.twitterProfile || profile.instagramProfile) && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <p className="text-xs text-slate-500 mb-2">Connected profiles:</p>
          <div className="space-y-1">
            {profile.twitterProfile && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Twitter className="w-3 h-3 text-sky-400" />
                @{profile.twitterProfile.username} • {profile.twitterProfile.followers_count?.toLocaleString()} followers
              </div>
            )}
            {profile.instagramProfile && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Instagram className="w-3 h-3 text-pink-400" />
                @{profile.instagramProfile.username} • {profile.instagramProfile.media_count?.toLocaleString()} posts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ONBOARDING ============
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [mcpUrl, setMcpUrl] = useState('http://localhost:3000');
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    location: '',
    zipCode: '',
    pronouns: '',
    struggles: [],
    communicationPref: '',
    interests: '',
    interestCategories: [],
    comedyStyle: '',
    favoriteComedian: '',
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

  const interestOptions = [
    { id: 'sports', label: '🏀 Sports', icon: TrendingUp },
    { id: 'gaming', label: '🎮 Gaming', icon: Gamepad2 },
    { id: 'music', label: '🎵 Music', icon: Music },
    { id: 'movies_tv', label: '🎬 Movies/TV', icon: Film },
    { id: 'tech', label: '💻 Tech', icon: Zap },
    { id: 'fitness', label: '💪 Fitness', icon: Heart },
    { id: 'food', label: '🍕 Food', icon: Coffee },
    { id: 'travel', label: '✈️ Travel', icon: MapPin },
    { id: 'books', label: '📚 Books', icon: BookOpen },
    { id: 'pets', label: '🐕 Pets', icon: Heart }
  ];

  const comedyStyles = [
    { id: 'observational', label: 'Witty observations (Seinfeld, Mulaney)' },
    { id: 'dark', label: 'Dark humor (Jeselnik, Sloss)' },
    { id: 'storytelling', label: 'Great storytelling (Birbiglia, Segura)' },
    { id: 'dry', label: 'Deadpan/dry (Steven Wright, Tig Notaro)' },
    { id: 'high_energy', label: 'High energy (Kevin Hart, Chris Rock)' },
    { id: 'absurdist', label: 'Absurd/surreal (Mitch Hedberg)' },
    { id: 'none', label: "I'm not really into comedy" }
  ];

  const commStyles = [
    { id: 'direct', label: 'Direct & to the point' },
    { id: 'gentle', label: 'Gentle & supportive' },
    { id: 'challenging', label: 'Push me a little' },
    { id: 'casual', label: 'Casual like a friend' }
  ];

  const toggleInterest = (id) => {
    setProfile(p => ({
      ...p,
      interestCategories: p.interestCategories.includes(id)
        ? p.interestCategories.filter(i => i !== id)
        : [...p.interestCategories, id]
    }));
  };

  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];

  const testApiKey = async () => {
    setTesting(true);
    setError('');
    try {
      await callClaude(apiKey, [{ role: 'user', text: 'Hello' }], 'Reply with just "Connected"');
      storage.set(STORAGE_KEYS.API_KEY, apiKey);
      storage.set(STORAGE_KEYS.MCP_URL, mcpUrl);
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

    // Save explicit interests
    if (profile.interestCategories.length > 0) {
      InterestSystem.saveExplicitInterests(profile.interestCategories);
      // Initialize interest mentions
      profile.interestCategories.forEach(interest => {
        InterestSystem.trackInterest(interest, 'explicit from onboarding');
      });
    }

    // Save comedy preferences
    if (profile.comedyStyle && profile.comedyStyle !== 'none') {
      InterestSystem.saveComedyPreference({ style: profile.comedyStyle });
    }
    if (profile.favoriteComedian) {
      InterestSystem.saveComedyPreference({ comedian: profile.favoriteComedian });
    }

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
              <p className="text-sm text-slate-300 mb-3">MJ learns how you communicate — from your chats and your social media — and adapts to feel like a friend who actually gets you.</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <span>Mirrors your language style</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span>Optional Twitter/X integration</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span>Optional Instagram integration</span>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">
              Get Started
            </button>
          </div>
        )}

        {/* API Key + MCP */}
        {step === 1 && (
          <div className="space-y-6">
            <button onClick={() => setStep(0)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
            <div>
              <h2 className="text-xl font-medium text-white mb-2">Connect Services</h2>
              <p className="text-slate-400 text-sm">MJ needs API access to work.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Claude API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Social MCP Server URL (optional)</label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <p className="text-xs text-slate-500 mt-1">Leave default if running MCP server locally</p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 text-sm flex items-center gap-1">
              Get Claude API key <ExternalLink className="w-3 h-3" />
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
                <input type="text" value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Age range</label>
                <div className="flex flex-wrap gap-2">
                  {ageRanges.map(age => (
                    <button key={age} onClick={() => setProfile(p => ({ ...p, age }))} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${profile.age === age ? 'bg-sky-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Pronouns (optional)</label>
                <input type="text" value={profile.pronouns} onChange={(e) => setProfile(p => ({ ...p, pronouns: e.target.value }))} placeholder="e.g., she/her, he/him, they/them" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
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
                {profile.location && <p className="text-sm text-emerald-400 mt-1">📍 {profile.location}</p>}
              </div>
            </div>

            <button onClick={() => setStep(3)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">Continue</button>
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
              <p className="text-slate-400 text-sm">Select any that apply.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {struggles.map(s => (
                <button key={s.id} onClick={() => toggleStruggle(s.id)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${profile.struggles.includes(s.id) ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">How do you like to be supported?</label>
              <div className="space-y-2">
                {commStyles.map(style => (
                  <button key={style.id} onClick={() => setProfile(p => ({ ...p, communicationPref: style.id }))} className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${profile.communicationPref === style.id ? 'bg-sky-600/30 border border-sky-500/50' : 'bg-slate-700/30 border border-slate-700/50 hover:border-slate-600'}`}>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(4)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">Continue</button>
          </div>
        )}

        {/* Interests & Fun Stuff */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
              <span className="text-xs text-slate-500">Step 3 of 5</span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-1">What are you into?</h2>
              <p className="text-slate-400 text-sm">So we can chat about stuff you actually care about.</p>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Pick your interests (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      profile.interestCategories.includes(interest.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                <Smile className="w-4 h-4" /> What kind of humor do you like?
              </label>
              <div className="space-y-2">
                {comedyStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setProfile(p => ({ ...p, comedyStyle: style.id }))}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                      profile.comedyStyle === style.id
                        ? 'bg-amber-600/30 border border-amber-500/50'
                        : 'bg-slate-700/30 border border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Favorite comedian? (optional)</label>
              <input
                type="text"
                value={profile.favoriteComedian}
                onChange={(e) => setProfile(p => ({ ...p, favoriteComedian: e.target.value }))}
                placeholder="e.g., John Mulaney, Trevor Noah..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button onClick={() => setStep(5)} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">Continue</button>
          </div>
        )}

        {/* Social Media Integration */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(4)} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
              <span className="text-xs text-slate-500">Step 4 of 5</span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-1">Social Media (Optional)</h2>
              <p className="text-slate-400 text-sm">Helps MJ match your communication style.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                <p className="text-sm text-slate-300">Connect your social accounts</p>
                <p className="text-xs text-slate-500">MJ will analyze your posts to learn your vocabulary, tone, and interests — then mirror that style in conversations.</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Twitter className="w-4 h-4 text-sky-400" />
                    <input
                      type="text"
                      value={profile.socialHandles.twitter}
                      onChange={(e) => setProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, twitter: e.target.value.replace('@', '') } }))}
                      placeholder="Twitter/X username"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <input
                      type="text"
                      value={profile.socialHandles.instagram}
                      onChange={(e) => setProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, instagram: e.target.value.replace('@', '') } }))}
                      placeholder="Instagram username"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Requires the Social MCP Server to be running. Your data is processed locally.
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Anything else you want MJ to know?</label>
                <textarea
                  value={profile.interests}
                  onChange={(e) => setProfile(p => ({ ...p, interests: e.target.value }))}
                  placeholder="e.g., I'm a nurse, I have two kids, I'm into gaming..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(6)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">Skip</button>
              <button onClick={() => setStep(6)} className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">Continue</button>
            </div>
          </div>
        )}

        {/* Ready */}
        {step === 6 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-2">{profile.name ? `Ready, ${profile.name}` : 'Ready'}</h2>
              <p className="text-slate-400 text-sm">MJ will learn and adapt as you chat.</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-slate-300">Learns your vocabulary & tone</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Gets more personalized over time</span>
              </div>
              {(profile.socialHandles.twitter || profile.socialHandles.instagram) && (
                <div className="flex items-center gap-2 text-sm">
                  <Link className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Social media style integration ready</span>
                </div>
              )}
            </div>
            <button onClick={finishOnboarding} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-medium transition-colors">Start Talking with MJ</button>
            <p className="text-xs text-slate-500">Not a substitute for professional help. Crisis? Call 988.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SETTINGS MODAL ============
function SettingsModal({ profile, chatStyle, socialStyle, onClose, onReset, onUpdateProfile }) {
  const [editProfile, setEditProfile] = useState(profile);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [accountabilitySettings, setAccountabilitySettings] = useState(CheckInSystem.getSettings());
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'not_supported'
  );

  const saveProfile = () => {
    storage.set(STORAGE_KEYS.USER_PROFILE, editProfile);
    onUpdateProfile(editProfile);
    onClose();
  };

  const mcpUrl = storage.get(STORAGE_KEYS.MCP_URL) || 'http://localhost:3000';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h2 className="text-lg font-medium">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-6">
          {/* Social Media Sync */}
          <SocialMediaSync
            profile={profile}
            mcpUrl={mcpUrl}
            onUpdate={(updatedProfile, styleAnalysis) => {
              storage.set(STORAGE_KEYS.USER_PROFILE, updatedProfile);
              if (styleAnalysis) {
                storage.set(STORAGE_KEYS.SOCIAL_STYLE, styleAnalysis);
              }
              onUpdateProfile(updatedProfile);
            }}
          />

          {/* Style Analysis */}
          {(chatStyle || socialStyle) && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" /> Communication Profile
              </h3>
              <div className="bg-slate-700/30 rounded-xl p-3 space-y-2 text-sm">
                {chatStyle && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Chat vocabulary</span>
                      <span className="text-slate-200 capitalize">{chatStyle.vocabularyLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Chat tone</span>
                      <span className="text-slate-200 capitalize">{chatStyle.formality}</span>
                    </div>
                  </>
                )}
                {socialStyle && (
                  <>
                    <div className="pt-2 border-t border-slate-600/30">
                      <span className="text-xs text-violet-400">From Social Media:</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vocabulary</span>
                      <span className="text-slate-200 capitalize">{socialStyle.vocabulary_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tone</span>
                      <span className="text-slate-200 capitalize">{socialStyle.tone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vernacular</span>
                      <span className="text-slate-200 capitalize">{socialStyle.vernacular?.replace('_', ' ')}</span>
                    </div>
                    {socialStyle.common_topics?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Topics</span>
                        <span className="text-slate-200">{socialStyle.common_topics.join(', ')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Edit Profile */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Your Profile</h3>
            <div className="space-y-3">
              <input type="text" value={editProfile.name || ''} onChange={(e) => setEditProfile(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="text" value={editProfile.location || ''} onChange={(e) => setEditProfile(p => ({ ...p, location: e.target.value }))} placeholder="Location" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <input type="text" value={editProfile.socialHandles?.twitter || ''} onChange={(e) => setEditProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, twitter: e.target.value } }))} placeholder="Twitter" className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                </div>
                <div className="flex-1 flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <input type="text" value={editProfile.socialHandles?.instagram || ''} onChange={(e) => setEditProfile(p => ({ ...p, socialHandles: { ...p.socialHandles, instagram: e.target.value } }))} placeholder="Instagram" className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                </div>
              </div>
              <button onClick={saveProfile} className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>

          {/* Accountability Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-400" /> Accountability & Check-ins
            </h3>
            <div className="space-y-3">
              {/* Check-ins toggle */}
              <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white">Daily Check-ins</span>
                  <p className="text-xs text-slate-400">Morning, midday, and evening reminders</p>
                </div>
                <input
                  type="checkbox"
                  checked={accountabilitySettings.checkInsEnabled}
                  onChange={(e) => {
                    const updated = { ...accountabilitySettings, checkInsEnabled: e.target.checked };
                    setAccountabilitySettings(updated);
                    CheckInSystem.updateSettings(updated);
                  }}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-violet-500 focus:ring-violet-500"
                />
              </label>

              {/* Browser notifications */}
              <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white">Browser Notifications</span>
                  <p className="text-xs text-slate-400">
                    {notificationStatus === 'granted' ? 'Enabled' :
                     notificationStatus === 'denied' ? 'Blocked in browser settings' :
                     notificationStatus === 'not_supported' ? 'Not supported' : 'Click to enable'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (notificationStatus === 'default') {
                      const result = await CheckInSystem.requestNotificationPermission();
                      setNotificationStatus(result.granted ? 'granted' : 'denied');
                      if (result.granted) {
                        const updated = { ...accountabilitySettings, notificationsEnabled: true };
                        setAccountabilitySettings(updated);
                        CheckInSystem.updateSettings(updated);
                      }
                    }
                  }}
                  disabled={notificationStatus !== 'default'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    notificationStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-400' :
                    notificationStatus === 'denied' ? 'bg-red-500/20 text-red-400' :
                    notificationStatus === 'not_supported' ? 'bg-slate-600 text-slate-400' :
                    'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                  }`}
                >
                  {notificationStatus === 'granted' ? '✓ On' :
                   notificationStatus === 'denied' ? 'Blocked' :
                   notificationStatus === 'not_supported' ? 'N/A' : 'Enable'}
                </button>
              </label>

              {/* Reminder intensity */}
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-white block mb-2">Reminder Style</span>
                <div className="flex gap-2">
                  {['gentle', 'moderate', 'persistent'].map((intensity) => (
                    <button
                      key={intensity}
                      onClick={() => {
                        const updated = { ...accountabilitySettings, reminderIntensity: intensity };
                        setAccountabilitySettings(updated);
                        CheckInSystem.updateSettings(updated);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                        accountabilitySettings.reminderIntensity === intensity
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      {intensity === 'gentle' ? '🌱 Gentle' :
                       intensity === 'moderate' ? '💪 Moderate' : '🔥 Persistent'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Celebrate wins toggle */}
              <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white">Celebrate Wins</span>
                  <p className="text-xs text-slate-400">Get encouragement when completing tasks</p>
                </div>
                <input
                  type="checkbox"
                  checked={accountabilitySettings.celebrateWins}
                  onChange={(e) => {
                    const updated = { ...accountabilitySettings, celebrateWins: e.target.checked };
                    setAccountabilitySettings(updated);
                    CheckInSystem.updateSettings(updated);
                  }}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-violet-500 focus:ring-violet-500"
                />
              </label>

              {/* SMS Reminders */}
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm text-white">Text Message Reminders</span>
                    <p className="text-xs text-slate-400">Get check-ins via SMS (Beta)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accountabilitySettings.smsEnabled}
                    onChange={(e) => {
                      const updated = { ...accountabilitySettings, smsEnabled: e.target.checked };
                      setAccountabilitySettings(updated);
                      CheckInSystem.updateSettings(updated);
                    }}
                    className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-violet-500 focus:ring-violet-500"
                  />
                </div>
                {accountabilitySettings.smsEnabled && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="tel"
                      value={accountabilitySettings.phoneNumber || ''}
                      onChange={(e) => {
                        const updated = { ...accountabilitySettings, phoneNumber: e.target.value };
                        setAccountabilitySettings(updated);
                        CheckInSystem.updateSettings(updated);
                      }}
                      placeholder="Your phone number (+1...)"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <p className="text-xs text-amber-400/80">
                      📱 SMS requires server setup. Contact support for enterprise SMS integration.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Apple Health Integration */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" /> Apple Health
            </h3>
            <div className="space-y-3">
              {/* Health connection status */}
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white">Connect Apple Health</span>
                    <p className="text-xs text-slate-400">Share sleep, activity & mindfulness data with MJ</p>
                  </div>
                  <button
                    onClick={async () => {
                      const result = await AppleHealthKit.requestAuthorization();
                      if (result.authorized) {
                        AppleHealthKit.updateSettings({ enabled: true });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      AppleHealthKit.getSettings().authorized
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    {AppleHealthKit.getSettings().authorized ? '✓ Connected' : 'Connect'}
                  </button>
                </div>
              </div>

              {AppleHealthKit.getSettings().authorized && (
                <>
                  {/* Share with MJ toggle */}
                  <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer">
                    <div>
                      <span className="text-sm text-white">Share Health Insights with MJ</span>
                      <p className="text-xs text-slate-400">Let MJ adjust tone based on your health data</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={AppleHealthKit.getSettings().shareWithMJ}
                      onChange={(e) => {
                        AppleHealthKit.updateSettings({ shareWithMJ: e.target.checked });
                      }}
                      className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-red-500 focus:ring-red-500"
                    />
                  </label>

                  {/* Data types */}
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-xs text-slate-400 block mb-2">Data being tracked:</span>
                    <div className="flex flex-wrap gap-2">
                      {['😴 Sleep', '👟 Steps', '🔥 Calories', '🧘 Mindful', '💪 Workouts'].map(item => (
                        <span key={item} className="px-2 py-1 bg-slate-600/50 rounded text-xs text-slate-300">{item}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                <p className="text-sm text-red-300">Delete everything?</p>
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

// ============ INSIGHTS MODAL ============
function InsightsModal({ onClose }) {
  const patterns = EmotionalLearning.getEmotionalPatterns();
  const strategies = EmotionalLearning.getEffectiveStrategies();
  const breakthroughs = SessionMemory.getBreakthroughs(10);
  const struggles = SessionMemory.getActiveStruggles();
  const sessions = SessionMemory.getRecentSessions(10);

  const formatTime = (hour) => {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  const hasData = patterns || strategies || breakthroughs.length > 0 || struggles.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Your Journey Insights
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {!hasData ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">MJ is still learning about you.</p>
              <p className="text-sm text-slate-500 mt-1">Keep chatting and insights will appear here.</p>
            </div>
          ) : (
            <>
              {/* Emotional Patterns */}
              {patterns && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Moon className="w-4 h-4" /> Your Patterns
                  </h3>
                  <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                    {patterns.vulnerableTimes?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Harder times</p>
                        <p className="text-sm text-slate-300">
                          You tend to struggle around {patterns.vulnerableTimes.map(formatTime).join(', ')}
                        </p>
                      </div>
                    )}
                    {patterns.strongTimes?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Stronger times</p>
                        <p className="text-sm text-emerald-300">
                          You're often more engaged around {patterns.strongTimes.map(formatTime).join(', ')}
                        </p>
                      </div>
                    )}
                    {patterns.commonOverlays?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">What comes up often</p>
                        <div className="flex flex-wrap gap-2">
                          {patterns.commonOverlays.map(o => (
                            <span key={o} className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded text-xs capitalize">
                              {o.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-600/30">
                      Based on {patterns.totalSessions} sessions
                    </p>
                  </div>
                </div>
              )}

              {/* What Works */}
              {strategies && (strategies.mostEffective?.length > 0 || strategies.leastEffective?.length > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" /> What Works for You
                  </h3>
                  <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                    {strategies.mostEffective?.length > 0 && (
                      <div>
                        <p className="text-xs text-emerald-400 mb-2">These approaches help ✓</p>
                        <div className="flex flex-wrap gap-2">
                          {strategies.mostEffective.map(s => (
                            <span key={s} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs capitalize">
                              {s.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {strategies.leastEffective?.length > 0 && (
                      <div className="pt-2 border-t border-slate-600/30">
                        <p className="text-xs text-slate-500 mb-2">Less helpful for you</p>
                        <div className="flex flex-wrap gap-2">
                          {strategies.leastEffective.map(s => (
                            <span key={s} className="px-2 py-1 bg-slate-600/50 text-slate-400 rounded text-xs capitalize">
                              {s.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Breakthroughs */}
              {breakthroughs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Your Breakthroughs
                  </h3>
                  <div className="space-y-2">
                    {breakthroughs.slice(0, 5).map((b, i) => (
                      <div key={b.id || i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-sm text-amber-200">"{b.userMessage}"</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(b.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Struggles */}
              {struggles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" /> What You're Working Through
                  </h3>
                  <div className="space-y-2">
                    {struggles.slice(0, 5).map((s, i) => (
                      <div key={i} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm text-slate-300 capitalize">{s.topic.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-500">{s.mentions} mentions</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session History */}
              {sessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Recent Sessions
                  </h3>
                  <div className="space-y-2">
                    {sessions.slice().reverse().slice(0, 5).map((s, i) => (
                      <div key={s.id || i} className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">
                            {new Date(s.timestamp).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            s.mood === 'driven' ? 'bg-amber-500/20 text-amber-300' :
                            s.mood === 'engaged' ? 'bg-emerald-500/20 text-emerald-300' :
                            s.mood === 'depleted' ? 'bg-slate-500/20 text-slate-400' :
                            'bg-sky-500/20 text-sky-300'
                          }`}>
                            {s.mood}
                          </span>
                        </div>
                        {s.topic && <p className="text-sm text-slate-300">{s.topic}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ TASK MANAGER COMPONENT ============
function TaskManager({ onTaskUpdate, onCheckIn }) {
  const [tasks, setTasks] = useState(DailyActivitySystem.getTodaysTasks());
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newEstimate, setNewEstimate] = useState(30);
  const [showAddTask, setShowAddTask] = useState(false);
  const [stats, setStats] = useState(DailyActivitySystem.getStats());

  // Refresh tasks
  const refreshTasks = useCallback(() => {
    setTasks(DailyActivitySystem.getTodaysTasks());
    setStats(DailyActivitySystem.getStats());
  }, []);

  // Add task
  const handleAddTask = () => {
    if (!newTask.trim()) return;

    const task = DailyActivitySystem.addTask({
      text: newTask.trim(),
      priority: newPriority,
      estimatedMinutes: newEstimate
    });

    setNewTask('');
    setNewPriority('normal');
    setNewEstimate(30);
    setShowAddTask(false);
    refreshTasks();

    if (onTaskUpdate) onTaskUpdate(task, 'added');
  };

  // Complete task
  const handleComplete = (taskId) => {
    const task = DailyActivitySystem.completeTask(taskId);
    refreshTasks();
    if (onTaskUpdate) onTaskUpdate(task, 'completed');
  };

  // Priority colors
  const priorityColors = {
    urgent_important: 'bg-red-500/20 border-red-500 text-red-400',
    important: 'bg-orange-500/20 border-orange-500 text-orange-400',
    urgent: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    normal: 'bg-blue-500/20 border-blue-500 text-blue-400'
  };

  const priorityIcons = {
    urgent_important: '🔥',
    important: '⭐',
    urgent: '⚡',
    normal: '📋'
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-violet-400" />
          <span className="font-medium text-white">Today's Tasks</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-emerald-400">
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            {stats.today.completed}/{stats.today.total}
          </span>
          {stats.completionRate > 0 && (
            <span className="text-violet-400">{stats.completionRate}%</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {stats.today.total > 0 && (
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-violet-500 to-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
        {tasks.length === 0 ? (
          <div className="text-center text-slate-400 py-4">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tasks yet! Add your priorities for today.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                task.completed
                  ? 'bg-slate-700/30 border-slate-600 opacity-60'
                  : priorityColors[task.priority]
              }`}
            >
              <button
                onClick={() => !task.completed && handleComplete(task.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-current hover:bg-white/10'
                }`}
              >
                {task.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {priorityIcons[task.priority]} {task.text}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimatedMinutes}m</span>
                  {task.delayCount > 0 && (
                    <span className="text-amber-400">⏳ Delayed {task.delayCount}x</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add task form */}
      {showAddTask ? (
        <div className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What do you need to do?"
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white text-sm border border-slate-600 focus:border-violet-500 focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="bg-slate-800 rounded-lg px-2 py-1 text-sm border border-slate-600 text-white"
            >
              <option value="urgent_important">🔥 Urgent & Important</option>
              <option value="important">⭐ Important</option>
              <option value="urgent">⚡ Urgent</option>
              <option value="normal">📋 Normal</option>
            </select>
            <select
              value={newEstimate}
              onChange={(e) => setNewEstimate(Number(e.target.value))}
              className="bg-slate-800 rounded-lg px-2 py-1 text-sm border border-slate-600 text-white"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Add Task
            </button>
            <button
              onClick={() => setShowAddTask(false)}
              className="px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full py-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-colors text-sm"
        >
          + Add Task
        </button>
      )}

      {/* Quick actions */}
      {stats.today.total > 0 && stats.today.remaining > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={() => onCheckIn && onCheckIn('progress_check')}
            className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-sm transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Focus Mode - Let's tackle the next task!
          </button>
        </div>
      )}

      {/* Celebration when all done */}
      {stats.today.total > 0 && stats.today.remaining === 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700 text-center">
          <Trophy className="w-8 h-8 mx-auto text-amber-400 mb-2" />
          <p className="text-amber-400 font-medium">All tasks complete! 🎉</p>
          <p className="text-slate-400 text-sm">You crushed it today!</p>
        </div>
      )}
    </div>
  );
}

// ============ HEALTH DATA PANEL COMPONENT ============
function HealthPanel({ healthData, onRefresh }) {
  if (!healthData) return null;

  const metrics = [
    {
      icon: '😴',
      label: 'Sleep',
      value: healthData.sleep?.value || 0,
      unit: 'hrs',
      goal: 8,
      color: 'text-indigo-400'
    },
    {
      icon: '👟',
      label: 'Steps',
      value: healthData.steps?.value || 0,
      unit: '',
      goal: healthData.steps?.goal || 10000,
      color: 'text-emerald-400',
      format: (v) => v.toLocaleString()
    },
    {
      icon: '🔥',
      label: 'Calories',
      value: healthData.activeEnergy?.value || 0,
      unit: '',
      goal: healthData.activeEnergy?.goal || 500,
      color: 'text-orange-400'
    },
    {
      icon: '🧘',
      label: 'Mindful',
      value: healthData.mindfulMinutes?.value || 0,
      unit: 'min',
      goal: healthData.mindfulMinutes?.goal || 10,
      color: 'text-violet-400'
    }
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-white">Today's Health</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1 text-slate-400 hover:text-white rounded"
          title="Refresh from Apple Health"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {metrics.map((metric, i) => {
          const pct = Math.min((metric.value / metric.goal) * 100, 100);
          const displayValue = metric.format ? metric.format(metric.value) : metric.value;

          return (
            <div key={i} className="text-center">
              <div className="text-lg mb-1">{metric.icon}</div>
              <div className={`text-sm font-medium ${metric.color}`}>
                {displayValue}{metric.unit}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                <div
                  className={`h-1 rounded-full ${
                    pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{metric.label}</div>
            </div>
          );
        })}
      </div>

      {healthData.workouts?.count > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700 text-center">
          <span className="text-xs text-emerald-400">💪 {healthData.workouts.count} workout logged today!</span>
        </div>
      )}
    </div>
  );
}

// ============ MOOD CHECK-IN COMPONENT ============
function MoodCheckin({ onClose, onComplete }) {
  const [step, setStep] = useState(0); // 0: mood, 1: energy, 2: feelings, 3: note
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [feelings, setFeelings] = useState([]);
  const [note, setNote] = useState('');

  const moods = Object.entries(MoodTracker.MOODS);
  const energyLevels = Object.entries(MoodTracker.ENERGY_LEVELS);

  const handleComplete = () => {
    const entry = MoodTracker.logMood({ mood, energy, feelings, note });
    onComplete?.(entry);
    onClose();
  };

  const toggleFeeling = (feeling) => {
    setFeelings(prev =>
      prev.includes(feeling) ? prev.filter(f => f !== feeling) : [...prev, feeling].slice(0, 5)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-sm w-full overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-medium">How are you feeling?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 0: Mood */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center">Select your mood</p>
              <div className="flex justify-center gap-3">
                {moods.map(([key, m]) => (
                  <button
                    key={key}
                    onClick={() => { setMood(key); setStep(1); }}
                    className={`p-3 rounded-xl transition-all ${
                      mood === key ? 'bg-violet-500/30 scale-110' : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <p className="text-xs mt-1 text-slate-300">{m.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Energy */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center">How's your energy?</p>
              <div className="flex justify-center gap-4">
                {energyLevels.map(([key, e]) => (
                  <button
                    key={key}
                    onClick={() => { setEnergy(key); setStep(2); }}
                    className={`p-4 rounded-xl transition-all ${
                      energy === key ? 'bg-amber-500/30 scale-105' : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{e.emoji}</span>
                    <p className="text-xs mt-1 text-slate-300">{e.label}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full text-sm text-slate-500 hover:text-slate-300">
                Skip →
              </button>
            </div>
          )}

          {/* Step 2: Feelings */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center">Any feelings to note? (optional)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {MoodTracker.FEELING_TAGS.map(feeling => (
                  <button
                    key={feeling}
                    onClick={() => toggleFeeling(feeling)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      feelings.includes(feeling)
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {feeling}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium"
              >
                {feelings.length > 0 ? 'Continue' : 'Skip'} →
              </button>
            </div>
          )}

          {/* Step 3: Note */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center">Anything else to add?</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick thought or note... (optional)"
                className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm text-white resize-none h-20"
              />
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Save Check-in
              </button>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {[0, 1, 2, 3].map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-violet-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ BREATHING EXERCISE COMPONENT ============
function BreathingExercise({ pattern, onClose, onComplete }) {
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, holdAfter, complete
  const [cycle, setCycle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const p = BreathingExercises.PATTERNS[pattern];
  if (!p) return null;

  const phaseConfig = {
    inhale: { label: 'Breathe In', duration: p.inhale, next: p.hold > 0 ? 'hold' : 'exhale' },
    hold: { label: 'Hold', duration: p.hold, next: 'exhale' },
    exhale: { label: 'Breathe Out', duration: p.exhale, next: p.holdAfter > 0 ? 'holdAfter' : 'inhale' },
    holdAfter: { label: 'Hold', duration: p.holdAfter, next: 'inhale' }
  };

  useEffect(() => {
    if (!isActive || phase === 'ready' || phase === 'complete') return;

    const config = phaseConfig[phase];
    if (!config) return;

    setTimeLeft(config.duration);

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Move to next phase
          if (config.next === 'inhale') {
            const newCycle = cycle + 1;
            if (newCycle >= p.cycles) {
              setPhase('complete');
              setIsActive(false);
              BreathingExercises.logSession(pattern, true);
              BreathingExercises.triggerHaptic('success');
              onComplete?.();
            } else {
              setCycle(newCycle);
              setPhase('inhale');
              BreathingExercises.triggerHaptic('light');
            }
          } else {
            setPhase(config.next);
            BreathingExercises.triggerHaptic('light');
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, phase, cycle]);

  const startExercise = () => {
    setIsActive(true);
    setPhase('inhale');
    setCycle(0);
    BreathingExercises.triggerHaptic('medium');
  };

  const circleSize = phase === 'inhale' ? 'scale-110' : phase === 'exhale' ? 'scale-90' : 'scale-100';

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="max-w-sm w-full text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <span className="text-4xl">{p.icon}</span>
          <h2 className="text-xl font-medium mt-2">{p.name}</h2>
          <p className="text-sm text-slate-400">{p.description}</p>
        </div>

        {/* Breathing circle */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${p.color} opacity-30 transition-transform duration-[${phaseConfig[phase]?.duration || 4}s] ease-in-out ${circleSize}`}
          />
          <div
            className={`absolute inset-4 rounded-full bg-gradient-to-br ${p.color} opacity-50 transition-transform duration-[${phaseConfig[phase]?.duration || 4}s] ease-in-out ${circleSize}`}
          />
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            {phase === 'ready' && (
              <button
                onClick={startExercise}
                className="px-8 py-4 bg-white/20 rounded-full text-lg font-medium hover:bg-white/30 transition-colors"
              >
                Start
              </button>
            )}
            {phase !== 'ready' && phase !== 'complete' && (
              <>
                <p className="text-2xl font-light mb-2">{phaseConfig[phase]?.label}</p>
                <p className="text-5xl font-bold">{timeLeft}</p>
                <p className="text-sm text-slate-400 mt-2">Cycle {cycle + 1} of {p.cycles}</p>
              </>
            )}
            {phase === 'complete' && (
              <>
                <Check className="w-16 h-16 text-emerald-400 mb-2" />
                <p className="text-xl font-medium">Well done!</p>
                <p className="text-sm text-slate-400">{p.cycles} cycles completed</p>
              </>
            )}
          </div>
        </div>

        {phase === 'complete' && (
          <button
            onClick={onClose}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-medium"
          >
            Done
          </button>
        )}

        {isActive && phase !== 'complete' && (
          <button
            onClick={() => { setIsActive(false); setPhase('ready'); onClose(); }}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            End session
          </button>
        )}
      </div>
    </div>
  );
}

// ============ VOICE INPUT BUTTON COMPONENT ============
function VoiceInputButton({ onResult, onError, onListeningChange, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const updateListening = (value) => {
    setIsListening(value);
    onListeningChange?.(value);
  };

  const startListening = () => {
    if (!VoiceSystem.isAvailable()) {
      onError?.('Voice input is not supported in this browser');
      return;
    }

    const recognition = VoiceSystem.createRecognition();
    if (!recognition) {
      onError?.('Could not start voice recognition');
      return;
    }

    recognitionRef.current = recognition;
    updateListening(true);
    setTranscript('');

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;

      setTranscript(text);

      if (result.isFinal) {
        onResult?.(text);
        updateListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      onError?.(event.error);
      updateListening(false);
    };

    recognition.onend = () => {
      updateListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    updateListening(false);
  };

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`p-3 rounded-xl transition-all ${
        isListening
          ? 'bg-rose-500 text-white animate-pulse'
          : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}

// ============ CRISIS SUPPORT MODAL ============
function CrisisModal({ onClose, level = 'distress' }) {
  const [activeTab, setActiveTab] = useState(level === 'critical' ? 'resources' : 'grounding');
  const [groundingExercise, setGroundingExercise] = useState(null);
  const [groundingStep, setGroundingStep] = useState(0);

  const resources = CrisisSupport.RESOURCES.us;
  const exercises = CrisisSupport.GROUNDING_EXERCISES;

  const startGrounding = (exerciseId) => {
    setGroundingExercise(exercises[exerciseId]);
    setGroundingStep(0);
  };

  const nextGroundingStep = () => {
    if (groundingStep < groundingExercise.steps.length - 1) {
      setGroundingStep(s => s + 1);
      BreathingExercises.triggerHaptic('light');
    } else {
      CrisisSupport.logGrounding(groundingExercise.id, true);
      setGroundingExercise(null);
      setGroundingStep(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-violet-600/20 to-blue-600/20">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-medium">You're Not Alone</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('grounding')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'grounding' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400'
            }`}
          >
            🧘 Grounding
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'breathing' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400'
            }`}
          >
            🌊 Breathing
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'resources' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400'
            }`}
          >
            📞 Help Lines
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Grounding Tab */}
          {activeTab === 'grounding' && !groundingExercise && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">
                These exercises help bring you back to the present moment.
              </p>
              {Object.values(exercises).map(ex => (
                <button
                  key={ex.id}
                  onClick={() => startGrounding(ex.id)}
                  className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ex.icon}</span>
                    <div>
                      <p className="font-medium text-white">{ex.name}</p>
                      <p className="text-sm text-slate-400">{ex.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Active Grounding Exercise */}
          {activeTab === 'grounding' && groundingExercise && (
            <div className="text-center py-6">
              <span className="text-5xl mb-4 block">{groundingExercise.icon}</span>
              <h3 className="text-lg font-medium mb-6">{groundingExercise.name}</h3>

              <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
                <p className="text-lg text-white">
                  {groundingExercise.steps[groundingStep].prompt}
                </p>
                {groundingExercise.steps[groundingStep].icon && (
                  <span className="text-4xl mt-4 block">{groundingExercise.steps[groundingStep].icon}</span>
                )}
              </div>

              <div className="flex justify-center gap-2 mb-4">
                {groundingExercise.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= groundingStep ? 'bg-violet-500' : 'bg-slate-600'}`}
                  />
                ))}
              </div>

              <button
                onClick={nextGroundingStep}
                className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-full font-medium"
              >
                {groundingStep < groundingExercise.steps.length - 1 ? 'Next →' : 'Done ✓'}
              </button>

              <button
                onClick={() => setGroundingExercise(null)}
                className="block mx-auto mt-4 text-sm text-slate-500 hover:text-slate-300"
              >
                Exit exercise
              </button>
            </div>
          )}

          {/* Breathing Tab */}
          {activeTab === 'breathing' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">
                Slow breathing activates your body's calm response.
              </p>
              {Object.values(BreathingExercises.PATTERNS).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => {/* Would open BreathingExercise */}}
                  className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-sm text-slate-400">{p.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              {level === 'critical' && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-center mb-4">
                  <p className="text-red-400 font-medium">If you're in immediate danger, please call 911</p>
                </div>
              )}

              <p className="text-sm text-slate-400 mb-4">
                Free, confidential support is available 24/7.
              </p>

              {Object.values(resources).map((resource, i) => (
                <div key={i} className="p-4 bg-slate-700/50 rounded-xl">
                  <p className="font-medium text-white mb-2">{resource.name}</p>
                  <div className="flex gap-2">
                    {resource.number && (
                      <a
                        href={`tel:${resource.number.replace(/[^0-9]/g, '')}`}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" /> Call {resource.number}
                      </a>
                    )}
                    {resource.text && (
                      <a
                        href={`sms:${resource.text.match(/\d+/)?.[0] || ''}`}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-center text-sm font-medium"
                      >
                        📱 {resource.text.includes('HOME') ? 'Text HOME' : 'Text'}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                  You matter. Reaching out is a sign of strength.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MOOD STATS MINI COMPONENT ============
function MoodStatsMini() {
  const stats = MoodTracker.getStats(7);
  const todayMoods = MoodTracker.getTodayMoods();

  if (!stats && todayMoods.length === 0) return null;

  const trendIcon = stats?.trend === 'improving' ? '📈' : stats?.trend === 'declining' ? '📉' : '➡️';

  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">Mood</span>
        </div>
        {stats && <span className="text-xs text-slate-400">{trendIcon} {stats.trend}</span>}
      </div>

      {/* Today's mood */}
      {todayMoods.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-400">Today:</span>
          {todayMoods.slice(-3).map((m, i) => (
            <span key={i} className="text-lg">{MoodTracker.MOODS[m.mood]?.emoji}</span>
          ))}
        </div>
      )}

      {/* 7-day average */}
      {stats && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">7-day avg:</span>
          <div className="flex items-center gap-1">
            <div className="w-20 bg-slate-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                style={{ width: `${(stats.averageMood / 5) * 100}%` }}
              />
            </div>
            <span className="text-slate-300">{stats.averageMood}/5</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SYNC STATUS INDICATOR ============
function SyncStatusIndicator() {
  const [status, setStatus] = useState(OfflineManager.getStatus());
  const [queueSize, setQueueSize] = useState(OfflineManager.getQueueSize());

  useEffect(() => {
    const handleStatusChange = (e) => {
      setStatus(e.detail.status);
      setQueueSize(OfflineManager.getQueueSize());
    };

    window.addEventListener('sync-status-change', handleStatusChange);
    return () => window.removeEventListener('sync-status-change', handleStatusChange);
  }, []);

  if (status === 'online' && queueSize === 0) return null;

  const statusConfig = {
    online: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '✓', label: 'Synced' },
    offline: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: '⚡', label: 'Offline' },
    syncing: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '↻', label: 'Syncing...' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '!', label: 'Sync Error' }
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
      <span className={status === 'syncing' ? 'animate-spin' : ''}>{config.icon}</span>
      <span>{config.label}</span>
      {queueSize > 0 && <span className="text-slate-400">({queueSize})</span>}
    </div>
  );
}

// ============ CHECK-IN BANNER COMPONENT ============
function CheckInBanner({ checkIn, onRespond, onDismiss }) {
  if (!checkIn) return null;

  const bgColors = {
    morning_kickoff: 'from-amber-600/30 to-orange-600/30 border-amber-500/50',
    progress_check: 'from-blue-600/30 to-cyan-600/30 border-blue-500/50',
    wrap_up: 'from-violet-600/30 to-purple-600/30 border-violet-500/50'
  };

  const icons = {
    morning_kickoff: <Sun className="w-5 h-5 text-amber-400" />,
    progress_check: <Clock className="w-5 h-5 text-blue-400" />,
    wrap_up: <Moon className="w-5 h-5 text-violet-400" />
  };

  return (
    <div className={`bg-gradient-to-r ${bgColors[checkIn.type]} border rounded-xl p-4 mb-4 animate-pulse`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/10 rounded-lg">
          {icons[checkIn.type] || <BellRing className="w-5 h-5 text-violet-400" />}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{checkIn.message}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onRespond(checkIn.type)}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
            >
              Let's Go!
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 bg-slate-600/50 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ PROGRESS DASHBOARD COMPONENT ============
function ProgressDashboard({ onClose }) {
  const [progress] = useState(ProgressSystem.getProgress());
  const [stats] = useState(ProgressSystem.getStats());
  const achievements = Object.values(ProgressSystem.ACHIEVEMENTS);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Your Progress
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Streak Card */}
          <div className="bg-gradient-to-r from-orange-600/30 to-amber-600/30 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-300 mb-1">Current Streak</p>
                <p className="text-4xl font-bold text-white">{stats.currentStreak} <span className="text-lg text-orange-400">days</span></p>
              </div>
              <div className="text-6xl">🔥</div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>Best: {stats.longestStreak} days</span>
              <span>•</span>
              <span>{stats.daysOnJourney} days on journey</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{stats.totalSessions}</p>
              <p className="text-xs text-slate-400">Sessions</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-violet-400">{stats.totalMessages}</p>
              <p className="text-xs text-slate-400">Messages</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.achievementCount}</p>
              <p className="text-xs text-slate-400">Achievements</p>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Achievements</h3>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map(a => {
                const earned = progress.achievements?.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl text-center transition-all ${earned ? 'bg-amber-600/20 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-600/30 opacity-40'}`}
                    title={a.description}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-xs text-slate-300 mt-1 truncate">{a.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Wins */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Recent Celebrations</h3>
            <div className="space-y-2">
              {CelebrationSystem.getWeeklyWins().slice(-5).map((win, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{win.message}</span>
                  <span className="text-xs text-slate-500">{new Date(win.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
              {CelebrationSystem.getWeeklyWins().length === 0 && (
                <p className="text-sm text-slate-500">Keep going - wins are coming!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ DAILY AFFIRMATION BANNER ============
function AffirmationBanner({ onDismiss }) {
  const [affirmation, setAffirmation] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const daily = AffirmationSystem.getDailyAffirmation();
    setAffirmation(daily);
    const favs = AffirmationSystem.getFavorites();
    setIsFavorite(favs.some(f => f.text === daily?.affirmation));
  }, []);

  const toggleFavorite = () => {
    if (isFavorite) {
      AffirmationSystem.removeFavorite(affirmation.affirmation);
    } else {
      AffirmationSystem.saveFavorite(affirmation.affirmation, affirmation.category);
    }
    setIsFavorite(!isFavorite);
  };

  if (!affirmation) return null;

  return (
    <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs text-violet-400 mb-1">✨ Daily Affirmation</p>
          <p className="text-white font-medium italic">"{affirmation.affirmation}"</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-pink-400' : 'text-slate-500 hover:text-pink-400'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={onDismiss} className="p-2 text-slate-500 hover:text-slate-300 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ QUICK BOOSTER MODAL ============
function QuickBoosterModal({ booster, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => {
        const next = prev + 1;
        // Find current step
        const stepIdx = booster.steps.findIndex((s, i) =>
          next >= (booster.steps[i - 1]?.time || 0) && next < s.time
        );
        if (stepIdx >= 0) setCurrentStep(stepIdx);

        if (next >= booster.duration) {
          clearInterval(timer);
          QuickBoosters.logBooster(booster.id, true);
          onComplete?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booster, onComplete]);

  const currentInstruction = booster.steps[currentStep]?.instruction || booster.steps[booster.steps.length - 1]?.instruction;
  const progress = (timeElapsed / booster.duration) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden">
        <div className="p-6 text-center">
          <span className="text-5xl mb-4 block">{booster.icon}</span>
          <h3 className="text-xl font-bold text-white mb-2">{booster.name}</h3>
          <p className="text-lg text-slate-300 mb-6 min-h-[60px]">{currentInstruction}</p>

          <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-slate-500">{booster.duration - timeElapsed}s remaining</p>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-white transition-colors"
          >
            End Early
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ QUICK BOOSTERS MENU ============
function QuickBoostersMenu({ onSelect, onClose }) {
  const boosters = QuickBoosters.getAll();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Mood Boosters
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {boosters.map(booster => (
            <button
              key={booster.id}
              onClick={() => onSelect(booster)}
              className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-left transition-all flex items-center gap-4"
            >
              <span className="text-3xl">{booster.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-white">{booster.name}</p>
                <p className="text-sm text-slate-400">{booster.description}</p>
              </div>
              <div className="text-xs text-slate-500">{booster.duration}s</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ COPING TOOLKIT MODAL ============
function CopingToolkitModal({ onClose }) {
  const [strategies, setStrategies] = useState([...CopingToolkit.DEFAULT_STRATEGIES, ...CopingToolkit.getToolkit().strategies]);
  const [showAdd, setShowAdd] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '', category: 'grounding', forSituations: [] });
  const favorites = CopingToolkit.getToolkit().favorites;

  const categories = ['grounding', 'physical', 'connection', 'expression', 'mood'];

  const addStrategy = () => {
    if (newStrategy.name && newStrategy.description) {
      const added = CopingToolkit.addStrategy(newStrategy);
      setStrategies([...strategies, added]);
      setShowAdd(false);
      setNewStrategy({ name: '', description: '', category: 'grounding', forSituations: [] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            My Coping Toolkit
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[65vh] space-y-2">
          {strategies.map((strategy, i) => (
            <div
              key={strategy.id || i}
              className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{strategy.name}</p>
                  <p className="text-sm text-slate-400">{strategy.description}</p>
                  <p className="text-xs text-slate-500 mt-1">For: {strategy.forSituations?.join(', ')}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-600/50 rounded text-slate-400">{strategy.category}</span>
              </div>
            </div>
          ))}

          {showAdd ? (
            <div className="p-3 bg-slate-700/30 rounded-xl border border-emerald-500/30 space-y-3">
              <input
                type="text"
                placeholder="Strategy name"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <select
                value={newStrategy.category}
                onChange={(e) => setNewStrategy({ ...newStrategy, category: e.target.value })}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addStrategy} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm">Add</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full p-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-500 hover:text-slate-400 hover:border-slate-500 transition-all"
            >
              + Add your own strategy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ JOURNAL MODAL ============
function JournalModal({ onClose }) {
  const [prompt, setPrompt] = useState(GuidedJournaling.getPrompt());
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState(GuidedJournaling.getRecentEntries(5));

  const saveEntry = () => {
    if (text.trim()) {
      GuidedJournaling.saveEntry({
        category: prompt.category,
        prompt: prompt.prompt,
        text: text.trim()
      });
      setSaved(true);
      setEntries(GuidedJournaling.getRecentEntries(5));
      setTimeout(() => {
        setText('');
        setSaved(false);
        setPrompt(GuidedJournaling.getPrompt());
      }, 2000);
    }
  };

  const newPrompt = () => {
    setPrompt(GuidedJournaling.getPrompt());
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            Guided Journal
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Prompt */}
          <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-4">
            <p className="text-xs text-violet-400 mb-2">{prompt.category} prompt</p>
            <p className="text-white font-medium">{prompt.prompt}</p>
            <button onClick={newPrompt} className="mt-2 text-xs text-violet-400 hover:text-violet-300">
              ↻ Different prompt
            </button>
          </div>

          {/* Writing area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write freely... no one else will see this"
            className="w-full h-40 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500"
          />

          <div className="flex gap-2">
            <button
              onClick={saveEntry}
              disabled={!text.trim()}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
            >
              {saved ? '✓ Saved!' : 'Save Entry'}
            </button>
          </div>

          {/* Recent entries */}
          {entries.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Recent entries</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {entries.map(entry => (
                  <div key={entry.id} className="text-xs text-slate-400 p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-500">{new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>{entry.text?.slice(0, 50)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ SESSION SUMMARY MODAL ============
function SessionSummaryModal({ summary, onClose }) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Session Recap
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{summary.duration}</p>
              <p className="text-xs text-slate-400">minutes</p>
            </div>
            <div className="flex-1 bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-violet-400">{summary.messageCount}</p>
              <p className="text-xs text-slate-400">messages</p>
            </div>
          </div>

          {/* Themes */}
          {summary.themes.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">We talked about:</p>
              <div className="flex flex-wrap gap-2">
                {summary.themes.map(theme => (
                  <span key={theme} className="px-3 py-1 bg-violet-600/30 border border-violet-500/30 rounded-full text-xs text-violet-300">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaway */}
          {summary.keyTakeaway && (
            <div className="bg-amber-600/20 border border-amber-500/30 rounded-xl p-4">
              <p className="text-xs text-amber-400 mb-1">💡 Key Insight</p>
              <p className="text-white text-sm">{summary.keyTakeaway}</p>
            </div>
          )}

          <p className="text-sm text-slate-500 text-center">Great job showing up today! 🌟</p>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ CELEBRATION OVERLAY ============
function CelebrationOverlay({ celebration, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!celebration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-slate-800/90 backdrop-blur border border-amber-500/30 rounded-2xl p-6 text-center animate-bounce">
        <p className="text-4xl mb-2">{celebration.message}</p>
        {celebration.detail && <p className="text-slate-400 text-sm">{celebration.detail}</p>}
      </div>
      {celebration.confetti && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MORNING RITUAL MODAL ============
function MorningRitualModal({ onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useState('');
  const [mood, setMood] = useState(3);
  const prompt = MorningRitual.getPrompt();

  const complete = () => {
    if (intention.trim()) {
      MorningRitual.setIntention(intention.trim(), mood);
      onComplete?.({ intention: intention.trim(), mood });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-amber-900/40 to-slate-800 rounded-2xl w-full max-w-md border border-amber-500/30 overflow-hidden">
        <div className="p-6 text-center">
          <span className="text-5xl mb-4 block">🌅</span>
          <h2 className="text-xl font-bold text-white mb-2">Morning Intention</h2>
          <p className="text-amber-300/80 text-sm mb-4">Streak: {MorningRitual.getData().streak} days 🔥</p>

          {step === 0 ? (
            <>
              <p className="text-slate-300 mb-4">{prompt}</p>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Today, I want to..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none mb-4"
                rows={3}
              />
              <button onClick={() => setStep(1)} disabled={!intention.trim()} className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl text-white font-medium">
                Next
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-300 mb-4">How are you feeling this morning?</p>
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map(m => (
                  <button key={m} onClick={() => setMood(m)} className={`text-3xl p-2 rounded-xl transition-all ${mood === m ? 'bg-amber-600/50 scale-110' : 'hover:bg-slate-700'}`}>
                    {['😢', '😔', '😐', '😊', '😄'][m - 1]}
                  </button>
                ))}
              </div>
              <button onClick={complete} className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium">
                Set My Intention ✨
              </button>
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-700">
          <button onClick={onClose} className="w-full text-slate-400 hover:text-white">Maybe later</button>
        </div>
      </div>
    </div>
  );
}

// ============ EVENING WIND-DOWN MODAL ============
function WindDownModal({ onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const steps = EveningWindDown.STEPS;

  const handleNext = (value) => {
    setResponses(prev => ({ ...prev, [steps[step].id]: value }));
    if (step < steps.length - 1) setStep(step + 1);
    else {
      EveningWindDown.complete({ ...responses, [steps[step].id]: value });
      onComplete?.(responses);
      onClose();
    }
  };

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-indigo-900/40 to-slate-800 rounded-2xl w-full max-w-md border border-indigo-500/30 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            {steps.map((s, i) => (
              <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${i <= step ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                {s.icon}
              </div>
            ))}
          </div>

          <h3 className="text-xl font-bold text-white text-center mb-2">{currentStep.title}</h3>
          <p className="text-indigo-300 text-center mb-4">{currentStep.prompt}</p>

          <textarea
            placeholder="Write here..."
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none mb-4"
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && e.target.value.trim()) { e.preventDefault(); handleNext(e.target.value.trim()); e.target.value = ''; }}}
          />

          <p className="text-xs text-slate-500 text-center">Press Enter to continue</p>
        </div>
        <div className="p-4 border-t border-slate-700">
          <button onClick={onClose} className="w-full text-slate-400 hover:text-white">Skip for tonight</button>
        </div>
      </div>
    </div>
  );
}

// ============ SMART REPLIES COMPONENT ============
function SmartRepliesBar({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect(s.text)} className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-full text-sm text-slate-300 whitespace-nowrap transition-all">
          {s.text}
        </button>
      ))}
    </div>
  );
}

// ============ QUICK ACTIONS BAR ============
function QuickActionsBar({ actions, onAction }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex gap-2 p-3 border-b border-slate-700/30 overflow-x-auto">
      {actions.map(action => (
        <button key={action.id} onClick={() => onAction(action.action)} className="px-3 py-2 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl text-sm text-violet-300 whitespace-nowrap hover:from-violet-600/30 hover:to-purple-600/30 transition-all">
          {action.label}
        </button>
      ))}
    </div>
  );
}

// ============ WEEKLY STORY MODAL ============
function WeeklyStoryModal({ onClose }) {
  const [story] = useState(() => GrowthStory.shouldShow() ? GrowthStory.generate() : GrowthStory.getLatest());

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-violet-900/40 to-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-violet-500/30">
        <div className="p-4 border-b border-slate-700 text-center">
          <span className="text-4xl">📖</span>
          <h2 className="text-xl font-bold text-white mt-2">Your Week</h2>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {story.sections.map((section, i) => (
            <div key={i} className="p-4 bg-slate-700/30 rounded-xl">
              <h3 className="text-sm font-medium text-violet-400 mb-2">{section.title}</h3>
              <p className="text-white">{section.content}</p>
              {section.items && (
                <ul className="mt-2 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-slate-400">• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700">
          <button onClick={onClose} className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium">
            Keep Going 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ CONTENT FEED COMPONENT ============
function ContentFeedCard({ item, onSave }) {
  return (
    <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
      {item.type === 'quote' && (
        <>
          <p className="text-white italic">"{item.content.text}"</p>
          {item.content.author && <p className="text-sm text-slate-400 mt-2">— {item.content.author}</p>}
        </>
      )}
      {item.type === 'challenge' && (
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs text-amber-400 mb-1">Daily Challenge</p>
            <p className="text-white">{item.content.text}</p>
          </div>
        </div>
      )}
      {item.type === 'affirmation' && (
        <div className="text-center">
          <span className="text-2xl">✨</span>
          <p className="text-white mt-2 italic">"{item.content.text}"</p>
        </div>
      )}
    </div>
  );
}

// ============ VOICE MODE BUTTON ============
function VoiceModeButton({ active, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`p-3 rounded-xl transition-all ${active ? 'bg-violet-500 text-white animate-pulse' : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'} ${disabled ? 'opacity-50' : ''}`}
      title={active ? 'Voice mode active' : 'Enable voice mode'}
    >
      <Volume2 className="w-5 h-5" />
    </button>
  );
}

// ============ MAIN APP ============
function MainApp({ profile, onReset, onUpdateProfile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false); // For real-time search indicator
  const [energy, setEnergy] = useState('stable');
  const [emotionalOverlay, setEmotionalOverlay] = useState(null);
  const [showScripts, setShowScripts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [showHealth, setShowHealth] = useState(false);
  const [todayHabits, setTodayHabits] = useState({});
  // Mood & Mental Health Features
  const [showMoodCheckin, setShowMoodCheckin] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [activeBreathingPattern, setActiveBreathingPattern] = useState('calm');
  const [showCrisis, setShowCrisis] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // User Satisfaction Features
  const [showProgress, setShowProgress] = useState(false);
  const [showBoosters, setShowBoosters] = useState(false);
  const [activeBooster, setActiveBooster] = useState(null);
  const [showToolkit, setShowToolkit] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [showAffirmation, setShowAffirmation] = useState(true);
  // High-ROI Features
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  const [showWindDown, setShowWindDown] = useState(false);
  const [showWeeklyStory, setShowWeeklyStory] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [copiedScript, setCopiedScript] = useState(null);
  const [error, setError] = useState('');
  const [chatStyle, setChatStyle] = useState(storage.get(STORAGE_KEYS.STYLE_ANALYSIS));
  const [socialStyle, setSocialStyle] = useState(storage.get(STORAGE_KEYS.SOCIAL_STYLE));
  const [lastMjResponse, setLastMjResponse] = useState('');
  const [sessionStartTime] = useState(Date.now());
  const messagesEndRef = useRef(null);
  const apiKey = storage.get(STORAGE_KEYS.API_KEY);
  const locationData = storage.get(STORAGE_KEYS.LOCATION_DATA);

  // Emotional Learning context
  const getEmotionalLearningContext = useCallback(() => {
    return {
      effectiveStrategies: EmotionalLearning.getEffectiveStrategies(),
      patterns: EmotionalLearning.getEmotionalPatterns()
    };
  }, []);

  // Session Memory context
  const getSessionMemoryContext = useCallback(() => {
    return {
      activeStruggles: SessionMemory.getActiveStruggles(),
      recentBreakthroughs: SessionMemory.getBreakthroughs(5),
      recentSessions: SessionMemory.getRecentSessions(3)
    };
  }, []);

  const getTodayKey = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    const habitsLog = storage.get(STORAGE_KEYS.HABITS_LOG) || {};
    setTodayHabits(habitsLog[getTodayKey()] || {});
    setSocialStyle(storage.get(STORAGE_KEYS.SOCIAL_STYLE));
  }, []);

  // Initialize session and check for streak milestones
  useEffect(() => {
    const progress = ProgressSystem.recordSession();

    // Check for streak celebration
    if (progress.currentStreak > 0 && progress.currentStreak % 7 === 0) {
      const streakCelebration = CelebrationSystem.celebrate('streak', `${progress.currentStreak}-day streak! 🔥`);
      setTimeout(() => setCelebration(streakCelebration), 1500);
    }

    // Analyze notification patterns
    const moodLog = MoodTracker.getTodayMoods();
    SmartNotifications.analyzePatterns(moodLog, []);

    // Initialize quick actions
    const actions = QuickActions.getActions({ mood: moodLog[0]?.mood });
    setQuickActions(actions);

    // Check for morning ritual prompt
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11 && !MorningRitual.hasCompletedToday()) {
      setTimeout(() => setShowMorningRitual(true), 2000);
    }

    // Check for evening wind-down prompt
    if (hour >= 20 && !EveningWindDown.hasCompletedToday()) {
      setTimeout(() => setShowWindDown(true), 2000);
    }

    // Check for weekly story
    if (GrowthStory.shouldShow()) {
      setTimeout(() => setShowWeeklyStory(true), 3000);
    }
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

  // Check-in system - check every minute for due check-ins
  useEffect(() => {
    const checkForCheckIns = () => {
      const settings = CheckInSystem.getSettings();
      if (!settings.checkInsEnabled) return;

      const checkInStatus = CheckInSystem.isDueForCheckIn();
      if (checkInStatus.due && !pendingCheckIn) {
        const message = CheckInSystem.getMessage(checkInStatus.type);
        setPendingCheckIn({ type: checkInStatus.type, message, name: checkInStatus.name });

        // Send notification if enabled
        if (settings.notificationsEnabled && Notification.permission === 'granted') {
          CheckInSystem.sendNotification('MJ Check-in', message, {
            onClick: () => window.focus()
          });
        }
      }
    };

    // Check immediately and then every minute
    checkForCheckIns();
    const interval = setInterval(checkForCheckIns, 60000);
    return () => clearInterval(interval);
  }, [pendingCheckIn]);

  // Request notification permission on mount if settings indicate it should be enabled
  useEffect(() => {
    const settings = CheckInSystem.getSettings();
    if (settings.notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  // Load health data on mount
  useEffect(() => {
    const loadHealthData = async () => {
      const settings = AppleHealthKit.getSettings();
      if (settings.authorized && settings.enabled) {
        const data = await AppleHealthKit.fetchTodayData();
        setHealthData(data);
        setShowHealth(true);
      }
    };
    loadHealthData();

    // Refresh health data every 30 minutes
    const interval = setInterval(loadHealthData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Refresh health data
  const refreshHealthData = useCallback(async () => {
    const data = await AppleHealthKit.fetchTodayData();
    setHealthData(data);
    // Also refresh widget data
    WidgetManager.getWidgetData();
  }, []);

  // Handle check-in response
  const handleCheckInResponse = useCallback((checkInType) => {
    CheckInSystem.logCheckIn(checkInType);
    setPendingCheckIn(null);

    // Generate a contextual message based on check-in type
    const tasks = DailyActivitySystem.getTodaysTasks();
    const stats = DailyActivitySystem.getStats();
    let contextMessage = '';

    if (checkInType === 'morning_kickoff') {
      contextMessage = "Good morning! I'm ready to set my priorities for today.";
    } else if (checkInType === 'progress_check') {
      if (stats.today.completed > 0) {
        contextMessage = `Checking in! I've completed ${stats.today.completed} task${stats.today.completed > 1 ? 's' : ''} so far.`;
      } else {
        contextMessage = "Checking in on my progress today...";
      }
    } else if (checkInType === 'wrap_up') {
      contextMessage = "End of day reflection - let me share how today went.";
    }

    if (contextMessage) {
      setInput(contextMessage);
    }
  }, []);

  // Handle check-in dismiss
  const handleCheckInDismiss = useCallback(() => {
    // Log that they dismissed but don't mark as completed
    setPendingCheckIn(null);
  }, []);

  // Handle task updates
  const handleTaskUpdate = useCallback((task, action) => {
    if (action === 'completed') {
      // Optionally add a celebration message
      const celebrations = [
        "Nice work! ✓",
        "Task crushed! 💪",
        "One down! Keep going!",
        "Progress! 🎯"
      ];
      // Could trigger a small toast notification here
    }
  }, []);

  // Voice input handlers
  const handleVoiceInput = useCallback((transcript) => {
    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    setIsListening(false);
  }, []);

  const handleVoiceError = useCallback((error) => {
    console.error('Voice input error:', error);
    setIsListening(false);
    setError('Voice input unavailable. Try typing instead.');
    setTimeout(() => setError(''), 3000);
  }, []);

  // Mood check-in handler
  const handleMoodComplete = useCallback((entry) => {
    setShowMoodCheckin(false);
    // Optionally send a message to MJ about the mood
    const moodNames = { 1: 'struggling', 2: 'low', 3: 'okay', 4: 'good', 5: 'great' };
    const moodMessage = `I just checked in - feeling ${moodNames[entry.mood] || 'okay'} (${entry.mood}/5)${entry.factors?.length ? '. Factors: ' + entry.factors.join(', ') : ''}`;
    setInput(moodMessage);
  }, []);

  // Breathing exercise completion
  const handleBreathingComplete = useCallback((pattern, duration) => {
    setShowBreathing(false);
    // Log the session
    BreathingExercises.logSession(pattern, duration, true);
    // Optionally notify MJ
    setMessages(prev => [...prev, {
      role: 'mj',
      text: `Nice breathing session! 🌬️ You completed ${duration} seconds of the ${pattern} breathing pattern. How are you feeling now?`
    }]);
  }, []);

  // Start breathing exercise
  const startBreathing = useCallback((pattern = 'calm') => {
    setActiveBreathingPattern(pattern);
    setShowBreathing(true);
  }, []);

  // Quick action handler
  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'morning_ritual': setShowMorningRitual(true); break;
      case 'mood_checkin': setShowMoodCheckin(true); break;
      case 'tasks': setShowTasks(true); break;
      case 'boosters': setShowBoosters(true); break;
      case 'journal': setShowJournal(true); break;
      case 'winddown': setShowWindDown(true); break;
      case 'sleep_breathing': startBreathing('sleep'); break;
      default: break;
    }
  }, [startBreathing]);

  // Smart reply handler
  const handleSmartReply = useCallback((text) => {
    setInput(text);
    setSmartReplies([]); // Clear suggestions after selection
  }, []);

  const updateChatStyle = useCallback((allMessages) => {
    const analysis = analyzeStyleLocal(allMessages);
    if (analysis && analysis.sampleSize >= 3) {
      setChatStyle(analysis);
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

  const detectOverlay = (text) => {
    const lower = text.toLowerCase();
    // Priority order: Crisis > Shame > Anger > Cynicism > Social Anxiety > Avoidance
    if (/kill myself|suicide|end it|don't want to live|hurt myself|self.?harm/i.test(lower)) return 'crisis';
    if (/ashamed|embarrassed|pathetic|disgusted with myself|can't show|humiliated|worthless/i.test(lower)) return 'shame';
    if (/furious|pissed|hate|angry|rage|want to scream|so mad/i.test(lower)) return 'anger';
    if (/what's the point|nothing matters|doesn't work|waste of time|never changes|bullshit/i.test(lower)) return 'cynicism';
    if (/awkward|people judge|scared to talk|social|nervous around|what if they|embarrass myself/i.test(lower)) return 'social_anxiety';
    if (/keep putting off|avoiding|don't want to face|can't deal|hiding from/i.test(lower)) return 'avoidance';
    return null;
  };

  // Detect what intervention type MJ used
  const detectInterventionType = (mjResponse) => {
    const lower = mjResponse.toLowerCase();
    if (/tiny|small|micro|just one|minute/i.test(lower)) return 'micro_steps';
    if (/valid|makes sense|understandable|of course you/i.test(lower)) return 'validation';
    if (/what's in your control|focus on what you can/i.test(lower)) return 'reframing';
    if (/try|experiment|test|just see|what if/i.test(lower)) return 'invitation_to_experiment';
    if (/proud|strength|courage|showed up/i.test(lower)) return 'identity_reinforcement';
    if (/moment isn't|doesn't define|one instance/i.test(lower)) return 'shame_protection';
    if (/breathe|pause|slow down|take a moment/i.test(lower)) return 'grounding';
    if (/here's a script|you could say|try saying/i.test(lower)) return 'social_scripts';
    return 'general_support';
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const detectedEnergy = detectEnergy(userMessage);
    const detectedOverlay = detectOverlay(userMessage);
    setEnergy(detectedEnergy);
    setEmotionalOverlay(detectedOverlay);
    setError('');

    // Log emotional state for pattern learning
    EmotionalLearning.logEmotionalState({
      energy: detectedEnergy,
      overlay: detectedOverlay
    });

    // Detect and track struggles
    const detectedStruggles = SessionMemory.detectStruggles(userMessage);
    detectedStruggles.forEach(topic => {
      SessionMemory.updateStruggle({
        topic,
        context: userMessage.slice(0, 150),
        resolved: false
      });
    });

    // Check for breakthrough from previous exchange
    if (lastMjResponse && messages.length > 0) {
      const breakthrough = SessionMemory.detectBreakthrough(userMessage, lastMjResponse);
      if (breakthrough) {
        SessionMemory.saveBreakthrough(breakthrough);

        // Log successful intervention
        const interventionType = detectInterventionType(lastMjResponse);
        EmotionalLearning.logIntervention({
          type: interventionType,
          outcome: 'positive',
          context: detectedStruggles[0] || 'general'
        });
      }
    }

    const newMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    updateChatStyle(newMessages);

    // Track interests mentioned in message
    const detectedInterests = InterestSystem.detectInterests(userMessage);
    detectedInterests.forEach(interest => {
      InterestSystem.trackInterest(interest, userMessage.slice(0, 100));
    });

    // Detect comedy preferences
    const comedyPref = InterestSystem.detectComedyPreference(userMessage);
    if (comedyPref) {
      InterestSystem.saveComedyPreference(comedyPref);
    }

    // Detect procrastination patterns
    const procrastinationCheck = ProcrastinationDetector.detect(userMessage);
    let procrastinationContext = null;

    if (procrastinationCheck.detected) {
      console.log('Procrastination detected:', procrastinationCheck);
      // Get intervention strategy
      const intervention = ProcrastinationDetector.getIntervention(
        procrastinationCheck.primaryType,
        profile
      );
      // Get pattern analysis for context
      const patterns = ProcrastinationDetector.analyzePatterns();

      procrastinationContext = {
        detected: true,
        type: procrastinationCheck.primaryType,
        severity: procrastinationCheck.severity,
        suggestedIntervention: intervention,
        patterns,
        pendingTasks: DailyActivitySystem.getPendingByPriority().slice(0, 3)
      };
    }

    // Get task context
    const taskStats = DailyActivitySystem.getStats();
    const pendingTasks = DailyActivitySystem.getPendingByPriority();

    try {
      const currentChatStyle = analyzeStyleLocal(newMessages);
      const emotionalLearning = getEmotionalLearningContext();
      const sessionMemory = getSessionMemoryContext();

      // Build interest context
      const topInterests = InterestSystem.getTopInterests(5);
      const interestContext = {
        topInterests,
        comedyPrefs: InterestSystem.getComedyPrefs(),
        conversationStarters: InterestSystem.getConversationStarters()
      };

      // Check if message needs real-time web search (sports, news, current events, etc.)
      const searchCheck = RealTimeSearch.needsWebSearch(userMessage);
      const useWebSearch = searchCheck.needed;

      if (useWebSearch) {
        setSearching(true);
        console.log('Web search enabled:', searchCheck.category, searchCheck.reason);
      }

      let systemPrompt = buildSystemPrompt(
        profile,
        currentChatStyle,
        socialStyle,
        locationData,
        emotionalLearning,
        sessionMemory,
        interestContext
      );

      // Add search instruction to system prompt when web search is enabled
      if (useWebSearch) {
        systemPrompt += RealTimeSearch.getSearchInstruction(searchCheck.category);
      }

      // Add accountability coaching context
      if (taskStats.today.total > 0 || procrastinationContext) {
        systemPrompt += `

=== ACCOUNTABILITY COACH MODE ===
Today's Tasks Status:
- Completed: ${taskStats.today.completed}/${taskStats.today.total}
- Remaining: ${taskStats.today.remaining}
- Completion Rate: ${taskStats.completionRate}%
${pendingTasks.length > 0 ? `
Next Priority Tasks:
${pendingTasks.slice(0, 3).map((t, i) => `${i + 1}. ${t.text} (${t.priority.replace('_', ' ')})`).join('\n')}
` : ''}
`;
      }

      // Add procrastination intervention context
      if (procrastinationContext?.detected) {
        systemPrompt += `

=== PROCRASTINATION DETECTED ===
Type: ${procrastinationContext.type}
Severity: ${procrastinationContext.severity}

SUGGESTED INTERVENTION APPROACH:
"${procrastinationContext.suggestedIntervention}"

YOUR APPROACH:
- Acknowledge their feelings without judgment
- Gently explore what's underneath the avoidance
- Help them find the smallest possible next step
- Don't be preachy or lecture them
- Use your knowledge of what works for them
- If they have pending tasks, help them pick ONE to focus on
- Make it feel doable, not overwhelming
${procrastinationContext.patterns ? `
USER'S PROCRASTINATION PATTERNS:
- Tends to delay more around: ${procrastinationContext.patterns.worstTimeOfDay || 'unknown'}
- Most challenging day: ${procrastinationContext.patterns.worstDayOfWeek || 'unknown'}
` : ''}
`;
      }

      // Add Apple Health context if available
      if (healthData) {
        const healthContext = await AppleHealthKit.buildHealthContext();
        if (healthContext) {
          systemPrompt += healthContext;
        }
      }

      // Add mood tracking context
      const moodContext = MoodTracker.buildMoodContext();
      if (moodContext) {
        systemPrompt += moodContext;
      }

      // Add adaptive tone guidance
      const recentMood = MoodTracker.getTodayMoods().slice(-1)[0]?.mood;
      systemPrompt += AdaptiveTone.buildToneContext(detectedEnergy, detectedOverlay, recentMood);

      // Add conversation callback context
      const callbackContext = ConversationCallbacks.getCallbackContext();
      if (callbackContext) {
        systemPrompt += callbackContext;
      }

      // Add coping toolkit context
      const toolkitContext = CopingToolkit.buildToolkitContext();
      if (toolkitContext) {
        systemPrompt += toolkitContext;
      }

      // Add journaling insights
      const journalContext = GuidedJournaling.buildJournalContext();
      if (journalContext) {
        systemPrompt += journalContext;
      }

      // Add session history context
      const sessionContext = SessionSummary.buildSummaryContext();
      if (sessionContext) {
        systemPrompt += sessionContext;
      }

      // Add deep personalization context
      const personalizationContext = DeepPersonalization.buildPersonalizationContext();
      if (personalizationContext) {
        systemPrompt += personalizationContext;
      }

      // Add morning intention context
      const morningContext = MorningRitual.buildContext();
      if (morningContext) {
        systemPrompt += morningContext;
      }

      // Add accountability buddy context
      const buddyContext = AccountabilityBuddy.buildContext();
      if (buddyContext) {
        systemPrompt += buddyContext;
      }

      // Check for crisis indicators
      const crisisCheck = CrisisSupport.detectCrisis(userMessage);
      if (crisisCheck.detected) {
        console.log('Crisis detected:', crisisCheck);
        systemPrompt += `

=== CRISIS SUPPORT MODE ===
⚠️ This message contains indicators of ${crisisCheck.level === 'severe' ? 'SEVERE' : 'moderate'} distress.
Keywords detected: ${crisisCheck.keywords.join(', ')}

YOUR PRIORITY RESPONSE:
1. First, acknowledge their pain with genuine compassion
2. Gently check if they're safe right now
3. Remind them they can call 988 (Suicide & Crisis Lifeline) anytime
4. Offer a grounding exercise if appropriate
5. Stay present and supportive - don't try to fix everything
6. Keep your response warm but calm
${crisisCheck.level === 'severe' ? `
⚠️ SEVERE CRISIS - Be extra gentle. Prioritize their immediate safety.
Consider asking: "Are you safe right now?" and "Is there someone who can be with you?"
` : ''}
`;
        // If severe, trigger the crisis modal
        if (crisisCheck.level === 'severe') {
          setShowCrisis(true);
        }
      }

      const response = await callClaude(apiKey, newMessages, systemPrompt, useWebSearch);
      setSearching(false);

      setMessages([...newMessages, { role: 'mj', text: response }]);
      setLastMjResponse(response);

      // Generate smart reply suggestions
      const replies = SmartReplies.getSuggestions({
        lastMjMessage: response,
        conversationLength: newMessages.length
      });
      setSmartReplies(replies);

      // Voice mode - speak response
      if (voiceMode && VoiceConversation.getSettings().autoSpeak) {
        VoiceConversation.speak(response);
      }

      // Track progress and check for celebrations
      const progressUpdate = ProgressSystem.recordMessage();
      const newAchievements = ProgressSystem.checkAchievements(progressUpdate);

      // Trigger celebration for new achievements
      if (newAchievements.length > 0) {
        const newCelebration = CelebrationSystem.celebrate('achievement', newAchievements[0].name);
        setCelebration(newCelebration);
      }

      // Extract and track conversation mentions for callbacks
      const mentions = ConversationCallbacks.extractMentions(userMessage);
      mentions.forEach(m => ConversationCallbacks.trackMention(m.category, m.detail));

      // Deep personalization - extract personal details
      DeepPersonalization.extractDetails(userMessage);

      // Track recurring themes
      detectedStruggles.forEach(theme => ConversationCallbacks.trackTheme(theme));

      // Log the intervention (outcome will be determined by next user message)
      const interventionType = detectInterventionType(response);
      EmotionalLearning.logIntervention({
        type: interventionType,
        outcome: 'neutral', // Will be updated if user responds positively
        context: detectedStruggles[0] || 'general',
        energy: detectedEnergy,
        overlay: detectedOverlay
      });

      const updatedProfile = { ...profile, totalSessions: (profile.totalSessions || 0) + 1 };
      storage.set(STORAGE_KEYS.USER_PROFILE, updatedProfile);
    } catch (e) {
      setError(e.message || 'Failed to get response');
    }
    setLoading(false);
  };

  // Save session summary when conversation has meaningful content
  const saveCurrentSession = useCallback(() => {
    if (messages.length < 4) return; // Need at least 2 exchanges

    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length < 2) return;

    const detectedStruggles = [];
    userMessages.forEach(m => {
      detectedStruggles.push(...SessionMemory.detectStruggles(m.text));
    });
    const uniqueTopics = [...new Set(detectedStruggles)];

    SessionMemory.saveSessionSummary({
      mood: energy,
      overlay: emotionalOverlay,
      topic: uniqueTopics.slice(0, 3).join(', ') || 'general check-in',
      messageCount: messages.length,
      duration: Math.round((Date.now() - sessionStartTime) / 60000) // minutes
    });
  }, [messages, energy, emotionalOverlay, sessionStartTime]);

  // Save session on unmount or when starting new conversation
  useEffect(() => {
    return () => saveCurrentSession();
  }, [saveCurrentSession]);

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
    saveCurrentSession();
    setMessages([{ role: 'mj', text: `Fresh start. How are you right now?` }]);
    setLastMjResponse('');
    setEmotionalOverlay(null);
  };

  const handleProfileUpdate = (updatedProfile) => {
    onUpdateProfile(updatedProfile);
    setSocialStyle(storage.get(STORAGE_KEYS.SOCIAL_STYLE));
  };

  const EnergyIcon = ENERGY_STATES[energy].icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
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
                {(chatStyle?.sampleSize >= 5 || socialStyle) && (
                  <div className="flex items-center gap-1 text-xs text-violet-400">
                    <Brain className="w-3 h-3" />
                    <span>Adapting</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator />
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`p-2 rounded-lg transition-colors ${showTasks ? 'text-violet-400 bg-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Tasks & Goals"
            >
              <ListTodo className="w-4 h-4" />
            </button>
            {healthData && (
              <button
                onClick={() => setShowHealth(!showHealth)}
                className={`p-2 rounded-lg transition-colors ${showHealth ? 'text-red-400 bg-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                title="Health Data"
              >
                <Heart className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowProgress(true)}
              className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-700/50"
              title="Progress & Achievements"
            >
              <Trophy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBoosters(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-700/50"
              title="Quick Mood Boosters"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowJournal(true)}
              className="p-2 text-slate-400 hover:text-violet-400 rounded-lg hover:bg-slate-700/50"
              title="Journal"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowToolkit(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-700/50"
              title="Coping Toolkit"
            >
              <Shield className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMoodCheckin(true)}
              className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-700/50"
              title="Mood Check-in"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={() => startBreathing('calm')}
              className="p-2 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-700/50"
              title="Breathing Exercise"
            >
              <Wind className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCrisis(true)}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50"
              title="Crisis Resources"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button onClick={() => setShowInsights(true)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50" title="Your insights">
              <Sparkles className="w-4 h-4" />
            </button>
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

        {/* Quick Actions Bar */}
        {quickActions.length > 0 && (
          <QuickActionsBar actions={quickActions} onAction={handleQuickAction} />
        )}

        {/* Daily Affirmation */}
        {showAffirmation && (
          <div className="px-4 pt-3">
            <AffirmationBanner onDismiss={() => setShowAffirmation(false)} />
          </div>
        )}

        {/* Check-in Banner */}
        {pendingCheckIn && (
          <div className="px-4 pt-3">
            <CheckInBanner
              checkIn={pendingCheckIn}
              onRespond={handleCheckInResponse}
              onDismiss={handleCheckInDismiss}
            />
          </div>
        )}

        {/* Task Manager Panel */}
        {showTasks && (
          <div className="px-4 pt-3">
            <TaskManager
              onTaskUpdate={handleTaskUpdate}
              onCheckIn={(type) => {
                const message = CheckInSystem.getMessage(type);
                setInput(message);
              }}
            />
          </div>
        )}

        {/* Health Data Panel */}
        {showHealth && healthData && (
          <div className="px-4 pt-3">
            <HealthPanel
              healthData={healthData}
              onRefresh={refreshHealthData}
            />
          </div>
        )}

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
              <div className="bg-slate-700/30 border border-slate-600/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                {searching && (
                  <span className="text-xs text-sky-400 flex items-center gap-1">
                    <Newspaper className="w-3 h-3" />
                    Checking latest info...
                  </span>
                )}
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

        <div className="p-4 border-t border-slate-700/30 bg-slate-900/50">
          {/* Smart Reply Suggestions */}
          {smartReplies.length > 0 && (
            <SmartRepliesBar suggestions={smartReplies} onSelect={handleSmartReply} />
          )}

          <div className="flex gap-2">
            <VoiceInputButton
              onResult={handleVoiceInput}
              onError={handleVoiceError}
              onListeningChange={setIsListening}
              disabled={loading}
            />
            <VoiceModeButton
              active={voiceMode}
              onToggle={() => setVoiceMode(!voiceMode)}
              disabled={loading}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening..." : "How are you showing up today?"}
              className={`flex-1 bg-slate-800/50 border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none placeholder-slate-500 ${isListening ? 'border-rose-500/50 animate-pulse' : 'border-slate-700/50 focus:border-slate-600'}`}
              rows={1}
              disabled={loading || isListening}
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
          chatStyle={chatStyle}
          socialStyle={socialStyle}
          onClose={() => setShowSettings(false)}
          onReset={onReset}
          onUpdateProfile={handleProfileUpdate}
        />
      )}

      {showInsights && (
        <InsightsModal onClose={() => setShowInsights(false)} />
      )}

      {/* Mood Check-in Modal */}
      {showMoodCheckin && (
        <MoodCheckin
          onComplete={handleMoodComplete}
          onClose={() => setShowMoodCheckin(false)}
        />
      )}

      {/* Breathing Exercise Modal */}
      {showBreathing && (
        <BreathingExercise
          pattern={activeBreathingPattern}
          onComplete={handleBreathingComplete}
          onClose={() => setShowBreathing(false)}
        />
      )}

      {/* Crisis Support Modal */}
      {showCrisis && (
        <CrisisModal onClose={() => setShowCrisis(false)} />
      )}

      {/* Progress Dashboard */}
      {showProgress && (
        <ProgressDashboard onClose={() => setShowProgress(false)} />
      )}

      {/* Quick Boosters Menu */}
      {showBoosters && !activeBooster && (
        <QuickBoostersMenu
          onSelect={(booster) => {
            setShowBoosters(false);
            setActiveBooster(booster);
          }}
          onClose={() => setShowBoosters(false)}
        />
      )}

      {/* Active Booster */}
      {activeBooster && (
        <QuickBoosterModal
          booster={activeBooster}
          onClose={() => setActiveBooster(null)}
          onComplete={() => {
            const newCelebration = CelebrationSystem.celebrate('habit_complete', activeBooster.name);
            setCelebration(newCelebration);
            setActiveBooster(null);
          }}
        />
      )}

      {/* Coping Toolkit */}
      {showToolkit && (
        <CopingToolkitModal onClose={() => setShowToolkit(false)} />
      )}

      {/* Journal */}
      {showJournal && (
        <JournalModal onClose={() => setShowJournal(false)} />
      )}

      {/* Session Summary */}
      {showSessionSummary && (
        <SessionSummaryModal
          summary={showSessionSummary}
          onClose={() => setShowSessionSummary(null)}
        />
      )}

      {/* Celebration Overlay */}
      {celebration && (
        <CelebrationOverlay
          celebration={celebration}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Morning Ritual Modal */}
      {showMorningRitual && (
        <MorningRitualModal
          onClose={() => setShowMorningRitual(false)}
          onComplete={(data) => {
            const celebration = CelebrationSystem.celebrate('habit_complete', 'Morning intention set! 🌅');
            setCelebration(celebration);
          }}
        />
      )}

      {/* Evening Wind-Down Modal */}
      {showWindDown && (
        <WindDownModal
          onClose={() => setShowWindDown(false)}
          onComplete={() => {
            const celebration = CelebrationSystem.celebrate('habit_complete', 'Wind-down complete! 🌙');
            setCelebration(celebration);
          }}
        />
      )}

      {/* Weekly Growth Story */}
      {showWeeklyStory && (
        <WeeklyStoryModal onClose={() => setShowWeeklyStory(false)} />
      )}

      {/* Mini Mood Stats in corner */}
      <MoodStatsMini onClick={() => setShowMoodCheckin(true)} />
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
