# Phase 6: What-If Counterfactual Engine

The Phase 6 What-If Counterfactual Engine allows engineers to simulate the effects of various interventions on the evidence-backed analysis generated in Phase 5, without altering the underlying raw evidence.

## Architecture

```
Real Scan
   ↓
Immutable Evidence
   ↓
Phase 5 Analysis
   ↓
Clone Context (Deep Copy)
   ↓
Apply hypothetical overrides (Strict Allowlist)
   ↓
Run same deterministic analysis engine (Phase 5)
   ↓
Compare baseline vs scenario (Delta Engine)
```

The What-If Engine executes entirely **in-memory** ensuring that the baseline real evidence and analysis remain immutable and untainted.

## Scenario Types

The engine supports the following structured scenarios:

1. **INTRODUCE_CRYPTO_ABSTRACTION**
   - Assumes direct algorithmic dependencies are migrated behind an abstraction layer.
   - Affects: Migration effort, crypto-agility.
   
2. **REDUCE_DATA_RETENTION**
   - Assumes a shorter required protection retention period.
   - Affects: Data clock, Protection runway state.
   
3. **HYBRID_MIGRATION**
   - Assumes the cryptographic path is migrated to a hybrid state.
   - Affects: Migration effort. Requires explicit verification of protocol support.

4. **MIGRATION_PLANNING**
   - Simulates resolving migration blockers (e.g. resolving external dependencies).
   - Affects: Migration effort.
   
5. **HARDEN_CURRENT_DEPLOYMENT**
   - Simulates operational improvements (e.g. key separation, automated rotation).
   - Affects: Operational control state.

## Integrity Rules

1. **Evidence Boundary**: Every scenario result explicitly labels `SIMULATED ASSUMPTIONS` vs `REAL EVIDENCE`.
2. **No False Runtime Evidence**: Runtime observations are historical facts and cannot be mutated by a scenario.
3. **No Rescan Required**: Operates directly on the baseline Phase 5 context without triggering a full codebase clone or scan.
4. **Baseline Immutability**: The underlying `AnalysisResult` and its evidence records are never mutated.

## Example Output Deltas

The `DeltaEngine` compares the baseline vs simulated result using dimension-specific rules, outputting:
- `IMPROVED`
- `WORSENED`
- `CHANGED`
- `UNCHANGED`
- `UNKNOWN`
- `NEW` (for Action Candidates)
- `REMOVED` (for Action Candidates)
