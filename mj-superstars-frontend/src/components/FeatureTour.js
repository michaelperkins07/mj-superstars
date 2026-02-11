// ============================================================
// MJ's Superstars - Feature Tour (Post-Onboarding Walkthrough)
// Shows key app features after first onboarding
// ============================================================
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// TOUR STEPS
// ============================================================
const TOUR_STEPS = [
  {
    id: 'commitments',
    emoji: '🛡️',
    gradient: 'from-sky-500 to-emerald-500',
    title: '3 Pillars',
    subtitle: 'Physical • Mental • Social',
    description: 'Every day, make three commitments: Move your body, learn something new, and connect with empathy. This is the foundation of everything.',
    tip: 'Complete all 3 daily to build your Clear Mind Score',
  },
  {
    id: 'chat',
    emoji: '💬',
    gradient: 'from-sky-500 to-blue-600',
    title: 'Chat with Coach Mike',
    subtitle: 'Your personal AI + EI coach',
    description: 'Talk about anything — stress, goals, habits, emotions. Coach Mike keeps it real and helps you level up.',
    tip: 'Try: "I\'m feeling stuck" or "Give me a push"',
  },
  {
    id: 'mood',
    emoji: '🎭',
    gradient: 'from-violet-500 to-purple-600',
    title: 'Track Your Mood',
    subtitle: 'Know yourself better',
    description: 'Log how you feel daily. Over time, Coach Mike spots patterns and helps you understand your emotional rhythms.',
    tip: 'Daily check-ins build your streak',
  },
  {
    id: 'explore',
    emoji: '🧰',
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Explore Tools',
    subtitle: 'Coping skills & exercises',
    description: 'Breathing exercises, grounding techniques, affirmations, and more — all in your pocket.',
    tip: 'New tools unlock as you use the app',
  },
  {
    id: 'journal',
    emoji: '📓',
    gradient: 'from-rose-500 to-pink-600',
    title: 'Journal & Insights',
    subtitle: 'Reflect and grow',
    description: 'Write freely or use guided prompts. Coach Mike analyzes your entries to surface insights about your growth.',
    tip: 'Even 2 sentences count as a journal entry',
  },
];

// ============================================================
// DOT INDICATOR
// ============================================================
function DotIndicator({ total, current }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-6 bg-sky-400' : 'w-2 bg-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
function FeatureTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[currentStep];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem('mj_feature_tour_seen', 'true');
      onComplete?.();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('mj_feature_tour_seen', 'true');
    onComplete?.();
  }, [onComplete]);

  // Swipe handling
  const handleDragEnd = useCallback(
    (_, info) => {
      const swipeThreshold = 50;
      if (info.offset.x < -swipeThreshold && currentStep < TOUR_STEPS.length - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      } else if (info.offset.x > swipeThreshold && currentStep > 0) {
        setDirection(-1);
        setCurrentStep((prev) => prev - 1);
      }
    },
    [currentStep]
  );

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md">
      <div className="w-full max-w-md mx-4">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
          >
            Skip Tour
          </button>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-800 min-h-[420px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${step.gradient} p-8 pb-10 text-center`}>
                <div className="text-5xl mb-4">{step.emoji}</div>
                <h2 className="text-2xl font-bold text-white mb-1">{step.title}</h2>
                <p className="text-white/70 text-sm font-medium">{step.subtitle}</p>
              </div>

              {/* Content */}
              <div className="p-6 pt-5">
                <p className="text-slate-300 text-sm leading-relaxed mb-4">{step.description}</p>

                {/* Pro tip */}
                <div className="bg-slate-700/50 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-400 text-sm mt-0.5">💡</span>
                  <p className="text-slate-400 text-xs leading-relaxed">{step.tip}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="mt-6 mb-4">
          <DotIndicator total={TOUR_STEPS.length} current={currentStep} />
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl py-4 transition-colors text-sm"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 font-semibold rounded-xl py-4 transition-colors text-sm ${
              isLastStep
                ? 'bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 text-white'
                : 'bg-sky-500 hover:bg-sky-400 text-white'
            }`}
          >
            {isLastStep ? "Let's Go! 🚀" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeatureTour;
