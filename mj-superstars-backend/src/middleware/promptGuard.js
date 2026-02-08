import { logger } from '../utils/logger.js';

// CANARY TOKENS - embedded in system prompt to detect leakage
const CANARY_TOKENS = [
  'WMFK-9284-SENTINEL',
  'WMFK-3847-BEACON',
  'WMFK-5621-ANCHOR',
  'WMFK-4093-KEYSTONE',
  'WMFK-7156-GUARDIAN'
];

// INSTRUCTION LEAKAGE PATTERNS - detect prompt disclosure
const INSTRUCTION_LEAKAGE_PATTERNS = [
  /my instructions are/gi,
  /my system prompt/gi,
  /I was told to/gi,
  /I'm configured to/gi,
  /my guidelines state/gi,
  /my programming says/gi,
  /I'm instructed to/gi,
  /my directives/gi,
  /CONFIDENTIALITY DIRECTIVE/gi,
  /FINAL DIRECTIVE/gi,
  /FOUNDING PRINCIPLES/gi
];

/**
 * filterResponse - Scans Claude's responses for prompt leakage
 * @param {string} response - The response from Claude
 * @returns {Object} { safe: boolean, filtered: string, alert: boolean }
 */
export function filterResponse(response) {
  if (!response || typeof response !== 'string') {
    return { safe: true, filtered: response, alert: false };
  }

  // Check for canary tokens
  for (const token of CANARY_TOKENS) {
    if (response.includes(token)) {
      logger.error(`CRITICAL: Canary token detected in response: ${token}`);
      return {
        safe: false,
        filtered: "Hey! I'm here to help you level up. What's on your mind today?",
        alert: true
      };
    }
  }

  // Check for instruction leakage patterns
  let hasLeakage = false;
  let filteredResponse = response;

  for (const pattern of INSTRUCTION_LEAKAGE_PATTERNS) {
    if (pattern.test(response)) {
      hasLeakage = true;
      // Remove sentences containing the leakage pattern
      const sentences = filteredResponse.split(/(?<=[.!?])\s+/);
      const cleanedSentences = sentences.filter(sentence => !pattern.test(sentence));
      filteredResponse = cleanedSentences.join(' ');
      pattern.lastIndex = 0; // Reset regex state
    }
  }

  if (hasLeakage) {
    logger.warn('WARNING: Instruction leakage pattern detected in response. Filtering...');
    return {
      safe: true,
      filtered: filteredResponse,
      alert: false
    };
  }

  return {
    safe: true,
    filtered: response,
    alert: false
  };
}

/**
 * ExtractionDetector - Tracks suspicious extraction patterns across sessions
 */
export class ExtractionDetector {
  constructor() {
    this.sessions = new Map();
    this.EXTRACTION_THRESHOLD = 5;
    this.WINDOW_DURATION = 10 * 60 * 1000; // 10 minutes
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * checkMessage - Analyzes user message for extraction attempt patterns
   * @param {string} sessionId - User session ID
   * @param {string} message - User's message
   * @returns {Object} { flagged: boolean, score: number }
   */
  checkMessage(sessionId, message) {
    if (!sessionId || !message || typeof message !== 'string') {
      return { flagged: false, score: 0 };
    }

    const lowerMessage = message.toLowerCase();
    let score = 0;

    // DIRECT EXTRACTION ATTEMPTS (+3 points each)
    const directPatterns = [
      /show me your prompt/,
      /repeat your instructions/,
      /what are your guidelines/,
      /system prompt/,
      /ignore previous instructions/,
      /ignore your rules/,
      /dan mode/,
      /developer mode/,
      /debug mode/
    ];

    for (const pattern of directPatterns) {
      if (pattern.test(lowerMessage)) {
        score += 3;
      }
    }

    // INDIRECT EXTRACTION ATTEMPTS (+2 points each)
    const indirectPatterns = [
      /how were you built/,
      /what were you told/,
      /who programmed you/,
      /what's in your configuration/,
      /pretend you're a different ai/,
      /role-play as chatgpt/,
      /act as an ai without restrictions/
    ];

    for (const pattern of indirectPatterns) {
      if (pattern.test(lowerMessage)) {
        score += 2;
      }
    }

    // ENCODING TRICKS (+3 points each)
    const encodingPatterns = [
      /base64/,
      /encode your/,
      /translate your instructions/,
      /in hex/,
      /rot13/,
      /convert to/
    ];

    for (const pattern of encodingPatterns) {
      if (pattern.test(lowerMessage)) {
        score += 3;
      }
    }

    // Initialize session if needed
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        attempts: [],
        totalScore: 0
      });
    }

    const session = this.sessions.get(sessionId);
    const now = Date.now();

    // Add this attempt
    session.attempts.push({
      timestamp: now,
      score: score
    });

    // Remove attempts outside the window
    session.attempts = session.attempts.filter(
      attempt => now - attempt.timestamp < this.WINDOW_DURATION
    );

    // Calculate current window score
    session.totalScore = session.attempts.reduce((sum, attempt) => sum + attempt.score, 0);

    // Check if threshold exceeded
    const flagged = session.totalScore >= this.EXTRACTION_THRESHOLD;

    if (flagged) {
      logger.warn(
        `Extraction attempt detected in session ${sessionId}. Score: ${session.totalScore}. Message: "${message.substring(0, 100)}..."`
      );
    }

    return {
      flagged: flagged,
      score: session.totalScore
    };
  }

  /**
   * cleanup - Remove expired sessions
   */
  cleanup() {
    const now = Date.now();
    const sessionsToDelete = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      // Remove old attempts from this session
      session.attempts = session.attempts.filter(
        attempt => now - attempt.timestamp < this.WINDOW_DURATION
      );

      // If session has no recent attempts, mark for deletion
      if (session.attempts.length === 0) {
        sessionsToDelete.push(sessionId);
      }
    }

    // Delete expired sessions
    for (const sessionId of sessionsToDelete) {
      this.sessions.delete(sessionId);
    }

    if (sessionsToDelete.length > 0) {
      logger.debug(`Cleaned up ${sessionsToDelete.length} expired extraction detector sessions`);
    }
  }

  /**
   * destroy - Cleanup and stop interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}
