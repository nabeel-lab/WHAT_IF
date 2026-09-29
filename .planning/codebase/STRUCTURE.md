# Structure

The repository follows a monorepo structure:

- `apps/web/`: Next.js frontend application. Contains UI components, pages (dashboard, findings lists, detailed evidence views), and Tailwind configurations.
- `services/api/`: FastAPI backend service. Contains route controllers (`projects`, `scans`, `findings`), database connection modules, and background task handlers.
- `packages/analyzer/`: The core scanning engine. Contains `scanner.py`, which implements the Python `ast.NodeVisitor` to detect cryptographic signatures.
- `infra/database/migrations/`: Contains the SQL schema definitions for Supabase.
- `tests/`: Contains `pytest` integration tests and the `CareVault` sample application used as the scanning target.
