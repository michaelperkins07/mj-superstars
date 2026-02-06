// ============================================================
// Guest Data Migration Routes
// Migrates localStorage guest data to a new authenticated account
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../database/db.js';
import {
  generateAccessToken,
  generateRefreshToken
} from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// ============================================================
// POST /api/guest/migrate - Migrate guest data to new account
// ============================================================
router.post('/migrate',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('display_name').optional().trim().isLength({ max: 100 }),
    body('guest_data').isObject().withMessage('Guest data required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, display_name, guest_data } = req.body;

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Extract guest data
    const {
      conversations = [],
      moods = [],
      tasks = [],
      journal_entries = [],
      profile = {},
      streaks = {}
    } = guest_data;

    const migrationSummary = {
      conversations: 0,
      messages: 0,
      moods: 0,
      tasks: 0,
      journal_entries: 0,
      errors: []
    };

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Run everything in a transaction
    let result;
    try {
    result = await transaction(async (client) => {
      // ── Step 1: Create user account ──
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, created_at`,
        [
          email,
          password_hash,
          display_name || profile.name || null
        ]
      );

      const user = userResult.rows[0];

      // ── Step 2: Create personalization record ──
      await client.query(
        `INSERT INTO user_personalization (user_id, preferred_name, interests, goals)
         VALUES ($1, $2, $3, $4)`,
        [
          user.id,
          display_name || profile.name || null,
          JSON.stringify(profile.interests || []),
          JSON.stringify(profile.goals || [])
        ]
      );

      // ── Step 3: Initialize streaks ──
      const streakTypes = ['check_in', 'morning_ritual', 'evening_reflection', 'task_completion'];
      for (const type of streakTypes) {
        const guestStreak = type === 'check_in' ? streaks : {};
        await client.query(
          `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            type,
            guestStreak.current_streak || 0,
            guestStreak.longest_streak || 0,
            guestStreak.total_completions || 0,
            guestStreak.last_completed_date || null
          ]
        );
      }

      // ── Step 4: Migrate conversations and messages ──
      // Live DB schema: conversations(id, user_id, title, summary, started_at, ended_at, message_count, initial_mood, final_mood, topics, is_active, created_at, updated_at)
      // Live DB schema: messages(id, conversation_id, user_id, role, content, mood_detected, topics, intent, is_voice, audio_url, audio_duration, input_tokens, output_tokens, created_at)
      try {
        for (const conv of conversations) {
          const convId = uuidv4();

          await client.query(
            `INSERT INTO conversations (id, user_id, title, message_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              convId,
              user.id,
              conv.title || 'Chat with MJ',
              (conv.messages || []).length,
              conv.started_at || conv.created_at || new Date().toISOString()
            ]
          );

          migrationSummary.conversations++;

          // Migrate messages within this conversation
          if (Array.isArray(conv.messages)) {
            for (const msg of conv.messages) {
              await client.query(
                `INSERT INTO messages (id, conversation_id, user_id, role, content, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  uuidv4(),
                  convId,
                  user.id,
                  msg.role || 'user',
                  msg.content || '',
                  msg.created_at || msg.timestamp || new Date().toISOString()
                ]
              );
              migrationSummary.messages++;
            }
          }
        }
      } catch (err) {
        logger.error('Guest migration - conversations error:', err.message);
        migrationSummary.errors.push({ type: 'conversations', error: err.message });
      }

      // ── Step 5: Migrate moods ──
      // Live DB schema: mood_entries(id, user_id, mood_score, energy_level, anxiety_level, note, activities, triggers, source, conversation_id, time_of_day, day_of_week, created_at)
      try {
        for (const mood of moods) {
          await client.query(
            `INSERT INTO mood_entries (id, user_id, mood_score, note, activities, source, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              user.id,
              mood.value || mood.mood_score || 3,
              mood.note || null,
              JSON.stringify(mood.tags || mood.activities || mood.factors || []),
              'manual',
              mood.created_at || mood.timestamp || new Date().toISOString()
            ]
          );
          migrationSummary.moods++;
        }
      } catch (err) {
        logger.error('Guest migration - moods error:', err.message);
        migrationSummary.errors.push({ type: 'moods', error: err.message });
      }

      // ── Step 6: Migrate tasks ──
      // Live DB schema: tasks(id, user_id, title, description, category, difficulty, estimated_minutes, due_date, due_time, is_recurring, recurrence_rule, status, completed_at, suggested_by_mj, suggestion_context, created_at, updated_at)
      try {
        for (const task of tasks) {
          await client.query(
            `INSERT INTO tasks (id, user_id, title, description, category, difficulty, status, due_date, completed_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              uuidv4(),
              user.id,
              task.title || 'Untitled Task',
              task.description || null,
              task.category || 'self_care',
              task.difficulty || 'medium',
              task.completed || task.status === 'completed' ? 'completed' : (task.status || 'pending'),
              task.due_date || null,
              task.completed_at || null,
              task.created_at || task.timestamp || new Date().toISOString()
            ]
          );
          migrationSummary.tasks++;
        }
      } catch (err) {
        logger.error('Guest migration - tasks error:', err.message);
        migrationSummary.errors.push({ type: 'tasks', error: err.message });
      }

      // ── Step 7: Migrate journal entries ──
      // Live DB schema: journal_entries(id, user_id, title, content, prompt_id, prompt_text, mood_score, tags, word_count, is_private, created_at, updated_at)
      try {
        for (const entry of journal_entries) {
          await client.query(
            `INSERT INTO journal_entries (id, user_id, title, content, prompt_text, mood_score, tags, word_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              uuidv4(),
              user.id,
              entry.title || 'Journal Entry',
              entry.content || '',
              entry.prompt || null,
              entry.mood_score || null,
              JSON.stringify(entry.tags || []),
              entry.word_count || (entry.content || '').split(/\s+/).length,
              entry.created_at || entry.timestamp || new Date().toISOString()
            ]
          );
          migrationSummary.journal_entries++;
        }
      } catch (err) {
        logger.error('Guest migration - journal error:', err.message);
        migrationSummary.errors.push({ type: 'journal_entries', error: err.message });
      }

      return user;
    });
    } catch (txErr) {
      return res.status(500).json({
        error: 'Migration failed',
        debug_message: txErr.message,
        debug_code: txErr.code,
        debug_constraint: txErr.constraint,
        debug_table: txErr.table,
        debug_detail: txErr.detail
      });
    }

    // Generate auth tokens (outside transaction)
    const accessToken = generateAccessToken(result);
    const refreshToken = generateRefreshToken(result);

    // Store refresh token session
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [result.id, tokenHash, req.body.device_info || {}, req.ip]
    );

    logger.info('Guest data migrated successfully:', {
      userId: result.id,
      email,
      summary: migrationSummary
    });

    res.status(201).json({
      message: 'Account created and guest data migrated successfully',
      user: {
        id: result.id,
        email: result.email,
        display_name: result.display_name
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900
      },
      migration_summary: migrationSummary
    });
  })
);

export default router;
