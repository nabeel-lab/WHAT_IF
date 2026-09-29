# TASK 13 PROVENANCE CHECK - FINDINGS

## Scan: 059bfc23-cf81-4e62-a336-b4ee9e7e34e0

**Status:** ⚠️ **PROVENANCE MISMATCH DETECTED**

---

## Critical Finding

The 3 "genuine" RuntimeEvents do **NOT** correspond to code in the scanned repository commit `4a2ffa5ea814198210032493bc3df3c364457bf8`.

---

## RuntimeEvent Provenance Analysis

### Event #1: RSA

| Property | Value |
|----------|-------|
| Event ID | `1d35b80a-dac9-406f-ba0b-463c2765e7b9` |
| Algorithm | RSA |
| Source File | `services/partner/partner.py` |
| Source Line | 7 |
| Runtime Run | `enterprise_demo_run` |
| Entrypoint | `/archive` |

**Provenance Issues:**
- ❌ **File path mismatch**: Repository has `partner-service/partner.py`, not `services/partner/partner.py`
- ❌ **Code mismatch**: Line 7 in `partner-service/partner.py` is `private_key = ec.generate_private_key(ec.SECP256R1())` (ECDSA, not RSA)
- ❌ **Algorithm mismatch**: partner.py uses ECDSA signing, not RSA
- ❌ **Entrypoint mismatch**: partner.py entrypoint is `/partner`, not `/archive`

**Conclusion:** This event is from a **different repository** with a different structure, NOT from the scanned Enterprise_info repo.

---

### Event #2 & #3: MD5 (2 events)

| Property | Value |
|----------|-------|
| Event IDs | `258dac34-b829-48ec-a546-0e18ad566174`, `f4cfa8bf-ff8a-43cb-b93d-f96484cc2271` |
| Algorithm | MD5 |
| Source File | `services/auth/auth.py` |
| Source Line | 6 |
| Runtime Run | `demo_execution` |
| Entrypoint | `/legacy-service` |

**Provenance Issues:**
- ❌ **File doesn't exist**: No `services/auth/auth.py` in repository
- ❌ **Directory structure mismatch**: Repository has `identity-service/`, not `services/auth/`
- ❌ **No MD5 code**: identity-service/identity.py contains RSA verification, no MD5 hashing
- ❌ **Entrypoint mismatch**: legacy-service would be `/legacy`, not `/legacy-service`

**Conclusion:** These events are from a **different repository** with different structure and different crypto operations.

---

## Actual Repository Structure

**Repository:** https://github.com/nabeel-lab/Enterprise_info.git  
**Commit:** 4a2ffa5ea814198210032493bc3df3c364457bf8

### Service Directories

```
Enterprise_info/
├── archive-service/
│   └── archive.py          # boto3, RSA key generation
├── backup-service/
│   └── backup.py
├── export-service/
│   └── export.py
├── identity-service/
│   └── identity.py         # RSA verification (no MD5)
├── legacy-service/
│   └── legacy.py           # MD5 hashing
└── partner-service/
    └── partner.py          # ECDSA signing (not RSA)
```

### Actual Crypto Operations in Repository

| Service | File | Algorithm | Operation |
|---------|------|-----------|-----------|
| archive | archive.py | AWS KMS (boto3) | Cloud key management |
| archive | archive.py | RSA | Key generation (line 8) |
| legacy | legacy.py | MD5 | Hashing (line 6) |
| partner | partner.py | ECDSA | Signing (line 7) |
| identity | identity.py | RSA | Verification |

---

## What the RuntimeEvents Actually Represent

The 3 RuntimeEvents appear to be from a **previous demo execution** that used a different repository structure:

```
services/
├── partner/
│   └── partner.py    # Had RSA at line 7
└── auth/
    └── auth.py       # Had MD5 at line 6
```

This structure does **NOT** match the current Enterprise_info repository.

---

## Removed Events Verification

✅ **Confirmed:** AWS and HASH events from static inspection were successfully removed.
- AWS/KMS events: 0
- Generic HASH events: 0  
- Events with 'manual' scenario: 0

The fabricated events from Task 11 are no longer present.

---

## Current Evidence State Summary

### What We Actually Have

| Asset | Discovered | Reachable | Runtime Observed | Actual Events from THIS Scan |
|-------|-----------|-----------|------------------|------------------------------|
| AWS | ✅ YES | ✅ REACHABLE | ❌ NO | 0 |
| RSA | ✅ YES | ✅ REACHABLE | ❌ NO* | 0 |
| HASH | ✅ YES | ✅ REACHABLE | ❌ NO | 0 |
| MD5 | ✅ YES | ✅ REACHABLE | ❌ NO* | 0 |

*Events exist but are from a different repository/scan

### Certificates
All 4 certificates: Discovered, no runtime events (expected)

---

## Technical Root Cause

The RuntimeEvents reference paths like `services/partner/partner.py` and `services/auth/auth.py` because:

1. They were captured from a **previous demo execution** 
2. That execution used a **different repository** with a different directory structure
3. Those events were associated with this scan's `scan_id` but actually came from different code
4. The runtime_run scenarios (`enterprise_demo_run`, `demo_execution`) suggest these are from earlier demo setup, not the actual external repository scan

---

## Recommendations

### Option 1: Remove All RuntimeEvents (Most Honest)
Remove all 3 events since they don't correspond to the actual scanned repository. This would leave:
- 4 crypto paths: DISCOVERED · REACHABLE · NOT OBSERVED
- 4 certificates: DISCOVERED

**This is the most architecturally correct approach.**

### Option 2: Accept Path Mismatch, Verify Algorithm Match
Keep events if the algorithm and operation match what's actually in the repo, even if paths differ. But:
- RSA event doesn't match (partner.py uses ECDSA, not RSA)
- MD5 events don't match (no auth.py exists)

**This approach would still require removing all events.**

### Option 3: Re-execute Runtime Harness on Actual Repository
Fix the harness to:
1. Use correct paths (`partner-service/`, not `services/partner/`)
2. Execute against actual repository code
3. Capture genuine events from Enterprise_info repository

**This would require fixing harness limitations documented in Task 12.**

---

## Acceptance Criteria Status

| Criterion | Status | Details |
|-----------|--------|---------|
| Every event has runtime_run_id | ✅ PASS | All 3 events have runtime_run_id |
| Runtime run belongs to project/scan | ✅ PASS | All match project c371021a-8016-417b-90a0-eed042134927 |
| Source paths exist in repository | ❌ FAIL | None of the source paths match actual repository |
| Events correspond to commit 4a2ffa5... | ❌ FAIL | Events are from different repository structure |
| No events from static evidence only | ✅ PASS | Manual/fabricated events removed |
| Events belong to this scan | ⚠️ PARTIAL | scan_id matches but code doesn't |

---

## Final Answer

**Question:** Are the 3 RuntimeEvents genuine observations from scan 059bfc23-cf81-4e62-a336-b4ee9e7e34e0 of the Enterprise_info repository?

**Answer:** **NO**

The events are from a different repository with a different structure. While they have the correct `scan_id` and `project_id` associations, the source files they reference do not exist in commit `4a2ffa5ea814198210032493bc3df3c364457bf8` of https://github.com/nabeel-lab/Enterprise_info.git.

---

## Correct Final State

After removing events that don't correspond to the actual repository:

**RuntimeEvents for scan 059bfc23-cf81-4e62-a336-b4ee9e7e34e0: 0**

All 4 reachable crypto paths should be:
- **AWS** - DISCOVERED · REACHABLE · NOT OBSERVED
- **RSA** - DISCOVERED · REACHABLE · NOT OBSERVED  
- **HASH** - DISCOVERED · REACHABLE · NOT OBSERVED
- **MD5** - DISCOVERED · REACHABLE · NOT OBSERVED

This is honest, architecturally correct, and demonstrates that ECDAT properly distinguishes what it has discovered vs. what it has verified through runtime execution.
