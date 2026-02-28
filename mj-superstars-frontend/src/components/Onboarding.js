// ============================================================
// MJ's Superstars - Onboarding Flow
// Conversational personalization that feeds MJ's coaching
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHapticsHook } from '../services/haptics';
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingSkipped
} from '../services/analytics';

// ============================================================
// STEP DATA
// ============================================================
const STRUGGLES = [
  { id: 'anxiety', label: 'Anxiety & Worry', emoji: '😰' },
  { id: 'motivation', label: 'Staying Motivated', emoji: '😩' },
  { id: 'confidence', label: 'Self-Confidence', emoji: '🪞' },
  { id: 'stress', label: 'Stress & Burnout', emoji: '🔥' },
  { id: 'relationships', label: 'Relationships', emoji: '💔' },
  { id: 'focus', label: 'Focus & Discipline', emoji: '🎯' },
  { id: 'sleep', label: 'Sleep & Rest', emoji: '😴' },
  { id: 'emotions', label: 'Managing Emotions', emoji: '🌊' },
];

const GOALS = [
  { id: 'calm', label: 'Feel Calmer Daily', emoji: '🧘' },
  { id: 'habits', label: 'Build Better Habits', emoji: '📈' },
  { id: 'confidence', label: 'Boost Confidence', emoji: '💪' },
  { id: 'mindset', label: 'Stronger Mindset', emoji: '🧠' },
  { id: 'health', label: 'Improve Health', emoji: '❤️' },
  { id: 'journal', label: 'Reflect & Journal', emoji: '📓' },
  { id: 'relationships', label: 'Better Relationships', emoji: '🤝' },
  { id: 'growth', label: 'Personal Growth', emoji: '🌱' },
];

const COMM_STYLES = [
  { id: 'real_talk', label: 'Real Talk', desc: 'Keep it 100 — direct, no sugarcoating', emoji: '🎤' },
  { id: 'gentle', label: 'Gentle & Supportive', desc: 'Patient, encouraging, soft approach', emoji: '🤗' },
  { id: 'coach', label: 'Coach Mode', desc: 'Push me, hold me accountable', emoji: '🏆' },
  { id: 'mix', label: 'Mix It Up', desc: 'Read the room — adapt to what I need', emoji: '🎭' },
];

// ============================================================
// ANIMATED COMPONENTS
// ============================================================
function ProgressBar({ step, total }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-sky-500 to-violet-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

function ChipSelector({ options, selected, onToggle, multi = true }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {options.map((opt) => {
        const isSelected = multi
          ? selected.includes(opt.id)
          : selected === opt.id;
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(opt.id)}
            className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all border ${
              isSelected
                ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-lg shadow-sky-500/10'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <span className="mr-2">{opt.emoji}</span>
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function StyleCard({ option, isSelected, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border transition-all ${
        isSelected
          ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{option.emoji}</span>
        <div>
          <div className={`font-semibold ${isSelected ? 'text-sky-300' : 'text-white'}`}>
            {option.label}
          </div>
          <div className="text-sm text-slate-400">{option.desc}</div>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// INDIVIDUAL STEP COMPONENTS
// ============================================================

// Step 0: Welcome
function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-xl shadow-sky-500/20"
      >
        MP
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        I'm Mike Perkins
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-lg text-sky-300 mb-4 font-medium"
      >
        Your corner man for life
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-slate-400 max-w-sm leading-relaxed"
      >
        Real people helping real people. I've been where you are — let me learn a little about you so we can figure this out together. No pressure, just curiosity.
      </motion.p>
    </div>
  );
}

// Step 1: Coach Name Preference
function CoachNameStep({ coachName, onSelect }) {
  const options = [
    { id: 'mike', label: 'Mike', desc: 'Friends & family call me this', emoji: '🤝' },
    { id: 'perkins', label: 'Perkins', desc: 'Most people at work call me this', emoji: '💼' },
  ];
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-5xl mb-6 shadow-xl shadow-sky-500/20"
      >
        🎤
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        What do you call me?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        I'm Mike Perkins — pick the name that feels right for us.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(opt.id)}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              coachName === opt.id
                ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <div className={`font-semibold ${coachName === opt.id ? 'text-sky-300' : 'text-white'}`}>
                  {opt.label}
                </div>
                <div className="text-sm text-slate-400">{opt.desc}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// Step 2: Name
function NameStep({ name, setName }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-6"
      >
        👋
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        What should I call you?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        Your name, a nickname — whatever feels right.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          data-form-type="other"
          data-lpignore="true"
          className="w-full bg-slate-800 border border-slate-600 rounded-2xl px-5 py-4 text-white text-center text-lg placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
        />
      </motion.div>
    </div>
  );
}

// Step 2: Struggles
function StrugglesStep({ selected, onToggle }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-6"
      >
        💭
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        What are you working through?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        No judgment — pick as many as apply. This helps me know where to focus.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ChipSelector options={STRUGGLES} selected={selected} onToggle={onToggle} multi={true} />
      </motion.div>
    </div>
  );
}

// Step 3: Goals
function GoalsStep({ selected, onToggle }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-6"
      >
        🎯
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        What do you want to build?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        Pick the goals that matter most to you right now.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ChipSelector options={GOALS} selected={selected} onToggle={onToggle} multi={true} />
      </motion.div>
    </div>
  );
}

// Step 4: Communication style
function CommStyleStep({ selected, onSelect }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-6"
      >
        🗣️
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        How should I talk to you?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        Everyone's different. Pick the vibe that'll help you most.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        {COMM_STYLES.map((style) => (
          <StyleCard
            key={style.id}
            option={style}
            isSelected={selected === style.id}
            onSelect={() => onSelect(style.id)}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Step 5: Conversation Mode
function ModeStep({ selected, onSelect, coachName }) {
  const displayName = coachName === 'perkins' ? 'Perkins' : 'Mike';
  const modes = [
    { id: 'perk', label: 'Perk Mode', desc: `Full ${displayName} energy — real stories, accountability, and hype`, emoji: '🔥' },
    { id: 'empathy', label: 'Empathy Mode', desc: 'Gentle, supportive — here to pick you up when things are heavy', emoji: '💙' },
    { id: 'confused', label: 'Prep Mode', desc: 'Structured help — organize your thoughts and get prepared', emoji: '🧩' },
    { id: 'problem_solve', label: 'Problem Solve Mode', desc: `${displayName} helps you break it down, find the root cause, and build a real solution`, emoji: '🛠️' },
    { id: 'elite_comm', label: 'Elite Communicator Mode', desc: `Level up how you speak, write, and present — ${displayName} coaches your communication game`, emoji: '🎤' },
  ];
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-6xl mb-6"
      >
        🎭
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-white mb-2"
      >
        How should I show up?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 mb-8 max-w-sm"
      >
        Pick the energy that fits where you're at right now. You can always change this later.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        {modes.map((mode) => (
          <StyleCard
            key={mode.id}
            option={mode}
            isSelected={selected === mode.id}
            onSelect={() => onSelect(mode.id)}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Step 6: Ready
function ReadyStep({ name, coachName }) {
  const displayName = name || 'Friend';
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-5xl mb-6 shadow-xl shadow-emerald-500/20"
      >
        🔥
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Let's go, {displayName}!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-lg text-sky-300 mb-4 font-medium"
      >
        {coachName === 'perkins' ? 'Perkins' : 'Mike'} is locked in
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-slate-400 max-w-sm leading-relaxed"
      >
        I know what you're working through and how you want me to show up. Every word matters, every sentence is a parlay — I'm here to make sure you hit and win at life. Let's get this.
      </motion.p>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================
const TOTAL_STEPS = 8;

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [struggles, setStruggles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [commStyle, setCommStyle] = useState('');
  const [coachName, setCoachName] = useState('mike');
  const [conversationMode, setConversationMode] = useState('perk');
  const haptics = useHapticsHook();

  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  // Toggle for multi-select
  const toggleItem = useCallback((list, setList) => (id) => {
    haptics.selection();
    setList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, [haptics]);

  const toggleStruggle = toggleItem(struggles, setStruggles);
  const toggleGoal = toggleItem(goals, setGoals);

  const selectCommStyle = useCallback((id) => {
    haptics.selection();
    setCommStyle(id);
  }, [haptics]);

  const selectCoachName = useCallback((id) => {
    haptics.selection();
    setCoachName(id);
  }, [haptics]);

  const selectMode = useCallback((id) => {
    haptics.selection();
    setConversationMode(id);
  }, [haptics]);

  // Can user advance?
  const canProceed = () => {
    switch (step) {
      case 0: return true; // welcome
      case 1: return coachName !== ''; // coach name preference
      case 2: return name.trim().length > 0;
      case 3: return struggles.length > 0;
      case 4: return goals.length > 0;
      case 5: return commStyle !== '';
      case 6: return conversationMode !== ''; // mode selection
      case 7: return true; // ready screen
      default: return true;
    }
  };

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    haptics.buttonPress();
    trackOnboardingStepCompleted(step, { stepId: ['welcome', 'coachName', 'name', 'struggles', 'goals', 'commStyle', 'mode', 'ready'][step] });

    if (step === TOTAL_STEPS - 1) {
      // Final step — submit everything
      const onboardingData = {
        preferred_name: name.trim(),
        coach_name_preference: coachName,
        challenges: struggles,
        goals: goals,
        interests: [],
        communication_preference: commStyle,
        conversation_mode: conversationMode,
        onboardingCompleted: true,
      };
      trackOnboardingCompleted({ struggles: struggles.length, goals: goals.length, commStyle, coachName, conversationMode });
      onComplete(onboardingData);
    } else {
      setStep(prev => prev + 1);
    }
  }, [step, name, struggles, goals, commStyle, coachName, conversationMode, haptics, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      haptics.selection();
      setStep(prev => prev - 1);
    }
  }, [step, haptics]);

  const handleSkip = useCallback(() => {
    haptics.buttonPress();
    trackOnboardingSkipped(step);
    onComplete({ onboardingCompleted: true, skipped: true });
  }, [step, haptics, onComplete]);

  // Button label
  const getButtonLabel = () => {
    if (step === 0) return "Let's Go";
    if (step === TOTAL_STEPS - 1) return "Start My Journey";
    return 'Continue';
  };

  // Render current step content
  const renderStep = () => {
    switch (step) {
      case 0: return <WelcomeStep />;
      case 1: return <CoachNameStep coachName={coachName} onSelect={selectCoachName} />;
      case 2: return <NameStep name={name} setName={setName} />;
      case 3: return <StrugglesStep selected={struggles} onToggle={toggleStruggle} />;
      case 4: return <GoalsStep selected={goals} onToggle={toggleGoal} />;
      case 5: return <CommStyleStep selected={commStyle} onSelect={selectCommStyle} />;
      case 6: return <ModeStep selected={conversationMode} onSelect={selectMode} coachName={coachName} />;
      case 7: return <ReadyStep name={name} coachName={coachName} />;
      default: return null;
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar: progress + skip — fixed at top */}
      <div style={{ flexShrink: 0, padding: '1.5rem 1.5rem 0.5rem 1.5rem', paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between mb-3">
          {step > 0 ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleBack}
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back
            </motion.button>
          ) : (
            <div />
          )}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
          >
            Skip
          </motion.button>
        </div>
        <ProgressBar step={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content — scrollable area */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 1rem' }} className="keyboard-scroll-fix">
        <div className="flex flex-col items-center justify-center py-6" style={{ minHeight: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Spacer so content doesn't hide behind fixed button */}
        <div style={{ height: '5rem' }} />
      </div>

      {/* Button — absolutely fixed at bottom with safe area */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0.75rem 1.5rem',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, rgb(2,6,23) 60%, transparent)',
        zIndex: 50
      }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canProceed()}
          className={`w-full max-w-md mx-auto block py-4 rounded-2xl text-lg font-semibold transition-all shadow-lg ${
            canProceed()
              ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          {getButtonLabel()}
        </motion.button>
      </div>
    </div>
  );
}

export default Onboarding;
