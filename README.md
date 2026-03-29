# EduReach Platform

EduReach is a modern, feature-rich educational platform designed to showcase college life, courses, and placement records while providing an interactive and intelligent user experience. It employs a smart scroll-gated content strategy to encourage student sign-ups and features an advanced AI-powered counselor specifically trained on the college's knowledge base.

## Features

- **Dynamic Landing Page**: A beautifully designed homepage featuring Hero, About, Courses, Mentors, and Achievements sections.
- **Gated Content Strategy**: Engages users by showing initial content publicly, then seamlessly prompting them to sign up to unlock premium sections like Student Life, Events Gallery, and Hiring Statistics.
- **AI-Powered Counselor (RAG Chatbot)**: Includes a floating chat widget powered by **Google Gemini** and **LangChain**. It uses Retrieval-Augmented Generation (RAG) backed by **MongoDB Atlas Vector Search** to provide precise answers about courses, fees, admissions, and campus life based on a custom knowledge base.
- **Secure Authentication**: Robust user authentication system using JWT (JSON Web Tokens) and bcrypt for password hashing.
- **Modern Tech Stack**: Built with React 19, Vite, Tailwind CSS v4 on the frontend, and Node.js with Express and TypeScript on the backend.

## Uniqueness of the Project

1. **Context-Aware AI Assistant**: Unlike generic chatbots, the AI Counselor is implemented using LangChain tools and MongoDB Vector Search. It retrieves specific information from an internal knowledge base (`edureach-knowledge.txt`), ensuring that answers are highly relevant to EduReach College.
2. **Smart Conversion Journey**: The platform uniquely blends a marketing landing page with a web app by using scroll-triggered events to display call-to-action popups (Sign Up/Call) right as the user hits the "Mentors" section, maximizing lead generation.
3. **Full-Stack AI Integration**: Demonstrates a complete, end-to-end integration of modern AI practices (Embeddings, Vector Stores, LLM Agents) within a standard MERN-like stack.

## Technology Stack

**Frontend**
- React 19 & Vite
- Tailwind CSS v4
- React Router DOM v7
- Lucide React (Icons)
- Axios (HTTP Client)
- React Hot Toast (Notifications)

**Backend**
- Node.js & Express
- TypeScript
- MongoDB & Mongoose (with MongoDB Atlas Vector Search)
- LangChain (@langchain/google-genai, @langchain/mongodb)
- JWT & bcryptjs
- Zod (Schema Validation)

## 💻 Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URL
- Google Gemini API Key (`GOOGLE_API_KEY`)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd edureach-platform
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   # Create a .env file and add the required variables:
   # PORT=5000
   # MONGODB_URI=your_mongodb_atlas_uri
   # JWT_SECRET=your_secret_key
   # GOOGLE_API_KEY=your_gemini_api_key
   # CLIENT_URL=http://localhost:5173
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd client
   npm install
   # Create a .env file:
   # VITE_API_URL=http://localhost:5000/api
   npm run dev
   ```
