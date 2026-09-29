# ECDAT Final Product Model

This document defines the final canonical product model, boundaries, identity rules, and definitions for the Enterprise Cryptographic Discovery and Analysis Tool (ECDAT).

## Canonical Entities & Hierarchy

The application strictly adheres to the following hierarchy:

1. **Enterprise** → Organizational boundary.
2. **Project** → A repository or logical application scope.
3. **Scan** (ScanRun) → An immutable point-in-time snapshot of the repository state.
4. **CBOM** → The primary inventory of discovered cryptographic assets for a given scan.
5. **Crypto Asset** → A normalized, canonical cryptographic identity (e.g., `RSA`, `AWS KMS`, `Certificate`).
6. **Evidence** → The underlying proof (source code occurrences, configuration declarations, runtime logs) that support the discovery of a Crypto Asset.
7. **Verification (Reachability / Runtime / Configuration)** → States derived from correlating evidence.
8. **Crypto Path** → An end-to-end chain connecting an entrypoint -> source operation -> keys/providers -> protected data.
9. **Data / Key / Certificate / Controls** → Core metadata associated with paths or assets.
10. **Analysis** (Readiness) → The deterministic interpretation of all the above.
11. **What-If** → A hypothetical simulation overlay that overrides evidence *without* mutating the baseline scan.

## Asset & Finding Identity Rules

- **CBOM Asset** (Canonical Identity): Assets are grouped by `(asset_type, algorithm, role, logical_identity)`. `logical_identity` relies on context like the asset's name or source. This prevents 19 instances of an RSA operation from appearing as 19 distinct assets unless they serve different logical purposes.
- **Findings**: A finding is simply the *investigative view* of a canonical Crypto Asset or Crypto Path. Findings are NOT 1-to-1 with raw evidence lines or runtime events. 
- **Data Deduplication**: Canonical DataAssets are unique per `project_id` and `name`. They are not duplicated per CryptoPath.
- **Key Deduplication**: Canonical KeyContexts are unique per `project_id` and `key_id_name`. They are not duplicated per CryptoPath.

## Definitions

- **Runtime Definition**: A "Runtime-observed path" means there is at least one verified `RuntimeEvent` associated with a specific `CryptoPath`.
- **Reachability Definition**: Evaluated at the `CryptoPath` level (`REACHABLE`, `UNREACHABLE`, `CONDITIONAL`, `UNKNOWN`). Indicates whether an executable entrypoint can structurally reach the cryptographic operation.
- **Configuration Definition**: Evaluated against actual configuration files (e.g., `crypto.yaml`). A "Configuration declaration" means the mechanism is explicitly defined in a configuration file. A "Configuration mismatch" means static/runtime evidence conflicts with the declared configuration.

## Explanation & Local AI Architecture

ECDAT relies primarily on a **DeterministicExplanationProvider** to synthesize raw pipeline facts (reachability, runtime observability, and configuration state) into human-readable Investigative Summaries. 

**Future Local AI Provider Architecture**:
- An optional `LocalLLMExplanationProvider` may be introduced.
- **Privacy**: The model will run locally/offline. Enterprise source code, keys, and secrets will NEVER be sent to an external provider.
- **Input Constraint**: The model will only receive *structured evidence summaries* (e.g., JSON detailing algorithm, reachability state, and runtime status).
- **Role Constraint**: The AI layer is strictly for "Explaining these verified facts in simpler language." It is NEVER authoritative. The deterministic backend makes all final security, reachability, and analysis decisions.

## What-If Boundary

- The What-If simulation engine constructs a `deep_copy` of the `ContextAggregate` (the baseline representation of the scan's findings, paths, and data).
- Hypothetical modifications are applied *only* to the copied state.
- Simulated analysis deltas are returned.
- **Strict Rule**: What-If NEVER modifies `ScanRun`, `Evidence`, `RuntimeEvent`, `CryptoAsset`, `DataAsset`, `KeyContext`, `CryptoPath`, or `AnalysisResult` records in the database.

## Final Acceptance Test Results

- The `Enterprise_info` fixture successfully exercises all critical states (`FOUND`, `REACHABLE`, `OBSERVED`, `DECLARED`, `MISMATCH`).
- The pipeline seamlessly associates `crypto.yaml` configuration and `runtime_events.json` data to source code operations.
- The UI strictly scopes all pages (Overview, CBOM, Findings, Paths, Data, Keys, Readiness, Evidence) to the globally selected `scan_id`.
- The product architecture is fully stable, and the engineering phase is finalized.
