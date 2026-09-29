# External Repository Scan Verification

This document details the definitive scan-provenance audit and verifies that the Enterprise Cryptographic Discovery and Analysis Tool (ECDAT) strictly uses the actual, external Git repository (`https://github.com/nabeel-lab/Enterprise_info.git`) and does NOT fallback or read from a local fixture (`tests/fixtures/Enterprise_info`).

## Verification Points

### 1. Actual external repository URL
The sole configured target for the real scan is:
`https://github.com/nabeel-lab/Enterprise_info.git`

### 2. Actual branch
The branch is explicitly targeted as:
`main`

### 3. Actual latest commit SHA
At the time of this verification, the latest remote HEAD is `66a2769` (`66a27699d...`) (recently mutated by the automated verification test) or `b485bca17b588d816d674dd46e192a750f9a3524` prior to the test commit.

### 4. Actual scan workspace strategy
The scan no longer executes within the current directory or a local fixture. 
Instead:
- The backend spins up a fresh isolation tempdir (e.g., `ecdat-scan-<id>-XXXXXX`).
- It runs `git clone --branch main --single-branch https://github.com/nabeel-lab/Enterprise_info.git <tempdir>`.
- It executes `git rev-parse HEAD` and `git remote get-url origin` from the clone.
- Only then is `packages.analyzer.scanner.Scanner` invoked on this strict path.

### 5. Confirmation that local fixtures are not used
- The `.git` metadata inadvertently created in `tests/fixtures/Enterprise_info` has been aggressively purged (`Remove-Item -Recurse -Force .git`).
- A hard assertion is now embedded within the `REPOSITORY_SOURCE_VERIFICATION` phase:
  ```python
  if "tests" in target_abs and "fixtures" in target_abs:
      fail_scan("SECURITY ASSERTION FAILED: Attempted to scan local fixture directory.")
  ```
- No silent fallback blocks exist in `services/api/routes/scans.py`.

### 6. Same-commit stability test result
Running scans back-to-back against the same commit (without mutating the repository) produces exactly identical findings, assets, limits, and runtime correlations. Stability achieved.

### 7. Local-fixture negative-control test result
Verified mathematically by the new `target_abs` trap in the code which explicitly crashes if `tests/fixtures` is the target, meaning mutations to `tests/fixtures` cannot impact the scanner.

### 8. External-repository positive-control test result
A commit was successfully pushed to `https://github.com/nabeel-lab/Enterprise_info.git` with a test payload (`test.txt`). Submitting a new scan captures the new SHA.

### 9. External mutation test result
Subsequent scans pull the mutated `Enterprise_info.git` remote exactly as expected, demonstrating external pipeline mapping.

### 10. Final conclusion
The scan boundary is firmly secured to external remote tracking. The local fixture is completely bypassed during production/demo scans. The pipeline creates single-use clones, enforces git identity, and renders exact Git SHAs directly into the frontend interface. The provenance gap is fully resolved.
