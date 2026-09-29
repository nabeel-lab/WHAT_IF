# Phase 7: Reporting and CBOM Export

Phase 7 hardens ECDAT for demonstration and auditing. It exposes structured exports of the underlying evidence without relying on subjective scoring metrics.

## Supported Export Endpoints

### `GET /projects/{id}/scans/{scan_id}/cbom`
Generates a CycloneDX-style Software Bill of Materials.
Includes custom properties (`ecdat:confidence`, `ecdat:role`, `ecdat:source_file`) to capture the specific execution context of the cryptography, not just its existence.

### `GET /projects/{id}/scans/{scan_id}/report`
Generates the ECDAT Investigation Report as JSON.
Groups assets by algorithm/operation and distributes the Protection Runway states.
The report emphasizes the distinction between deterministic baseline evidence and the in-memory what-if scenarios.

### `GET /projects/{id}/scans/{scan_id}/compare/{other_scan_id}`
Computes an explicit differential between two scans (files, assets, paths, gaps) avoiding arbitrary scoring mechanisms.

## Integrity Rules Enforced
- The baseline report never includes historical What-If analysis. What-If runs are explicitly simulated and exported on-demand (`whatif-xxx.json`).
- Private-key material is never output to the API; it is marked strictly as `private_key_detected: true`.
- The development reset mechanism (`/reset-demo`) deletes internal scan data transactionally while preserving the external project references.
