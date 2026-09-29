# Architecture

ECDAT is structured into distinct layers separating discovery, persistence, and presentation.

## Core Flow
1. **Frontend (Next.js)** triggers a scan request to the backend.
2. **Backend (FastAPI)** orchestrates the scan as a background task to prevent blocking.
3. **Analyzer (Scanner)** parses the `CareVault` Python repository using the native `ast` library to identify structural cryptographic patterns deterministically (RSA, AES, Hash, Signatures).
4. **Persistence (Supabase)** normalizes findings into `crypto_assets` and detailed `evidence` logs mapped to exact line numbers and confidence levels.
5. **Frontend Dashboard** consumes the API to display the discovery results cleanly.

## Key Design Principles
- **Evidence-Based Determinism**: Uses AST parsing rather than regex or AI guessing. Findings must have structural evidence.
- **Confidence Levels**: Not all findings are equal. Distinguishes between direct operations (HIGH), primitive construction (MEDIUM), and library imports (LOW).
