# 🚀 Omni Copilot

> A unified AI assistant that controls Google Calendar, Drive, Gmail & Notion through a single natural language chat interface.

![Tech Stack](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python-009688?style=flat-square)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20%2B%20Tailwind-000?style=flat-square)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%201.5-4285F4?style=flat-square)
![DB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square)

---

## 🎯 What It Does

Give natural language commands like:

| Command | What Happens |
|---|---|
| *"Create a Google Meet at 7 PM today for team sync"* | Creates calendar event + Meet link |
| *"Fetch my resume from Drive and summarize it"* | Reads PDF/DOCX → AI explanation |
| *"Summarize my 5 unread emails"* | Fetches Gmail → structured summary |
| *"Write an about me section in Notion"* | AI-generates content → creates page |
| *"What meetings do I have this week?"* | Lists upcoming calendar events |

---

## 🏗️ Architecture

```
omni-copilot/
├── backend/                    # FastAPI Python backend
│   └── app/
│       ├── main.py             # App entry point
│       ├── config/
│       │   ├── settings.py     # Env-based config
│       │   └── database.py     # MongoDB (Motor async)
│       ├── routes/
│       │   ├── chat.py         # Chat endpoints
│       │   ├── auth.py         # Google + Notion OAuth
│       │   ├── files.py        # File upload/parse
│       │   └── integrations.py # Integration status
│       ├── services/
│       │   ├── ai_service.py   # Gemini agent loop
│       │   └── chat_service.py # Chat orchestration + DB
│       ├── tools/
│       │   ├── registry.py     # Tool registry (JSON schema + executor)
│       │   ├── calendar_tool.py# Google Calendar operations
│       │   ├── drive_tool.py   # Google Drive read/list
│       │   ├── gmail_tool.py   # Gmail fetch
│       │   └── notion_tool.py  # Notion page creation
│       ├── integrations/
│       │   └── google_auth.py  # OAuth2 + token refresh
│       ├── models/
│       │   └── schemas.py      # Pydantic models
│       └── utils/
│           ├── encryption.py   # Fernet token encryption
│           └── file_parser.py  # PDF + DOCX extraction
│
├── frontend/                   # Next.js 14 frontend
│   └── src/
│       ├── app/
│       │   ├── layout.tsx      # Root layout + fonts
│       │   ├── globals.css     # Design system CSS
│       │   └── page.tsx        # Main chat page
│       ├── components/
│       │   ├── chat/
│       │   │   ├── MessageBubble.tsx  # User/AI message display
│       │   │   ├── ChatInput.tsx      # Input + file upload
│       │   │   └── ToolTrace.tsx      # AI execution steps UI
│       │   └── sidebar/
│       │       └── Sidebar.tsx        # Sessions + integrations
│       ├── hooks/
│       │   └── useUser.ts      # User state + auth
│       └── lib/
│           └── api.ts          # Axios API client + types
│
└── docker-compose.yml          # Full stack orchestration
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud account (free)
- Notion account (free)

### 1. Clone & Configure

```bash
git clone <repo>
cd omni-copilot

# Backend config
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

# Frontend config
cp frontend/.env.local.example frontend/.env.local
```

### 2. Get API Keys

#### Google APIs (free)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable these APIs:
   - Google Calendar API
   - Google Drive API
   - Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add redirect URI: `http://localhost:8000/api/auth/google/callback`
5. Copy Client ID + Secret to `.env`

#### Gemini API (free tier)
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create API Key → Copy to `GEMINI_API_KEY`

#### Notion API (free)
1. Go to [Notion Integrations](https://www.notion.so/profile/integrations)
2. Create a public integration (OAuth)
3. Copy Client ID + Secret to `.env`

### 3. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Register tools (add to main.py startup)
# Already handled by the lifespan function

uvicorn app.main:app --reload
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 5. Or Use Docker

```bash
docker-compose up --build
```

---

## 🔐 Authentication Flow

```
User clicks "Sign in with Google"
      ↓
GET /api/auth/google/login?user_id=new
      ↓
Redirect → Google OAuth consent
      ↓
GET /api/auth/google/callback?code=...
      ↓
Exchange code → access + refresh tokens
Encrypt tokens (Fernet) → store in MongoDB
Fetch Google profile → upsert user
      ↓
Redirect → frontend with user_id
      ↓
Frontend stores user_id in localStorage
```

---

## 🧠 AI Agent Loop

```
User sends message
      ↓
Gemini 1.5 Flash + tool definitions (JSON schema)
      ↓
Gemini decides which tool(s) to call
      ↓
Backend executes tool (Calendar / Drive / Gmail / Notion)
      ↓
Tool result sent back to Gemini
      ↓
Gemini synthesizes final natural language response
      ↓
Response + tool trace displayed in UI
```

Supports **multi-step reasoning** — Gemini can chain tools:
e.g. "Read my resume from Drive and create a Notion profile page"
→ `read_drive_file` → AI processes text → `create_notion_page`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/message` | Send message to AI agent |
| `GET` | `/api/chat/history/{user_id}/{session_id}` | Get chat history |
| `GET` | `/api/chat/sessions/{user_id}` | List all sessions |
| `GET` | `/api/auth/google/login` | Start Google OAuth |
| `GET` | `/api/auth/google/callback` | OAuth callback |
| `GET` | `/api/auth/notion/login` | Start Notion OAuth |
| `GET` | `/api/auth/me/{user_id}` | Get user profile |
| `POST` | `/api/files/upload` | Upload + parse file |
| `GET` | `/api/integrations/status/{user_id}` | Integration status |

Full interactive docs: `http://localhost:8000/docs`

---

## 🗄️ MongoDB Schema

```javascript
// users collection
{
  _id: ObjectId,
  email: String,          // unique index
  name: String,
  picture: String,
  google_tokens: {
    access_token: String,  // Fernet encrypted
    refresh_token: String, // Fernet encrypted
    token_expiry: Date,
  },
  notion_token: String,   // Fernet encrypted
  integrations: { google: Boolean, notion: Boolean },
  created_at: Date,
  updated_at: Date,
}

// chat_messages collection
{
  _id: ObjectId,
  session_id: String,     // indexed
  user_id: String,        // indexed
  role: "user" | "assistant",
  content: String,
  tool_executions: [{
    tool_name: String,
    tool_input: Object,
    tool_output: Object,
    success: Boolean,
    duration_ms: Number,
  }],
  created_at: Date,
}

// tool_logs collection
{
  _id: ObjectId,
  user_id: String,
  tool_name: String,
  input_data: Object,
  output_data: Object,
  success: Boolean,
  error: String | null,
  duration_ms: Number,
  created_at: Date,
}
```

---

## 🎨 UI Features

- **Dark glassmorphism design** — premium SaaS aesthetic
- **Execution trace panel** — collapsible step-by-step tool trace
- **Quick prompts** — suggested commands on focus
- **File upload** — attach PDF/DOCX to chat
- **Session history** — sidebar with all previous chats
- **Integration status** — real-time connected/disconnected state
- **Responsive** — mobile sidebar drawer
- **Smooth animations** — Framer Motion throughout
