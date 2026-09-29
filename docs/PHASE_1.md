# Phase 1: Foundation

This document details the exact scope and limitations of ECDAT Phase 1.

## Implemented Capabilities
- **Repository Ingestion**: Scans the provided local `CareVault` sample repository.
- **Scan Execution**: Deterministic scanning orchestrated by a FastAPI background task.
- **Cryptographic Discovery**: Detects RSA, AES, Hash, and generic symmetric primitive operations using a custom Python AST traversal. 
- **Finding Normalization**: Findings are mapped to a standard `crypto_assets` and `evidence` schema.
- **Finding Persistence**: Findings and scan logs are permanently stored in Supabase PostgreSQL.
- **Findings Dashboard**: Minimalist Next.js dashboard reporting metrics and scan actions.
- **Finding Details View**: Precise evidence snippets and line numbers explaining exactly *why* a cryptographic pattern was flagged.
- **Automated Tests**: Pytest suite to verify the AST analyzer logic against known fixtures in `CareVault`.

## Intentionally Not Implemented
- **Dynamic / Runtime Analysis**: No code execution tracing or memory inspection.
- **LLM / AI / ML**: No generative risk summaries or AI agents. The discovery is 100% deterministic.
- **Risk Scores**: Findings show confidence levels (HIGH/MEDIUM/LOW) based on evidence strength (operation vs import), not arbitrary risk scores.
- **Migration & PQC Recommendations**: No automated rewriting, crypto-shredding, or hybrid migration suggestions are generated in this phase.
- **Cloud/Upload Scanning Limits**: Phase 1 analyzes a local path (`CareVault`) to avoid ZIP traversal vulnerabilities and arbitrary code execution at this foundational stage.

## Test Results
The AST scanner successfully passes the integration test (`test_analyzer.py`), accurately identifying:
- Direct RSA encryption (`PY-RSA-001`, HIGH)
- RSA primitive construction (`PY-RSA-002`, MEDIUM)
- Unused RSA imports (`PY-RSA-003`, LOW)
- Direct Hashing and AES setup.
