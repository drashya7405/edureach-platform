# EduReach Platform

EduReach is a full-stack college-discovery and admissions experience for the fictional **EduReach College, Hyderabad**. It combines a responsive marketing site, account-based content access, and an AI admissions counselor grounded in an internal college knowledge base.

The app presents programs, faculty, campus life, events, placement data, and contact details. Visitors can browse the core landing page without an account; signing up unlocks the remaining content and access to the chatbot.

## Contents

- [Capabilities](#capabilities)
- [Architecture and request flow](#architecture-and-request-flow)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Frontend](#frontend)
- [Backend and API](#backend-and-api)
- [AI counselor and knowledge base](#ai-counselor-and-knowledge-base)
- [Database](#database)
- [Configuration](#configuration)
- [Run locally](#run-locally)
- [Build, quality checks, and deployment](#build-quality-checks-and-deployment)
- [Current implementation notes](#current-implementation-notes)

## Capabilities

- Responsive single-page college website with smooth anchor navigation and desktop/mobile navigation menus.
- Hero, college overview, achievements, program catalogue, rotating quotes, mentor cards, campus-life cards, events gallery, placement highlights, counseling CTA, and contact footer.
- A scroll-triggered sign-up prompt when a logged-out visitor reaches the mentors section; the prompt is shown once per browser session.
- Gated post-mentor content: campus life, event gallery, counseling CTA, and placement statistics appear only to authenticated users.
- Account registration, login, persisted JWT session, current-user lookup, logout, user feedback notifications, and protected UI states.
- Floating AI-chat launcher that sends logged-out visitors to login and opens the chat drawer for signed-in users.
- AI counselor with suggested questions, conversation UI, loading state, error state, and answers grounded in the EduReach knowledge-base document.
- Health endpoint that reports server, MongoDB, JWT, Gemini-key, and timestamp status.

## Architecture and request flow

```text
React client (Vite)
  ├─ AuthContext (session state via HTTP-only cookie)
  ├─ Axios client with credentials (/api by default)
  └─ POST /auth/* and /chat/message
           │
           ▼
Express API (Port 3001)
  ├─ Mongoose → MongoDB users collection
  ├─ Native MongoDB client → knowledge_docs collection
  └─ LangChain agent → Gemini chat model + retrieval tool
                              │
                              ▼
                    MongoDB Atlas Vector Search index (3072D)
                    edureach_vector_index
```

On startup, the server connects to MongoDB, starts Express, and runs a read-only knowledge-base probe. It never destructively drops or rebuilds knowledge embeddings on startup. Authentication uses secure HTTP-only cookies, with credentials automatically sent by Axios.

## Technology stack

| Area | Technologies |
| --- | --- |
| Client | React 19, TypeScript, Vite 6, React Router DOM 7 |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, custom CSS variables, responsive utility classes |
| UI | Lucide React icons, React Hot Toast notifications |
| HTTP | Axios with an authorization request interceptor |
| Server | Node.js, Express 4, TypeScript, `tsx` |
| Authentication | JSON Web Tokens (`jsonwebtoken`) and `bcryptjs` (10 salt rounds) |
| Data | MongoDB Atlas, Mongoose, MongoDB native driver |
| AI / RAG | LangChain, Google Gemini chat and embeddings, MongoDB Atlas Vector Search, recursive text splitter |
| Validation / middleware | Zod is installed; CORS, JSON and URL-encoded parsers, custom auth and error middleware are used |
| Deployment config | Vercel SPA rewrite configuration for the client |

## Project structure

```text
edureach-platform/
├── README.md
├── client/                           # React single-page application
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/react.svg
│   │   ├── components/
│   │   │   ├── AboutSection.tsx
│   │   │   ├── AchievementsSection.tsx
│   │   │   ├── CallPopup.tsx
│   │   │   ├── ChatDrawer.tsx
│   │   │   ├── CounselorCTA.tsx
│   │   │   ├── CoursesSection.tsx
│   │   │   ├── EventsGallery.tsx
│   │   │   ├── FloatingChatButton.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── HiringStatsSection.tsx
│   │   │   ├── MentorsSection.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── QuotesSection.tsx
│   │   │   ├── SignupPopup.tsx
│   │   │   └── StudentLifeSection.tsx
│   │   ├── context/AuthContext.tsx
│   │   ├── data/content.ts           # Site copy, stats, courses, people, contacts, image URLs
│   │   ├── pages/HomePage.tsx
│   │   ├── pages/LoginPage.tsx
│   │   ├── pages/SignupPage.tsx
│   │   ├── services/api.ts
│   │   ├── services/auth.service.ts
│   │   ├── services/chat.service.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vercel.json
│   └── vite.config.ts
└── server/                           # Express API and RAG service
    ├── knowledge-base/edureach-knowledge.txt
    ├── src/
    │   ├── config/database.config.ts
    │   ├── controllers/auth.controller.ts
    │   ├── controllers/chat.controller.ts
    │   ├── middleware/auth.middleware.ts
    │   ├── middleware/error-handler.middleware.ts
    │   ├── models/knowledge-doc.model.ts
    │   ├── models/user.model.ts
    │   ├── routes/auth.routes.ts
    │   ├── routes/chat.routes.ts
    │   ├── services/rag.service.ts
    │   ├── utils/jwt.util.ts
    │   ├── utils/password.util.ts
    │   ├── app.ts
    │   └── server.ts
    ├── package.json
    └── tsconfig.json
```

`package-lock.json` files in both applications lock installed dependency versions. `client/README.md` is the original Vite template reference; this root README is the project documentation.

## Frontend

### Pages and routing

| URL | Component | Purpose |
| --- | --- | --- |
| `/` | `HomePage` inside `Navbar` | Public landing page plus authenticated gated content |
| `/login` | `LoginPage` | Sign-in form with toast feedback and redirect home on success |
| `/signup` | `SignupPage` | Registration form with optional phone number and redirect home on success |

`App.tsx` wraps the router in `AuthProvider`, renders the global toast container, and always mounts the floating chat control. The application is mounted in React `StrictMode`.

### User experience and content

- **Visual theme:** maroon (`#7B1E2B`), cream (`#faf7f5`), Playfair Display heading font, and Source Sans 3 body font. `index.css` also enables smooth scrolling and custom scrollbar styling.
- **Content source:** `client/src/data/content.ts` centrally supplies all public copy, image URLs (Cloudinary), navigation links, courses, mentors, facilities, recruiter list, placement figures, events, quotes, and contacts.
- **Core public sections:** hero, about, achievement statistics, six B.Tech cards, M.Tech and MBA program summaries, quote carousel, and mentors.
- **Authenticated sections:** six interactive campus/student-life cards, six-item events gallery, counselor CTA, and department placement bars plus recruiter chips.
- **Popups:** `SignupPopup` offers registration/login; `CallPopup` is a visible placeholder and currently states that AI counselor calls are planned for a future part.
- **Chat:** `ChatDrawer` keeps in-memory messages only (no chat-history persistence), accepts Enter to send, offers four quick questions, autoscrolls, and calls the backend chat API.

### Authentication behavior

`AuthContext` verifies active sessions via HTTP-only cookies by calling `GET /api/auth/me` on initial load. JWT tokens are never stored in client `localStorage`. On registration or login, the server issues a secure, HTTP-only cookie and returns the authenticated user profile. Logging out calls `POST /api/auth/logout`, clearing the cookie on the server and resetting client user state. The Axios instance is configured with `withCredentials: true` to automatically include cookies on all API requests.

## Backend and API

### Server behavior

- `server.ts` validates environment variables, connects to MongoDB, starts Express on `PORT` (default `3001`), and runs a read-only knowledge-base probe in the background. It never rebuilds or deletes knowledge base documents during startup.
- `app.ts` enforces production-safe CORS restricted to origins defined in `CLIENT_URL` or `FRONTEND_URL` (with localhost permitted during development), sets 1MB body limits, mounts routes, provides JSON 404 handlers, and applies a centralized error handler that sanitizes error messages and stack traces in production.

### API reference

All responses use a `success` flag; successful payloads are returned under `data`.

| Method and endpoint | Auth | Request body | Success result | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/health` | No | — | Server/database state, JWT and Gemini configuration flags, timestamp | Returns `200` when MongoDB is connected; otherwise `503` |
| `POST /api/auth/register` | No | `name`, `email`, `password`, optional `phone` | JWT and user object | Requires name/email/password; password must be at least 6 characters; duplicate email returns `409` |
| `POST /api/auth/register` | No | `name`, `email`, `password`, `phone` (optional) | Sets HTTP-only cookie, returns user object | Validates email, password >= 6 chars; rejects duplicates with `409` |
| `POST /api/auth/login` | No | `email`, `password` | Sets HTTP-only cookie, returns user object | Incorrect credentials return `401` |
| `POST /api/auth/logout` | No | — | Clears HTTP-only cookie | Returns 200 on logout |
| `GET /api/auth/me` | HTTP-only cookie / Bearer JWT | — | Current user excluding password | Missing, invalid, or expired token returns `401` |
| `POST /api/chat/message` | Yes (authMiddleware + rateLimiter) | `message` (1-1000 chars) | `{ message: string }` | Gated on auth and input validation; returns AI counselor response |

### User model

The Mongoose `User` document stores:

| Field | Rules |
| --- | --- |
| `name` | Required, trimmed, 2–100 characters |
| `email` | Required, unique, lowercased, trimmed, email-pattern validated |
| `password` | Required, bcrypt hash, minimum 6 characters |
| `phone` | Optional, trimmed, defaults to `null` |
| `created_at` | Set to the current date by default |

JWTs contain `userId` and `email`, use `JWT_SECRET`, and expire after `JWT_EXPIRES_IN` (default `7d`).

## AI counselor and knowledge base

The counselor is a retrieval-augmented generation (RAG) subsystem implemented in `server/src/services/rag.service.ts` with centralized configuration in `server/src/config/rag.config.ts`.

### Architecture & Resource Lifecycle
1. **Singleton Resource Management**: `MongoClient`, `GoogleGenerativeAIEmbeddings`, `MongoDBAtlasVectorSearch`, and `ChatGoogleGenerativeAI` are initialized once as long-lived singletons, avoiding connection leaks and per-request object creation overhead.
2. **Non-Destructive Server Startup**: During normal server startup or container restarts, the server only performs a read-only status check. It **never** destructively deletes or rebuilds embeddings on startup.
3. **Safe Manual Indexing**: Knowledge base indexing is executed explicitly via `npm run index:knowledge`. It verifies chunk embeddings (3072D) and stages documents before updating the live collection.
4. **LangChain Retrieval**: The conversational agent invokes the `retrieve` tool, which queries the `edureach_vector_index` Atlas Vector Search index for the top-3 most relevant chunks.
5. **Resilient Fallback**: If Atlas Vector Search encounters an index error, the system safely falls back to direct knowledge context retrieval and LLM answering without crashing or leaking credentials.

Default models are `gemini-2.5-flash` for chat and `gemini-embedding-001` (3072 dimensions) for embeddings, matching the existing MongoDB Atlas Vector Search index. These can be configured via `GEMINI_CHAT_MODEL` and `GEMINI_EMBEDDING_MODEL`.

### Knowledge Base Commands

| Command | Purpose | When to run |
| :--- | :--- | :--- |
| `npm run index:knowledge` | Splits document, generates 3072D embeddings, verifies dimensions, and safely populates `knowledge_docs` | Initial setup, or when `edureach-knowledge.txt` content is updated |
| `npm run verify:knowledge` | Verifies file readability, embedding generation, MongoDB connection, and document schema | Health checks and post-deployment validation |

### Required MongoDB Atlas Vector Search Index

Create or preserve the Vector Search index named **`edureach_vector_index`** on database **`edureach_db`**, collection **`knowledge_docs`** with the following JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

## Database

Two logical collections are used in `edureach_db`:

| Collection | Writer/reader | Contents |
| --- | --- | --- |
| `users` | Mongoose authentication flow | Registered user records and password hashes |
| `knowledge_docs` | Native MongoDB client and LangChain | Chunk text, numeric embeddings (3072D), metadata, and timestamps |

`knowledge-doc.model.ts` describes `text`, `embedding`, and flexible `metadata` with timestamps, though RAG vector operations use the native MongoDB collection directly.

`knowledge-doc.model.ts` describes `text`, `embedding`, and flexible `metadata` with timestamps, though RAG vector operations use the native MongoDB collection directly.

## Configuration

Create `server/.env`:

```dotenv
# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Database and authentication
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/edureach_db?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

# Google Gemini / RAG
GOOGLE_API_KEY=your-google-ai-studio-api-key
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

Create `client/.env` only when the API is not accessed through the Vite proxy:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Do not commit either `.env` file. Keep `JWT_SECRET`, `MONGODB_URI`, and `GOOGLE_API_KEY` private.

## Run locally

### Prerequisites

- Node.js 18 or later
- A MongoDB Atlas cluster and an Atlas Vector Search index as described above
- A Google Gemini API key with access to the selected chat and embedding models

### Install and start

Open two terminals from the repository root.

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Then open the URL printed by Vite (normally `http://localhost:5173`). Confirm the API with `http://localhost:5000/api/health` when using the default server port.

## Build, quality checks, and deployment

### Available scripts

| Directory | Command | Description |
| --- | --- | --- |
| `client` | `npm run dev` | Starts the Vite development server |
| `client` | `npm run build` | Type-checks the client and creates a production Vite build |
| `client` | `npm run lint` | Runs ESLint over the client source |
| `client` | `npm run preview` | Serves the built client locally |
| `server` | `npm run dev` | Runs `tsx watch src/server.ts` in development mode |
| `server` | `npm run build` | Compiles TypeScript into `./dist` |
| `server` | `npm start` | Runs compiled JavaScript (`node dist/server.js`) |
| `server` | `npm test` | Runs automated test suite (validation, auth middleware, health, chat) |
| `server` | `npm run index:knowledge` | Safely indexes knowledge base into MongoDB Atlas Vector Search |
| `server` | `npm run verify:knowledge` | Verifies knowledge file, embeddings API, and collection schema |

## Testing

Run backend unit and validation test suites locally:

```bash
cd server
npm test
```

Tests run in offline test isolation using Node's native test runner (`node:test`) and `supertest`, validating input schemas, HTTP-only cookie authentication, error mapping, and endpoint rate-limiting without requiring live database connections or production credentials.

## Continuous Integration (CI)

A lightweight GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on pushes and pull requests to `main`/`master`:

1. **Frontend Job**:
   - Clean install (`npm ci`)
   - ESLint validation (`npm run lint`)
   - TypeScript checking and production bundle build (`npm run build`)
2. **Backend Job**:
   - Clean install (`npm ci`)
   - TypeScript compilation (`npm run build`)
   - Automated test suite execution (`npm test`)

The workflow requires no external cloud secrets or live databases to validate builds and tests.
