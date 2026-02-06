// ============================================================
// Mock Database for Demo Mode
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// In-memory data stores
const stores = {
  users: new Map(),
  sessions: new Map(),
  conversations: new Map(),
  messages: new Map(),
  moods: new Map(),
  tasks: new Map(),
  morningIntentions: new Map(),
  eveningReflections: new Map(),
  journals: new Map(),
  streaks: new Map(),
  achievements: new Map(),
  personalization: new Map(),
  copingTools: new Map(),
  content: new Map(),
  notifications: new Map()
};

// Seed default content
const seedDefaultContent = () => {
  const defaultAffirmations = [
    { id: uuidv4(), content_type: 'affirmation', body: 'I am doing the best I can with what I have right now.', is_active: true },
    { id: uuidv4(), content_type: 'affirmation', body: 'My feelings are valid, even when they are difficult.', is_active: true },
    { id: uuidv4(), content_type: 'affirmation', body: 'I am worthy of rest and care.', is_active: true },
    { id: uuidv4(), content_type: 'quote', body: 'The only way out is through.', author: 'Robert Frost', is_active: true },
    { id: uuidv4(), content_type: 'challenge', body: 'Send a message to someone you appreciate today.', is_active: true }
  ];

  defaultAffirmations.forEach(item => stores.content.set(item.id, item));

  const defaultCopingTools = [
    { id: uuidv4(), name: '4-7-8 Breathing', category: 'breathing', steps: ['Breathe in for 4 seconds', 'Hold for 7 seconds', 'Exhale for 8 seconds'], duration_minutes: 3 },
    { id: uuidv4(), name: '5-4-3-2-1 Grounding', category: 'grounding', steps: ['Notice 5 things you can see', 'Notice 4 things you can touch', 'Notice 3 things you can hear', 'Notice 2 things you can smell', 'Notice 1 thing you can taste'], duration_minutes: 5 }
  ];

  defaultCopingTools.forEach(tool => stores.copingTools.set(tool.id, tool));
};

seedDefaultContent();

// Mock query function
export const query = async (sql, params = []) => {
  // Parse the SQL to determine the operation
  const sqlLower = sql.toLowerCase().trim();

  // SELECT NOW() - health check
  if (sqlLower.includes('select now()')) {
    return { rows: [{ now: new Date() }] };
  }

  // Check if tables exist
  if (sqlLower.includes('information_schema.tables')) {
    return { rows: [{ exists: true }] };
  }

  // Return mock data based on query patterns
  if (sqlLower.startsWith('select') && sqlLower.includes('from users')) {
    const users = Array.from(stores.users.values());
    if (params[0]) {
      const user = users.find(u => u.id === params[0] || u.email === params[0]);
      return { rows: user ? [user] : [] };
    }
    return { rows: users };
  }

  if (sqlLower.startsWith('insert into users')) {
    const id = uuidv4();
    const user = {
      id,
      email: params[0],
      password_hash: params[1],
      display_name: params[2],
      is_premium: false,
      is_active: true,
      created_at: new Date(),
      communication_style: { formality: 0.5, emoji_usage: 0.5, message_length: 'medium' }
    };
    stores.users.set(id, user);
    return { rows: [user] };
  }

  if (sqlLower.startsWith('insert into user_personalization')) {
    const id = uuidv4();
    const data = { id, user_id: params[0], people: [], triggers: [], comforts: [], interests: [] };
    stores.personalization.set(id, data);
    return { rows: [data] };
  }

  if (sqlLower.startsWith('insert into user_streaks')) {
    const id = uuidv4();
    const streak = { id, user_id: params[0], streak_type: params[1], current_streak: 0, longest_streak: 0, total_completions: 0 };
    stores.streaks.set(id, streak);
    return { rows: [streak] };
  }

  if (sqlLower.startsWith('insert into user_sessions')) {
    const id = uuidv4();
    const session = { id, user_id: params[0], refresh_token_hash: params[1], expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    stores.sessions.set(id, session);
    return { rows: [session] };
  }

  if (sqlLower.includes('from conversations')) {
    const conversations = Array.from(stores.conversations.values()).filter(c => c.user_id === params[0]);
    return { rows: conversations, rowCount: conversations.length };
  }

  if (sqlLower.startsWith('insert into conversations')) {
    const id = uuidv4();
    const conv = { id, user_id: params[0], title: params[1], initial_mood: params[2], is_active: true, message_count: 0, created_at: new Date() };
    stores.conversations.set(id, conv);
    return { rows: [conv] };
  }

  if (sqlLower.includes('from messages')) {
    const messages = Array.from(stores.messages.values()).filter(m => m.conversation_id === params[0]);
    return { rows: messages };
  }

  if (sqlLower.startsWith('insert into messages')) {
    const id = uuidv4();
    const msg = { id, conversation_id: params[0], user_id: params[1], role: params[2], content: params[3], created_at: new Date() };
    stores.messages.set(id, msg);
    return { rows: [msg] };
  }

  if (sqlLower.includes('from mood_entries')) {
    const moods = Array.from(stores.moods.values()).filter(m => m.user_id === params[0]);
    return { rows: moods };
  }

  if (sqlLower.startsWith('insert into mood_entries')) {
    const id = uuidv4();
    const mood = { id, user_id: params[0], mood_score: params[1], energy_level: params[2], note: params[4], created_at: new Date() };
    stores.moods.set(id, mood);
    return { rows: [mood] };
  }

  if (sqlLower.includes('from tasks')) {
    const tasks = Array.from(stores.tasks.values()).filter(t => t.user_id === params[0]);
    return { rows: tasks };
  }

  if (sqlLower.startsWith('insert into tasks')) {
    const id = uuidv4();
    const task = { id, user_id: params[0], title: params[1], description: params[2], status: 'pending', created_at: new Date() };
    stores.tasks.set(id, task);
    return { rows: [task] };
  }

  if (sqlLower.includes('from user_personalization')) {
    const data = Array.from(stores.personalization.values()).find(p => p.user_id === params[0]);
    return { rows: data ? [data] : [] };
  }

  if (sqlLower.includes('from user_streaks')) {
    const streaks = Array.from(stores.streaks.values()).filter(s => s.user_id === params[0]);
    return { rows: streaks };
  }

  if (sqlLower.includes('from morning_intentions')) {
    const intentions = Array.from(stores.morningIntentions.values()).filter(i => i.user_id === params[0]);
    return { rows: intentions };
  }

  if (sqlLower.includes('from coping_tools')) {
    const tools = Array.from(stores.copingTools.values());
    return { rows: tools };
  }

  if (sqlLower.includes('from content_items')) {
    const content = Array.from(stores.content.values());
    return { rows: content };
  }

  // Default empty response
  return { rows: [], rowCount: 0 };
};

// Mock transaction function
export const transaction = async (callback) => {
  // Create a simple client-like object
  const client = {
    query: async (sql, params) => query(sql, params)
  };
  return callback(client);
};

// Mock getClient function
export const getClient = async () => ({
  query: async (sql, params) => query(sql, params),
  release: () => {}
});

// Initialize mock database
export const initializeDatabase = async () => {
  console.log('🗄️  Mock database initialized (in-memory mode)');
  return true;
};

export default { query, transaction, getClient, initializeDatabase };
