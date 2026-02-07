// ============================================================
// MJ's Superstars - API Client Service
// ============================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mj-superstars.onrender.com/api';

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

let accessToken = null;
let refreshToken = null;

export const TokenManager = {
  setTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem('mj_access_token', access);
    localStorage.setItem('mj_refresh_token', refresh);
  },

  getAccessToken() {
    if (!accessToken) {
      accessToken = localStorage.getItem('mj_access_token');
    }
    return accessToken;
  },

  getRefreshToken() {
    if (!refreshToken) {
      refreshToken = localStorage.getItem('mj_refresh_token');
    }
    return refreshToken;
  },

  clearTokens() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('mj_access_token');
    localStorage.removeItem('mj_refresh_token');
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  }
};

// ============================================================
// HTTP CLIENT
// ============================================================

// Prevent concurrent token refresh race condition
let refreshPromise = null;

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  const token = TokenManager.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token refresh on 401 (with race condition protection)
    if (response.status === 401 && TokenManager.getRefreshToken()) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${TokenManager.getAccessToken()}`;
        const retryResponse = await fetch(url, { ...options, headers });
        return handleResponse(retryResponse);
      } else {
        TokenManager.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('Session expired');
      }
    }

    return handleResponse(response);
  } catch (error) {
    // Detect offline vs server errors
    if (!navigator.onLine || error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const offlineError = new Error('You\'re offline. This will sync when you reconnect.');
      offlineError.code = 'OFFLINE';
      offlineError.status = 0;
      offlineError.isOffline = true;
      throw offlineError;
    }
    console.error('API request failed:', error);
    throw error;
  }
}

async function handleResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: TokenManager.getRefreshToken() })
    });

    if (response.ok) {
      const data = await response.json();
      TokenManager.setTokens(data.access_token, TokenManager.getRefreshToken());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// AUTH API
// ============================================================

export const AuthAPI = {
  async register(email, password, displayName) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: TokenManager.getRefreshToken() })
      });
    } finally {
      TokenManager.clearTokens();
    }
  },

  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(token, newPassword) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword })
    });
  },

  async changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
  }
};

// ============================================================
// SOCIAL AUTH API
// ============================================================

export const SocialAuthAPI = {
  async signInWithApple(idToken, authorizationCode, user) {
    const data = await request('/social-auth/apple', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, authorization_code: authorizationCode, user })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async signInWithGoogle(idToken, accessToken) {
    const data = await request('/social-auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, access_token: accessToken })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async signInWithX(oauthToken, oauthTokenSecret, userId, screenName, name, profileImageUrl) {
    const data = await request('/social-auth/x', {
      method: 'POST',
      body: JSON.stringify({
        oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret,
        user_id: userId, screen_name: screenName, name, profile_image_url: profileImageUrl
      })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async signInWithInstagram(accessToken, userId, username, name, profilePictureUrl) {
    const data = await request('/social-auth/instagram', {
      method: 'POST',
      body: JSON.stringify({
        access_token: accessToken, user_id: userId,
        username, name, profile_picture_url: profilePictureUrl
      })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  async getLinkedAccounts() {
    return request('/social-auth/accounts');
  },

  async unlinkAccount(provider) {
    return request(`/social-auth/accounts/${provider}`, { method: 'DELETE' });
  }
};

// ============================================================
// USER API
// ============================================================

export const UserAPI = {
  async getProfile() {
    return request('/users/me');
  },

  async updateProfile(updates) {
    return request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async updateCommunicationStyle(style) {
    return request('/users/me/communication-style', {
      method: 'PUT',
      body: JSON.stringify(style)
    });
  },

  async updatePersonalization(data) {
    return request('/users/me/personalization', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async completeOnboarding(data) {
    return request('/users/me/onboarding', {
      method: 'POST',
      body: JSON.stringify({ onboarding_data: data })
    });
  },

  async exportData() {
    return request('/users/me/export');
  }
};

// ============================================================
// CONVERSATION API
// ============================================================

export const ConversationAPI = {
  async list(options = {}) {
    const params = new URLSearchParams(options);
    return request(`/conversations?${params}`);
  },

  async create(initialMood) {
    return request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ initial_mood: initialMood })
    });
  },

  async get(id, messageLimit = 50) {
    return request(`/conversations/${id}?message_limit=${messageLimit}`);
  },

  async sendMessage(conversationId, content, isVoice = false) {
    return request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, is_voice: isVoice })
    });
  },

  async end(id, finalMood) {
    return request(`/conversations/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({ final_mood: finalMood })
    });
  },

  async delete(id) {
    return request(`/conversations/${id}`, { method: 'DELETE' });
  }
};

// ============================================================
// MOOD API
// ============================================================

export const MoodAPI = {
  async list(options = {}) {
    const params = new URLSearchParams(options);
    return request(`/moods?${params}`);
  },

  async log(moodScore, data = {}) {
    return request('/moods', {
      method: 'POST',
      body: JSON.stringify({ mood_score: moodScore, ...data })
    });
  },

  async getTrends(period = '7d') {
    return request(`/moods/trends?period=${period}`);
  },

  async getToday() {
    return request('/moods/today');
  },

  async delete(id) {
    return request(`/moods/${id}`, { method: 'DELETE' });
  }
};

// ============================================================
// TASK API
// ============================================================

export const TaskAPI = {
  async list(options = {}) {
    const params = new URLSearchParams(options);
    return request(`/tasks?${params}`);
  },

  async getToday() {
    return request('/tasks/today');
  },

  async create(task) {
    return request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  },

  async update(id, updates) {
    return request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async complete(id, data = {}) {
    return request(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async skip(id, reason) {
    return request(`/tasks/${id}/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async delete(id) {
    return request(`/tasks/${id}`, { method: 'DELETE' });
  },

  async getSuggestions(context = {}) {
    return request('/tasks/suggest', {
      method: 'POST',
      body: JSON.stringify(context)
    });
  }
};

// ============================================================
// RITUAL API
// ============================================================

export const RitualAPI = {
  // Morning
  async getMorningToday() {
    return request('/rituals/morning/today');
  },

  async setMorningIntention(intentionText, focusWord, moodScore) {
    return request('/rituals/morning', {
      method: 'POST',
      body: JSON.stringify({ intention_text: intentionText, focus_word: focusWord, mood_score: moodScore })
    });
  },

  async addMorningReflection(reflection, intentionMet) {
    return request('/rituals/morning/reflect', {
      method: 'PUT',
      body: JSON.stringify({ reflection, intention_met: intentionMet })
    });
  },

  async getMorningHistory(limit = 30) {
    return request(`/rituals/morning/history?limit=${limit}`);
  },

  // Evening
  async getEveningToday() {
    return request('/rituals/evening/today');
  },

  async completeEvening(data) {
    return request('/rituals/evening', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getEveningHistory(limit = 30) {
    return request(`/rituals/evening/history?limit=${limit}`);
  },

  // Prompts
  async getPrompts(type = 'morning') {
    return request(`/rituals/prompts?type=${type}`);
  }
};

// ============================================================
// JOURNAL API
// ============================================================

export const JournalAPI = {
  async list(options = {}) {
    const params = new URLSearchParams(options);
    return request(`/journal?${params}`);
  },

  async get(id) {
    return request(`/journal/${id}`);
  },

  async create(entry) {
    return request('/journal', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },

  async update(id, updates) {
    return request(`/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return request(`/journal/${id}`, { method: 'DELETE' });
  },

  async generatePrompt(type = 'reflection') {
    return request(`/journal/prompts/generate?type=${type}`);
  },

  async getPromptLibrary() {
    return request('/journal/prompts/library');
  },

  async getStats() {
    return request('/journal/stats');
  }
};

// ============================================================
// PROGRESS API
// ============================================================

export const ProgressAPI = {
  async getDashboard() {
    return request('/progress/dashboard');
  },

  async getStreaks() {
    return request('/progress/streaks');
  },

  async getAchievements(earnedOnly = false) {
    return request(`/progress/achievements?earned_only=${earnedOnly}`);
  },

  async getWeeklyStory() {
    return request('/progress/weekly-story');
  },

  async getWeeklyStoryHistory(limit = 10) {
    return request(`/progress/weekly-story/history?limit=${limit}`);
  },

  async getInsights() {
    return request('/progress/insights');
  },

  async markInsightRead(id) {
    return request(`/progress/insights/${id}/viewed`, { method: 'PUT' });
  }
};

// ============================================================
// COPING API
// ============================================================

export const CopingAPI = {
  async getTools(category) {
    const params = category ? `?category=${category}` : '';
    return request(`/coping/tools${params}`);
  },

  async getTool(id) {
    return request(`/coping/tools/${id}`);
  },

  async createTool(tool) {
    return request('/coping/tools', {
      method: 'POST',
      body: JSON.stringify(tool)
    });
  },

  async updateTool(id, updates) {
    return request(`/coping/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteTool(id) {
    return request(`/coping/tools/${id}`, { method: 'DELETE' });
  },

  async logToolUse(toolId, data) {
    return request(`/coping/tools/${toolId}/use`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getRecommendations(mood) {
    return request(`/coping/recommend?mood=${mood}`);
  },

  async getQuickExercises() {
    return request('/coping/quick');
  },

  async getSafetyPlan() {
    return request('/coping/safety-plan');
  },

  async updateSafetyPlan(plan) {
    return request('/coping/safety-plan', {
      method: 'PUT',
      body: JSON.stringify(plan)
    });
  }
};

// ============================================================
// CONTENT API
// ============================================================

export const ContentAPI = {
  async getFeed(type, limit = 10) {
    const params = new URLSearchParams({ limit });
    if (type) params.append('type', type);
    return request(`/content/feed?${params}`);
  },

  async getDailyAffirmation() {
    return request('/content/daily-affirmation');
  },

  async getQuotes(category, limit = 5) {
    const params = new URLSearchParams({ limit });
    if (category) params.append('category', category);
    return request(`/content/quotes?${params}`);
  },

  async getChallenges(mood, limit = 3) {
    const params = new URLSearchParams({ limit });
    if (mood) params.append('mood', mood);
    return request(`/content/challenges?${params}`);
  },

  async interact(contentId, interactionType) {
    return request(`/content/${contentId}/interact`, {
      method: 'POST',
      body: JSON.stringify({ interaction_type: interactionType })
    });
  },

  async getSaved() {
    return request('/content/saved');
  }
};

// ============================================================
// NOTIFICATION API
// ============================================================

export const NotificationAPI = {
  async getHistory(limit = 50) {
    return request(`/notifications/history?limit=${limit}`);
  },

  async subscribe(subscription) {
    return request('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  },

  async unsubscribe(endpoint) {
    return request('/notifications/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint })
    });
  },

  async getScheduled() {
    return request('/notifications/scheduled');
  },

  async createScheduled(checkin) {
    return request('/notifications/scheduled', {
      method: 'POST',
      body: JSON.stringify(checkin)
    });
  },

  async updateScheduled(id, updates) {
    return request(`/notifications/scheduled/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteScheduled(id) {
    return request(`/notifications/scheduled/${id}`, { method: 'DELETE' });
  },

  async sendTest() {
    return request('/notifications/test', { method: 'POST' });
  }
};

// ============================================================
// INSIGHTS API
// ============================================================

export const InsightsAPI = {
  async list(unreadOnly = false) {
    return request(`/insights?unread_only=${unreadOnly}`);
  },

  async markRead(id) {
    return request(`/insights/${id}/read`, { method: 'PUT' });
  },

  async getMoodPatterns(days = 30) {
    return request(`/insights/mood-patterns?days=${days}`);
  },

  async getProgressSummary(period = '7d') {
    return request(`/insights/progress-summary?period=${period}`);
  },

  async getConversationThemes(days = 30) {
    return request(`/insights/conversation-themes?days=${days}`);
  }
};

// ============================================================
// GUEST API (No authentication required)
// ============================================================

export const GuestAPI = {
  async createSession() {
    return request('/guest/session', {
      method: 'POST'
    });
  },

  async sendMessage(content, history = [], guestName = 'Friend', sessionId = null, userContext = {}) {
    return request('/guest/chat', {
      method: 'POST',
      body: JSON.stringify({
        content,
        history,
        guest_name: guestName,
        session_id: sessionId,
        user_context: userContext
      })
    });
  },

  async migrateToAccount(email, password, displayName, guestData) {
    const data = await request('/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
        guest_data: guestData
      })
    });
    TokenManager.setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  }
};

// ============================================================
// EXPORT ALL
// ============================================================

export default {
  TokenManager,
  AuthAPI,
  UserAPI,
  ConversationAPI,
  GuestAPI,
  MoodAPI,
  TaskAPI,
  RitualAPI,
  JournalAPI,
  ProgressAPI,
  CopingAPI,
  ContentAPI,
  NotificationAPI,
  InsightsAPI
};
