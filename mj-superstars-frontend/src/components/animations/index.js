// ============================================================
// MJ's Superstars - Animation Library
// Framer Motion animations for polished UI interactions
// ============================================================

import React, { forwardRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ============================================================
// ANIMATION VARIANTS
// ============================================================

/**
 * Fade animations
 */
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

/**
 * Slide up animations (for modals, cards)
 */
export const slideUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

/**
 * Slide down animations (for notifications)
 */
export const slideDownVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

/**
 * Scale animations (for buttons, cards)
 */
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

/**
 * Pop animations (for achievements, celebrations)
 */
export const popVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20
    }
  },
  exit: { opacity: 0, scale: 0.5 }
};

/**
 * Stagger children animations
 */
export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

/**
 * List item animations
 */
export const listItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

/**
 * Page transition variants
 */
export const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

// ============================================================
// ANIMATION TRANSITIONS
// ============================================================

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30
};

export const smoothTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1]
};

export const bounceTransition = {
  type: 'spring',
  stiffness: 500,
  damping: 25
};

export const slowTransition = {
  duration: 0.5,
  ease: 'easeInOut'
};

// ============================================================
// ANIMATED COMPONENTS
// ============================================================

/**
 * Animated container with presence
 */
export const AnimatedPresence = AnimatePresence;

/**
 * Fade-in component
 */
export const FadeIn = forwardRef(({ children, delay = 0, duration = 0.3, className = '', ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : duration,
        delay: shouldReduceMotion ? 0 : delay
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

FadeIn.displayName = 'FadeIn';

/**
 * Slide-up component
 */
export const SlideUp = forwardRef(({ children, delay = 0, className = '', ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      transition={{
        ...springTransition,
        delay
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

SlideUp.displayName = 'SlideUp';

/**
 * Scale-in component
 */
export const ScaleIn = forwardRef(({ children, delay = 0, className = '', ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
      transition={{
        ...springTransition,
        delay
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

ScaleIn.displayName = 'ScaleIn';

/**
 * Pop-in component (for celebrations)
 */
export const PopIn = forwardRef(({ children, delay = 0, className = '', ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.5 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
        delay
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

PopIn.displayName = 'PopIn';

/**
 * Staggered list container
 */
export const StaggerList = forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

StaggerList.displayName = 'StaggerList';

/**
 * Staggered list item
 */
export const StaggerItem = forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={staggerItemVariants}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
});

StaggerItem.displayName = 'StaggerItem';

/**
 * Pressable/tappable component with scale feedback
 */
export const Pressable = forwardRef(({
  children,
  className = '',
  onTap,
  disabled = false,
  scale = 0.98,
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      whileTap={disabled || shouldReduceMotion ? {} : { scale }}
      whileHover={disabled || shouldReduceMotion ? {} : { scale: 1.02 }}
      onTap={disabled ? undefined : onTap}
      className={`cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Pressable.displayName = 'Pressable';

/**
 * Animated button with press feedback
 */
export const AnimatedButton = forwardRef(({
  children,
  className = '',
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();

  const baseStyles = 'font-semibold rounded-xl transition-colors flex items-center justify-center gap-2';
  const variantStyles = {
    primary: 'bg-sky-500 hover:bg-sky-400 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-white',
    danger: 'bg-red-500 hover:bg-red-400 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300'
  };

  return (
    <motion.button
      ref={ref}
      whileTap={disabled || shouldReduceMotion ? {} : { scale: 0.97 }}
      whileHover={disabled || shouldReduceMotion ? {} : { scale: 1.02 }}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </motion.svg>
      ) : null}
      {children}
    </motion.button>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

/**
 * Card with hover effects
 */
export const AnimatedCard = forwardRef(({
  children,
  className = '',
  onClick,
  hoverable = true,
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={hoverable && !shouldReduceMotion ? {
        y: -4,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      } : {}}
      whileTap={onClick && !shouldReduceMotion ? { scale: 0.98 } : {}}
      onClick={onClick}
      transition={springTransition}
      className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

/**
 * Progress bar with animation
 */
export const AnimatedProgress = ({ value, max = 100, className = '', color = 'sky' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const shouldReduceMotion = useReducedMotion();

  const colorClasses = {
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`h-2 bg-slate-700 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.8,
          ease: [0.4, 0, 0.2, 1]
        }}
        className={`h-full rounded-full ${colorClasses[color] || colorClasses.sky}`}
      />
    </div>
  );
};

/**
 * Counter animation for numbers
 */
export const AnimatedCounter = ({ value, duration = 1, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
      className={className}
    >
      {value}
    </motion.span>
  );
};

/**
 * Skeleton loading animation
 */
export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseStyles = 'bg-slate-700 animate-pulse';
  const variantStyles = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} />
  );
};

/**
 * Page transition wrapper
 */
export const PageTransition = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
      transition={smoothTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Floating action button with entrance animation
 */
export const FloatingButton = forwardRef(({
  children,
  className = '',
  onClick,
  position = 'bottom-right',
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();

  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2'
  };

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 20 }}
      whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
      onClick={onClick}
      transition={bounceTransition}
      className={`fixed ${positionStyles[position]} z-50 w-14 h-14 bg-sky-500 hover:bg-sky-400 text-white rounded-full shadow-lg shadow-sky-500/30 flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});

FloatingButton.displayName = 'FloatingButton';

/**
 * Confetti/celebration animation
 */
export const Celebration = ({ active, duration = 3000 }) => {
  const [particles, setParticles] = React.useState([]);

  React.useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        color: ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 5)]
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  return (
    <AnimatePresence>
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{ y: -20, x: particle.x, opacity: 1, scale: 1 }}
          animate={{
            y: window.innerHeight + 20,
            x: particle.x + (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720,
            opacity: 0
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
          className="fixed top-0 w-3 h-3 rounded-full pointer-events-none z-[100]"
          style={{ backgroundColor: particle.color }}
        />
      ))}
    </AnimatePresence>
  );
};

/**
 * Pulse animation for notifications/badges
 */
export const Pulse = ({ children, active = true, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  if (!active || shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Shake animation for errors
 */
export const Shake = ({ children, active = false, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={active && !shouldReduceMotion ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Export motion for custom animations
export { motion, useReducedMotion };
