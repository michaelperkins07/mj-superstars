// ============================================================
// MJ's Superstars - Web Deep Link Router
// Handles URL-based navigation when the app loads in a browser
// ============================================================

// Map URL paths to app tab names
const PATH_TO_TAB = {
  mood: 'mood',
  chat: 'chat',
  journal: 'journal',
  tasks: 'tasks',
  explore: 'explore',
  insights: 'insights',
  profile: 'profile',
  breathing: 'explore',
  coping: 'explore',
  rituals: 'rituals',
  gamification: 'gamification',
};

/**
 * Parse the current URL and return navigation intent
 * @returns {{ tab: string|null, params: object }} navigation intent or null
 */
export function parseDeepLinkFromUrl() {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(searchParams);

  // Skip non-deep-link paths
  if (path === '/' || path === '/index.html') return null;

  // Remove leading slash and get first segment
  const segments = path.split('/').filter(Boolean);
  const primaryRoute = segments[0]?.toLowerCase();

  if (!primaryRoute) return null;

  // Special routes that aren't tab navigation
  if (primaryRoute === 'reset-password') return null; // Handled by AuthScreen
  if (primaryRoute === 'privacy-policy' || primaryRoute === 'privacy.html') return null;
  if (primaryRoute === 'terms-of-service' || primaryRoute === 'support.html') return null;

  const tab = PATH_TO_TAB[primaryRoute];
  if (tab) {
    return { tab, params, subRoute: segments[1] || null };
  }

  // Handle /share/* and /invite/* for social features
  if (primaryRoute === 'share' || primaryRoute === 'invite') {
    return { tab: null, action: primaryRoute, code: segments[1] || null, params };
  }

  return null;
}

/**
 * Apply deep link navigation by dispatching to the main app
 * Should be called once on app mount, after auth is resolved
 */
export function applyDeepLink() {
  const intent = parseDeepLinkFromUrl();
  if (!intent) return false;

  if (intent.tab) {
    // Navigate to the tab via custom event
    window.dispatchEvent(new CustomEvent('mj-navigate', { detail: intent.tab }));

    // Clean the URL so it doesn't re-trigger on reload
    if (window.history.replaceState) {
      window.history.replaceState({}, '', '/');
    }
    return true;
  }

  if (intent.action === 'share') {
    // Store share code for the social sharing system to pick up
    if (intent.code) {
      sessionStorage.setItem('mj_share_code', intent.code);
    }
    if (window.history.replaceState) {
      window.history.replaceState({}, '', '/');
    }
    return true;
  }

  if (intent.action === 'invite') {
    // Store referral code for the referral system to pick up
    if (intent.code) {
      sessionStorage.setItem('mj_referral_code', intent.code);
      localStorage.setItem('mj_referral_code', intent.code);
    }
    if (window.history.replaceState) {
      window.history.replaceState({}, '', '/');
    }
    return true;
  }

  return false;
}
