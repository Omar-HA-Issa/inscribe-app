# Inscribe

AI-powered document analysis platform that detects contradictions across technical documentation using RAG and vector search.

## Overview

Inscribe helps engineering teams identify version mismatches, API discrepancies, and configuration conflicts across their documentation. Upload documents, ask questions, and get AI-powered insights with source attribution.

**Live Demo:** [Coming Soon]

## Problem

Engineering teams struggle with documentation that contradicts itself across versions—API docs that reference deprecated endpoints, configuration examples with outdated parameters, and tutorials that don't match current implementations. These inconsistencies cause bugs, slow onboarding, and waste engineering time.

## Solution

Inscribe uses vector embeddings and LLM analysis to automatically detect contradictions across your document set. Instead of just searching what's in your docs, it tells you what's wrong with them.

**Key capabilities:**
- Upload technical docs and automatically chunk them for semantic search
- Ask natural language questions and get answers with source citations
- Run cross-document analysis to find conflicting information
- Get confidence scores and specific quotes highlighting contradictions

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui

**Backend:** Node.js, Express, TypeScript, LangChain

**AI/ML:** OpenAI GPT-4o, text-embedding-3-small

**Database:** PostgreSQL with pgvector (Supabase)

## Features

- Multi-format document upload (PDF, DOCX, TXT)
- Semantic search with vector embeddings
- Cross-document contradiction detection with confidence scoring
- AI-powered chat with conversation history
- Document summarization and key insights extraction
- Export analysis results to CSV

## Architecture

```
Frontend (React) → REST API (Express) → AI Services (OpenAI/LangChain)
                                      → Database (Supabase/pgvector)
```

Documents are parsed, chunked, and embedded as vectors. Queries are embedded and matched against chunks using cosine similarity. Retrieved context is passed to GPT-4o for response generation with source attribution.

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/inscribe-app.git
cd inscribe-app
npm run install:all
```

### Environment Variables

**Backend** (`backend/.env`):
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
PORT=3001
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:3001
```

### Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Project Structure

```
inscribe-app/
├── backend/
│   └── src/
│       ├── app/routes/       # API endpoints
│       ├── core/services/    # Business logic (RAG, embeddings, analysis)
│       └── shared/           # Utilities and config
├── frontend/
│   └── src/
│       ├── components/       # React components
│       ├── pages/            # Route pages
│       └── shared/           # API client and utilities
└── .github/workflows/        # CI/CD
```

## License

MIT
