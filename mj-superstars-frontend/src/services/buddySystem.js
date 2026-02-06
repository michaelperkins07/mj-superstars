// ============================================================
// MJ's Superstars - Buddy System Service
// Accountability partners for mutual support
// ============================================================

import api from './api';
import { trackFeatureUsed } from './analytics';

// ============================================================
// BUDDY STATUS TYPES
// ============================================================

export const BUDDY_STATUS = {
  PENDING_SENT: 'pending_sent',     // You sent an invite
  PENDING_RECEIVED: 'pending_received', // You received an invite
  ACTIVE: 'active',                  // Active buddy relationship
  PAUSED: 'paused',                  // Temporarily paused
  ENDED: 'ended'                     // Ended relationship
};

export const SHARING_LEVELS = {
  NONE: 'none',           // No sharing
  STREAKS: 'streaks',     // Only share streaks
  MOODS: 'moods',         // Share mood scores (not details)
  DETAILED: 'detailed'    // Share moods with notes
};

export const CELEBRATION_TYPES = {
  STREAK_MILESTONE: 'streak_milestone',
  MOOD_IMPROVEMENT: 'mood_improvement',
  GOAL_COMPLETED: 'goal_completed',
  WEEKLY_CHECK_IN: 'weekly_check_in',
  CUSTOM: 'custom'
};

// ============================================================
// BUDDY MANAGEMENT
// ============================================================

/**
 * Get current buddy information
 */
export async function getCurrentBuddy() {
  try {
    const response = await api.get('/api/buddy');
    return response.data;
  } catch (err) {
    console.error('Failed to get buddy:', err);
    return null;
  }
}

/**
 * Send a buddy invite via code
 */
export async function sendBuddyInvite(inviteCode) {
  try {
    const response = await api.post('/api/buddy/invite', { code: inviteCode });
    trackFeatureUsed('buddy_invite_sent');
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to send invite');
  }
}

/**
 * Generate your own invite code
 */
export async function generateInviteCode() {
  try {
    const response = await api.post('/api/buddy/generate-code');
    return response.data.code;
  } catch (err) {
    throw new Error('Failed to generate invite code');
  }
}

/**
 * Accept a buddy request
 */
export async function acceptBuddyRequest(requestId) {
  try {
    const response = await api.post(`/api/buddy/accept/${requestId}`);
    trackFeatureUsed('buddy_request_accepted');
    return response.data;
  } catch (err) {
    throw new Error('Failed to accept request');
  }
}

/**
 * Decline a buddy request
 */
export async function declineBuddyRequest(requestId) {
  try {
    await api.post(`/api/buddy/decline/${requestId}`);
    return true;
  } catch (err) {
    throw new Error('Failed to decline request');
  }
}

/**
 * Update sharing preferences with buddy
 */
export async function updateSharingPreferences(preferences) {
  try {
    const response = await api.put('/api/buddy/preferences', preferences);
    return response.data;
  } catch (err) {
    throw new Error('Failed to update preferences');
  }
}

/**
 * Pause buddy relationship
 */
export async function pauseBuddyRelationship() {
  try {
    await api.post('/api/buddy/pause');
    return true;
  } catch (err) {
    throw new Error('Failed to pause relationship');
  }
}

/**
 * Resume buddy relationship
 */
export async function resumeBuddyRelationship() {
  try {
    await api.post('/api/buddy/resume');
    return true;
  } catch (err) {
    throw new Error('Failed to resume relationship');
  }
}

/**
 * End buddy relationship
 */
export async function endBuddyRelationship() {
  try {
    await api.delete('/api/buddy');
    return true;
  } catch (err) {
    throw new Error('Failed to end relationship');
  }
}

// ============================================================
// BUDDY ACTIVITIES
// ============================================================

/**
 * Send a nudge/encouragement to buddy
 */
export async function sendNudge(message, type = 'encouragement') {
  try {
    const response = await api.post('/api/buddy/nudge', { message, type });
    trackFeatureUsed('buddy_nudge_sent', { type });
    return response.data;
  } catch (err) {
    throw new Error('Failed to send nudge');
  }
}

/**
 * Get nudges received from buddy
 */
export async function getNudges(limit = 10) {
  try {
    const response = await api.get('/api/buddy/nudges', { params: { limit } });
    return response.data;
  } catch (err) {
    return [];
  }
}

/**
 * Send a celebration to buddy
 */
export async function sendCelebration(type, data = {}) {
  try {
    const response = await api.post('/api/buddy/celebrate', { type, ...data });
    trackFeatureUsed('buddy_celebration_sent', { type });
    return response.data;
  } catch (err) {
    throw new Error('Failed to send celebration');
  }
}

/**
 * Get buddy's shared activity
 */
export async function getBuddyActivity() {
  try {
    const response = await api.get('/api/buddy/activity');
    return response.data;
  } catch (err) {
    return null;
  }
}

/**
 * Get shared goals with buddy
 */
export async function getSharedGoals() {
  try {
    const response = await api.get('/api/buddy/goals');
    return response.data;
  } catch (err) {
    return [];
  }
}

/**
 * Create a shared goal with buddy
 */
export async function createSharedGoal(goal) {
  try {
    const response = await api.post('/api/buddy/goals', goal);
    trackFeatureUsed('buddy_goal_created');
    return response.data;
  } catch (err) {
    throw new Error('Failed to create shared goal');
  }
}

/**
 * Update shared goal progress
 */
export async function updateGoalProgress(goalId, progress) {
  try {
    const response = await api.put(`/api/buddy/goals/${goalId}`, { progress });
    return response.data;
  } catch (err) {
    throw new Error('Failed to update goal');
  }
}

// ============================================================
// QUICK MESSAGES
// ============================================================

export const QUICK_NUDGES = [
  { id: 'thinking', emoji: '💭', message: "Thinking of you!" },
  { id: 'proud', emoji: '🌟', message: "Proud of you!" },
  { id: 'checkin', emoji: '👋', message: "How are you doing?" },
  { id: 'youvegot', emoji: '💪', message: "You've got this!" },
  { id: 'here', emoji: '🤗', message: "I'm here for you" },
  { id: 'breathe', emoji: '🌬️', message: "Remember to breathe" },
  { id: 'selfcare', emoji: '💚', message: "Time for self-care!" },
  { id: 'celebrate', emoji: '🎉', message: "Let's celebrate!" }
];

export const CELEBRATION_MESSAGES = {
  [CELEBRATION_TYPES.STREAK_MILESTONE]: [
    "Amazing streak! Keep it going! 🔥",
    "Look at that consistency! 🌟",
    "You're unstoppable! 💪"
  ],
  [CELEBRATION_TYPES.MOOD_IMPROVEMENT]: [
    "Your mood is trending up! ☀️",
    "Seeing positive changes! 🌈",
    "Growth looks good on you! 🌱"
  ],
  [CELEBRATION_TYPES.GOAL_COMPLETED]: [
    "You did it! Goal crushed! 🎯",
    "Another one down! 🏆",
    "So proud of your progress! ⭐"
  ],
  [CELEBRATION_TYPES.WEEKLY_CHECK_IN]: [
    "Great week together! 🤝",
    "We're in this together! 💪",
    "Teamwork makes the dream work! ✨"
  ]
};

// ============================================================
// BUDDY HOOKS
// ============================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for buddy system
 */
export function useBuddy() {
  const [buddy, setBuddy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCurrentBuddy();
      setBuddy(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendNudgeTobuddy = useCallback(async (message, type) => {
    const result = await sendNudge(message, type);
    return result;
  }, []);

  const celebrateBuddy = useCallback(async (type, data) => {
    const result = await sendCelebration(type, data);
    return result;
  }, []);

  return {
    buddy,
    loading,
    error,
    refresh,
    hasBuddy: !!buddy && buddy.status === BUDDY_STATUS.ACTIVE,
    sendNudge: sendNudgeTobuddy,
    celebrate: celebrateBuddy,
    updatePreferences: updateSharingPreferences,
    pause: pauseBuddyRelationship,
    resume: resumeBuddyRelationship,
    end: endBuddyRelationship
  };
}

/**
 * Hook for buddy invites
 */
export function useBuddyInvites() {
  const [invites, setInvites] = useState([]);
  const [myCode, setMyCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateCode = useCallback(async () => {
    setLoading(true);
    try {
      const code = await generateInviteCode();
      setMyCode(code);
      return code;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendInvite = useCallback(async (code) => {
    setLoading(true);
    try {
      return await sendBuddyInvite(code);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(async (requestId) => {
    const result = await acceptBuddyRequest(requestId);
    setInvites(prev => prev.filter(i => i.id !== requestId));
    return result;
  }, []);

  const declineInvite = useCallback(async (requestId) => {
    await declineBuddyRequest(requestId);
    setInvites(prev => prev.filter(i => i.id !== requestId));
  }, []);

  return {
    invites,
    myCode,
    loading,
    generateCode,
    sendInvite,
    acceptInvite,
    declineInvite
  };
}

/**
 * Hook for buddy activity feed
 */
export function useBuddyActivity() {
  const [activity, setActivity] = useState(null);
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [activityData, nudgesData] = await Promise.all([
        getBuddyActivity(),
        getNudges()
      ]);
      setActivity(activityData);
      setNudges(nudgesData);
    } catch (err) {
      console.error('Failed to load buddy activity:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    activity,
    nudges,
    loading,
    refresh
  };
}

// ============================================================
// EXPORT
// ============================================================

export default {
  BUDDY_STATUS,
  SHARING_LEVELS,
  CELEBRATION_TYPES,
  QUICK_NUDGES,
  CELEBRATION_MESSAGES,

  // Core functions
  getCurrentBuddy,
  sendBuddyInvite,
  generateInviteCode,
  acceptBuddyRequest,
  declineBuddyRequest,
  updateSharingPreferences,
  pauseBuddyRelationship,
  resumeBuddyRelationship,
  endBuddyRelationship,

  // Activities
  sendNudge,
  getNudges,
  sendCelebration,
  getBuddyActivity,
  getSharedGoals,
  createSharedGoal,
  updateGoalProgress,

  // Hooks
  useBuddy,
  useBuddyInvites,
  useBuddyActivity
};
