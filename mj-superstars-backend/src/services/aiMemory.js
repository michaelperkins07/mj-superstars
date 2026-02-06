// ============================================================
// MJ's Superstars - AI Memory & Personalization Service
// Long-term memory and context management for personalized AI
// ============================================================

const pool = require('../config/database');
const claude = require('./claude');

// ============================================================
// MEMORY TYPES
// ============================================================

const MEMORY_TYPES = {
  // User information
  PERSONAL_INFO: 'personal_info',      // Name, preferences, etc.
  LIFE_CONTEXT: 'life_context',         // Job, relationships, living situation
  GOALS: 'goals',                       // User's stated goals
  CHALLENGES: 'challenges',             // Ongoing challenges/struggles

  // Patterns & Insights
  MOOD_PATTERN: 'mood_pattern',         // Observed mood patterns
  TRIGGER: 'trigger',                   // Identified triggers
  COPING_PREFERENCE: 'coping_preference', // What works for them

  // Relationship
  COMMUNICATION_STYLE: 'communication_style',
  IMPORTANT_DATE: 'important_date',     // Birthdays, anniversaries
  MILESTONE: 'milestone',               // Achievements, breakthroughs

  // Session Context
  RECENT_TOPIC: 'recent_topic',         // Topics discussed recently
  ONGOING_SITUATION: 'ongoing_situation' // Situations being tracked
};

const MEMORY_IMPORTANCE = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

// ============================================================
// DATABASE OPERATIONS
// ============================================================

/**
 * Create memories table if not exists
 */
async function initMemoryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      key VARCHAR(255),
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 2,
      confidence DECIMAL(3,2) DEFAULT 1.0,
      source VARCHAR(50),
      expires_at TIMESTAMP,
      last_accessed TIMESTAMP DEFAULT NOW(),
      access_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, type, key)
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON user_memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON user_memories(importance DESC);
  `);
}

/**
 * Store a memory
 */
async function storeMemory(userId, {
  type,
  key,
  content,
  importance = MEMORY_IMPORTANCE.MEDIUM,
  confidence = 1.0,
  source = 'conversation',
  expiresAt = null
}) {
  const result = await pool.query(`
    INSERT INTO user_memories (user_id, type, key, content, importance, confidence, source, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, type, key)
    DO UPDATE SET
      content = EXCLUDED.content,
      importance = GREATEST(user_memories.importance, EXCLUDED.importance),
      confidence = EXCLUDED.confidence,
      updated_at = NOW()
    RETURNING *
  `, [userId, type, key, content, importance, confidence, source, expiresAt]);

  return result.rows[0];
}

/**
 * Get memories by type
 */
async function getMemoriesByType(userId, type) {
  const result = await pool.query(`
    SELECT * FROM user_memories
    WHERE user_id = $1 AND type = $2
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY importance DESC, updated_at DESC
  `, [userId, type]);

  // Update access tracking
  if (result.rows.length > 0) {
    const ids = result.rows.map(r => r.id);
    await pool.query(`
      UPDATE user_memories
      SET last_accessed = NOW(), access_count = access_count + 1
      WHERE id = ANY($1)
    `, [ids]);
  }

  return result.rows;
}

/**
 * Get all memories for a user
 */
async function getAllMemories(userId) {
  const result = await pool.query(`
    SELECT * FROM user_memories
    WHERE user_id = $1
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY importance DESC, updated_at DESC
  `, [userId]);

  return result.rows;
}

/**
 * Get most relevant memories for a context
 */
async function getRelevantMemories(userId, context, limit = 10) {
  // Get all memories
  const allMemories = await getAllMemories(userId);

  // If we have few memories, return all
  if (allMemories.length <= limit) {
    return allMemories;
  }

  // Score memories by relevance
  const scored = allMemories.map(memory => ({
    ...memory,
    relevanceScore: calculateRelevance(memory, context)
  }));

  // Sort by relevance and return top N
  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Calculate relevance of a memory to current context
 */
function calculateRelevance(memory, context) {
  let score = memory.importance * 10; // Base score from importance

  // Recency boost (memories from last 7 days get bonus)
  const daysSinceUpdate = (Date.now() - new Date(memory.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 1) score += 15;
  else if (daysSinceUpdate < 7) score += 10;
  else if (daysSinceUpdate < 30) score += 5;

  // Frequency boost (frequently accessed memories are likely important)
  score += Math.min(memory.access_count * 2, 10);

  // Confidence factor
  score *= memory.confidence;

  // Context matching (simple keyword overlap)
  if (context) {
    const contextWords = context.toLowerCase().split(/\s+/);
    const memoryWords = memory.content.toLowerCase().split(/\s+/);
    const overlap = contextWords.filter(w => memoryWords.includes(w)).length;
    score += overlap * 5;
  }

  // Type-based boosts
  if ([MEMORY_TYPES.PERSONAL_INFO, MEMORY_TYPES.GOALS, MEMORY_TYPES.CHALLENGES].includes(memory.type)) {
    score += 5; // These are always relevant
  }

  return score;
}

/**
 * Delete a memory
 */
async function deleteMemory(userId, memoryId) {
  await pool.query(`
    DELETE FROM user_memories
    WHERE id = $1 AND user_id = $2
  `, [memoryId, userId]);
}

/**
 * Clean up expired memories
 */
async function cleanupExpiredMemories() {
  await pool.query(`
    DELETE FROM user_memories
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  `);
}

// ============================================================
// MEMORY EXTRACTION FROM CONVERSATIONS
// ============================================================

/**
 * Extract memories from a conversation
 */
async function extractMemoriesFromConversation(userId, messages) {
  // Only process if we have enough content
  if (!messages || messages.length < 2) return [];

  // Prepare conversation text
  const conversationText = messages
    .slice(-10) // Last 10 messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    // Use Claude to extract memories
    const response = await claude.createCompletion({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Analyze this conversation and extract important information about the user that should be remembered for future conversations. Focus on:
- Personal details (name, job, family, location)
- Goals and aspirations
- Current challenges or struggles
- Preferences and communication style
- Important dates or events mentioned
- Emotional patterns or triggers
- What coping strategies work for them

Conversation:
${conversationText}

Return a JSON array of memories to store. Each memory should have:
- type: one of [personal_info, life_context, goals, challenges, mood_pattern, trigger, coping_preference, communication_style, important_date, milestone, ongoing_situation]
- key: a unique identifier for this piece of info (e.g., "name", "job", "goal_1")
- content: the information to remember
- importance: 1-4 (1=low, 4=critical)
- confidence: 0.0-1.0 (how certain you are about this)

Only return valid JSON array. If no new memories, return empty array [].`
      }]
    });

    // Parse the response
    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) return [];

    const memories = JSON.parse(jsonMatch[0]);

    // Store each memory
    const stored = [];
    for (const memory of memories) {
      if (memory.type && memory.key && memory.content) {
        const result = await storeMemory(userId, {
          type: memory.type,
          key: memory.key,
          content: memory.content,
          importance: memory.importance || MEMORY_IMPORTANCE.MEDIUM,
          confidence: memory.confidence || 0.8,
          source: 'conversation_extraction'
        });
        stored.push(result);
      }
    }

    return stored;
  } catch (err) {
    console.error('Memory extraction error:', err);
    return [];
  }
}

// ============================================================
// CONTEXT BUILDING FOR AI
// ============================================================

/**
 * Build memory context for AI prompt
 */
async function buildMemoryContext(userId) {
  const memories = await getAllMemories(userId);

  if (memories.length === 0) {
    return null;
  }

  // Group memories by type
  const grouped = {};
  for (const memory of memories) {
    if (!grouped[memory.type]) {
      grouped[memory.type] = [];
    }
    grouped[memory.type].push(memory);
  }

  // Build context string
  let context = "Here's what I remember about this user:\n\n";

  // Personal info first
  if (grouped[MEMORY_TYPES.PERSONAL_INFO]) {
    context += "**Personal Information:**\n";
    for (const m of grouped[MEMORY_TYPES.PERSONAL_INFO]) {
      context += `- ${m.key}: ${m.content}\n`;
    }
    context += "\n";
  }

  // Life context
  if (grouped[MEMORY_TYPES.LIFE_CONTEXT]) {
    context += "**Life Context:**\n";
    for (const m of grouped[MEMORY_TYPES.LIFE_CONTEXT]) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  // Goals
  if (grouped[MEMORY_TYPES.GOALS]) {
    context += "**Their Goals:**\n";
    for (const m of grouped[MEMORY_TYPES.GOALS]) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  // Challenges
  if (grouped[MEMORY_TYPES.CHALLENGES]) {
    context += "**Current Challenges:**\n";
    for (const m of grouped[MEMORY_TYPES.CHALLENGES]) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  // Patterns & preferences
  const patterns = [
    ...(grouped[MEMORY_TYPES.MOOD_PATTERN] || []),
    ...(grouped[MEMORY_TYPES.TRIGGER] || []),
    ...(grouped[MEMORY_TYPES.COPING_PREFERENCE] || [])
  ];

  if (patterns.length > 0) {
    context += "**Patterns & Preferences:**\n";
    for (const m of patterns) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  // Communication style
  if (grouped[MEMORY_TYPES.COMMUNICATION_STYLE]) {
    context += "**Communication Style:**\n";
    for (const m of grouped[MEMORY_TYPES.COMMUNICATION_STYLE]) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  // Recent situations
  if (grouped[MEMORY_TYPES.ONGOING_SITUATION]) {
    context += "**Ongoing Situations to Follow Up On:**\n";
    for (const m of grouped[MEMORY_TYPES.ONGOING_SITUATION]) {
      context += `- ${m.content}\n`;
    }
    context += "\n";
  }

  return context;
}

/**
 * Generate a conversation summary for long-term storage
 */
async function summarizeConversation(messages) {
  if (!messages || messages.length < 5) return null;

  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    const response = await claude.createCompletion({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Summarize this conversation in 2-3 sentences, focusing on the key topics discussed and any emotional context:

${conversationText}`
      }]
    });

    return response.content[0].text.trim();
  } catch (err) {
    console.error('Conversation summary error:', err);
    return null;
  }
}

// ============================================================
// USER INSIGHTS
// ============================================================

/**
 * Generate insights from user's history
 */
async function generateUserInsights(userId) {
  const memories = await getAllMemories(userId);

  // Get recent moods
  const moodResult = await pool.query(`
    SELECT score, factors, created_at
    FROM mood_entries
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 30
  `, [userId]);

  const moods = moodResult.rows;

  if (memories.length < 5 && moods.length < 7) {
    return null; // Not enough data
  }

  // Calculate mood statistics
  const avgMood = moods.length > 0
    ? moods.reduce((sum, m) => sum + m.score, 0) / moods.length
    : null;

  // Find common factors
  const factorCounts = {};
  for (const mood of moods) {
    if (mood.factors) {
      for (const factor of mood.factors) {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      }
    }
  }

  const topFactors = Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor]) => factor);

  return {
    moodStats: {
      average: avgMood ? Math.round(avgMood * 10) / 10 : null,
      entries: moods.length
    },
    topFactors,
    memoryCount: memories.length,
    activeGoals: memories.filter(m => m.type === MEMORY_TYPES.GOALS).length,
    knownChallenges: memories.filter(m => m.type === MEMORY_TYPES.CHALLENGES).length
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  MEMORY_TYPES,
  MEMORY_IMPORTANCE,
  initMemoryTable,
  storeMemory,
  getMemoriesByType,
  getAllMemories,
  getRelevantMemories,
  deleteMemory,
  cleanupExpiredMemories,
  extractMemoriesFromConversation,
  buildMemoryContext,
  summarizeConversation,
  generateUserInsights
};
