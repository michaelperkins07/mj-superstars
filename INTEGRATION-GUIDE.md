# MJ's Superstars - Integration Guide

This guide explains how all the pieces fit together: Frontend, Backend, and iOS Native Shell.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Device                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Capacitor Native Shell                       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 React Web App                       │  │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │  │
│  │  │  │ AuthContext│  │ DataContext│  │ Components   │  │  │  │
│  │  │  └─────┬──────┘  └─────┬──────┘  └──────────────┘  │  │  │
│  │  │        │               │                            │  │  │
│  │  │        └───────┬───────┘                            │  │  │
│  │  │                │                                    │  │  │
│  │  │        ┌───────▼───────┐                            │  │  │
│  │  │        │  API Service  │◄────── Native Plugins      │  │  │
│  │  │        │  Socket.IO    │        (Haptics, Push,     │  │  │
│  │  │        └───────┬───────┘         Storage, etc.)     │  │  │
│  │  └────────────────┼────────────────────────────────────┘  │  │
│  └───────────────────┼───────────────────────────────────────┘  │
└──────────────────────┼──────────────────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Backend Server                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │   Express   │  │  Socket.IO  │  │    Claude AI Service    │   │
│  │   REST API  │  │  Real-time  │  │    (Conversations)      │   │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘   │
│         │                │                       │                │
│         └────────────────┼───────────────────────┘                │
│                          │                                        │
│                  ┌───────▼───────┐                                │
│                  │  PostgreSQL   │                                │
│                  │   Database    │                                │
│                  └───────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
mj-superstars/
├── mj-superstars-backend/          # Node.js/Express API server
│   ├── src/
│   │   ├── server.js               # Main entry point
│   │   ├── database/               # DB config & schema
│   │   ├── routes/                 # REST API routes
│   │   ├── services/               # Claude AI, notifications
│   │   └── middleware/             # Auth, error handling
│   └── package.json
│
├── mj-superstars-frontend/         # React web app + services
│   └── src/
│       ├── contexts/               # React contexts (Auth, Data)
│       ├── hooks/                  # Custom hooks
│       ├── services/               # API client, Socket.IO
│       └── components/             # UI components
│
├── mj-superstars-ios/              # Capacitor iOS wrapper
│   ├── capacitor.config.ts         # Capacitor config
│   ├── www/                        # Built web assets
│   ├── ios/                        # Xcode project (generated)
│   └── src/native/                 # Native plugin wrappers
│
└── mj-superstars-full.jsx          # Original monolithic React app
```

## Data Flow

### 1. Authentication Flow

```
User Opens App
      │
      ▼
┌─────────────────────────┐
│ Check stored tokens     │ ◄── localStorage / Preferences
└───────────┬─────────────┘
            │
      ┌─────▼─────┐
      │ Has Token?│
      └─────┬─────┘
            │
     Yes ───┴─── No
      │          │
      ▼          ▼
┌─────────┐  ┌─────────────┐
│ Validate│  │ Show Login/ │
│ with API│  │ Onboarding  │
└────┬────┘  └──────┬──────┘
     │              │
     ▼              ▼
┌─────────┐  ┌─────────────┐
│ Load    │  │ Register/   │
│ Profile │  │ Login       │
└────┬────┘  └──────┬──────┘
     │              │
     └──────┬───────┘
            ▼
┌─────────────────────────┐
│ Store tokens & profile  │
│ Connect Socket.IO       │
│ Load user data          │
└─────────────────────────┘
```

### 2. Mood Logging Flow

```
User logs mood (score: 4, note: "feeling better")
                    │
                    ▼
┌──────────────────────────────────────────┐
│ DataContext.logMood()                    │
│  1. Create local entry with timestamp    │
│  2. Update local state immediately       │
│  3. Save to localStorage                 │
└─────────────────┬────────────────────────┘
                  │
           ┌──────▼──────┐
           │  Is Online? │
           └──────┬──────┘
                  │
         Yes ─────┴───── No
          │              │
          ▼              ▼
┌─────────────────┐  ┌─────────────────┐
│ POST /api/moods │  │ Queue for later │
│ Sync with server│  │ sync            │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Server analyzes mood patterns           │
│ Updates streaks & achievements          │
│ Triggers insights if threshold reached  │
└─────────────────────────────────────────┘
```

### 3. Real-time Conversation Flow

```
User sends message to MJ
          │
          ▼
┌───────────────────────────────┐
│ Socket.IO emit('message')    │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────────────────┐
│ Server receives message                   │
│  1. Save to database                      │
│  2. Build context (profile, history, etc) │
│  3. Call Claude API                       │
│  4. Stream response back via Socket.IO    │
└──────────────────────┬────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────┐
│ Client receives 'mj_response'             │
│  1. Update conversation state             │
│  2. Play haptic feedback                  │
│  3. Scroll to new message                 │
└───────────────────────────────────────────┘
```

## Key Integration Points

### Frontend → Backend API

```typescript
// src/services/api.js provides all API methods
import { MoodAPI, TaskAPI, ConversationAPI } from './services/api';

// Log a mood
const response = await MoodAPI.log(4, {
  note: 'feeling good',
  factors: ['exercise', 'sleep']
});

// Create a task
const task = await TaskAPI.create({
  title: 'Take a walk',
  category: 'wellness'
});

// Start conversation
const convo = await ConversationAPI.create(4);
```

### Frontend → Native (Capacitor)

```typescript
// src/native/hooks.ts provides React hooks for native features
import { useHaptics, usePushNotifications } from './native/hooks';

function TaskComplete() {
  const haptics = useHaptics();

  const onComplete = async () => {
    await haptics.success();  // Native haptic feedback
    await TaskAPI.complete(taskId);
  };
}
```

### Offline Support

```typescript
// DataContext handles offline-first data management
// Changes are queued and synced when connection returns

const { logMood, isOnline, syncing } = useData();

// This works offline - queued automatically
await logMood(4, { note: 'feeling okay' });

// Check sync status
if (syncing) {
  showSyncIndicator();
}
```

## Running the Full Stack

### 1. Start Backend

```bash
cd mj-superstars-backend
npm install
npm start
# Server running on http://localhost:3000
```

### 2. Build Frontend

```bash
cd mj-superstars-frontend
npm install
npm run build
```

### 3. Run iOS App

```bash
cd mj-superstars-ios
npm install

# Copy frontend build
cp -r ../mj-superstars-frontend/build/* ./www/

# Sync and open Xcode
npx cap sync ios
npx cap open ios
```

### 4. Development Mode

For faster iteration, run the frontend dev server and point Capacitor to it:

```typescript
// capacitor.config.ts
server: {
  url: 'http://localhost:3000',  // Your dev server
  cleartext: true
}
```

## Environment Configuration

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mj_superstars
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-claude-api-key
USE_MOCK_DB=true  # For demo mode without PostgreSQL
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Testing

### Backend API

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","display_name":"Test"}'
```

### Frontend Integration

```bash
# Run integration tests
cd mj-superstars-frontend
npm test
```

## Deployment Checklist

### Backend
- [ ] Set production DATABASE_URL
- [ ] Configure real ANTHROPIC_API_KEY
- [ ] Set secure JWT_SECRET
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure rate limiting

### Frontend
- [ ] Set production API URLs
- [ ] Build with production env
- [ ] Enable error tracking (Sentry)

### iOS
- [ ] Configure signing certificates
- [ ] Set up push notification certs
- [ ] Create app icons and splash screen
- [ ] Test on real device
- [ ] Submit to TestFlight

---

## What's Next?

Based on the [roadmap](./MJ-SUPERSTARS-ROADMAP.md):

**Completed:**
- ✅ Backend API with all endpoints
- ✅ Frontend-Backend integration (contexts, hooks, API client)
- ✅ iOS Capacitor shell with native plugins

**Sprint 2 Focus (Week 3-4):**
- Push notifications implementation
- UI polish and animations
- Onboarding improvements
- TestFlight deployment

**Sprint 3 Focus (Week 5-6):**
- Apple Watch companion app
- HealthKit integration
- Analytics setup

---

Questions? Check the individual README files in each project directory.
