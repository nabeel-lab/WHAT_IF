# ECDAT Architecture

The ECDAT system is built on a 7-phase intelligence pipeline, designed to extract objective evidence from source code and runtime behavior, map it to business and security contexts, and deterministically analyze migration risks.

## Pipeline Phases

### 1. Discovery (Static Analysis)
- Clones target repositories via libgit2 (or accesses locally via `tests/fixtures`).
- Analyzes source code (AST parsing) to detect cryptographic APIs (e.g. `cryptography.hazmat`).
- Extracts algorithm, role, source file, and line numbers.

### 2. Verification (Runtime Observation & Configuration)
- Observes real execution via a Pytest-based `sys.settrace` or AST-instrumentation runtime harness.
- Generates `RuntimeEvent`s for cryptographic operations that actually fire.
- Compares declared configuration files (e.g., `config.yaml`) against observed reality, identifying Configuration Mismatches.

### 3. Contextualization (Protected Data & Keys)
- Maps the discovered and verified operations into formal `CryptoPath`s.
- Correlates paths with specific `KeyContext`s (e.g., AWS KMS `arn:aws:kms...`) and `DataAsset`s (e.g., PII, PHI).

### 4. Enterprise Integration (Dynamic Repository)
- Operates on live, external repositories (like `nabeel-lab/Enterprise_info`).
- Ensures that the analysis updates dynamically if the underlying source code or configuration changes.

### 5. Deterministic Analysis
- Evaluates the aggregated evidence against a strictly deterministic, rules-based engine.
- Computes `Protection Runway` (Data Clock vs Quantum Clock).
- Evaluates `Migration Effort` based on direct call sites and provider abstraction.
- Emits actionable Action Candidates based on verified evidence gaps.

### 6. What-If Counterfactuals
- Allows interactive simulation of architectural interventions (e.g., "What if we introduce a crypto abstraction?").
- Executes entirely in-memory using deep-cloned context.
- Leaves baseline repository and Phase 5 evidence completely unmutated.

### 7. Reporting & CBOM Export
- Compiles a hierarchical, standard-compatible JSON CBOM (CycloneDX style) mapping algorithms to keys and source files.
- Generates an Investigation Report clearly separating immutable REAL EVIDENCE from SIMULATED SCENARIOS.
- Compares historical scans to prove environment mutation.
