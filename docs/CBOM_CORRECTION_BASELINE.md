# CBOM Correction Baseline

## Target State
- **Repository**: `https://github.com/nabeel-lab/Enterprise_info.git`
- **Branch**: `main`
- **Baseline Commit SHA**: `e8940ce29fe202396d77d1940bad98ba75170b73`

## Initial Inventory Counts (Before Correction)
Currently, because ECDAT lacks proper `scan_id` constraints on secondary tables (like `crypto_paths`, `data_assets`), the database is accumulating duplicated and mixed data across all past scans.

For the active project context (accumulated over multiple scans):
- **Cryptographic Assets (Raw Occurrences)**: 213 total in DB (15 in the latest baseline scan)
- **Certificates**: Not currently captured as independent normalized entities in DB
- **Key Metadata**: 33 accumulated globally
- **Data Assets**: 32 accumulated globally
- **CryptoPaths**: 34 accumulated globally
- **Reachability Results**: 56 accumulated globally
- **Runtime Observations**: 12 accumulated globally
- **Configuration Declarations**: Currently unknown/mixed

## The Core Defect
The current data model treats **each evidence occurrence** as a distinct `crypto_asset` row. The UI displays these unnormalized rows verbatim. Furthermore, relationships like `CryptoPaths` and `DataAssets` are bound to the Project rather than the Scan, leading to cross-scan contamination.

## The Objective
We will remodel the data structure and queries to ensure:
1. `scan_id` scopes all inventory explicitly (no cross-scan mixing).
2. CBOM is a **normalized** list of unique cryptographic assets.
3. Evidence (occurrences, reachability, runtime) is treated as a 1-to-many relationship under the normalized CBOM assets.
4. The `Summary` API aggregates and displays statistics strictly for the `scan_id` selected in the UI.
