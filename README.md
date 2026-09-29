# ECDAT

**Cryptographic Discovery & Migration Intelligence**

ECDAT is a cryptographic migration decision system. Phase 1 provides the foundation for reliable, deterministic cryptographic discovery using Python AST analysis.

## What is Phase 1?

Phase 1 establishes the core structural capabilities:
- Ingestion of a sample local Python repository
- Deterministic static analysis using Abstract Syntax Trees (AST)
- Finding normalization and persistence (Supabase)
- A professional, calm, and minimalist engineering dashboard to view findings and evidence.

Phase 1 **does not** include runtime analysis, PQC migration recommendations, risk scoring, or ML-based classification.

## Tech Stack
- **Frontend**: Next.js 16.x, React 19, Tailwind CSS 4.x
- **Backend**: FastAPI 0.141.x, Python 3.12+
- **Database**: Supabase (PostgreSQL 17)
- **Static Analysis**: Python `ast` module

## Local Setup

### 1. Database
You must have a Supabase project created.
Execute the SQL in `infra/database/migrations/001_initial_schema.sql` in your Supabase SQL Editor to create the required tables.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

DATABASE_URL=your_postgres_url
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_service_role_key
```

### 3. Backend (FastAPI)
```bash
cd services/api
uv venv
# Windows: .\.venv\Scripts\activate
# Unix: source .venv/bin/activate
uv pip install fastapi uvicorn pydantic supabase psycopg2-binary
cd ../..
python -m uvicorn services.api.main:app --reload --port 8000
```

### 4. Frontend (Next.js)
```bash
cd apps/web
pnpm install
pnpm dev --port 3000
```

Open `http://localhost:3000` to access the dashboard. Click "Start Scan" to scan the included `CareVault` sample repository.
