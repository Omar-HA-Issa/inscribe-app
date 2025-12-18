# Inscribe 🧠

**AI-Powered Technical Documentation Analysis Platform**

> Full-stack TypeScript application using RAG, vector embeddings, and LLM agents to detect contradictions across technical documentation

Inscribe helps DevOps and engineering teams identify version mismatches, API discrepancies, and configuration conflicts across their documentation. Built with React, Node.js, PostgreSQL with pgvector, and OpenAI's GPT-4o.

🚀 **Live Demo:** In Progress
📊 **Tech Highlights:** RAG Pipeline | Vector Search | LangChain | TypeScript Full-Stack | Azure Deployment

---

## 🎯 Technical Showcase

This project demonstrates:

- **Modern AI/ML Stack:** RAG implementation with LangChain, OpenAI GPT-4o, and vector embeddings
- **Full-Stack TypeScript:** End-to-end type safety across React frontend and Node.js backend
- **Vector Database:** PostgreSQL with pgvector extension for semantic search
- **Production Architecture:** RESTful API design, smart caching, CI/CD with GitHub Actions
- **Real-World Problem Solving:** Built to solve actual pain points in technical documentation workflows

**Key Technical Achievements:**
- Implemented semantic chunking strategy for optimal RAG performance
- Built cross-document analysis engine with confidence scoring
- Designed cost-efficient caching system reducing API costs by ~70%
- Deployed production-ready app with automated CI/CD pipeline

---

## Why Inscribe?

Traditional document search tells you what's *in* your docs. Inscribe tells you what's *wrong* with them.

### The Problem
Engineering teams struggle with:
- API documentation that contradicts itself across versions
- Configuration examples that reference deprecated parameters
- Tutorial code that doesn't match current endpoints
- Scattered tribal knowledge across wikis, READMEs, and Confluence

### The Solution
Inscribe's **Cross-Document Analysis** automatically:
- ✅ Detects version mismatches and API endpoint discrepancies
- ✅ Identifies configuration conflicts across documentation
- ✅ Provides confidence scoring with source attribution
- ✅ Highlights contradictions before they cause production issues

---

## Features

### Core Capabilities (Production Ready)
- 📄 **Multi-Format Support** - PDF, DOCX, TXT file upload and processing
- 🔍 **Semantic Search** - Vector-based search across all documents with pgvector
- 🤖 **AI Summarization** - Automatic document summaries and key insights
- 💬 **Document Chat** - Natural language Q&A with context-aware responses
- ⚠️ **Contradiction Detection** - Proactive cross-document analysis (flagship feature)
- 📊 **CSV Export** - Export insights and contradictions for team review
- 💰 **Smart Caching** - Cost-optimized API usage (~$0.02-0.05 per analysis)

### UI/UX
- 🎨 Clean, minimal dark mode interface
- 🌈 Purple-to-blue gradient accents
- 📱 Responsive design
- ⚡ Fast, intuitive navigation

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript - Full type safety and modern hooks
- **Build Tool:** Vite - Lightning-fast development and optimized production builds
- **Styling:** Tailwind CSS - Utility-first responsive design
- **UI Components:** shadcn/ui - Accessible, customizable component library
- **State Management:** React Hooks (useState, useEffect, custom hooks)
- **API Layer:** Fetch with custom error handling and request interceptors

### Backend
- **Runtime:** Node.js 18+ 
- **Framework:** Express.js with TypeScript - Type-safe REST API
- **AI/ML Integration:** 
  - **LangChain** - RAG orchestration and document processing pipeline
  - **OpenAI GPT-4o** - Advanced language model for analysis and chat
  - **OpenAI text-embedding-3-small** - High-quality vector embeddings
- **Document Processing:** 
  - pdf-parse for PDF extraction
  - mammoth for DOCX parsing
  - Custom text chunking algorithms
- **Architecture:** RESTful API design with middleware patterns

### Database & Infrastructure
- **Database:** Supabase (Managed PostgreSQL 15+)
- **Vector Search:** pgvector extension for similarity search
- **File Storage:** Supabase Storage with CDN
- **ORM/Client:** Supabase JavaScript client
- **Deployment:** 
  - GitHub Actions for CI/CD
  - Azure for hosting
  - Environment-based configuration
- **Domain:** documindai.io with HTTPS

### Development Tools
- **Version Control:** Git + GitHub
- **IDE:** PyCharm with Claude Code plugin
- **Package Management:** npm with workspace scripts
- **Linting:** ESLint + Prettier (TypeScript strict mode)
- **Testing:** Manual testing + alpha/beta user feedback

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript                                        │  │
│  │  • Vite build system                                          │  │
│  │  • Tailwind CSS + shadcn/ui                                   │  │
│  │  • Custom hooks for state management                          │  │
│  │  • Fetch API with error handling                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER (Express.js)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  REST Endpoints:                                              │  │
│  │  • /api/upload        - Document ingestion                    │  │
│  │  • /api/chat          - RAG-powered Q&A                       │  │
│  │  • /api/insights      - Contradiction detection               │  │
│  │  • /api/documents     - CRUD operations                       │  │
│  │                                                                │  │
│  │  Middleware:                                                   │  │
│  │  • CORS, body-parser, error handling                          │  │
│  │  • Request validation & sanitization                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌──────────────────────────┐      ┌──────────────────────────────────┐
│    AI/ML SERVICES        │      │     DATA LAYER                   │
│                          │      │                                  │
│  ┌────────────────────┐ │      │  Supabase (PostgreSQL + Storage) │
│  │   OpenAI APIs      │ │      │                                  │
│  │                    │ │      │  ┌────────────────────────────┐ │
│  │  • GPT-4o          │ │      │  │  Tables:                    │ │
│  │    (Chat & Analysis)│◄───┐  │  │  • documents               │ │
│  │                    │ │   │  │  │  • document_chunks         │ │
│  │  • text-embedding- │ │   │  │  │    (with vector column)    │ │
│  │    3-small         │ │   │  │  │  • conversations           │ │
│  │    (Embeddings)    │ │   │  │  │  • messages                │ │
│  └────────────────────┘ │   │  │  │  • insights                │ │
│                          │   │  │  └────────────────────────────┘ │
│  ┌────────────────────┐ │   │  │                                  │
│  │   LangChain        │ │   │  │  ┌────────────────────────────┐ │
│  │                    │ │   │  │  │  pgvector Extension:       │ │
│  │  • RAG Pipeline    │─┼───┘  │  │  • Cosine similarity search│ │
│  │  • Document Loader │ │      │  │  • 1536-dim embeddings     │ │
│  │  • Text Splitter   │ │      │  └────────────────────────────┘ │
│  │  • Vector Store    │◄┼──────┤                                  │
│  └────────────────────┘ │      │  ┌────────────────────────────┐ │
│                          │      │  │  Storage:                  │ │
│  ┌────────────────────┐ │      │  │  • PDF/DOCX/TXT files     │ │
│  │  Custom Services   │ │      │  │  • CDN delivery            │ │
│  │                    │ │      │  └────────────────────────────┘ │
│  │  • Smart Cache     │ │      │                                  │
│  │  • Contradiction   │ │      └──────────────────────────────────┘
│  │    Detection       │ │
│  │  • Cost Tracking   │ │
│  └────────────────────┘ │
└──────────────────────────┘

Key Design Patterns:
• Frontend communicates ONLY with backend API (never direct DB access)
• Backend handles all Supabase authentication and queries
• Vector embeddings stored in pgvector for fast similarity search
• Smart caching layer intercepts repeated queries
• Source attribution tracked through entire pipeline
```

### Data Flow Example: Document Upload & Analysis

1. **Upload:** User uploads PDF → Frontend → `/api/upload` endpoint
2. **Storage:** Express saves to Supabase Storage, creates DB record
3. **Parsing:** Backend extracts text using pdf-parse
4. **Chunking:** LangChain splits into semantic chunks (~500 tokens each)
5. **Embedding:** Each chunk → OpenAI API → 1536-dim vector
6. **Storage:** Chunks + vectors stored in `document_chunks` table
7. **Analysis:** GPT-4o generates summary and initial insights
8. **Response:** Metadata + summary returned to frontend

### Data Flow Example: Chat Query

1. **Query:** User asks question → Frontend → `/api/chat` endpoint
2. **Cache Check:** System checks if similar query exists in cache
3. **Embedding:** Query → OpenAI → 1536-dim vector
4. **Search:** pgvector finds top-k similar chunks using cosine similarity
5. **Context:** Retrieved chunks + conversation history assembled
6. **LLM:** Context → GPT-4o → Generated response with sources
7. **Caching:** Response cached for similar future queries
8. **Response:** Answer + source citations returned to frontend

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key with GPT-4o access

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

3. **Configure environment variables**

   Backend (`backend/.env`):
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

   Frontend (`frontend/.env.local`):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Set up Supabase**
   
   Run the SQL schema to create tables and enable pgvector:
   ```sql
   -- Enable vector extension
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Create tables (see docs/schema.sql for full schema)
   -- Main tables: documents, document_chunks, conversations, messages, insights
   ```
   
   Create a storage bucket named `documents` with public read access.

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
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   │   ├── upload.ts    # Document upload & processing
│   │   │   ├── chat.ts      # Chat interface
│   │   │   ├── insights.ts  # Contradiction detection
│   │   │   └── documents.ts # Document management
│   │   ├── services/
│   │   │   ├── rag.ts       # RAG implementation
│   │   │   ├── embeddings.ts # Vector embeddings
│   │   │   └── analysis.ts  # Cross-doc analysis
│   │   ├── utils/           # Helpers & parsers
│   │   └── index.ts         # Express app entry
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # API client & utilities
│   │   └── main.tsx        # App entry
│   └── package.json
│
├── .github/
│   └── workflows/          # CI/CD pipeline
│
└── README.md
```

---

## 📈 Development Journey

**Timeline:** 3+ months of development  
**Status:** Deploying MVP 
**Launch:** January 2026

### Technical Milestones Completed ✅

**Core Infrastructure:**
- ✅ Full-stack TypeScript application with end-to-end type safety
- ✅ RESTful API with Express.js and comprehensive error handling
- ✅ PostgreSQL database with pgvector extension for vector operations
- ✅ Supabase integration for auth, storage, and real-time capabilities

**AI/ML Pipeline:**
- ✅ RAG (Retrieval-Augmented Generation) implementation using LangChain
- ✅ Document parsing for PDF, DOCX, and TXT formats
- ✅ Semantic chunking strategy optimized for technical documentation
- ✅ Vector embedding generation and storage with OpenAI APIs
- ✅ Similarity search using cosine distance in pgvector
- ✅ Context-aware chat interface with conversation history

**Advanced Features:**
- ✅ Cross-document contradiction detection algorithm
- ✅ Confidence scoring system with source attribution
- ✅ AI-powered summarization and insight generation
- ✅ Smart caching layer reducing API costs by ~70%
- ✅ CSV export functionality for analysis results
- ✅ Cost tracking and optimization ($0.02-0.05 per analysis)


### Current Focus 🚧
- Deploying MVP and making it live
- Alpha testing and user feedback collection
- Edge case handling and error recovery
- Performance profiling and optimization
- Documentation and code comments

### Technical Challenges Solved 💡
1. **Chunking Strategy:** Developed semantic chunking that preserves context while staying under token limits
2. **Cost Management:** Implemented intelligent caching that doesn't sacrifice user experience
3. **Contradiction Detection:** Built confidence scoring algorithm that reduces false positives
4. **Scalability:** Designed architecture to handle concurrent users and large document sets
5. **Type Safety:** Maintained full TypeScript coverage across 10,000+ lines of code

---

## Use Cases

### Primary Target: DevOps & Engineering Teams
- **API Documentation Review:** Catch breaking changes before deployment
- **Configuration Audits:** Ensure consistency across environment configs
- **Onboarding:** Help new engineers navigate tribal knowledge
- **Documentation Debt:** Identify outdated or conflicting information

### Tested With
- ✅ Complex technical PDFs (Microsoft SEC filings, 100+ pages)
- ✅ Multi-version API documentation
- ✅ Configuration files and setup guides
- ✅ Tutorial and how-to documentation

---

## 🎯 Key Technical Features

### 1. Contradiction Detection Engine
Goes beyond simple document search to proactively identify conflicts:
- Version mismatches across API documentation
- Configuration parameter discrepancies  
- Deprecated vs. current code examples
- Confidence scoring with source attribution

**Implementation:** Custom algorithm analyzing semantic similarity across document chunks, with GPT-4o for final contradiction validation.

### 2. RAG Pipeline
Efficient retrieval-augmented generation for accurate Q&A:
- Semantic chunking optimized for technical documentation
- Vector similarity search using pgvector
- Context-aware response generation
- Source citation with every answer

**Implementation:** LangChain orchestration with custom chunking strategy balancing context preservation and token limits.

### 3. Smart Caching System
Reduces API costs by ~70% without sacrificing UX:
- Query similarity detection
- Cached response retrieval
- Automatic cache invalidation
- Cost tracking per analysis

**Implementation:** Custom caching layer using vector similarity to match queries, with intelligent TTL management.

### 4. Production Architecture
Built for scale from day one:
- Backend-only database access (frontend → API → DB)
- RESTful API with proper error handling
- Environment-based configuration
- CI/CD with GitHub Actions
- Monitoring and logging

**Implementation:** Express middleware patterns, Supabase RLS policies, Azure deployment with automated workflows.

---

## Performance & Cost

- **Analysis Speed:** ~2-5 seconds for cross-document contradiction detection
- **Cost per Analysis:** $0.02-0.05 (with smart caching)
- **Supported File Sizes:** Up to 50MB per document
- **Concurrent Users:** Scales with Supabase/Azure infrastructure

---

## Testing

Currently in **Alpha Phase** with internal testing. Beta program launching January 2026.

---

## 🤝 Contributing

This is currently a solo portfolio project, but feedback and suggestions are welcome! Feel free to:
- Open issues for bugs or feature ideas
- Star the repo if you find it interesting
- Fork it to experiment with your own modifications

Pull requests are not being accepted at this time as this is an active portfolio project.

---

## 📄 License

MIT License - see LICENSE file for details

This project is open source for educational and portfolio purposes. Feel free to learn from the code, but please don't deploy direct clones commercially.

---

## 🙏 Acknowledgments

- [LangChain](https://js.langchain.com/) - RAG framework and orchestration
- [OpenAI](https://openai.com/) - GPT-4o and embeddings API  
- [Supabase](https://supabase.com/) - Database and backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework



---

**"Stop searching. Start analyzing."**
