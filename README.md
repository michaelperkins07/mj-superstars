# 🌟 MJ's Superstars

AI-powered mental health coaching app featuring MJ, your personal wellness companion.

## Features

- 💬 **AI Chat** - Conversational mental health support powered by Claude
- 📊 **Mood Tracking** - Log and visualize your emotional journey
- 📔 **Journaling** - Guided reflection with AI prompts
- ✅ **Task Management** - Stay on top of wellness goals
- 👥 **Buddy System** - Connect with accountability partners
- ⌚ **Apple Watch** - Quick mood logging from your wrist
- 🔔 **Smart Notifications** - Gentle reminders at the right time

## Tech Stack

- **Frontend**: React, Capacitor (iOS), TailwindCSS
- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL
- **Cache**: Redis
- **AI**: Anthropic Claude API
- **Hosting**: Render

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Anthropic API key

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/mj-superstars.git
cd mj-superstars

# Install dependencies
cd mj-superstars-backend && npm install
cd ../mj-superstars-frontend && npm install

# Set up environment variables
cp mj-superstars-backend/.env.example mj-superstars-backend/.env
# Edit .env with your API keys

# Start development servers
cd mj-superstars-backend && npm run dev
cd ../mj-superstars-frontend && npm start
```

### Deploy to Render

1. Push to GitHub
2. Connect repo to [Render](https://render.com)
3. Select "Blueprint" deployment
4. Set required environment variables
5. Deploy!

See [RENDER-DEPLOY.md](./RENDER-DEPLOY.md) for detailed instructions.

## Project Structure

```
mj-superstars/
├── mj-superstars-backend/    # Node.js API server
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth, validation
│   │   ├── database/         # Migrations, queries
│   │   └── workers/          # Background jobs
│   └── package.json
├── mj-superstars-frontend/   # React web app
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API clients
│   │   └── hooks/            # Custom hooks
│   └── package.json
├── mj-superstars-ios/        # Capacitor iOS config
├── render.yaml               # Render Blueprint
└── README.md
```

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `JWT_SECRET` | Secret for JWT tokens |
| `CLIENT_URL` | Frontend URL for CORS |

### Frontend
| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL |
| `REACT_APP_SOCKET_URL` | WebSocket URL |

## License

Private - All rights reserved.

---

Built with ❤️ by Mike
