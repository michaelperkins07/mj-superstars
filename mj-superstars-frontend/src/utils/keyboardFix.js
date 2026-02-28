// ============================================================
// iOS Keyboard Fix
// Ensures focused inputs are visible when the iOS keyboard opens
// Works with Capacitor's Keyboard plugin (resize: 'body')
// ============================================================

let isKeyboardVisible = false;
let cleanupFunctions = [];

/**
 * Initialize the iOS keyboard fix.
 * Call once on app mount. Returns a cleanup function.
 */
export function initKeyboardFix() {
  // Only needed on iOS / Capacitor
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isIOS && !window.Capacitor?.isNativePlatform?.()) {
    return () => {};
  }

  // 1. Use Capacitor Keyboard events if available
  if (window.Capacitor?.Plugins?.Keyboard) {
    try {
      const { Keyboard } = window.Capacitor.Plugins;

      const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        isKeyboardVisible = true;
        document.body.classList.add('keyboard-open');
        // Give the DOM time to resize, then scroll active element into view
        requestAnimationFrame(() => {
          scrollActiveInputIntoView(info.keyboardHeight);
        });
      });

      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        isKeyboardVisible = false;
        document.body.classList.remove('keyboard-open');
      });

      cleanupFunctions.push(() => {
        showListener?.remove?.();
        hideListener?.remove?.();
      });
    } catch (e) {
      // Plugin not available, fall back to visualViewport
    }
  }

  // 2. Fallback: Use visualViewport API for keyboard detection
  if (window.visualViewport) {
    const handleResize = () => {
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const keyboardHeight = windowHeight - viewportHeight;

      if (keyboardHeight > 100) {
        // Keyboard is likely open
        if (!isKeyboardVisible) {
          isKeyboardVisible = true;
          document.body.classList.add('keyboard-open');
        }
        scrollActiveInputIntoView(keyboardHeight);
      } else if (isKeyboardVisible) {
        isKeyboardVisible = false;
        document.body.classList.remove('keyboard-open');
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    cleanupFunctions.push(() => {
      window.visualViewport.removeEventListener('resize', handleResize);
    });
  }

  // 3. Focus handler: scroll focused inputs into view
  const handleFocusIn = (e) => {
    const target = e.target;
    if (!target || !isInputElement(target)) return;

    // Delay to let keyboard animation complete
    setTimeout(() => {
      scrollActiveInputIntoView();
    }, 300);
  };

  document.addEventListener('focusin', handleFocusIn, { passive: true });
  cleanupFunctions.push(() => {
    document.removeEventListener('focusin', handleFocusIn);
  });

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    document.body.classList.remove('keyboard-open');
  };
}

function isInputElement(el) {
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.contentEditable === 'true';
}

function scrollActiveInputIntoView(keyboardHeight = 0) {
  const activeEl = document.activeElement;
  if (!activeEl || !isInputElement(activeEl)) return;

  // Use scrollIntoView with a slight delay for smooth behavior
  requestAnimationFrame(() => {
    try {
      // Find the nearest scrollable parent
      const scrollParent = findScrollableParent(activeEl);

      if (scrollParent) {
        const inputRect = activeEl.getBoundingClientRect();
        const scrollRect = scrollParent.getBoundingClientRect();
        const viewportBottom = window.innerHeight - keyboardHeight;

        // If input is below the visible area (keyboard covers it)
        if (inputRect.bottom > viewportBottom - 20) {
          // Scroll so the input is comfortably above the keyboard
          const scrollAmount = inputRect.bottom - viewportBottom + 80; // 80px buffer
          scrollParent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
        // If input is above the visible area
        else if (inputRect.top < scrollRect.top) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // No scrollable parent found, try native scrollIntoView
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      // Fallback: simple scrollIntoView
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function findScrollableParent(el) {
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
