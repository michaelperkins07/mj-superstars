// ============================================================
// MJ's Superstars - Data Context
// Syncs app data between local storage and backend API
// Provides offline-first data management
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  MoodAPI,
  TaskAPI,
  ConversationAPI,
  JournalAPI,
  RitualAPI,
  ProgressAPI,
  CopingAPI,
  ContentAPI,
  InsightsAPI,
  TokenManager
} from '../services/api';
import { socketService, useSocketEvent } from '../services/socket';

const DataContext = createContext(null);

// Local storage wrapper with JSON parsing
const localStore = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { console.error('Storage error:', e); }
  },
  remove: (key) => localStorage.removeItem(key)
};

export function DataProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Data state
  const [moods, setMoods] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [copingTools, setCopingTools] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [insights, setInsights] = useState([]);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial data from local storage
  useEffect(() => {
    setMoods(localStore.get('mj_mood_log') || []);
    setTasks(localStore.get('mj_daily_tasks') || []);
    setCopingTools(localStore.get('mj_coping_tools') || []);
    setConversations(localStore.get('mj_conversations') || []);
  }, []);

  // Sync with server when coming online
  useEffect(() => {
    if (isOnline && TokenManager.isAuthenticated()) {
      syncAllData();
    }
  }, [isOnline]);

  // ============================================================
  // MOOD TRACKING
  // ============================================================

  const logMood = useCallback(async (moodScore, data = {}) => {
    const moodEntry = {
      id: Date.now().toString(),
      mood_score: moodScore,
      ...data,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Update local state immediately
    const updatedMoods = [moodEntry, ...moods];
    setMoods(updatedMoods);
    localStore.set('mj_mood_log', updatedMoods);

    // Sync to server if online
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await MoodAPI.log(moodScore, data);
        // Update with server response
        const syncedMoods = updatedMoods.map(m =>
          m.id === moodEntry.id ? { ...response.mood, synced: true } : m
        );
        setMoods(syncedMoods);
        localStore.set('mj_mood_log', syncedMoods);
        return response;
      } catch (err) {
        console.error('Failed to sync mood:', err);
        queueOfflineAction('mood', 'create', moodEntry);
      }
    } else {
      queueOfflineAction('mood', 'create', moodEntry);
    }

    return { mood: moodEntry };
  }, [moods, isOnline]);

  const getMoodTrends = useCallback(async (period = '7d') => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        return await MoodAPI.getTrends(period);
      } catch (err) {
        console.error('Failed to get mood trends:', err);
      }
    }

    // Calculate locally
    const now = new Date();
    const periodDays = parseInt(period) || 7;
    const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const recentMoods = moods.filter(m => new Date(m.timestamp) > cutoff);

    return {
      average: recentMoods.reduce((sum, m) => sum + m.mood_score, 0) / recentMoods.length || 0,
      entries: recentMoods.length,
      trend: recentMoods.length > 1 ?
        (recentMoods[0].mood_score - recentMoods[recentMoods.length - 1].mood_score) : 0
    };
  }, [moods, isOnline]);

  // ============================================================
  // TASKS
  // ============================================================

  const createTask = useCallback(async (taskData) => {
    const task = {
      id: Date.now().toString(),
      ...taskData,
      status: 'pending',
      created_at: new Date().toISOString(),
      synced: false
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    localStore.set('mj_daily_tasks', updatedTasks);

    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await TaskAPI.create(taskData);
        const syncedTasks = updatedTasks.map(t =>
          t.id === task.id ? { ...response.task, synced: true } : t
        );
        setTasks(syncedTasks);
        localStore.set('mj_daily_tasks', syncedTasks);
        return response;
      } catch (err) {
        console.error('Failed to sync task:', err);
        queueOfflineAction('task', 'create', task);
      }
    } else {
      queueOfflineAction('task', 'create', task);
    }

    return { task };
  }, [tasks, isOnline]);

  const completeTask = useCallback(async (taskId, data = {}) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t
    );
    setTasks(updatedTasks);
    localStore.set('mj_daily_tasks', updatedTasks);

    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await TaskAPI.complete(taskId, data);

        // Also emit via socket for real-time updates
        socketService.completeTask(taskId);

        return response;
      } catch (err) {
        console.error('Failed to sync task completion:', err);
        queueOfflineAction('task', 'complete', { taskId, data });
      }
    } else {
      queueOfflineAction('task', 'complete', { taskId, data });
    }

    return { success: true };
  }, [tasks, isOnline]);

  const getTodayTasks = useCallback(async () => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await TaskAPI.getToday();
        const merged = mergeTasks(tasks, response.tasks);
        setTasks(merged);
        localStore.set('mj_daily_tasks', merged);
        return response;
      } catch (err) {
        console.error('Failed to get today tasks:', err);
      }
    }

    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t =>
      new Date(t.created_at).toDateString() === today ||
      (t.due_date && new Date(t.due_date).toDateString() === today)
    );
    return { tasks: todayTasks };
  }, [tasks, isOnline]);

  // ============================================================
  // CONVERSATIONS
  // ============================================================

  const startConversation = useCallback(async (initialMood) => {
    const conversation = {
      id: Date.now().toString(),
      initial_mood: initialMood,
      messages: [],
      started_at: new Date().toISOString(),
      synced: false
    };

    const updatedConversations = [conversation, ...conversations];
    setConversations(updatedConversations);
    setActiveConversation(conversation);
    localStore.set('mj_conversations', updatedConversations);

    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await ConversationAPI.create(initialMood);

        // Join socket room
        socketService.joinConversation(response.conversation.id);

        const syncedConversation = { ...response.conversation, synced: true };
        const synced = updatedConversations.map(c =>
          c.id === conversation.id ? syncedConversation : c
        );
        setConversations(synced);
        setActiveConversation(syncedConversation);
        localStore.set('mj_conversations', synced);
        return response;
      } catch (err) {
        console.error('Failed to sync conversation:', err);
      }
    }

    return { conversation };
  }, [conversations, isOnline]);

  const sendMessage = useCallback(async (conversationId, content, isVoice = false) => {
    const message = {
      id: Date.now().toString(),
      conversation_id: conversationId,
      content,
      role: 'user',
      is_voice: isVoice,
      created_at: new Date().toISOString()
    };

    // Add to local conversation
    if (activeConversation && activeConversation.id === conversationId) {
      const updated = {
        ...activeConversation,
        messages: [...(activeConversation.messages || []), message]
      };
      setActiveConversation(updated);
    }

    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        // Use socket for real-time messaging
        socketService.sendMessage(conversationId, content, isVoice);
        return { message };
      } catch (err) {
        console.error('Failed to send message:', err);
        // Fall back to REST API
        return await ConversationAPI.sendMessage(conversationId, content, isVoice);
      }
    }

    return { message };
  }, [activeConversation, isOnline]);

  const loadConversation = useCallback(async (conversationId) => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await ConversationAPI.get(conversationId);
        setActiveConversation(response.conversation);

        // Join socket room
        socketService.joinConversation(conversationId);

        return response;
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    }

    const local = conversations.find(c => c.id === conversationId);
    if (local) {
      setActiveConversation(local);
      return { conversation: local };
    }

    return null;
  }, [conversations, isOnline]);

  // Handle incoming messages from socket
  useSocketEvent('mj_response', (data) => {
    if (activeConversation && data.conversation_id === activeConversation.id) {
      const updated = {
        ...activeConversation,
        messages: [...(activeConversation.messages || []), data.message]
      };
      setActiveConversation(updated);
    }
  });

  // ============================================================
  // COPING TOOLS
  // ============================================================

  const getCopingTools = useCallback(async (category) => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await CopingAPI.getTools(category);
        setCopingTools(response.tools);
        localStore.set('mj_coping_tools', response.tools);
        return response;
      } catch (err) {
        console.error('Failed to get coping tools:', err);
      }
    }

    return { tools: copingTools };
  }, [copingTools, isOnline]);

  const logToolUse = useCallback(async (toolId, data) => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        return await CopingAPI.logToolUse(toolId, data);
      } catch (err) {
        console.error('Failed to log tool use:', err);
        queueOfflineAction('coping', 'logUse', { toolId, data });
      }
    } else {
      queueOfflineAction('coping', 'logUse', { toolId, data });
    }
  }, [isOnline]);

  // ============================================================
  // PROGRESS & STREAKS
  // ============================================================

  const getProgress = useCallback(async () => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        const response = await ProgressAPI.getDashboard();
        setStreaks(response.streaks);
        setAchievements(response.achievements);
        return response;
      } catch (err) {
        console.error('Failed to get progress:', err);
      }
    }

    return {
      streaks: localStore.get('mj_streaks') || {},
      achievements: localStore.get('mj_achievements') || []
    };
  }, [isOnline]);

  // ============================================================
  // CONTENT
  // ============================================================

  const getDailyAffirmation = useCallback(async () => {
    if (isOnline && TokenManager.isAuthenticated()) {
      try {
        return await ContentAPI.getDailyAffirmation();
      } catch (err) {
        console.error('Failed to get affirmation:', err);
      }
    }

    // Return cached or default affirmation
    const cached = localStore.get('mj_daily_affirmation');
    if (cached && new Date(cached.date).toDateString() === new Date().toDateString()) {
      return cached;
    }

    return {
      affirmation: "You are worthy of love and kindness, especially from yourself.",
      date: new Date().toISOString()
    };
  }, [isOnline]);

  // ============================================================
  // SYNC HELPERS
  // ============================================================

  const queueOfflineAction = (resource, action, data) => {
    const queue = localStore.get('mj_sync_queue') || [];
    queue.push({
      resource,
      action,
      data,
      timestamp: new Date().toISOString()
    });
    localStore.set('mj_sync_queue', queue);
  };

  const syncAllData = useCallback(async () => {
    if (!isOnline || !TokenManager.isAuthenticated() || syncing) return;

    setSyncing(true);
    try {
      // Sync offline queue first
      const queue = localStore.get('mj_sync_queue') || [];
      const remainingQueue = [];

      for (const item of queue) {
        try {
          await processQueueItem(item);
        } catch (err) {
          console.error('Failed to process queue item:', err);
          remainingQueue.push(item);
        }
      }

      localStore.set('mj_sync_queue', remainingQueue);

      // Fetch latest data
      await Promise.all([
        getMoodTrends('7d'),
        getTodayTasks(),
        getCopingTools(),
        getProgress()
      ]);

      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing]);

  const processQueueItem = async (item) => {
    switch (item.resource) {
      case 'mood':
        if (item.action === 'create') {
          await MoodAPI.log(item.data.mood_score, item.data);
        }
        break;
      case 'task':
        if (item.action === 'create') {
          await TaskAPI.create(item.data);
        } else if (item.action === 'complete') {
          await TaskAPI.complete(item.data.taskId, item.data.data);
        }
        break;
      case 'coping':
        if (item.action === 'logUse') {
          await CopingAPI.logToolUse(item.data.toolId, item.data.data);
        }
        break;
      default:
        console.warn('Unknown sync item:', item.resource);
    }
  };

  // Merge server data with local data, preferring server for synced items
  const mergeTasks = (local, server) => {
    const serverIds = new Set(server.map(t => t.id));
    const unsyncedLocal = local.filter(t => !t.synced && !serverIds.has(t.id));
    return [...server.map(t => ({ ...t, synced: true })), ...unsyncedLocal];
  };

  const value = {
    isOnline,
    syncing,
    lastSyncTime,

    // Mood
    moods,
    logMood,
    getMoodTrends,

    // Tasks
    tasks,
    createTask,
    completeTask,
    getTodayTasks,

    // Conversations
    conversations,
    activeConversation,
    startConversation,
    sendMessage,
    loadConversation,
    setActiveConversation,

    // Coping
    copingTools,
    getCopingTools,
    logToolUse,

    // Progress
    streaks,
    achievements,
    getProgress,

    // Content
    getDailyAffirmation,

    // Sync
    syncAllData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export default DataContext;
