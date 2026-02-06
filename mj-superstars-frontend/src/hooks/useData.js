// ============================================================
// MJ's Superstars - Data Hooks
// React hooks for data operations
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';

/**
 * Hook for mood tracking
 */
export function useMood() {
  const { moods, logMood, getMoodTrends } = useData();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(false);

  const todaysMoods = moods.filter(m => {
    const today = new Date().toDateString();
    return new Date(m.timestamp).toDateString() === today;
  });

  const latestMood = moods[0] || null;

  const averageMood = todaysMoods.length > 0
    ? todaysMoods.reduce((sum, m) => sum + m.mood_score, 0) / todaysMoods.length
    : null;

  const loadTrends = useCallback(async (period = '7d') => {
    setLoading(true);
    try {
      const result = await getMoodTrends(period);
      setTrends(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [getMoodTrends]);

  return {
    moods,
    todaysMoods,
    latestMood,
    averageMood,
    trends,
    loading,
    logMood,
    loadTrends
  };
}

/**
 * Hook for task management
 */
export function useTasks() {
  const { tasks, createTask, completeTask, getTodayTasks } = useData();
  const [loading, setLoading] = useState(false);

  const today = new Date().toDateString();

  const todaysTasks = tasks.filter(t => {
    const taskDate = new Date(t.created_at || t.due_date).toDateString();
    return taskDate === today;
  });

  const pendingTasks = todaysTasks.filter(t => t.status === 'pending');
  const completedTasks = todaysTasks.filter(t => t.status === 'completed');

  const completionRate = todaysTasks.length > 0
    ? (completedTasks.length / todaysTasks.length) * 100
    : 0;

  const addTask = useCallback(async (taskData) => {
    setLoading(true);
    try {
      return await createTask(taskData);
    } finally {
      setLoading(false);
    }
  }, [createTask]);

  const markComplete = useCallback(async (taskId, data = {}) => {
    setLoading(true);
    try {
      return await completeTask(taskId, data);
    } finally {
      setLoading(false);
    }
  }, [completeTask]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      return await getTodayTasks();
    } finally {
      setLoading(false);
    }
  }, [getTodayTasks]);

  return {
    tasks,
    todaysTasks,
    pendingTasks,
    completedTasks,
    completionRate,
    loading,
    addTask,
    markComplete,
    refresh
  };
}

/**
 * Hook for conversations with MJ
 */
export function useConversation() {
  const {
    activeConversation,
    startConversation,
    sendMessage,
    loadConversation,
    setActiveConversation
  } = useData();

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messages = activeConversation?.messages || [];

  const start = useCallback(async (initialMood) => {
    setLoading(true);
    try {
      return await startConversation(initialMood);
    } finally {
      setLoading(false);
    }
  }, [startConversation]);

  const send = useCallback(async (content, isVoice = false) => {
    if (!activeConversation) {
      throw new Error('No active conversation');
    }
    setSending(true);
    try {
      return await sendMessage(activeConversation.id, content, isVoice);
    } finally {
      setSending(false);
    }
  }, [activeConversation, sendMessage]);

  const load = useCallback(async (conversationId) => {
    setLoading(true);
    try {
      return await loadConversation(conversationId);
    } finally {
      setLoading(false);
    }
  }, [loadConversation]);

  const close = useCallback(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  return {
    conversation: activeConversation,
    messages,
    loading,
    sending,
    start,
    send,
    load,
    close
  };
}

/**
 * Hook for coping tools
 */
export function useCopingTools() {
  const { copingTools, getCopingTools, logToolUse } = useData();
  const [loading, setLoading] = useState(false);

  const breathingExercises = copingTools.filter(t => t.category === 'breathing');
  const groundingExercises = copingTools.filter(t => t.category === 'grounding');
  const otherTools = copingTools.filter(t =>
    !['breathing', 'grounding'].includes(t.category)
  );

  const load = useCallback(async (category) => {
    setLoading(true);
    try {
      return await getCopingTools(category);
    } finally {
      setLoading(false);
    }
  }, [getCopingTools]);

  const logUse = useCallback(async (toolId, data) => {
    return await logToolUse(toolId, data);
  }, [logToolUse]);

  return {
    tools: copingTools,
    breathingExercises,
    groundingExercises,
    otherTools,
    loading,
    load,
    logUse
  };
}

/**
 * Hook for progress and streaks
 */
export function useProgress() {
  const { streaks, achievements, getProgress } = useData();
  const [loading, setLoading] = useState(false);

  const currentStreak = streaks?.current_streak || 0;
  const longestStreak = streaks?.longest_streak || 0;

  const earnedAchievements = achievements.filter(a => a.earned);
  const lockedAchievements = achievements.filter(a => !a.earned);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      return await getProgress();
    } finally {
      setLoading(false);
    }
  }, [getProgress]);

  return {
    streaks,
    currentStreak,
    longestStreak,
    achievements,
    earnedAchievements,
    lockedAchievements,
    loading,
    load
  };
}

/**
 * Hook for daily affirmation
 */
export function useAffirmation() {
  const { getDailyAffirmation } = useData();
  const [affirmation, setAffirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDailyAffirmation();
      setAffirmation(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [getDailyAffirmation]);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  return {
    affirmation,
    loading,
    refresh: load
  };
}

/**
 * Hook for sync status
 */
export function useSyncStatus() {
  const { isOnline, syncing, lastSyncTime, syncAllData } = useData();

  const timeSinceSync = lastSyncTime
    ? Math.floor((Date.now() - new Date(lastSyncTime).getTime()) / 1000 / 60)
    : null;

  return {
    isOnline,
    syncing,
    lastSyncTime,
    timeSinceSync,
    sync: syncAllData
  };
}

export default {
  useMood,
  useTasks,
  useConversation,
  useCopingTools,
  useProgress,
  useAffirmation,
  useSyncStatus
};
