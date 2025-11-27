# Inscribe 🧠

**AI-Powered Document Intelligence Platform**

> Discover what your documents hide beneath the surface

Inscribe is a RAG (Retrieval-Augmented Generation) powered document analysis platform that helps you uploadRoutes, analyze, and chat with your documents using AI. Extract insights, detect patterns, and uncover hidden information across your document collection.

---

## Project Overview

**Status:** In Development - Phase 1 (MVP)  
**Timeline:** 2-3 week sprint  

### What Inscribe Does:

- 📄 **Upload & Parse** - Support for PDF, TXT, and CSV files
- 🤖 **AI Summarization** - Automatic document summaries and key insights
- 💬 **Chat Interface** - Ask questions about your documents using natural language
- 🔍 **Semantic Search** - Vector-based similarity search across all documents
- 📊 **Smart Analytics** - Auto-detect patterns, trends, and contradictions
- ⚠️ **Intelligent Alerts** - Get notified when new documents deviate from patterns

---

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│  Frontend   │────────▶│   Backend   │────────▶│  Supabase   │
│  (Vite +    │         │  (Express + │         │  (Postgres  │
│   React)    │         │   Node.js)  │         │ + pgvector) │
│             │         │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │                       │
      │                       │                       │
      ▼                       ▼                       ▼
  User Interface        RAG Pipeline           Vector Storage
                      + LangChain              + Embeddings
                      + OpenAI
```

---

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Hooks

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Language:** TypeScript
- **AI/ML:** LangChain, OpenAI API
- **Document Parsing:** pdf-parse, mammoth

### Database & Storage
- **Database:** Supabase (PostgreSQL)
- **Vector Search:** pgvector extension
- **File Storage:** Supabase Storage
- **Embeddings:** OpenAI text-embedding-3-small

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/inscribe-app.git
   cd inscribe-app
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   Create `backend/.env`:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

   Create `frontend/.env.local`:
   ```bash
   VITE_API_URL=http://localhost:3001
   ```

4. **Set up Supabase database**
   - Run the SQL schema in `docs/schema.sql` (to be added)
   - Enable pgvector extension
   - Create storage bucket named `documents`

5. **Start development servers**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

---

## Project Structure

```
inscribe-app/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── routes/         # API routes (uploadRoutes, chat, etc.)
│   │   ├── services/       # Business logic (RAG, embeddings)
│   │   ├── utils/          # Helper functions
│   │   └── index.ts        # Entry point
│   ├── .env                # Backend environment variables
│   └── package.json
│
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & API client
│   │   ├── pages/         # Page components
│   │   └── main.tsx       # Entry point
│   ├── .env.local         # Frontend environment variables
│   └── package.json
│
├── .gitignore
├── package.json           # Root package.json (dev scripts)
└── README.md
```

---

## 🗓️ Development Roadmap

### Phase 1 - MVP (Weeks 1-2)

- [x] **Day 1:** Project setup & database schema 
- [ ] **Day 2-3:** Document uploadRoutes & parsing API
- [ ] **Day 4-5:** Document chunking & embeddings
- [ ] **Day 6-7:** Vector search & basic RAG
- [ ] **Day 8-9:** Chat interface UI
- [ ] **Day 10-11:** Summary generation
- [ ] **Day 12-14:** Testing & polish

### Phase 2 - Intelligence Layer (Weeks 3-4)

- [ ] Auto-generated dashboards
- [ ] Pattern detection & alerts
- [ ] Contradiction detection
- [ ] Advanced analytics
- [ ] Multi-document comparison
- [ ] Export & sharing features

---

## Features (Detailed)

### Current (Phase 1)
- ✅ Clean, professional UI with dark mode
- ✅ Database infrastructure with vector search
- ✅ Backend API foundation
- 🚧 Document uploadRoutes (PDF, TXT, CSV)
- 🚧 AI-powered summarization
- 🚧 Chat with documents using RAG

### Planned (Phase 2)
- 📊 Automated insight generation
- ⚠️ Smart anomaly detection
- 📈 Trend visualization
- 🔔 Real-time alerts
- 🤝 Collaborative features
- 📤 Report generation & export

---

## Testing

```bash
# Backend tests (to be added)
cd backend
npm test

# Frontend tests (to be added)
cd frontend
npm test

# E2E tests (to be added)
npm run test:e2e
```

---

## Database Schema

### Tables
- **documents** - Uploaded file metadata
- **document_chunks** - Text chunks with embeddings (vector)
- **conversations** - Chat history
- **messages** - Individual chat messages
- **insights** - AI-generated insights

See `docs/schema.sql` for full schema (to be added).

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

- [LangChain](https://js.langchain.com/) - RAG framework
- [OpenAI](https://openai.com/) - Embeddings & LLM
- [Supabase](https://supabase.com/) - Database & backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lovable](https://lovable.dev/) - Initial frontend scaffolding

---

## Screenshots

*Coming soon - to be added once UI is complete*

---

**Built with ❤️ as a learning project to explore RAG, vector databases, and AI-powered document analysis.**
