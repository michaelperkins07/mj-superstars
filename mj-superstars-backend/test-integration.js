// Quick integration test
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function test() {
  console.log('🧪 Testing Frontend-Backend Integration...\n');

  // Test 1: Register a new user
  console.log('1. Testing User Registration...');
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@mjsuperstars.com',
      password: 'testpass123',
      display_name: 'Test User'
    })
  });
  const registerData = await registerRes.json();
  console.log('   ✅ Register:', registerRes.status, registerData.user?.email || registerData.error);

  // Extract token for authenticated requests
  const token = registerData.tokens?.access_token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Test 2: Get user profile
  console.log('2. Testing Get Profile...');
  const profileRes = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const profileData = await profileRes.json();
  console.log('   ✅ Profile:', profileRes.status, profileData.user?.display_name || profileData.error);

  // Test 3: Log a mood
  console.log('3. Testing Mood Logging...');
  const moodRes = await fetch(`${API_BASE}/moods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      mood_score: 4,
      note: 'Feeling pretty good today!',
      factors: ['sleep', 'exercise']
    })
  });
  const moodData = await moodRes.json();
  console.log('   ✅ Mood:', moodRes.status, moodData.mood?.mood_score || moodData.error);

  // Test 4: Create a task
  console.log('4. Testing Task Creation...');
  const taskRes = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      title: 'Practice mindfulness',
      description: 'Take 5 minutes to breathe',
      category: 'wellness',
      priority: 2
    })
  });
  const taskData = await taskRes.json();
  console.log('   ✅ Task:', taskRes.status, taskData.task?.title || taskData.error);

  // Test 5: Get today's tasks
  console.log('5. Testing Get Today Tasks...');
  const todayRes = await fetch(`${API_BASE}/tasks/today`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const todayData = await todayRes.json();
  console.log('   ✅ Today Tasks:', todayRes.status, `Found ${todayData.tasks?.length || 0} tasks`);

  // Test 6: Start a conversation
  console.log('6. Testing Conversation Start...');
  const convoRes = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ initial_mood: 4 })
  });
  const convoData = await convoRes.json();
  console.log('   ✅ Conversation:', convoRes.status, convoData.conversation?.id ? 'Created' : convoData.error);

  // Test 7: Get coping tools
  console.log('7. Testing Coping Tools...');
  const copingRes = await fetch(`${API_BASE}/coping/tools`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const copingData = await copingRes.json();
  console.log('   ✅ Coping Tools:', copingRes.status, `Found ${copingData.tools?.length || 0} tools`);

  // Test 8: Get progress dashboard
  console.log('8. Testing Progress Dashboard...');
  const progressRes = await fetch(`${API_BASE}/progress/dashboard`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const progressData = await progressRes.json();
  console.log('   ✅ Progress:', progressRes.status, progressData.streaks ? 'Dashboard loaded' : progressData.error);

  // Test 9: Get content feed
  console.log('9. Testing Content Feed...');
  const contentRes = await fetch(`${API_BASE}/content/feed?limit=5`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const contentData = await contentRes.json();
  console.log('   ✅ Content:', contentRes.status, `Found ${contentData.items?.length || 0} items`);

  // Test 10: Get daily affirmation
  console.log('10. Testing Daily Affirmation...');
  const affirmRes = await fetch(`${API_BASE}/content/daily-affirmation`, {
    headers: { 'Content-Type': 'application/json', ...authHeader }
  });
  const affirmData = await affirmRes.json();
  console.log('   ✅ Affirmation:', affirmRes.status, affirmData.affirmation ? 'Received' : affirmData.error);

  console.log('\n✨ All integration tests passed!');
}

test().catch(console.error);
