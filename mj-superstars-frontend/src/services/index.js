// ============================================================
// MJ's Superstars - Services Exports
// ============================================================

// API Client
export {
  TokenManager,
  AuthAPI,
  UserAPI,
  ConversationAPI,
  MoodAPI,
  TaskAPI,
  RitualAPI,
  JournalAPI,
  ProgressAPI,
  CopingAPI,
  ContentAPI,
  NotificationAPI,
  InsightsAPI
} from './api';

// Socket Service
export { socketService, useSocket, useSocketEvent } from './socket';

// Storage Service
export { storage, useStorage, STORAGE_KEYS } from './storage';

// Notification Handler
export {
  setNavigationHandler,
  setInAppNotificationHandler,
  initNotificationHandlers,
  cleanupNotificationHandlers,
  handleNotificationAction,
  handleDeepLink,
  checkPendingNavigation,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  clearAllNotifications,
  updateBadgeCount
} from './notificationHandler';
