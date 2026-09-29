# ECDAT Final Integration Audit

**Date**: 2026-09-25
**Scope**: Integration/wiring correctness pass (backend routing, scan stages, evidence mapping).

## Objective
Finalize the canonical scan-centric wiring across the backend to ensure existing frontend visualizations have coherent, correlated data without redesigning the architecture.

## Identified Issues & Resolutions

### 1. Runtime Evidence Correlation
- **Issue**: Runtime events lacked `asset_id` mapping. They were attempting to correlate using `crypto_assets.file_path` which didn't exist in the schema. As a result, findings showed "0" runtime events.
- **Resolution**: Rewrote the scan correlation logic in `scans.py`. The pipeline now extracts the file stem from runtime events and matches it against `evidence.file` entries of type `static_code`. This properly bridges the dynamic/static gap. `runtime_events.asset_id` is now correctly populated.
- **Backfill**: Ran `scripts/backfill_runtime_controls.py` to retroactively correlate runtime events from previous scans.

### 2. Missing Controls Data
- **Issue**: The `controls` table was entirely empty because the scanner pipeline wasn't generating them, leading to empty control panes in the UI.
- **Resolution**: Enhanced the `CONTEXT_ENRICHMENT` phase in `scans.py` to auto-generate four canonical control records per asset (Key Custody, Key Rotation Policy, Crypto Abstraction Layer, Post-Quantum Readiness).
- **Schema Fix**: Relaxed the `controls` table constraint to accept `PRESENT`, `ABSENT`, and `NOT_APPLICABLE` in addition to `YES`, `NO`, `UNKNOWN`.

### 3. Finding Detail 404 Errors
- **Issue**: Clicking on some assets (like RSA) in the CBOM gave a "Finding not found" error because the frontend assumed the existence of a canonical project-scoped detail endpoint that was missing.
- **Resolution**: Implemented `_build_canonical_detail` and exposed it via `GET /projects/{pid}/findings/{fid}/detail`. This bundles finding, evidence, reachability, runtime, crypto_paths, data_assets, controls, and analysis into a single payload, removing N+1 fetch requirements and resolving the 404s.

### 4. Analysis "OBSERVED" State Missing
- **Issue**: Analysis results for runtime-observed assets didn't include the `OBSERVED` string because the analysis engine wasn't pulling `runtime_events` for the context aggregate.
- **Resolution**: Rewrote `services/api/routes/analysis.py` to explicitly query `runtime_events` scoped by `scan_id` and pass them into the `ContextAggregate`. The rules engine now correctly outputs `OBSERVED`.

### 5. What-If Proxy Misconfiguration
- **Issue**: The project-scoped What-If endpoint tried to call a non-existent `run_what_if` function and used the wrong URL mapping in integration tests.
- **Resolution**: Fixed `projects.py` to call `whatif_module.trigger_what_if` and fixed the test's URL path variables.

### 6. Scan Scoping Failures
- **Issue**: `crypto_paths` queries were not fully scan-scoped, causing bleed-over between scans.
- **Resolution**: Added `scan_id` to `crypto_paths` and updated API routes to filter correctly.

## Verification
A comprehensive integration test suite (`tests/integration/test_final_integration.py`) with 30 assertions was executed.
**Result**: 30/30 tests passed.

Key assertions verified:
1. `runtime_events` are correctly assigned to `asset_id`s.
2. Control records exist with valid states for all assets.
3. Analysis output correctly reflects `OBSERVED` when runtime events are present.
4. Summary counts (CBOM vs Overview) exactly match.
5. `crypto_paths` are scan-scoped.
6. The What-If proxy endpoint correctly routes and returns 200/422.
