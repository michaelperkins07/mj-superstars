# MJ's Superstars Backend API

A comprehensive Node.js/Express backend for the MJ's Superstars mental health coaching app.

## Features

- 🔐 **Authentication** - JWT-based auth with refresh tokens
- 💬 **Conversations** - Real-time chat with Claude AI integration
- 📊 **Mood Tracking** - Log, analyze, and visualize mood patterns
- ✅ **Task Management** - Tasks with gamification and streaks
- 🌅 **Daily Rituals** - Morning intentions & evening reflections
- 📝 **Journaling** - Guided prompts and AI-generated suggestions
- 🏆 **Progress & Achievements** - Streaks, points, and milestones
- 🧘 **Coping Toolkit** - Breathing exercises, grounding techniques
- 🔔 **Notifications** - Push notifications and scheduled check-ins
- 🔌 **Real-time** - Socket.IO for live messaging

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **AI**: Anthropic Claude API
- **Real-time**: Socket.IO
- **Push Notifications**: Web Push (VAPID)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Anthropic API key

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

Key variables to configure:

```env
# Database
DB_HOST=localhost
DB_NAME=mj_superstars
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your-super-secret-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### User
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/communication-style` - Update MJ's communication style
- `PUT /api/users/me/personalization` - Update personalization data

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Start new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations/:id/messages` - Send message to MJ
- `POST /api/conversations/:id/end` - End conversation

### Mood
- `GET /api/moods` - Get mood history
- `POST /api/moods` - Log mood
- `GET /api/moods/trends` - Get mood trends & patterns
- `GET /api/moods/today` - Get today's moods

### Tasks
- `GET /api/tasks` - Get tasks
- `GET /api/tasks/today` - Get today's tasks
- `POST /api/tasks` - Create task
- `POST /api/tasks/:id/complete` - Mark complete (with points!)
- `POST /api/tasks/suggest` - Get MJ task suggestions

### Rituals
- `GET /api/rituals/morning/today` - Get today's intention
- `POST /api/rituals/morning` - Set morning intention
- `GET /api/rituals/evening/today` - Get today's reflection
- `POST /api/rituals/evening` - Complete evening reflection

### Journal
- `GET /api/journal` - Get entries
- `POST /api/journal` - Create entry
- `GET /api/journal/prompts/generate` - Get AI-generated prompt
- `GET /api/journal/prompts/library` - Get prompt library

### Progress
- `GET /api/progress/dashboard` - Main progress dashboard
- `GET /api/progress/streaks` - Get all streaks
- `GET /api/progress/achievements` - Get achievements
- `GET /api/progress/weekly-story` - Get weekly growth story

### Coping
- `GET /api/coping/tools` - Get coping tools
- `POST /api/coping/tools` - Add custom tool
- `POST /api/coping/tools/:id/use` - Log tool usage
- `GET /api/coping/quick` - Quick exercises
- `GET /api/coping/safety-plan` - Get safety plan

### Content
- `GET /api/content/feed` - Get personalized content feed
- `GET /api/content/daily-affirmation` - Get AI-generated affirmation
- `GET /api/content/quotes` - Get quotes
- `GET /api/content/challenges` - Get daily challenges

### Notifications
- `POST /api/notifications/subscribe` - Subscribe to push
- `GET /api/notifications/scheduled` - Get scheduled check-ins
- `POST /api/notifications/scheduled` - Create scheduled check-in

### Insights
- `GET /api/insights` - Get AI insights
- `GET /api/insights/mood-patterns` - Mood pattern analysis
- `GET /api/insights/progress-summary` - Progress summary

## Socket.IO Events

### Client -> Server
- `send_message` - Send message in conversation
- `quick_mood` - Quick mood log
- `complete_task` - Mark task complete
- `join_conversation` - Join conversation room
- `typing_start/stop` - Typing indicators

### Server -> Client
- `connected` - Connection confirmed
- `message_saved` - User message saved
- `mj_typing` - MJ is typing
- `mj_response` - MJ's response
- `mood_logged` - Mood logged confirmation
- `task_completed` - Task completion confirmation

## Database Schema

The database includes 25+ tables for:
- Users & authentication
- Conversations & messages
- Mood tracking & patterns
- Tasks & completions
- Morning/evening rituals
- Journal entries
- Personalization & extractions
- Streaks & achievements
- Coping tools & safety plans
- Content & interactions
- Notifications & history
- Insights & analytics

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run migrations
npm run db:migrate
```

## Production Deployment

```bash
# Build and start
npm start

# With PM2
pm2 start src/server.js --name mj-backend
```

## License

Private - MJ's Superstars © 2024
