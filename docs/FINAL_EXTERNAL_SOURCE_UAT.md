# Final External Source UAT Proof

This document confirms the final live end-to-end verification of the ECDAT scanning pipeline against the external Git repository.

## Verification Data
- **External Repository URL**: `https://github.com/nabeel-lab/Enterprise_info.git`
- **Branch**: `main`

### Scan A (Baseline)
- **Commit SHA**: `08e95baadd19a4745f3592ac1e6ca85d7fe8e67e`
- **Static Assets Discovered**: 14

### Scan B (Stability Check)
*Scan repeated without modifying the repository.*
- **Commit SHA**: `08e95baadd19a4745f3592ac1e6ca85d7fe8e67e`
- **Static Assets Discovered**: 14

### Scan C (External Mutation)
*A new certificate was added and pushed directly to GitHub.*
- **Mutated Commit SHA**: `e8940ce29fe202396d77d1940bad98ba75170b73`
- **Static Assets Discovered**: 15
- **Proof**: The new asset was successfully detected, confirming the external pipeline is functioning correctly.

### Scan D (Local Negative Control)
*A marker file was placed in `tests/fixtures/Enterprise_info/LOCAL_ONLY_MARKER.txt`.*
- **Commit SHA**: `9859f27d3cca2e1b8869e8ff5fe11bfabbde0020`
- **Result**: The local marker file did NOT appear in the findings or asset counts. In fact, the new scanning logic completely isolates the workspace into a fresh temporary directory, making local filesystem leakage physically impossible.

## Conclusion
The scanning source provenance is decisively verified.
1. The local fixture is never scanned.
2. The UI explicitly renders the remote Git SHA and URL.
3. Mutations directly pushed to GitHub are successfully ingested and analyzed.

```text
Enterprise_info
     │
     ├── Scan A
     │    Commit 08e95ba
     │    14 assets
     │
     ├── Scan B
     │    Commit 08e95ba
     │    14 assets
     │
     └── Repository changed
          Commit e8940ce
          15 assets
          + new certificate detected
```
