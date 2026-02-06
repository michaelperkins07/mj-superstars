-- ============================================================
-- MJ's Superstars - Development Seed Data
-- Creates demo users and sample data for testing
-- ============================================================

-- ============================================================
-- DEMO USER (for App Store review)
-- ============================================================

INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    onboarding_completed,
    onboarding_data,
    subscription_status,
    subscription_product_id,
    subscription_expires_at,
    current_streak,
    longest_streak,
    total_points,
    last_activity_date,
    email_verified,
    preferences
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-000000demo01',
    'demo@mjsuperstars.com',
    -- Password: DemoUser2025!
    '$2b$10$rQZ8K5RxH5N8JqL5Yx5Y5uH5N5J5K5L5M5N5O5P5Q5R5S5T5U5V5W',
    'Demo User',
    TRUE,
    '{
        "name": "Demo",
        "goals": ["reduce_anxiety", "build_habits", "sleep_better"],
        "communication_style": "supportive",
        "notification_time": "09:00"
    }'::jsonb,
    'premium',
    'com.mjsuperstars.premium.yearly',
    '2026-12-31 23:59:59+00',
    14,
    21,
    2450,
    CURRENT_DATE,
    TRUE,
    '{
        "communication_style": "supportive",
        "notification_time_morning": "09:00",
        "notification_time_evening": "21:00",
        "timezone": "America/New_York",
        "haptics_enabled": true,
        "sound_enabled": true
    }'::jsonb
);

-- ============================================================
-- DEMO USER'S MOOD HISTORY (14 days)
-- ============================================================

INSERT INTO moods (user_id, value, note, factors, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 3, 'Starting my wellness journey', ARRAY['work', 'sleep'], NOW() - INTERVAL '14 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 3, NULL, ARRAY['work'], NOW() - INTERVAL '13 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Had a good meeting today', ARRAY['work', 'social'], NOW() - INTERVAL '12 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, NULL, ARRAY['exercise', 'sleep'], NOW() - INTERVAL '11 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 3, 'Feeling a bit stressed', ARRAY['work'], NOW() - INTERVAL '10 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 2, 'Rough day, but getting through it', ARRAY['work', 'health'], NOW() - INTERVAL '9 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Weekend vibes!', ARRAY['social', 'exercise'], NOW() - INTERVAL '8 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 5, 'Great day with friends', ARRAY['social', 'weather'], NOW() - INTERVAL '7 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Productive Monday', ARRAY['work', 'sleep'], NOW() - INTERVAL '6 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, NULL, ARRAY['exercise'], NOW() - INTERVAL '5 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 3, 'Midweek slump', ARRAY['sleep'], NOW() - INTERVAL '4 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Breathing exercises helped!', ARRAY['exercise', 'health'], NOW() - INTERVAL '3 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 5, 'Feeling grateful today', ARRAY['social', 'weather', 'exercise'], NOW() - INTERVAL '2 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Good progress on goals', ARRAY['work', 'sleep'], NOW() - INTERVAL '1 day'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 4, 'Ready for a new day!', ARRAY['sleep', 'exercise'], NOW());

-- ============================================================
-- DEMO CONVERSATION
-- ============================================================

INSERT INTO conversations (
    id,
    user_id,
    title,
    message_count,
    last_message_at,
    created_at
) VALUES (
    'c1c2c3c4-e5f6-7890-abcd-000000conv01',
    'a1b2c3d4-e5f6-7890-abcd-000000demo01',
    'Welcome Chat',
    6,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '14 days'
);

INSERT INTO messages (conversation_id, user_id, role, content, created_at) VALUES
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'user', 'Hey MJ! Just downloaded the app.', NOW() - INTERVAL '14 days'),
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'assistant', 'Hey there, Demo! 👋 Welcome to your wellness journey! I''m MJ, and I''m so glad you''re here. How are you feeling today? And what brought you to explore this app?', NOW() - INTERVAL '14 days' + INTERVAL '1 minute'),
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'user', 'I''ve been feeling pretty stressed with work lately. Looking for ways to manage it better.', NOW() - INTERVAL '14 days' + INTERVAL '5 minutes'),
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'assistant', 'I hear you - work stress is so common, and it''s really wise that you''re being proactive about managing it. 💜 There are lots of techniques we can explore together. Some people find that quick breathing exercises help in the moment, while others prefer building longer-term habits like journaling or regular check-ins. What sounds most appealing to you?', NOW() - INTERVAL '14 days' + INTERVAL '6 minutes'),
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'user', 'I think breathing exercises could help. I sometimes feel overwhelmed during meetings.', NOW() - INTERVAL '14 days' + INTERVAL '10 minutes'),
('c1c2c3c4-e5f6-7890-abcd-000000conv01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'assistant', 'That''s a great insight! In-the-moment techniques can be really powerful. I''ve added a 4-7-8 breathing exercise to your Coping Toolkit - it only takes a minute and can help calm your nervous system quickly. The best part? You can do it discreetly, even during a meeting! Want to try it together right now?', NOW() - INTERVAL '14 days' + INTERVAL '11 minutes');

-- ============================================================
-- DEMO TASKS
-- ============================================================

INSERT INTO tasks (user_id, title, description, category, points, completed, completed_at, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'Morning check-in', 'Start your day with intention', 'daily', 10, TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '14 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'Log your mood', 'How are you feeling?', 'daily', 10, TRUE, NOW(), NOW() - INTERVAL '14 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'Try a breathing exercise', 'Take 2 minutes to breathe', 'wellness', 15, TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', '10-minute walk', 'Get some fresh air', 'exercise', 20, FALSE, NULL, NOW() - INTERVAL '1 day'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'Write in journal', 'Reflect on your day', 'reflection', 15, FALSE, NULL, NOW());

-- ============================================================
-- DEMO JOURNAL ENTRIES
-- ============================================================

INSERT INTO journal_entries (user_id, prompt, content, themes, word_count, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'What are three things you''re grateful for today?', 'Today I''m grateful for: 1) My supportive team at work who helped me through a tough project. 2) The sunny weather that made my morning walk so pleasant. 3) This app - it''s helping me be more mindful about my mental health.', ARRAY['gratitude', 'work', 'nature'], 52, NOW() - INTERVAL '3 days'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'What challenged you today, and how did you handle it?', 'Had a difficult conversation with my manager about deadlines. I felt anxious beforehand, but I used the breathing exercise MJ suggested and it really helped me stay calm. The conversation went better than expected!', ARRAY['work', 'growth', 'coping'], 41, NOW() - INTERVAL '1 day');

-- ============================================================
-- DEMO AI MEMORIES
-- ============================================================

INSERT INTO ai_memories (user_id, memory_type, content, source_type, importance_score, is_current) VALUES
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'personal_info', 'User''s name is Demo', 'onboarding', 1.0, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'goals', 'Wants to reduce work-related anxiety', 'conversation', 0.9, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'goals', 'Interested in building better sleep habits', 'onboarding', 0.8, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'coping_preference', 'Finds breathing exercises helpful', 'conversation', 0.85, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'trigger', 'Work meetings can cause anxiety', 'conversation', 0.8, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'life_context', 'Has a supportive team at work', 'journal', 0.6, TRUE),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', 'communication_style', 'Prefers supportive and encouraging tone', 'onboarding', 0.9, TRUE);

-- ============================================================
-- DEMO BUDDY
-- ============================================================

INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    onboarding_completed,
    subscription_status,
    current_streak,
    total_points,
    last_activity_date,
    email_verified
) VALUES (
    'b1b2c3d4-e5f6-7890-abcd-000000buddy1',
    'buddy@mjsuperstars.com',
    '$2b$10$rQZ8K5RxH5N8JqL5Yx5Y5uH5N5J5K5L5M5N5O5P5Q5R5S5T5U5V5W',
    'Alex',
    TRUE,
    'premium',
    7,
    890,
    CURRENT_DATE,
    TRUE
);

INSERT INTO buddies (
    id,
    user_id,
    buddy_user_id,
    status,
    sharing_level,
    connected_at
) VALUES (
    'd1d2d3d4-e5f6-7890-abcd-000000budd01',
    'a1b2c3d4-e5f6-7890-abcd-000000demo01',
    'b1b2c3d4-e5f6-7890-abcd-000000buddy1',
    'active',
    'standard',
    NOW() - INTERVAL '14 days'
);

-- Buddy activities
INSERT INTO buddy_activities (buddy_id, from_user_id, activity_type, content, created_at) VALUES
('d1d2d3d4-e5f6-7890-abcd-000000budd01', 'b1b2c3d4-e5f6-7890-abcd-000000buddy1', 'nudge', 'You''ve got this! 💪', NOW() - INTERVAL '2 days'),
('d1d2d3d4-e5f6-7890-abcd-000000budd01', 'a1b2c3d4-e5f6-7890-abcd-000000demo01', 'celebration', 'Completed a 7-day streak! 🎉', NOW() - INTERVAL '1 day'),
('d1d2d3d4-e5f6-7890-abcd-000000budd01', 'b1b2c3d4-e5f6-7890-abcd-000000buddy1', 'mood_share', NULL, NOW() - INTERVAL '3 hours');

-- ============================================================
-- DEMO HEALTH DATA
-- ============================================================

INSERT INTO health_summaries (user_id, date, steps, active_calories, exercise_minutes, resting_heart_rate, heart_rate_variability, sleep_hours, sleep_quality) VALUES
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '6 days', 8234, 320, 45, 68, 42.5, 7.2, 'good'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '5 days', 6521, 280, 30, 70, 38.2, 6.5, 'fair'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '4 days', 9102, 410, 60, 66, 45.1, 7.8, 'good'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '3 days', 7856, 350, 40, 67, 43.0, 7.5, 'good'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '2 days', 5234, 220, 20, 72, 36.8, 6.0, 'fair'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE - INTERVAL '1 day', 10523, 480, 75, 65, 48.2, 8.0, 'excellent'),
('a1b2c3d4-e5f6-7890-abcd-000000demo01', CURRENT_DATE, 4521, 180, 15, 69, 41.0, 7.0, 'good');

-- ============================================================
-- TEST USER (for development)
-- ============================================================

INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    onboarding_completed,
    subscription_status,
    current_streak,
    total_points,
    email_verified
) VALUES (
    't1t2t3t4-e5f6-7890-abcd-000000test01',
    'test@example.com',
    -- Password: Test1234!
    '$2b$10$rQZ8K5RxH5N8JqL5Yx5Y5uH5N5J5K5L5M5N5O5P5Q5R5S5T5U5V5W',
    'Test User',
    FALSE,
    'free',
    0,
    0,
    TRUE
);

-- ============================================================
-- SEED COMPLETE
-- ============================================================

SELECT 'Development seed data inserted successfully!' as status;
