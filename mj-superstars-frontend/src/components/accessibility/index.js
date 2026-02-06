// ============================================================
// MJ's Superstars - Accessibility Components & Utilities
// WCAG 2.1 AA compliant components for inclusive design
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// ACCESSIBILITY CONTEXT
// ============================================================

const AccessibilityContext = createContext({
  reduceMotion: false,
  highContrast: false,
  fontSize: 'normal',
  screenReaderActive: false,
  setFontSize: () => {},
  setHighContrast: () => {},
  announceMessage: () => {}
});

/**
 * Accessibility Provider - wrap your app with this
 */
export function AccessibilityProvider({ children }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // 'small', 'normal', 'large', 'xlarge'
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const announcerRef = useRef(null);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handler = (e) => setReduceMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Detect high contrast mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(mediaQuery.matches);

    const handler = (e) => setHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Load saved preferences
  useEffect(() => {
    const savedFontSize = localStorage.getItem('mj_font_size');
    const savedContrast = localStorage.getItem('mj_high_contrast');

    if (savedFontSize) setFontSize(savedFontSize);
    if (savedContrast) setHighContrast(savedContrast === 'true');
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('mj_font_size', fontSize);
    localStorage.setItem('mj_high_contrast', String(highContrast));
  }, [fontSize, highContrast]);

  // Apply font size to root
  useEffect(() => {
    const root = document.documentElement;
    const sizes = {
      small: '14px',
      normal: '16px',
      large: '18px',
      xlarge: '20px'
    };
    root.style.fontSize = sizes[fontSize] || sizes.normal;
  }, [fontSize]);

  // Apply high contrast mode
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  // Screen reader announcement
  const announceMessage = useCallback((message, priority = 'polite') => {
    if (announcerRef.current) {
      // Clear and set new message for reliable announcement
      announcerRef.current.textContent = '';
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      }, 100);
    }
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        reduceMotion,
        highContrast,
        fontSize,
        screenReaderActive,
        setFontSize,
        setHighContrast,
        announceMessage
      }}
    >
      {children}
      {/* Live region for announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook to access accessibility context
 */
export function useAccessibility() {
  return useContext(AccessibilityContext);
}

// ============================================================
// SCREEN READER UTILITIES
// ============================================================

/**
 * Screen reader only text (visually hidden)
 */
export function ScreenReaderOnly({ children, as: Tag = 'span' }) {
  return (
    <Tag className="sr-only">
      {children}
    </Tag>
  );
}

/**
 * Skip to main content link
 */
export function SkipToContent({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-sky-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
    >
      Skip to main content
    </a>
  );
}

/**
 * Live region for dynamic announcements
 */
export function LiveRegion({ message, priority = 'polite', className = '' }) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  );
}

// ============================================================
// FOCUS MANAGEMENT
// ============================================================

/**
 * Focus trap for modals/dialogs
 */
export function FocusTrap({ children, active = true, restoreFocus = true }) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement;

    // Get focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus first element
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Handle tab key
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, restoreFocus]);

  return <div ref={containerRef}>{children}</div>;
}

/**
 * Hook for managing focus
 */
export function useFocusManagement() {
  const focusRef = useRef(null);

  const setFocus = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const moveFocus = useCallback((direction, elements) => {
    const currentIndex = elements.findIndex(el => el === document.activeElement);
    let nextIndex;

    if (direction === 'next') {
      nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
    }

    elements[nextIndex]?.focus();
  }, []);

  return { focusRef, setFocus, moveFocus };
}

// ============================================================
// ACCESSIBLE COMPONENTS
// ============================================================

/**
 * Accessible Button with proper ARIA
 */
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${className}`}
      {...props}
    >
      {loading && <ScreenReaderOnly>Loading...</ScreenReaderOnly>}
      {children}
    </button>
  );
}

/**
 * Accessible Modal/Dialog
 */
export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = ''
}) {
  const { announceMessage } = useAccessibility();

  useEffect(() => {
    if (isOpen) {
      announceMessage(`${title} dialog opened`);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, announceMessage]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 id="modal-title" className="text-xl font-bold text-white mb-2">
            {title}
          </h2>
          {description && (
            <p id="modal-description" className="text-slate-400 mb-4">
              {description}
            </p>
          )}

          {children}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </FocusTrap>
  );
}

/**
 * Accessible Slider/Range Input
 */
export function AccessibleSlider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  label,
  valueLabel,
  className = ''
}) {
  const { announceMessage } = useAccessibility();
  const id = useRef(`slider-${Math.random().toString(36).substr(2, 9)}`);

  const handleChange = (e) => {
    const newValue = Number(e.target.value);
    onChange(newValue);
    announceMessage(`${label}: ${valueLabel?.(newValue) || newValue}`);
  };

  return (
    <div className={className}>
      <label htmlFor={id.current} className="block text-sm font-medium text-slate-300 mb-2">
        {label}
        {valueLabel && (
          <span className="ml-2 text-white font-semibold">
            {valueLabel(value)}
          </span>
        )}
      </label>
      <input
        type="range"
        id={id.current}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueLabel?.(value)}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
}

/**
 * Accessible Toggle/Switch
 */
export function AccessibleToggle({
  checked,
  onChange,
  label,
  description,
  className = ''
}) {
  const { announceMessage } = useAccessibility();
  const id = useRef(`toggle-${Math.random().toString(36).substr(2, 9)}`);

  const handleToggle = () => {
    const newValue = !checked;
    onChange(newValue);
    announceMessage(`${label} ${newValue ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <label
          htmlFor={id.current}
          className="text-white font-medium cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-slate-400 text-sm">{description}</p>
        )}
      </div>

      <button
        id={id.current}
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          checked ? 'bg-sky-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
        <ScreenReaderOnly>
          {checked ? 'On' : 'Off'}
        </ScreenReaderOnly>
      </button>
    </div>
  );
}

/**
 * Accessible Tabs
 */
export function AccessibleTabs({ tabs, activeTab, onChange, className = '' }) {
  const { announceMessage } = useAccessibility();

  const handleKeyDown = (e, index) => {
    let newIndex = index;

    if (e.key === 'ArrowRight') {
      newIndex = index < tabs.length - 1 ? index + 1 : 0;
    } else if (e.key === 'ArrowLeft') {
      newIndex = index > 0 ? index - 1 : tabs.length - 1;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    onChange(tabs[newIndex].id);
    announceMessage(`${tabs[newIndex].label} tab`);
  };

  return (
    <div role="tablist" className={`flex gap-2 ${className}`}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            activeTab === tab.id
              ? 'bg-sky-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Accessible Loading Spinner
 */
export function AccessibleSpinner({ label = 'Loading...' }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      <svg
        className="w-5 h-5 animate-spin text-sky-500"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Accessible Error Message
 */
export function AccessibleError({ message, id }) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="text-red-400 text-sm mt-1 flex items-center gap-1"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {message}
    </div>
  );
}

// ============================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================

/**
 * Hook for keyboard navigation in lists
 */
export function useKeyboardNavigation(items, onSelect) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(items[focusedIndex], focusedIndex);
        break;
    }
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

// ============================================================
// ACCESSIBILITY SETTINGS COMPONENT
// ============================================================

/**
 * Accessibility Settings Panel
 */
export function AccessibilitySettings() {
  const {
    highContrast,
    fontSize,
    setHighContrast,
    setFontSize
  } = useAccessibility();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Accessibility</h2>

      {/* Font Size */}
      <div>
        <h3 className="text-white font-medium mb-3">Text Size</h3>
        <div className="flex gap-2">
          {['small', 'normal', 'large', 'xlarge'].map(size => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                fontSize === size
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              aria-pressed={fontSize === size}
            >
              {size === 'xlarge' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* High Contrast */}
      <AccessibleToggle
        checked={highContrast}
        onChange={setHighContrast}
        label="High Contrast"
        description="Increase contrast for better visibility"
      />

      {/* Instructions */}
      <div className="bg-slate-700/50 rounded-xl p-4">
        <h3 className="text-white font-medium mb-2">Keyboard Shortcuts</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li><kbd className="bg-slate-600 px-1 rounded">Tab</kbd> Navigate between elements</li>
          <li><kbd className="bg-slate-600 px-1 rounded">Enter</kbd> or <kbd className="bg-slate-600 px-1 rounded">Space</kbd> Activate buttons</li>
          <li><kbd className="bg-slate-600 px-1 rounded">Escape</kbd> Close dialogs</li>
          <li><kbd className="bg-slate-600 px-1 rounded">←</kbd> <kbd className="bg-slate-600 px-1 rounded">→</kbd> Navigate tabs</li>
        </ul>
      </div>
    </div>
  );
}

// CSS for screen reader only class (add to your global styles)
export const srOnlyStyles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.high-contrast {
  --color-text: #ffffff;
  --color-background: #000000;
  --color-primary: #00d4ff;
  --color-border: #ffffff;
}

.high-contrast * {
  border-color: white !important;
}

.high-contrast .text-slate-400,
.high-contrast .text-slate-500 {
  color: #d1d5db !important;
}
`;

export default {
  AccessibilityProvider,
  useAccessibility,
  ScreenReaderOnly,
  SkipToContent,
  LiveRegion,
  FocusTrap,
  useFocusManagement,
  AccessibleButton,
  AccessibleModal,
  AccessibleSlider,
  AccessibleToggle,
  AccessibleTabs,
  AccessibleSpinner,
  AccessibleError,
  useKeyboardNavigation,
  AccessibilitySettings,
  srOnlyStyles
};
