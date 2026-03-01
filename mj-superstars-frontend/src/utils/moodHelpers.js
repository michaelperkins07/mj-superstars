// ============================================================
// MJ's Superstars - Mood & Tracker Helpers
// ============================================================

export const moodEmoji = (score) => {
  const emojis = ['😢', '😔', '😐', '🙂', '😄'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const moodLabel = (score) => {
  const labels = ['Struggling', 'Down', 'Okay', 'Good', 'Great'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};

// ============================================================
// CONFIDENCE TRACKER
// ============================================================
export const confidenceEmoji = (score) => {
  const emojis = ['😰', '😟', '😌', '💪', '🔥'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const confidenceLabel = (score) => {
  const labels = ['Shaky', 'Uncertain', 'Steady', 'Strong', 'Unstoppable'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const confidenceColor = (score) => {
  const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400', 'text-sky-400'];
  return colors[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const CONFIDENCE_PROMPTS = {
  1: "What's making you doubt yourself right now? Let's name it.",
  2: "What's one thing you handled well recently?",
  3: "You're holding steady. What would push you to the next level?",
  4: "That confidence is showing. What fueled it?",
  5: "You're feeling unstoppable — remember this moment on the tough days."
};

// ============================================================
// ENERGY TRACKER
// ============================================================
export const energyEmoji = (score) => {
  const emojis = ['🪫', '😴', '⚡', '🚀', '☀️'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const energyLabel = (score) => {
  const labels = ['Drained', 'Low', 'Balanced', 'Energized', 'On Fire'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const energyColor = (score) => {
  const colors = ['text-slate-400', 'text-indigo-400', 'text-yellow-400', 'text-amber-400', 'text-orange-400'];
  return colors[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const ENERGY_PROMPTS = {
  1: "Time to recharge. What's draining you the most?",
  2: "Low energy doesn't mean low effort. What's one small win you can grab?",
  3: "Balanced energy — let's use it wisely. What matters most today?",
  4: "Feeling energized! Let's channel it. What's the biggest thing we can tackle?",
  5: "On fire! Ride this wave — what would Future You thank you for doing today?"
};

// ============================================================
// MORALS TRACKER
// ============================================================
export const moralsEmoji = (score) => {
  const emojis = ['🌑', '🌘', '🌗', '🌖', '🌕'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const moralsLabel = (score) => {
  const labels = ['Struggling', 'Wavering', 'Centered', 'Aligned', 'Grounded'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const moralsColor = (score) => {
  const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-violet-400', 'text-fuchsia-400'];
  return colors[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const MORALS_PROMPTS = {
  1: "Have you been comparing yourself to others or judging harshly? What triggered it?",
  2: "What values feel off-track right now? No judgment — just honesty.",
  3: "You're centered. What's one value you want to lean into more today?",
  4: "Living your values — that's powerful. What made you feel aligned?",
  5: "Fully grounded. Your integrity is your superpower. Keep leading by example."
};

// ============================================================
// TRACKER AFFIRMATIONS
// ============================================================
export const TRACKER_AFFIRMATIONS = {
  confidence: {
    1: ["Doubt is just a sign you care. That's a strength, not a weakness.",
        "Even the strongest people have shaky moments. You showed up anyway."],
    2: ["You're more capable than you feel right now. Trust the work you've put in.",
        "Uncertainty is temporary. Your potential isn't."],
    3: ["Steady progress beats bursts of brilliance. You're on the path.",
        "Confidence isn't about knowing everything — it's about trusting you'll figure it out."],
    4: ["That's the energy of someone who's been putting in the work. It shows.",
        "Confidence looks good on you. Keep building on it."],
    5: ["UNSTOPPABLE. Remember this feeling when the doubts try to creep back in.",
        "This is what happens when preparation meets opportunity. You're ready."]
  },
  energy: {
    1: ["Rest isn't quitting — it's reloading. Take what you need.",
        "Even phones need charging. You're no different."],
    2: ["Low battery doesn't mean broken. One step at a time.",
        "Sometimes showing up is the win. You showed up."],
    3: ["Balanced energy is sustainable energy. Smart move.",
        "Not too high, not too low — that's where the best decisions come from."],
    4: ["Ride this wave! Channel it into something that moves the needle.",
        "Energy like this is rare. Don't waste it on the small stuff."],
    5: ["ON FIRE! This is your moment. Make it count.",
        "This energy is contagious. Use it to lift others up too."]
  },
  morals: {
    1: ["Noticing is the first step to changing. You're already ahead of most people.",
        "Everyone slips. What matters is you're aware enough to catch it."],
    2: ["The fact that you're reflecting on this shows character. Keep going.",
        "Progress over perfection. You're working on it — that's what counts."],
    3: ["Centered and self-aware. That's the foundation of a top performer.",
        "You're walking the line between ambition and integrity. That's rare."],
    4: ["Your values are your compass, and you're following it well.",
        "Aligned actions create aligned outcomes. Keep it up."],
    5: ["Fully grounded in who you are. That's unshakeable.",
        "Integrity like this is your legacy. People notice, even when you think they don't."]
  }
};

export const getRandomAffirmation = (tracker, score) => {
  const msgs = TRACKER_AFFIRMATIONS[tracker]?.[score] || TRACKER_AFFIRMATIONS[tracker]?.[3] || [];
  return msgs[Math.floor(Math.random() * msgs.length)] || '';
};
