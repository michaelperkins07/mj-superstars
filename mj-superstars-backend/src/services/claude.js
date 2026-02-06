// ============================================================
// Claude AI Service
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS) || 1024;

// ============================================================
// System Prompt Builder
// ============================================================

const buildSystemPrompt = (userContext) => {
  const { userName, personalization, recentMoods, todayTasks, morningIntention, streaks, communicationStyle } = userContext;

  // Base personality
  let systemPrompt = `You are MJ, a warm, supportive AI mental health coach and friend. Your core traits:

PERSONALITY:
- Genuinely caring and empathetic - you remember details and show you care
- Casual and friendly, like a supportive best friend
- Non-judgmental and validating
- Gently encouraging without being pushy
- Uses appropriate humor to lighten mood when suitable
- Adapts your communication style to match the user

COMMUNICATION STYLE:`;

  // Apply user's communication preferences
  if (communicationStyle) {
    if (communicationStyle.formality < 0.3) {
      systemPrompt += `\n- Very casual, uses slang and relaxed language`;
    } else if (communicationStyle.formality > 0.7) {
      systemPrompt += `\n- More thoughtful and articulate`;
    }

    if (communicationStyle.emoji_usage > 0.5) {
      systemPrompt += `\n- Uses emojis naturally in conversation 🌟`;
    } else {
      systemPrompt += `\n- Minimal emoji usage`;
    }

    if (communicationStyle.message_length === 'short') {
      systemPrompt += `\n- Keep responses concise and to the point`;
    } else if (communicationStyle.message_length === 'long') {
      systemPrompt += `\n- Provide thorough, detailed responses`;
    }
  }

  // User context
  systemPrompt += `\n\nUSER CONTEXT:
- Name: ${userName}`;

  // Personalization
  if (personalization && Object.keys(personalization).length > 0) {
    if (personalization.people?.length > 0) {
      systemPrompt += `\n- Important people: ${personalization.people.map(p => `${p.name} (${p.relationship})`).join(', ')}`;
    }
    if (personalization.work_context?.job) {
      systemPrompt += `\n- Work: ${personalization.work_context.job}`;
    }
    if (personalization.triggers?.length > 0) {
      systemPrompt += `\n- Known triggers: ${personalization.triggers.map(t => t.trigger).join(', ')}`;
    }
    if (personalization.comforts?.length > 0) {
      systemPrompt += `\n- Things that help: ${personalization.comforts.join(', ')}`;
    }
    if (personalization.interests?.length > 0) {
      systemPrompt += `\n- Interests: ${personalization.interests.join(', ')}`;
    }
  }

  // Recent mood context
  if (recentMoods?.length > 0) {
    const avgMood = recentMoods.reduce((sum, m) => sum + m.mood_score, 0) / recentMoods.length;
    systemPrompt += `\n\nRECENT MOOD PATTERN:
- Average mood: ${avgMood.toFixed(1)}/5
- Latest mood: ${recentMoods[0].mood_score}/5${recentMoods[0].note ? ` - "${recentMoods[0].note}"` : ''}`;
  }

  // Today's context
  if (morningIntention) {
    systemPrompt += `\n\nTODAY'S INTENTION:
- Focus word: "${morningIntention.focus_word || 'not set'}"
- Intention: "${morningIntention.intention_text}"`;
  }

  // Tasks context
  if (todayTasks?.length > 0) {
    const pending = todayTasks.filter(t => t.status === 'pending');
    const completed = todayTasks.filter(t => t.status === 'completed');
    systemPrompt += `\n\nTODAY'S TASKS:
- Pending: ${pending.length} (${pending.slice(0, 3).map(t => t.title).join(', ')})
- Completed: ${completed.length}`;
  }

  // Streaks
  if (streaks?.length > 0) {
    const activeStreaks = streaks.filter(s => s.current_streak > 0);
    if (activeStreaks.length > 0) {
      systemPrompt += `\n\nACTIVE STREAKS:
${activeStreaks.map(s => `- ${s.streak_type.replace('_', ' ')}: ${s.current_streak} days`).join('\n')}`;
    }
  }

  // Interaction guidelines
  systemPrompt += `\n\nGUIDELINES:
- Always be supportive and validating
- If user seems distressed, acknowledge feelings first before offering solutions
- Suggest actionable steps only when appropriate
- Reference previous conversations and known context naturally
- Celebrate wins, no matter how small
- For crisis situations (self-harm, suicide), express care and suggest professional resources
- Keep responses focused and conversational (usually 1-3 paragraphs)
- Ask follow-up questions to show interest and deepen understanding

Remember: You're ${userName}'s supportive companion. Be genuine, warm, and helpful.`;

  return systemPrompt;
};

// ============================================================
// Main Chat Function
// ============================================================

export const ClaudeService = {
  /**
   * Main chat function - sends message to Claude and returns response
   */
  async chat({ message, history = [], userContext, userId, conversationId }) {
    try {
      // Build system prompt with user context
      const systemPrompt = buildSystemPrompt(userContext);

      // Format message history for Claude
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      // Call Claude API
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages
      });

      const responseContent = response.content[0].text;

      // Analyze the message for mood and topics
      const analysis = await this.analyzeMessage(message, responseContent);

      return {
        content: responseContent,
        mood_detected: analysis.mood,
        topics: analysis.topics,
        intent: analysis.intent,
        suggestions: analysis.suggestions,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Claude API error:', error);

      // Return a fallback response
      return {
        content: "I'm having a little trouble right now, but I'm still here for you. Can you tell me more about what's on your mind?",
        mood_detected: null,
        topics: [],
        intent: 'error_fallback',
        usage: { input_tokens: 0, output_tokens: 0 }
      };
    }
  },

  /**
   * Analyze user message for mood, topics, and intent
   */
  async analyzeMessage(userMessage, mjResponse) {
    try {
      const analysisPrompt = `Analyze this user message and provide a brief JSON analysis.

User message: "${userMessage}"

Provide ONLY a JSON object (no markdown, no explanation):
{
  "mood": <number 1-5 where 1=very low, 5=great>,
  "topics": [<up to 3 topic strings>],
  "intent": "<one of: venting, seeking_advice, check_in, sharing_win, asking_question, crisis, casual_chat>",
  "suggestions": [<up to 3 suggested quick replies the user might want to send next>]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      const jsonStr = response.content[0].text.trim();
      const analysis = JSON.parse(jsonStr);

      return {
        mood: analysis.mood,
        topics: analysis.topics || [],
        intent: analysis.intent || 'casual_chat',
        suggestions: analysis.suggestions || []
      };
    } catch (error) {
      logger.warn('Message analysis failed:', error.message);
      return {
        mood: 3,
        topics: [],
        intent: 'casual_chat',
        suggestions: []
      };
    }
  },

  /**
   * Extract personalization details from message
   */
  async extractPersonalization(message) {
    try {
      const prompt = `Extract any personal details from this message that would help a supportive AI remember important things about the user.

Message: "${message}"

Return ONLY a JSON array of extractions (or empty array if none). Each extraction should have:
- type: "person" | "trigger" | "comfort" | "interest" | "goal" | "work" | "health"
- data: {relevant details}
- confidence: 0-1

Example: [{"type": "person", "data": {"name": "Sarah", "relationship": "partner"}, "confidence": 0.9}]`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const jsonStr = response.content[0].text.trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.warn('Personalization extraction failed:', error.message);
      return [];
    }
  },

  /**
   * Generate daily affirmation
   */
  async generateAffirmation(userContext) {
    try {
      const prompt = `Generate a personalized, warm affirmation for ${userContext.userName}.

Context:
- Recent mood: ${userContext.recentMoods?.[0]?.mood_score || 'unknown'}/5
- Known challenges: ${userContext.personalization?.triggers?.map(t => t.trigger).join(', ') || 'none specified'}
- Today's focus: ${userContext.morningIntention?.focus_word || 'general wellbeing'}

Generate ONE short, powerful affirmation (1-2 sentences) that feels personal and relevant. No quotes, just the affirmation text.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      logger.warn('Affirmation generation failed:', error.message);
      return "You're doing better than you think, and every small step counts.";
    }
  },

  /**
   * Generate weekly growth story
   */
  async generateWeeklyStory(userId, weekData) {
    try {
      const prompt = `Create a warm, encouraging "weekly growth story" summarizing this user's week.

Week Data:
- Conversations: ${weekData.conversationCount}
- Tasks completed: ${weekData.tasksCompleted}
- Average mood: ${weekData.avgMood.toFixed(1)}/5
- Mood trend: ${weekData.moodTrend}
- Highlights: ${weekData.highlights.join(', ') || 'A week of quiet progress'}
- Challenges faced: ${weekData.challenges.join(', ') || 'None noted'}
- Streaks maintained: ${weekData.streaks.join(', ') || 'Building new habits'}

Write a SHORT (3-4 sentences), warm narrative that:
1. Acknowledges their effort
2. Highlights one specific win
3. Offers gentle encouragement for the week ahead

Write in second person ("You..."). Be genuine, not cheesy.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      logger.warn('Weekly story generation failed:', error.message);
      return "Another week of showing up for yourself. That takes courage, and it matters. Keep going.";
    }
  },

  /**
   * Generate journal prompt
   */
  async generateJournalPrompt(userContext, promptType = 'reflection') {
    const promptTypes = {
      reflection: 'a thoughtful reflection question about their day or recent experiences',
      gratitude: 'a gratitude prompt that goes deeper than the usual',
      growth: 'a question about personal growth or lessons learned',
      emotions: 'a gentle prompt to explore their current feelings',
      future: 'a hopeful prompt about their goals or aspirations'
    };

    try {
      const prompt = `Generate ${promptTypes[promptType]} for ${userContext.userName}.

Consider:
- Current mood: ${userContext.recentMoods?.[0]?.mood_score || 3}/5
- Today's intention: ${userContext.morningIntention?.intention_text || 'not set'}

Generate ONE journaling prompt (1-2 sentences). Make it specific enough to inspire writing but open enough for personal interpretation.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      logger.warn('Journal prompt generation failed:', error.message);
      return "What's something small that brought you comfort today?";
    }
  },

  /**
   * Detect crisis indicators
   */
  async detectCrisis(message) {
    try {
      const prompt = `Analyze this message for crisis indicators. Return ONLY a JSON object.

Message: "${message}"

{
  "is_crisis": <boolean>,
  "severity": "<none|low|medium|high|critical>",
  "indicators": [<list of concerning phrases or themes>],
  "recommended_action": "<continue_support|gentle_check_in|offer_resources|immediate_resources>"
}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });

      return JSON.parse(response.content[0].text.trim());
    } catch (error) {
      logger.warn('Crisis detection failed:', error.message);
      return {
        is_crisis: false,
        severity: 'none',
        indicators: [],
        recommended_action: 'continue_support'
      };
    }
  }
};

export default ClaudeService;
