// ============================================================
// MJ's Superstars - Onboarding Flow
// Beautiful, personalized onboarding experience
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
// ONBOARDING DATA
// ============================================================

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    type: 'intro',
    title: "Hey there! 👋",
    subtitle: "I'm MJ, your personal mental wellness companion",
    description: "I'm here to support you every day with understanding, encouragement, and practical tools for your wellbeing.",
    image: '🌟',
    cta: "Let's Get Started"
  },
  {
    id: 'name',
    type: 'input',
    title: "What should I call you?",
    subtitle: "I'd love to know your name so we can get personal",
    placeholder: "Your name or nickname",
    field: 'name',
    required: true
  },
  {
    id: 'goals',
    type: 'multi-select',
    title: "What brings you here?",
    subtitle: "Select all that resonate with you",
    field: 'goals',
    options: [
      { id: 'stress', label: 'Manage stress', icon: '😤' },
      { id: 'anxiety', label: 'Reduce anxiety', icon: '😰' },
      { id: 'mood', label: 'Track my mood', icon: '📊' },
      { id: 'habits', label: 'Build healthy habits', icon: '✨' },
      { id: 'sleep', label: 'Sleep better', icon: '😴' },
      { id: 'focus', label: 'Improve focus', icon: '🎯' },
      { id: 'confidence', label: 'Build confidence', icon: '💪' },
      { id: 'relationships', label: 'Better relationships', icon: '❤️' }
    ],
    minSelections: 1
  },
  {
    id: 'mood_baseline',
    type: 'mood-picker',
    title: "How are you feeling right now?",
    subtitle: "Let's start with a quick check-in",
    field: 'baseline_mood'
  },
  {
    id: 'communication',
    type: 'single-select',
    title: "How would you like me to talk?",
    subtitle: "I'll match your preferred communication style",
    field: 'communication_style',
    options: [
      { id: 'supportive', label: 'Warm & Supportive', description: 'Gentle encouragement and empathy', icon: '🤗' },
      { id: 'direct', label: 'Direct & Clear', description: 'Straightforward and practical', icon: '📌' },
      { id: 'playful', label: 'Light & Playful', description: 'Fun, upbeat energy', icon: '😄' },
      { id: 'coach', label: 'Coach Mode', description: 'Motivating and action-oriented', icon: '🏆' }
    ]
  },
  {
    id: 'check_ins',
    type: 'time-picker',
    title: "When should I check in?",
    subtitle: "I'll send gentle reminders at these times",
    fields: [
      { id: 'morning_time', label: 'Morning check-in', default: '08:00' },
      { id: 'evening_time', label: 'Evening reflection', default: '21:00' }
    ]
  },
  {
    id: 'notifications',
    type: 'permission',
    title: "Stay connected",
    subtitle: "Get gentle reminders and encouragement",
    permission: 'notifications',
    benefits: [
      "Daily mood check-in reminders",
      "Streak celebrations",
      "Personalized insights",
      "Crisis support when you need it"
    ]
  },
  {
    id: 'complete',
    type: 'complete',
    title: "You're all set! 🎉",
    subtitle: "I'm excited to be part of your journey",
    description: "Remember: Small steps lead to big changes. I'll be here whenever you need me.",
    cta: "Start My Journey"
  }
];

// ============================================================
// STEP COMPONENTS
// ============================================================

/**
 * Intro/Welcome Step
 */
function IntroStep({ step, onNext }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-8xl mb-8"
      >
        {step.image}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {step.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-sky-300 mb-4"
      >
        {step.subtitle}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-slate-400 max-w-sm mb-8"
      >
        {step.description}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="bg-sky-500 hover:bg-sky-400 text-white font-semibold py-4 px-8 rounded-2xl text-lg"
      >
        {step.cta}
      </motion.button>
    </div>
  );
}

/**
 * Text Input Step
 */
function InputStep({ step, value, onChange, onNext, canContinue }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (canContinue) onNext();
  };

  return (
    <div className="px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-8"
      >
        {step.subtitle}
      </motion.p>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="max-w-sm mx-auto"
      >
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(step.field, e.target.value)}
          placeholder={step.placeholder}
          autoFocus
          className="w-full bg-slate-800 border-2 border-slate-700 focus:border-sky-500 rounded-2xl px-6 py-4 text-white text-lg text-center placeholder-slate-500 outline-none transition-colors"
        />
      </motion.form>
    </div>
  );
}

/**
 * Multi-Select Step
 */
function MultiSelectStep({ step, value = [], onChange, onNext }) {
  const haptics = useHapticsHook();

  const toggleOption = (optionId) => {
    haptics.selection();
    const current = value || [];
    const newValue = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    onChange(step.field, newValue);
  };

  return (
    <div className="px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-6"
      >
        {step.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 max-w-lg mx-auto"
      >
        {step.options.map((option, i) => {
          const isSelected = value?.includes(option.id);
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleOption(option.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl">{option.icon}</span>
              <span className="text-sm font-medium text-left">{option.label}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Single-Select Step
 */
function SingleSelectStep({ step, value, onChange }) {
  const haptics = useHapticsHook();

  const selectOption = (optionId) => {
    haptics.selection();
    onChange(step.field, optionId);
  };

  return (
    <div className="px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-6"
      >
        {step.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 max-w-md mx-auto"
      >
        {step.options.map((option, i) => {
          const isSelected = value === option.id;
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectOption(option.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-500'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span className="text-3xl">{option.icon}</span>
              <div className="flex-1">
                <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {option.label}
                </div>
                <div className="text-sm text-slate-400">{option.description}</div>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Mood Picker Step
 */
function MoodPickerStep({ step, value, onChange }) {
  const haptics = useHapticsHook();

  const moods = [
    { score: 1, emoji: '😢', label: 'Really struggling' },
    { score: 2, emoji: '😔', label: 'Not great' },
    { score: 3, emoji: '😐', label: 'Okay' },
    { score: 4, emoji: '🙂', label: 'Pretty good' },
    { score: 5, emoji: '😊', label: 'Great!' }
  ];

  const selectMood = (score) => {
    haptics.moodLogged();
    onChange(step.field, score);
  };

  return (
    <div className="px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-8"
      >
        {step.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-4"
      >
        {moods.map((mood, i) => {
          const isSelected = value === mood.score;
          return (
            <motion.button
              key={mood.score}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectMood(mood.score)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                isSelected
                  ? 'bg-sky-500/20 ring-2 ring-sky-500'
                  : 'hover:bg-slate-800'
              }`}
            >
              <span className={`text-4xl transition-transform ${isSelected ? 'scale-125' : ''}`}>
                {mood.emoji}
              </span>
              <span className={`text-xs ${isSelected ? 'text-sky-300' : 'text-slate-500'}`}>
                {mood.label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Time Picker Step
 */
function TimePickerStep({ step, values, onChange }) {
  return (
    <div className="px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-8"
      >
        {step.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-sm mx-auto"
      >
        {step.fields.map((field, i) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-white font-medium">{field.label}</span>
            <input
              type="time"
              value={values?.[field.id] || field.default}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-sky-500 outline-none"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Permission Request Step
 */
function PermissionStep({ step, onGrant, onSkip }) {
  const [status, setStatus] = useState('pending'); // pending, granted, denied

  const handleGrant = async () => {
    // This would trigger the actual permission request
    // For now, simulate success
    setStatus('granted');
    onGrant();
  };

  return (
    <div className="px-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <span className="text-4xl">🔔</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-2 text-center"
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-center mb-6"
      >
        {step.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/50 rounded-xl p-5 mb-6 max-w-sm mx-auto"
      >
        <ul className="space-y-3">
          {step.benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-300">
              <div className="w-5 h-5 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm">{benefit}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 max-w-sm mx-auto"
      >
        <button
          onClick={handleGrant}
          className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Enable Notifications
        </button>
        <button
          onClick={onSkip}
          className="text-slate-400 hover:text-slate-300 text-sm py-2"
        >
          Maybe later
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Complete Step
 */
function CompleteStep({ step, userName, onComplete }) {
  const haptics = useHapticsHook();

  useEffect(() => {
    haptics.achievementUnlocked();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-8xl mb-6"
      >
        🎉
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {step.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-sky-300 mb-4"
      >
        {userName ? `Nice to meet you, ${userName}!` : step.subtitle}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-slate-400 max-w-sm mb-8"
      >
        {step.description}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
        className="bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg shadow-sky-500/30"
      >
        {step.cta}
      </motion.button>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================

export function Onboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [startTime] = useState(Date.now());
  const haptics = useHapticsHook();

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Track onboarding started
  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  // Update data
  const updateData = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Check if can continue
  const canContinue = useCallback(() => {
    if (step.required) {
      const value = data[step.field];
      return value && (typeof value === 'string' ? value.trim() : true);
    }
    if (step.minSelections) {
      const value = data[step.field] || [];
      return value.length >= step.minSelections;
    }
    if (step.type === 'single-select') {
      return !!data[step.field];
    }
    if (step.type === 'mood-picker') {
      return !!data[step.field];
    }
    return true;
  }, [step, data]);

  // Go to next step
  const nextStep = useCallback(() => {
    if (!canContinue()) return;

    haptics.buttonPress();
    trackOnboardingStepCompleted(currentStep, {
      stepName: step.id,
      ...data
    });

    if (isLastStep) {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      trackOnboardingCompleted({ durationSeconds, ...data });
      onComplete(data);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, step, data, isLastStep, canContinue, haptics, startTime, onComplete]);

  // Go to previous step
  const prevStep = useCallback(() => {
    haptics.buttonPress();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, haptics]);

  // Skip onboarding
  const skipOnboarding = useCallback(() => {
    trackOnboardingSkipped(currentStep);
    onComplete(data);
  }, [currentStep, data, onComplete]);

  // Render step content
  const renderStep = () => {
    switch (step.type) {
      case 'intro':
        return <IntroStep step={step} onNext={nextStep} />;
      case 'input':
        return (
          <InputStep
            step={step}
            value={data[step.field]}
            onChange={updateData}
            onNext={nextStep}
            canContinue={canContinue()}
          />
        );
      case 'multi-select':
        return (
          <MultiSelectStep
            step={step}
            value={data[step.field]}
            onChange={updateData}
            onNext={nextStep}
          />
        );
      case 'single-select':
        return (
          <SingleSelectStep
            step={step}
            value={data[step.field]}
            onChange={updateData}
          />
        );
      case 'mood-picker':
        return (
          <MoodPickerStep
            step={step}
            value={data[step.field]}
            onChange={updateData}
          />
        );
      case 'time-picker':
        return (
          <TimePickerStep
            step={step}
            values={data}
            onChange={updateData}
          />
        );
      case 'permission':
        return (
          <PermissionStep
            step={step}
            onGrant={nextStep}
            onSkip={nextStep}
          />
        );
      case 'complete':
        return (
          <CompleteStep
            step={step}
            userName={data.name}
            onComplete={nextStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col">
      {/* Progress Bar */}
      {!isFirstStep && !isLastStep && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={prevStep}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full"
              />
            </div>

            <button
              onClick={skipOnboarding}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Continue Button */}
      {!['intro', 'permission', 'complete'].includes(step.type) && (
        <div className="p-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={nextStep}
            disabled={!canContinue()}
            className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
              canContinue()
                ? 'bg-sky-500 hover:bg-sky-400 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue
          </motion.button>
        </div>
      )}
    </div>
  );
}

export default Onboarding;
