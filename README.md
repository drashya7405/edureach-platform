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
  ├─ AuthContext + localStorage token
  ├─ Axios client (/api by default)
  └─ POST /auth/* and /chat/message
           │
           ▼
Express API
  ├─ Mongoose → MongoDB users collection
  ├─ Native MongoDB client → knowledge_docs collection
  └─ LangChain agent → Gemini chat model + retrieval tool
                              │
                              ▼
                    MongoDB Atlas Vector Search index
                    edureach_vector_index
```

On startup, the server connects to MongoDB, starts Express, then initializes the knowledge base in the background. Authentication remains available even if AI indexing fails. The client stores the JWT in `localStorage`; Axios automatically attaches it as a `Bearer` token to API requests.

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

`AuthContext` reads `localStorage.token` when the client loads and calls `GET /api/auth/me`. Invalid/expired sessions are cleared. On login or registration, the returned JWT is saved and the profile is fetched; logout removes the token and user state. The Axios instance uses `VITE_API_URL` when set, otherwise `/api`, and adds `Authorization: Bearer <token>` automatically.

## Backend and API

### Server behavior

- `server.ts` loads `server/.env`, connects to MongoDB, listens on `PORT` (default `5000`), and warms the RAG knowledge base asynchronously.
- `app.ts` enables CORS for `CLIENT_URL` (default `http://localhost:5173`), accepts JSON and URL-encoded payloads up to 10 MB, mounts routes, supplies JSON 404 responses, and uses a final error handler.
- The error handler logs request method, URL, message, and stack, then returns a JSON `500` response.

### API reference

All responses use a `success` flag; successful payloads are returned under `data`.

| Method and endpoint | Auth | Request body | Success result | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/health` | No | — | Server/database state, JWT and Gemini configuration flags, timestamp | Returns `200` when MongoDB is connected; otherwise `503` |
| `POST /api/auth/register` | No | `name`, `email`, `password`, optional `phone` | JWT and user object | Requires name/email/password; password must be at least 6 characters; duplicate email returns `409` |
| `POST /api/auth/login` | No | `email`, `password` | JWT and user object | Incorrect credentials return `401` |
| `GET /api/auth/me` | Bearer JWT | — | Current user excluding password | Missing, invalid, or expired token returns `401` |
| `POST /api/chat/message` | No API middleware | `message` | `{ message: string }` | UI access is gated in the client; server endpoint itself is currently public |

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

The counselor is a retrieval-augmented generation (RAG) flow implemented in `server/src/services/rag.service.ts`.

1. At startup, it opens MongoDB database `edureach_db` and collection `knowledge_docs`.
2. If no valid embedding exists, it reads `server/knowledge-base/edureach-knowledge.txt`, splits it into 1,000-character chunks with 200-character overlap, embeds them with Gemini, and stores the chunks and vectors.
3. If documents exist but vectors are empty, it deletes those documents and re-indexes them. If valid vectors already exist, it reuses them.
4. For each chat request, LangChain creates a Gemini agent with a `retrieve` tool. The tool performs a top-3 similarity search against MongoDB Atlas Vector Search.
5. The agent is instructed to always retrieve before answering, stay concise and professional, and direct users to a counselor if the answer is absent.

Default models are `gemini-1.5-flash` for chat and `text-embedding-004` (768 dimensions) for embeddings. They can be overridden with environment variables (`GEMINI_CHAT_MODEL`, `GEMINI_EMBEDDING_MODEL`). The RAG service includes automatic fallbacks if retrieval calls fail.

The knowledge-base document includes college overview, programs and seats, fee structure and scholarships, admissions criteria and dates, placement data, facilities, events, faculty, and contact/office-hour details.

### Required MongoDB Atlas Vector Search index

Create a Vector Search index named **`edureach_vector_index`** on database **`edureach_db`**, collection **`knowledge_docs`** with the following JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
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
| `knowledge_docs` | Native MongoDB client and LangChain | Chunk text, numeric embeddings (768D), metadata, and timestamps |

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
GEMINI_CHAT_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
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
| `server` | `npm run dev` | Runs `tsx watch src/server.ts` |
| `server` | `npm run build` | Runs the TypeScript compiler configuration |
| `server` | `npm start` | Starts the server through Node with the `tsx` importer |
| `server` | `npm run seed:rag` | Indexes the knowledge base in MongoDB Atlas on demand |

### Deployment

See the detailed Vercel deployment walkthrough for complete step-by-step instructions.
