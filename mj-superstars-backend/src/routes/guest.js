// ============================================================
// Guest Chat Routes (No Authentication Required)
// Allows unauthenticated users to chat with MJ
// ============================================================

import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { ClaudeService } from '../services/claude.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================================
// POST /api/guest/chat - Send a message as a guest user
// ============================================================
router.post('/chat',
  [
    body('content').trim().notEmpty().isLength({ max: 10000 }),
    body('history').optional().isArray(),
    body('guest_name').optional().trim().isLength({ max: 100 }),
    body('session_id').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const { content, history = [], guest_name, session_id, user_context = {} } = req.body;

    // Build a guest user context, merging client-side cross-tab data
    const guestContext = {
      personalization: {
        ...(req.body.preferences || {}),
        ...(user_context.profile || {}),
        interests: user_context.profile?.interests || [],
        struggles: user_context.profile?.struggles || []
      },
      recentMoods: user_context.recentMoods || [],
      todayTasks: user_context.todayTasks || [],
      recentJournal: user_context.recentJournal || [],
      morningIntention: null,
      streaks: [],
      userName: guest_name || 'Friend',
      communicationStyle: {
        formality: 0.3,
        emoji_usage: 0.6,
        message_length: 'short'
      }
    };

    // Format history for Claude (limit to last 20 messages)
    const recentHistory = history.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Get response from Claude
    const claudeResponse = await ClaudeService.chat({
      message: content,
      history: recentHistory,
      userContext: guestContext,
      userId: session_id || 'guest',
      conversationId: session_id || 'guest-session'
    });

    logger.info('Guest chat message processed', {
      sessionId: session_id,
      guestName: guest_name || 'Friend'
    });

    res.json({
      user_message: {
        id: uuidv4(),
        role: 'user',
        content,
        created_at: new Date().toISOString()
      },
      mj_response: {
        id: uuidv4(),
        role: 'assistant',
        content: claudeResponse.content,
        mood_detected: claudeResponse.mood_detected,
        topics: claudeResponse.topics,
        intent: claudeResponse.intent,
        created_at: new Date().toISOString()
      },
      suggestions: claudeResponse.suggestions || []
    });
  })
);

// ============================================================
// POST /api/guest/session - Create a guest session ID
// ============================================================
router.post('/session',
  asyncHandler(async (req, res) => {
    const sessionId = uuidv4();

    res.status(201).json({
      session_id: sessionId,
      conversation: {
        id: sessionId,
        title: 'Chat with MJ',
        is_active: true,
        started_at: new Date().toISOString()
      },
      message: 'Guest session started'
    });
  })
);

export default router;
