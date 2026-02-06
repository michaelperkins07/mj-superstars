// ============================================================
// MJ's Superstars - Socket.IO Client Service
// ============================================================

import { io } from 'socket.io-client';
import { TokenManager } from './api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // ============================================================
  // CONNECTION
  // ============================================================

  connect() {
    if (this.socket?.connected) return;

    const token = TokenManager.getAccessToken();
    if (!token) {
      console.warn('Cannot connect socket: No auth token');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupDefaultListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // ============================================================
  // DEFAULT LISTENERS
  // ============================================================

  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection_failed', { error: error.message });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket_error', error);
    });

    // Forward all MJ events
    this.socket.on('connected', (data) => this.emit('connected', data));
    this.socket.on('message_saved', (data) => this.emit('message_saved', data));
    this.socket.on('mj_typing', (data) => this.emit('mj_typing', data));
    this.socket.on('mj_response', (data) => this.emit('mj_response', data));
    this.socket.on('mood_logged', (data) => this.emit('mood_logged', data));
    this.socket.on('task_completed', (data) => this.emit('task_completed', data));
    this.socket.on('new_message', (data) => this.emit('new_message', data));
    this.socket.on('joined_conversation', (data) => this.emit('joined_conversation', data));
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event, callback) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  sendMessage(conversationId, content, isVoice = false) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('send_message', {
      conversation_id: conversationId,
      content,
      is_voice: isVoice
    });
  }

  // ============================================================
  // CONVERSATION
  // ============================================================

  joinConversation(conversationId) {
    this.socket?.emit('join_conversation', { conversation_id: conversationId });
  }

  leaveConversation(conversationId) {
    this.socket?.emit('leave_conversation', { conversation_id: conversationId });
  }

  // ============================================================
  // TYPING INDICATORS
  // ============================================================

  startTyping(conversationId) {
    this.socket?.emit('typing_start', { conversation_id: conversationId });
  }

  stopTyping(conversationId) {
    this.socket?.emit('typing_stop', { conversation_id: conversationId });
  }

  // ============================================================
  // QUICK ACTIONS
  // ============================================================

  logQuickMood(moodScore, note) {
    this.socket?.emit('quick_mood', { mood_score: moodScore, note });
  }

  completeTask(taskId) {
    this.socket?.emit('complete_task', { task_id: taskId });
  }
}

// Singleton instance
export const socketService = new SocketService();

// React hook for socket events
export function useSocketEvent(event, callback) {
  const { useEffect } = require('react');

  useEffect(() => {
    const unsubscribe = socketService.on(event, callback);
    return unsubscribe;
  }, [event, callback]);
}

// React hook for socket connection
export function useSocket() {
  const { useState, useEffect } = require('react');
  const [connected, setConnected] = useState(socketService.isConnected());

  useEffect(() => {
    const unsubscribe = socketService.on('connection_status', ({ connected }) => {
      setConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    connected,
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
    sendMessage: socketService.sendMessage.bind(socketService),
    joinConversation: socketService.joinConversation.bind(socketService),
    leaveConversation: socketService.leaveConversation.bind(socketService),
    logQuickMood: socketService.logQuickMood.bind(socketService),
    completeTask: socketService.completeTask.bind(socketService)
  };
}

export default socketService;
