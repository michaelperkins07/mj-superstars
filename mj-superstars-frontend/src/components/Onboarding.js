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
// ONBOARDING SCREENS DATA - SIMPLIFIED 4-SCREEN FLOW
// ============================================================

const ONBOARDING_SCREENS = [
  {
    id: 'welcome',
    title: 'Meet White Mike',
    subtitle: 'Your personal mental health companion powered by AI',
    description: 'MJ\'s Superstars brings personalized support, habit tracking, and gamified wellness to your daily routine.',
    emoji: '🤖',
    animationClass: 'float-animation'
  },
  {
    id: 'tracking',
    title: 'Track Your Journey',
    subtitle: 'Mood tracking, journaling, and progress insights',
    description: 'Log your daily emotions, reflect through journaling, and watch your wellness metrics improve over time.',
    emoji: '📊',
    animationClass: 'pulse-animation'
  },
  {
    id: 'habits',
    title: 'Build Better Habits',
    subtitle: 'Daily rituals, streak rewards, and gamification',
    description: 'Build momentum with daily challenges, earn rewards for consistency, and unlock achievements as you level up.',
    emoji: '🔥',
    animationClass: 'bounce-animation'
  },
  {
    id: 'community',
    title: 'You\'re Not Alone',
    subtitle: 'Connect with a supportive community',
    description: 'Share your journey, find inspiration, and grow together with others on their wellness path.',
    emoji: '💪',
    animationClass: 'swing-animation'
  }
];

// ============================================================
// ANIMATED EMOJI COMPONENT
// ============================================================

function AnimatedEmoji({ emoji, animation }) {
  const getKeyframes = () => {
    switch(animation) {
      case 'float-animation':
        return {
          y: [0, -15, 0],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case 'pulse-animation':
        return {
          scale: [1, 1.15, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case 'bounce-animation':
        return {
          y: [0, -25, 0],
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut'
          }
        };
      case 'swing-animation':
        return {
          rotate: [0, 8, -8, 0],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      className="text-8xl"
      animate={getKeyframes()}
    >
      {emoji}
    </motion.div>
  );
}

// ============================================================
// DOT INDICATORS COMPONENT
// ============================================================

function DotIndicators({ currentScreen, totalScreens }) {
  return (
    <div className="flex justify-center gap-2 mb-8">
      {Array.from({ length: totalScreens }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`h-2 rounded-full transition-all ${
            index === currentScreen
              ? 'bg-sky-500 w-8'
              : 'bg-slate-600 w-2'
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================
// SCREEN COMPONENT
// ============================================================

function OnboardingScreen({ screen, onNext, onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-10"
      >
        <AnimatedEmoji emoji={screen.emoji} animation={screen.animationClass} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {screen.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-sky-300 mb-4 font-semibold"
      >
        {screen.subtitle}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-slate-400 max-w-md mb-8 leading-relaxed"
      >
        {screen.description}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="bg-sky-500 hover:bg-sky-400 text-white font-semibold py-4 px-10 rounded-2xl text-lg transition-colors shadow-lg shadow-sky-500/30"
      >
        Next
      </motion.button>
    </motion.div>
  );
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================

export function Onboarding({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [hasSkipped, setHasSkipped] = useState(false);
  const haptics = useHapticsHook();
  const totalScreens = ONBOARDING_SCREENS.length;
  const screen = ONBOARDING_SCREENS[currentScreen];
  const isLastScreen = currentScreen === totalScreens - 1;

  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  const handleNext = useCallback(() => {
    haptics.buttonPress();
    trackOnboardingStepCompleted(currentScreen, { screenId: screen.id });

    if (isLastScreen) {
      trackOnboardingCompleted({ skipped: false });
      onComplete({ onboardingCompleted: true });
    } else {
      setCurrentScreen(prev => prev + 1);
    }
  }, [currentScreen, screen, isLastScreen, haptics, onComplete]);

  const handleSkip = useCallback(() => {
    haptics.buttonPress();
    setHasSkipped(true);
    trackOnboardingSkipped(currentScreen);
    onComplete({ onboardingCompleted: false, skipped: true });
  }, [currentScreen, haptics, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleSkip}
        className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
      >
        Skip
      </motion.button>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* Dot Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="pt-12"
        >
          <DotIndicators currentScreen={currentScreen} totalScreens={totalScreens} />
        </motion.div>

        {/* Screen Content */}
        <AnimatePresence mode="wait">
          <OnboardingScreen
            key={screen.id}
            screen={screen}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </AnimatePresence>

        {/* Last Screen Hint */}
        {isLastScreen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <p className="text-slate-500 text-sm">
              Swipe up or tap the button above to begin
            </p>
          </motion.div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }

        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          75% { transform: rotate(-8deg); }
        }
      `}</style>
    </div>
  );
}

export default Onboarding;
