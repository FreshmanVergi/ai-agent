# SE4458 – Assignment 2: AI Agent Stay Application

**Student:** Berker Vergi | **Group:** 2

---

## 🔗 Links

| | URL |
|---|---|
| **GitHub** | https://github.com/FreshmanVergi/ai-agent |
| **Midterm API (StayAPI)** | http://stayapi-env.eba-ruyp7rkn.eu-central-1.elasticbeanstalk.com/swagger-ui/index.html |
| **Video** | https://drive.google.com/your-video-link |

---

## 📐 Architecture

```
React Native App (Mobile Frontend)
        ↓  HTTP
Node.js Agent Backend (Express)
        ↓  Groq API
Llama 3.3 LLM (via Groq)
        ↓  Tool Calling
MCP Tools (query_listings, book_listing, review_listing, get_my_bookings)
        ↓  REST API
StayAPI (Midterm - AWS Elastic Beanstalk)
        ↓
PostgreSQL (AWS RDS)

Firebase Firestore ← Real-time message logging (onSnapshot listener)
```

### Components
| Component | Technology |
|---|---|
| Mobile Frontend | React Native (Expo) |
| Agent Backend | Node.js + Express |
| LLM | Llama 3.3 70B via Groq API |
| MCP Tools | Node.js (custom tool definitions) |
| Real-time Database | Firebase Firestore |
| Midterm API | Spring Boot 3.4.4 (AWS Elastic Beanstalk) |
| Database | PostgreSQL 17 (AWS RDS) |

---

## 🛠️ MCP Tools

| Tool | Description | Maps to |
|---|---|---|
| `query_listings` | Search available listings by city, date, guests | `GET /api/v1/listings` |
| `book_listing` | Book a stay | `POST /api/v1/bookings` |
| `review_listing` | Review a completed stay | `POST /api/v1/reviews` |
| `get_my_bookings` | List user's bookings | `GET /api/v1/bookings/my` |

---

## 💬 How It Works

1. User sends a message from React Native app
2. Backend receives message, saves to Firestore (real-time)
3. Backend sends message + conversation history to Groq LLM
4. LLM decides which MCP tool to call based on intent
5. MCP tool calls the StayAPI endpoint
6. Result is returned to LLM to generate natural language response
7. Response is saved to Firestore and returned to frontend
8. React Native app listens to Firestore in real-time (onSnapshot) and updates UI

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Expo Go app on your phone
- Firebase project (Firestore enabled)

### Backend
```bash
cd backend
npm install
# Create .env file:
# GROQ_API_KEY=your_groq_key
# STAYAPI_BASE_URL=http://stayapi-env.eba-ruyp7rkn.eu-central-1.elasticbeanstalk.com
# STAYAPI_USERNAME=agentuser
# STAYAPI_PASSWORD=Agent123!
# PORT=3000

node server.js
```

### Mobile
```bash
cd mobile
npm install
# Update BACKEND_URL in App.js with your local IP
npx expo start
```
Scan QR code with Expo Go app.

---

## 📐 Design & Assumptions

- The Node.js backend acts as both the **API Gateway** and **Agent backend** — all requests from the mobile app go through it before reaching the StayAPI
- **Firestore** is used for real-time message persistence; the mobile app uses `onSnapshot` to listen for new messages without polling
- **In-memory conversation history** is used for LLM context to avoid re-fetching from Firestore on every message (which caused duplicate tool calls)
- A constant `agentuser/Agent123!` credential is used for StayAPI authentication — auto-registered as GUEST on first call
- LLM (Llama 3.3) handles intent parsing and tool selection automatically via Groq's function calling API
- Tool parameters are enforced as integers where needed to prevent schema validation errors with the Groq API

## 🐛 Issues Encountered

- **Gemini API free tier exhausted** quickly during testing → switched to Groq (free, fast, reliable)
- **Firestore re-fetch loop**: loading conversation history from Firestore for each LLM call caused the LLM to repeat tool calls → fixed by using in-memory Map for LLM context while Firestore handles only real-time UI updates
- **Tool parameter type mismatch**: Groq returned `rating` and `stayId` as strings instead of numbers → fixed by enforcing `integer` type in tool schema and using `parseInt()` in tool execution
- **Expo path with spaces**: project on external HDD with space in path caused some npm issues → resolved with quoted paths

---

## 📁 Project Structure

```
ai-agent/
├── backend/
│   ├── server.js          ← Express + Groq LLM + Firestore
│   ├── mcp-tools.js       ← MCP tool definitions + StayAPI calls
│   ├── package.json
│   └── serviceAccount.json (gitignored)
├── mobile/
│   ├── App.js             ← React Native chat UI + Firestore listener
│   └── package.json
└── README.md
```
