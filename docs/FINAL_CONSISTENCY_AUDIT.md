# ECDAT Final Consistency Audit

## 1. Root Cause Investigations

### Overview vs Findings Count (19 vs 20)
**Inconsistency:** Overview shows 19 discovered, Findings shows 20.
**Source:** `services/api/routes/scans.py` sets `scan.findings_count = len(result.findings)` immediately after the AST static analysis stage (19). However, the `CERTIFICATE_ANALYSIS` stage subsequently inserts 1 additional certificate into the `crypto_assets` table. The Findings page directly queries `crypto_assets` (yielding 20), while the Overview page reads the stale `scan.findings_count` column.

### Runtime Observation Contradiction
**Inconsistency:** Overview UI shows "Runtime observed: Unknown", `layout.tsx` aggregates to 0, but Analysis shows 20 runtime observation paths.
**Source:** 
- `overview/page.tsx` hardcodes "Unknown" for Runtime Observed.
- `layout.tsx` attempts to aggregate `f.runtime.length > 0` but `get_project_findings` fails to populate `f.runtime` properly due to N+1 query exceptions that are silently caught.
- `analysis/summary` counts `OBSERVED` directly from `analysis_results.evidence_state` without verifying if a `runtime_events` record actually exists.

### Reachability
**Inconsistency:** Reachable paths shows as "Unknown" in Overview, but Findings has reachable items.
**Source:** `overview/page.tsx` hardcodes `<span className="font-medium text-slate-900">Unknown</span>`. It makes no API call for reachability.

### Certificates, Key Metadata, and Configuration
**Inconsistency:** All show as 0 or Unknown on Overview.
**Source:** These are hard-coded fallback values in `overview/page.tsx`. The frontend makes no attempt to fetch them.

### Repeated Findings (e.g., AWS KMS)
**Inconsistency:** AWS KMS appears multiple times in the findings list.
**Source:** `Scanner.scan_directory` in `scans.py` inserts a new distinct `crypto_assets` row for *every single AST match*. It does not normalize by identity (algorithm/role). The `source_file`, `line_start`, and `line_end` are improperly stored on the asset rather than the `evidence` table.

### Navigation / Sidebar Dead Links
**Inconsistency:** Crypto Paths, Data, Keys, Controls, Readiness, and Evidence links are not clickable.
**Source:** `apps/web/src/app/projects/[projectId]/layout.tsx` hardcodes these routes with `disabled: true` and overrides their `href`.

### Scan 404
**Inconsistency:** Clicking "Scans" returns a 404.
**Source:** The `apps/web/src/app/projects/[projectId]/scans` directory has no `page.tsx` file to handle the root `/scans` route.

### Findings Not Opening
**Inconsistency:** Clicking a finding row does nothing.
**Source:** The `findings/page.tsx` table rows do not include an `onClick` or `Link` wrapping to route to `/projects/[projectId]/findings/[findingId]`.

### N+1 Loading Performance
**Inconsistency:** Findings page is slow.
**Source:** `projects.py:get_project_findings` iterates through `crypto_assets` and calls `get_finding_verification` (which does 8 database queries) for *each* finding sequentially.

---

## 2. Canonical Entity Definitions

To resolve these inconsistencies, ECDAT will strictly adhere to the following entity models:

- **CryptoAsset:** One normalized cryptographic asset identity (e.g., project_id + scan_id + asset_type + algorithm + role). It represents *what* was found, not *where* it was found.
- **Evidence:** Individual evidence (AST match, log, dependency) supporting that asset.
- **RuntimeEvent:** Individual observed runtime event.
- **CryptoPath:** Relationship/path connecting assets.
- **Finding:** A UI/Investigation record wrapping a CryptoAsset or CryptoPath with its aggregated evidence, runtime, reachability, and analysis state.

---

## 3. Canonical Summary Definitions

The new `ProjectInvestigationSummary` API will be the single source of truth for all overview metrics:

- **Discovered:** Distinct count of normalized `crypto_assets` for the scan.
- **Reachable:** Distinct count of `reachability_results` where status = `REACHABLE`.
- **Runtime Observed:** Distinct count of paths/assets possessing at least one successful `runtime_events` record.
- **Certificates:** Count of `certificates` for the scan.
- **Key Metadata:** Count of `key_contexts` for the scan.
- **Configuration Declared:** Count of assets with explicit configuration evidence.
- **Evidence Gaps:** Count of `analysis_results` where `evidence_coverage` = `INSUFFICIENT`.

---

## 4. Planned Fixes

1. **Schema Correction:** Remove `source_file`, `line_start`, `line_end` from `crypto_assets` constraints (they will be aggregated into `evidence`).
2. **Scanner Deduplication:** `scans.py` will group AST findings by identity and insert only one `crypto_asset`, pushing source occurrences into `evidence`.
3. **Canonical APIs:** 
   - Build `GET /projects/{project_id}/summary` to return `ProjectInvestigationSummary`.
   - Rebuild `GET /projects/{project_id}/findings` to use a single SQL join/view instead of N+1 queries.
4. **Remove Frontend Fallbacks:** Eliminate all hardcoded "0" and "Unknown" values in `overview/page.tsx` and map them to the summary API.
5. **Implement Missing Routes:** Create basic table views for Crypto Paths, Data, Keys, Controls, Readiness, and Evidence.
6. **Fix Navigation & 404s:** Enable sidebar links, add `/scans/page.tsx`, and make findings clickable.
