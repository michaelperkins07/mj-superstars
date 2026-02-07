// ============================================================
// Socket.IO Event Handlers
// ============================================================

import { query } from '../database/db.js';
import { ClaudeService } from './claude.js';
import { logger } from '../utils/logger.js';

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 10000;

// Store active connections
const activeConnections = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info('Socket connected:', { userId: user.id, socketId: socket.id });

    // Join user's personal room
    socket.join(`user:${user.id}`);
    activeConnections.set(socket.id, { userId: user.id, connectedAt: new Date() });

    // ============================================================
    // PRESENCE
    // ============================================================

    // Emit online status
    socket.emit('connected', {
      userId: user.id,
      displayName: user.display_name,
      timestamp: new Date()
    });

    // ============================================================
    // REAL-TIME CHAT
    // ============================================================

    // Handle real-time message sending
    socket.on('send_message', async (data) => {
      try {
        const { conversation_id, content, is_voice = false } = data || {};

        // Validate conversation_id is a UUID
        if (!conversation_id || !UUID_REGEX.test(conversation_id)) {
          socket.emit('error', { message: 'Invalid or missing conversation_id' });
          return;
        }

        // Validate content is a non-empty string within limits
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          socket.emit('error', { message: 'Content cannot be empty' });
          return;
        }
        if (content.length > MAX_CONTENT_LENGTH) {
          socket.emit('error', { message: `Content exceeds ${MAX_CONTENT_LENGTH} character limit` });
          return;
        }

        // Verify conversation belongs to user
        const convResult = await query(
          `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
          [conversation_id, user.id]
        );

        if (convResult.rows.length === 0) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Get user context
        const userContext = await getUserContext(user.id);

        // Get conversation history
        const historyResult = await query(
          `SELECT role, content FROM messages
           WHERE conversation_id = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [conversation_id]
        );
        const history = historyResult.rows.reverse();

        // Save user message
        const userMsgResult = await query(
          `INSERT INTO messages (conversation_id, user_id, role, content, is_voice)
           VALUES ($1, $2, 'user', $3, $4)
           RETURNING id, created_at`,
          [conversation_id, user.id, content, is_voice]
        );

        // Emit user message confirmation
        socket.emit('message_saved', {
          id: userMsgResult.rows[0].id,
          role: 'user',
          content,
          created_at: userMsgResult.rows[0].created_at
        });

        // Emit typing indicator
        socket.emit('mj_typing', { conversation_id });

        // Get response from Claude
        const claudeResponse = await ClaudeService.chat({
          message: content,
          history,
          userContext,
          userId: user.id,
          conversationId: conversation_id
        });

        // Save MJ response
        const mjMsgResult = await query(
          `INSERT INTO messages (conversation_id, user_id, role, content, mood_detected, topics, intent, input_tokens, output_tokens)
           VALUES ($1, $2, 'assistant', $3, $4, $5, $6, $7, $8)
           RETURNING id, content, mood_detected, topics, intent, created_at`,
          [
            conversation_id,
            user.id,
            claudeResponse.content,
            claudeResponse.mood_detected,
            JSON.stringify(claudeResponse.topics || []),
            claudeResponse.intent,
            claudeResponse.usage?.input_tokens,
            claudeResponse.usage?.output_tokens
          ]
        );

        // Update conversation
        await query(
          `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
          [conversation_id]
        );

        // Emit MJ response
        socket.emit('mj_response', {
          message: mjMsgResult.rows[0],
          suggestions: claudeResponse.suggestions || []
        });

        // Extract personalization asynchronously (don't block, but log errors)
        extractPersonalizationAsync(user.id, userMsgResult.rows[0].id, content).catch(err => {
          logger.error('Socket personalization extraction failed:', { userId: user.id, error: err.message });
        });

      } catch (error) {
        logger.error('Socket send_message error:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // ============================================================
    // TYPING INDICATORS
    // ============================================================

    socket.on('typing_start', (data) => {
      // Could be used for buddy system in the future
      socket.to(`conversation:${data.conversation_id}`).emit('user_typing', {
        userId: user.id,
        conversationId: data.conversation_id
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`conversation:${data.conversation_id}`).emit('user_stopped_typing', {
        userId: user.id,
        conversationId: data.conversation_id
      });
    });

    // ============================================================
    // CONVERSATION MANAGEMENT
    // ============================================================

    // Join conversation room for real-time updates
    socket.on('join_conversation', async (data) => {
      const { conversation_id } = data || {};
      if (!conversation_id || !UUID_REGEX.test(conversation_id)) return;

      // Verify ownership
      const result = await query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversation_id, user.id]
      );

      if (result.rows.length > 0) {
        socket.join(`conversation:${conversation_id}`);
        socket.emit('joined_conversation', { conversation_id });
      }
    });

    socket.on('leave_conversation', (data) => {
      socket.leave(`conversation:${data.conversation_id}`);
    });

    // ============================================================
    // MOOD CHECK-IN (Quick mood log via socket)
    // ============================================================

    socket.on('quick_mood', async (data) => {
      try {
        const { mood_score, note } = data || {};
        if (typeof mood_score !== 'number' || mood_score < 1 || mood_score > 10) {
          socket.emit('error', { message: 'Mood score must be 1-10' });
          return;
        }

        const hour = new Date().getHours();
        let time_of_day;
        if (hour >= 5 && hour < 12) time_of_day = 'morning';
        else if (hour >= 12 && hour < 17) time_of_day = 'afternoon';
        else if (hour >= 17 && hour < 21) time_of_day = 'evening';
        else time_of_day = 'night';

        const result = await query(
          `INSERT INTO mood_entries (user_id, mood_score, note, source, time_of_day)
           VALUES ($1, $2, $3, 'widget', $4)
           RETURNING *`,
          [user.id, mood_score, note || null, time_of_day]
        );

        socket.emit('mood_logged', {
          entry: result.rows[0],
          message: 'Mood logged!'
        });

      } catch (error) {
        logger.error('Quick mood error:', error);
        socket.emit('error', { message: 'Failed to log mood' });
      }
    });

    // ============================================================
    // TASK QUICK ACTIONS
    // ============================================================

    socket.on('complete_task', async (data) => {
      try {
        const { task_id } = data || {};
        if (!task_id || !UUID_REGEX.test(task_id)) {
          socket.emit('error', { message: 'Invalid task_id' });
          return;
        }

        const result = await query(
          `UPDATE tasks SET status = 'completed', completed_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [task_id, user.id]
        );

        if (result.rows.length > 0) {
          socket.emit('task_completed', {
            task: result.rows[0],
            message: 'Task completed! 🎉'
          });
        }

      } catch (error) {
        logger.error('Complete task error:', error);
        socket.emit('error', { message: 'Failed to complete task' });
      }
    });

    // ============================================================
    // DISCONNECT
    // ============================================================

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected:', {
        userId: user.id,
        socketId: socket.id,
        reason
      });

      activeConnections.delete(socket.id);

      // Update last active
      query(
        'UPDATE users SET last_active_at = NOW() WHERE id = $1',
        [user.id]
      ).catch(err => logger.error('Failed to update last_active_at:', err));
    });
  });

  // ============================================================
  // BROADCAST FUNCTIONS
  // ============================================================

  io.broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.broadcastToConversation = (conversationId, event, data) => {
    io.to(`conversation:${conversationId}`).emit(event, data);
  };

  return io;
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getUserContext(userId) {
  const personalization = await query(
    `SELECT * FROM user_personalization WHERE user_id = $1`,
    [userId]
  );

  const recentMoods = await query(
    `SELECT mood_score, note, created_at FROM mood_entries
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );

  const tasks = await query(
    `SELECT title, status, category FROM tasks
     WHERE user_id = $1 AND (due_date = CURRENT_DATE OR due_date IS NULL)
     ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  const intention = await query(
    `SELECT intention_text, focus_word FROM morning_intentions
     WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );

  const streaks = await query(
    `SELECT streak_type, current_streak FROM user_streaks WHERE user_id = $1`,
    [userId]
  );

  const user = await query(
    `SELECT display_name, communication_style FROM users WHERE id = $1`,
    [userId]
  );

  return {
    personalization: personalization.rows[0] || {},
    recentMoods: recentMoods.rows,
    todayTasks: tasks.rows,
    morningIntention: intention.rows[0] || null,
    streaks: streaks.rows,
    userName: user.rows[0]?.display_name || 'friend',
    communicationStyle: user.rows[0]?.communication_style || {}
  };
}

async function extractPersonalizationAsync(userId, messageId, content) {
  try {
    const extractions = await ClaudeService.extractPersonalization(content);

    for (const extraction of extractions) {
      await query(
        `INSERT INTO personalization_extractions (user_id, message_id, extraction_type, extracted_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, messageId, extraction.type, JSON.stringify(extraction.data), extraction.confidence]
      );
    }
  } catch (error) {
    logger.error('Failed to extract personalization:', error);
  }
}

export default { setupSocketHandlers };
