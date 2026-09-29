# DOC WHAT IF: The Complete System Bible, PRD & Technical Architecture

> **Enterprise Cryptographic Discovery, Analysis & Transition Platform (WHAT IF / ECDAT)**  
> *Deterministic Discovery • 4-Tier Verification • Dynamic Runtime Telemetry • What-If Blast Radius Simulation*

---

## 1. Executive Summary & Project Identity

### 1.1 What is "WHAT IF"?
**WHAT IF** (internally designated **ECDAT** — *Enterprise Cryptographic Discovery and Analysis Tool*) is a next-generation cryptographic posture management and migration simulation platform. It gives organizations total visibility into where, how, and why cryptography is used across their enterprise codebases, libraries, binaries, cloud configurations, and running services. 

Unlike traditional static security scanners that produce thousands of disconnected code alerts, **WHAT IF** builds a unified, queryable cryptographic knowledge graph. It connects source code entrypoints to cryptographic operations, cloud key management systems (AWS KMS, Azure Key Vault, HashiCorp Vault), enterprise data stores (PII, PHI, financial records), and live runtime execution paths. 

Crucially, **WHAT IF** features the industry's first **What-If Counterfactual Simulation Engine**: an interactive architectural sandbox that lets security architects, CISOs, and engineers simulate algorithm migrations (such as transitioning from quantum-vulnerable RSA-2048 to NIST Post-Quantum Cryptography standards like ML-KEM-768 or ML-DSA) and immediately visualize the downstream **cryptographic blast radius**, breaking changes, and migration effort **before a single line of production code is modified**.

---

## 2. The Problem Space: The Impending Cryptographic Cliff

### 2.1 The Post-Quantum Crisis & HNDL ("Harvest Now, Decrypt Later")
Modern digital security rests entirely on asymmetric public-key cryptography—principally RSA, Elliptic Curve Cryptography (ECDSA, ECDH), and Diffie-Hellman. These algorithms are provably vulnerable to Shor's Algorithm running on Cryptanalytically Relevant Quantum Computers (CRQCs).

Organizations face an immediate, non-negotiable threat:
1. **Harvest Now, Decrypt Later (HNDL):** Nation-state adversaries and threat actors are intercepting and archiving encrypted enterprise traffic, government communications, medical records, and intellectual property today. When a quantum computer becomes viable (projected between 2029 and 2034), all harvested data will be decrypted simultaneously in plaintext.
2. **The Data Lifetime Problem (Mosca's Theorem):**
   $$\text{If } (X + Y) > Z \implies \text{You are already compromised}$$
   Where:
   - $X$ = Shelf life / security longevity required for protected data (e.g., 25 years for patient health data or defense trade secrets).
   - $Y$ = Time required to migrate the enterprise cryptographic infrastructure to Post-Quantum Cryptography (PQC).
   - $Z$ = Time until a quantum computer breaks classical cryptography.
   For almost every Fortune 500 enterprise, $(X + Y)$ already exceeds $Z$.

### 2.2 The Epidemic of "Cryptographic Blindness"
Despite the existential risk, enterprise engineering teams suffer from acute cryptographic blindness:
- **Scattered Crypto:** Cryptographic primitives are buried across microservices, legacy monoliths, third-party binary dependencies, custom wrappers, and ad-hoc utility scripts.
- **Disconnected Keys & Data:** Security scanners flag an `RSA.generate_key()` call in isolation, but have zero awareness of which database table it encrypts or which AWS KMS key wraps it.
- **Config vs. Code Drift:** Infrastructure teams declare that all services use AES-256 in `crypto.yaml`, while legacy microservices silently run hardcoded DES, MD5, or weak RSA-1024 at runtime.

### 2.3 Why Existing Security Tools Fail
| Existing Approach | How It Operates | Why It Fails in Enterprise PQC Migration |
| :--- | :--- | :--- |
| **Static Code Analysis (SAST)** *(e.g., SonarQube, Semgrep, CodeQL)* | Greps code AST for function names like `hashlib.md5()` or `rsa.encrypt()`. | **Alert Fatigue & False Positives:** Flags dead code, test fixtures, and unreachable utilities. Cannot tell if the function actually executes in production. Zero understanding of keys, certificates, or data sensitivity. |
| **Software Composition Analysis (SCA)** *(e.g., Snyk, Dependabot)* | Reads top-level package manifests (`package.json`, `requirements.txt`). | **Manifest Myopia:** Cannot see which cryptographic APIs within a library are invoked. Misses native binary dependencies (`.dll`, `.so`) and hardcoded embedded keys. |
| **Generic AI Security Bots & LLMs** | Ingests code snippets and generates generic advice using public LLMs. | **Hallucinations & Zero Proof:** Lacks ground-truth reachability proofs. Leaks proprietary source code to external cloud providers. Cannot model deterministic downstream dependency impacts. |
| **Custom Security Layers / "Building Our Own Crypto"** | Teams attempt to implement custom wrapper frameworks or homegrown cryptographic libraries. | **High Risk of Flaws:** Violates the cardinal rule of cryptography ("Never roll your own crypto"). Ignores NIST PQC standards (FIPS 203, 204, 205) and increases attack surfaces. |

### 2.4 The WHAT IF Breakthrough
**WHAT IF** rejects the flawed paradigm of "guesswork and alerts." Instead, WHAT IF:
1. **Does not invent unproven cryptography:** We do not replace verified cryptographic libraries with custom layers. We **illuminate, verify, and govern** the cryptography already existing in your enterprise.
2. **Builds an empirical 4-Tier Verification Model:** Proves static existence, manifest presence, binary symbol reality, and **live runtime execution proof with callstack code snippets**.
3. **Simulates counterfactual futures:** Lets architects play "What If" with their infrastructure to engineer seamless PQC transitions.

---

## 3. Core Unique Selling Proposition (USP)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WHAT IF: CORE USP                                │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ 1. 4-Tier Cryptographic           │ Combines AST analysis, dependency DAGs, │
│    Verification Matrix            │ binary symbol parsing, and zero-leak    │
│                                   │ dynamic runtime stack unwinding.        │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 2. What-If Blast Radius           │ In-memory counterfactual simulation of  │
│    Simulation Engine              │ algorithm deprecations, key rotation,   │
│                                   │ and PQC upgrades before code changes.   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 3. Automated CycloneDX 1.6        │ Deterministic, audit-ready export of    │
│    CBOM Generation                │ every algorithm, key, and cert chain.   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 4. Spatial Investigation Canvas   │ Interactive 2D node-graph mapping of    │
│    & Decision Workbench           │ entrypoints, crypto ops, keys, and PII. │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

### USP Pillar 1: The 4-Tier Cryptographic Verification Matrix
A finding in WHAT IF is not just a regex match on a string. It is classified along an empirical 4-tier confidence continuum:

```
[Tier 1: Static AST] ──> [Tier 2: Dependency SCA] ──> [Tier 3: Binary/Cert] ──> [Tier 4: Runtime Telemetry]
     Code exists            Package declared              Symbols/Certs linked         Live Execution Proven
```

1. **Found (Static Code):** AST analysis identifies cryptographic invocation in source files.
2. **Reachable:** Control flow and call-graph analysis confirm that an active API endpoint or service entrypoint can reach the cryptographic function.
3. **Observed (Runtime Proven):** Dynamic instrumentation captures actual runtime invocation, unwinds the Python/binary call stack, extracts the exact line of executing code, and timestamps the execution event.
4. **Declared vs. Mismatch:** Compares discovered reality against declared enterprise governance configurations (e.g., `config.yaml`, `certificates.yaml`). Detects **Configuration Mismatches** where code claims to use AES-256 but executes 3DES or unencrypted channels.

### USP Pillar 2: Counterfactual What-If Simulation
When a security leader asks: *"What happens if we disable RSA-2048 and enforce ML-KEM-768 tomorrow?"*, no existing tool can answer. WHAT IF answers instantly:
- Clones the baseline environment into an isolated in-memory context aggregate.
- Applies hypothetical mutations (e.g., algorithm upgrades, key rotations, deprecation enforcement).
- Re-runs the deterministic analysis engine over the mutated graph.
- Calculates the **Migration Delta**:
  - Services unbroken vs. broken.
  - Estimated engineering story points / migration effort.
  - Protection runway gain (e.g., from -3.2 years to +18.5 years).
  - Transit and storage payload size increases (e.g., ML-KEM-768 public key size of 1,184 bytes vs. RSA-2048's 256 bytes).

---

## 4. Deep-Dive: How We Scan Binaries & Libraries

### 4.1 How We Scan Binaries
Enterprise microservices rarely run purely interpreted scripts; they link to compiled C extensions, Go binaries, Rust crates, and native shared libraries (`.so`, `.dll`, `.dylib`). WHAT IF inspects compiled binaries using deep static introspection without requiring source code:

```mermaid
flowchart LR
    BinFile[Native Binary / Executable<br/>.dll / .so / .exe / Mach-O] --> HeaderParser[Header & Format Parser<br/>PE / ELF / Mach-O]
    HeaderParser --> SecScan[Section & Segment Scanner<br/>.text / .rodata / .rdata]
    SecScan --> SymTab[Symbol Table Extraction<br/>.dynsym / .symtab / Export & Import Tables]
    SecScan --> Entropy[Section Entropy Analysis<br/>Detect Packed / Encrypted Blocks]
    SecScan --> ConstScan[Cryptographic Constants Scanner<br/>S-Boxes, IVs, Curve Parameters]
    SecScan --> StringCert[Certificate & Key Extraction<br/>PEM, DER, X.509, PKCS#8 Strings]
    
    SymTab --> LibClassifier{Cryptographic Library Linkage}
    LibClassifier -->|OpenSSL / libcrypto| CryptoMatch1[OpenSSL Primitives: RSA_*, EVP_*, AES_*]
    LibClassifier -->|BoringSSL / Go crypto| CryptoMatch2[BoringSSL / Go Primitives]
    LibClassifier -->|Windows BCrypt / CAPI| CryptoMatch3[BCryptEncrypt, NCryptOpenStorageProvider]
    
    ConstScan --> CBOMRecord[CBOM Asset Normalized<br/>Binary Provenance & Offset Stored]
    StringCert --> CBOMRecord
    CryptoMatch1 --> CBOMRecord
    CryptoMatch2 --> CBOMRecord
    CryptoMatch3 --> CBOMRecord
```

#### Binary Scanning Methodology:
1. **Format-Aware Parsing:**
   - **ELF (Linux):** Parses Program Headers, Dynamic Segment (`PT_DYNAMIC`), and Relocation Tables (`.rel.dyn`, `.rela.plt`).
   - **PE/COFF (Windows):** Reads DOS Stub, NT Headers, Data Directories (Import Directory Table, Export Directory Table), and Load Config structures.
   - **Mach-O (macOS/iOS):** Parses `LC_LOAD_DYLIB` and `LC_SYMTAB` load commands.
2. **Dynamic Symbol Table Matching:**
   - Detects dynamic imports and exports of well-known cryptographic shared libraries:
     - `libcrypto.so` / `libssl.so` (OpenSSL)
     - `bcrypt.dll` / `crypt32.dll` (Windows CryptoNG)
     - `libsystem_crypto.dylib` (Apple CommonCrypto)
     - `libmbedtls.so` / `libwolfssl.so`
   - Maps raw exported symbols (e.g., `EVP_CIPHER_CTX_new`, `RSA_private_encrypt`, `EC_KEY_new_by_curve_name`) to normalized cryptographic primitives.
3. **Cryptographic Constant & S-Box Detection:**
   - Identifies hardcoded cryptographic constants in `.rodata`:
     - AES S-Box (`0x63, 0x7c, 0x77, 0x7b...`)
     - SHA-256 Initial Hash Values (`0x6a09e667, 0xbb67ae85...`)
     - MD5 Constants ($T[i]$ values)
     - Standard elliptic curve domain parameters (secp256k1, secp384r1, P-256).
4. **Embedded Key & Certificate Extraction:**
   - Scans binary read-only sections for raw DER/PEM headers (`-----BEGIN CERTIFICATE-----`, `-----BEGIN RSA PRIVATE KEY-----`).
   - Extracts embedded X.509 certificates directly from compiled binary payloads and calculates their expiration and signature algorithms.
5. **Entropy Profiling:**
   - Computes Shannon entropy $H(X) = -\sum P(x_i) \log_2 P(x_i)$ across sections to flag obfuscated or encrypted payloads that require dynamic runtime tracing to uncover.

---

### 4.2 How We Scan Libraries & Dependencies
Modern applications assemble dozens of transitive packages. WHAT IF provides deep Software Composition Analysis focused specifically on cryptographic dependencies:

```mermaid
flowchart TD
    RepoRoot[Target Repository] --> ManifestFinder[Manifest Discovery Engine]
    
    ManifestFinder --> PyManifest[Python: pyproject.toml / requirements.txt / uv.lock]
    ManifestFinder --> NodeManifest[Node.js: package.json / pnpm-lock.yaml / package-lock.json]
    ManifestFinder --> GoManifest[Go: go.mod / go.sum]
    ManifestFinder --> RustManifest[Rust: Cargo.toml / Cargo.lock]
    
    PyManifest --> DAGResolver[Transitive Dependency Graph Resolver]
    NodeManifest --> DAGResolver
    GoManifest --> DAGResolver
    RustManifest --> DAGResolver
    
    DAGResolver --> CryptoTaxonomy{Cryptographic Taxonomy Matcher}
    
    CryptoTaxonomy -->|Known Direct Wrapper| DirectCrypto[Direct Crypto Lib: cryptography, pycryptodome, forge, node-jose]
    CryptoTaxonomy -->|Protocol Transport| TransportCrypto[Transport Security: paramiko, urllib3, tls, axios]
    CryptoTaxonomy -->|Cloud SDK| CloudCrypto[Cloud KMS SDK: boto3-kms, @aws-sdk/client-kms, azure-keyvault]
    
    DirectCrypto --> PQCClassification[NIST PQC Deprecation Classifier]
    TransportCrypto --> PQCClassification
    CloudCrypto --> PQCClassification
    
    PQCClassification --> OutputEvidence[Populate CBOM Library Entries & Evidence DAG]
```

#### Library Scanning Methodology:
1. **Lockfile & Manifest Intake:**
   - Parses both declarative manifests (`package.json`) and exact pinned lockfiles (`pnpm-lock.yaml`, `uv.lock`, `package-lock.json`, `Cargo.lock`, `go.sum`).
   - Resolves the complete directed acyclic graph (DAG) of direct and transitive dependencies.
2. **Cryptographic Taxonomy Matching:**
   - Cross-references resolved dependencies against our curated **Cryptographic Package Taxonomy (CPT)**, which categorizes libraries into:
     - *Cryptographic Primitives Providers* (`cryptography`, `pycryptodome`, `bouncycastle`, `tweetnacl`)
     - *Secure Protocols & Transports* (`paramiko`, `requests`, `urllib3`, `jsonwebtoken`, `auth0`)
     - *Hardware & Cloud Security Modules* (`boto3`, `@aws-sdk/client-kms`, `google-cloud-kms`)
3. **Usage Verification via Call-Graph Reachability:**
   - Unlike standard SCA tools that flag a library simply because it is in `package.json`, WHAT IF performs static AST reachability to confirm whether cryptographic methods from that package are actually imported and invoked in application source code.
4. **PQC Deprecation Matrix Evaluation:**
   - Compares package versions and supported cipher suites against NIST SP 800-208, FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA).
   - Labels dependencies as *Quantum Vulnerable*, *PQC Ready*, or *Transition Hybrid Supported*.

---

## 5. Product Requirements Document (PRD)

### 5.1 Product Vision & Goals
**Vision:** Provide the single pane of glass for enterprise cryptographic governance, zero-trust verification, and post-quantum migration simulation.

**Core Objectives (OKRs):**
- **Objective 1:** 100% Cryptographic Observability across source, dependencies, runtime, and infrastructure configs.
- **Objective 2:** Eliminate False-Positive Fatigue by providing empirical 4-Tier verification proof for all high-risk findings.
- **Objective 3:** Enable Zero-Downtime PQC Planning via real-time counterfactual What-If simulation.

### 5.2 Target Personas
1. **Chief Information Security Officer (CISO):** Needs executive dashboards, PQC compliance timelines, data clock vs. quantum clock runway metrics, and board-ready CBOM reports.
2. **Head of Application Security (AppSec):** Needs prioritized findings backed by empirical runtime proof, configuration mismatch alerts, and clear developer remediation guidance.
3. **Cryptographic Migration Lead / Enterprise Architect:** Needs the What-If simulation sandbox to test algorithm swaps, estimate sprint points, and evaluate latency/bandwidth impacts before committing roadmaps.
4. **Software Engineer / Microservice Owner:** Needs exact file names, line numbers, and executing code snippets showing where vulnerable cryptographic APIs are called.

### 5.3 Functional Requirements (FR)

| ID | Requirement | Description | Prototype Implementation Status |
| :--- | :--- | :--- | :--- |
| **FR-1** | Multi-Repository Intake | Ingest local directories and remote GitHub repositories. | **Implemented** (`services/api/routes/providers.py`, `services/api/providers/github.py`) |
| **FR-2** | Multi-Format Static Scanner | Parse Python, JavaScript/TypeScript, YAML configs, and dependency manifests. | **Implemented** (`packages/analyzer/scanner.py`, `certificate_parser.py`, `key_parser.py`) |
| **FR-3** | Dynamic Runtime Telemetry | Instrument execution, hook cryptographic APIs, unwind stack frames, and extract active code snippets. | **Implemented** (`packages/runtime/harness.py`, `services/api/routes/scans.py`) |
| **FR-4** | 4-Tier Verification Engine | Correlate evidence across Found, Reachable, Observed, Declared, and Mismatch states. | **Implemented** (`packages/analyzer/reachability.py`, `services/api/context_engine.py`) |
| **FR-5** | CycloneDX 1.6 CBOM Export | Deterministically compile and export standard-compliant JSON Cryptographic Bill of Materials. | **Implemented** (`packages/analysis/reporting.py`, `apps/web/src/app/projects/[projectId]/cbom/page.tsx`) |
| **FR-6** | What-If Simulation Sandbox | In-memory counterfactual simulation of cryptographic mutations without altering baseline scan records. | **Implemented** (`packages/analysis/whatif.py`, `services/api/routes/whatif.py`, `DecisionWorkbench.tsx`) |
| **FR-7** | Spatial Investigation Canvas | 2D node-edge graph visualization mapping Entrypoints → Operations → Keys → Data Assets with interactive drawer inspection. | **Implemented** (`ProgressiveExplorationGraph.tsx`, `RealInvestigationGraphV2.tsx`, `SpatialCanvas.tsx`) |
| **FR-8** | Finding Telemetry Cards | Finding detail view displaying executing code snippet, process name, timestamp, and runtime observation badge. | **Implemented** (`apps/web/src/app/projects/[projectId]/findings/[id]/page.tsx`) |
| **FR-9** | Deterministic Context Engine | Rule-based synthesis of findings into human-readable investigative narratives with zero external data leakage. | **Implemented** (`services/api/context_engine.py`, `services/api/explanations.py`) |
| **FR-10**| Project Governance Scoping | Ensure all findings, CBOMs, graphs, and readiness scores are strictly scoped to the active project and scan snapshot. | **Implemented** (`services/api/routes/projects.py`, UI project dropdown & scan selector) |

### 5.4 Non-Functional Requirements (NFR)
- **NFR-1 (Deterministic Consistency):** Running consecutive scans on an identical repository state must produce bit-for-bit identical findings, assets, and CBOM records.
- **NFR-2 (Zero Data Leakage / Offline-First):** Source code, cryptographic keys, and internal IP must never be transmitted to third-party cloud LLMs.
- **NFR-3 (Sub-Second UI Response):** Graph rendering and What-If scenario calculations must complete in under 500ms for projects with up to 5,000 nodes.
- **NFR-4 (Runtime Zero-Crash Guarantee):** Runtime instrumentation must never alter program control flow or cause unhandled exceptions in monitored services.

---

## 6. Technical Architecture & System Specifications

### 6.1 System Topology
The platform is organized as a modular, modern monorepo separating visualization, orchestration, static/dynamic analysis, and persistent storage:

```
WHAT_IF/
├── apps/
│   └── web/                   # Next.js 15 App Router Frontend (React 19, TailwindCSS, Lucide, Canvas)
├── services/
│   └── api/                   # FastAPI Backend Orchestrator (Pydantic v2, Context Engine, Routes)
├── packages/
│   ├── analyzer/              # Static AST scanner, X.509 parser, Key parser, Reachability graph
│   ├── analysis/              # Deterministic evaluation, What-If simulation, CBOM compiler
│   └── runtime/               # Dynamic execution harness, stack unwinder, live telemetry capture
├── infra/
│   └── database/migrations/   # SQLite/PostgreSQL schema definitions and evolutionary migrations
└── tests/
    ├── fixtures/              # Standalone test fixtures (CareVault, Enterprise_info)
    ├── unit/                  # Unit test suite for analysis, context, and intake engines
    └── integration/           # End-to-end integration and reachability test suites
```

### 6.2 Technology Stack Matrix

| Subsystem | Technology | Version / Specification | Role & Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | 15.2.x / React 19 | Server & Client components, layout orchestration, fast routing |
| **Styling & Design System** | TailwindCSS + Lucide Icons | 3.4.x | High-density cyber-security dark aesthetic, responsive cards, modals |
| **Graph Visualization** | Custom Canvas & React Flow | Custom Spatial Canvas | 2D node-edge exploration, auto-layout branching, collision avoidance |
| **Backend API** | FastAPI / Uvicorn | Python 3.12 / 3.13 | Asynchronous REST endpoints, scan pipeline lifecycle orchestration |
| **Validation & Schema** | Pydantic v2 | 2.10.x | Strict domain model enforcement, request/response validation |
| **Graph Analysis Engine** | NetworkX | 3.4.x | Control-flow reachability, call-graph DAG traversals, cycle detection |
| **Database Storage** | SQLite (WAL mode) / Postgres | SQLite 3 / SQL-compliant | ACID relational storage for scans, assets, evidence, and runtime events |
| **Runtime Instrumentation**| Python C-API / `sys._getframe` | Native Standard Library | Stack frame unwinding, caller linecache extraction, zero-overhead tracing |

---

## 7. Architectural Diagrams & Data Flows

### Diagram 1: High-Level Architecture Overview
```mermaid
graph TB
    subgraph UI["PRESENTATION LAYER (Next.js 15 Web Application)"]
        Dashboard[Overview Dashboard]
        Investigation[Spatial Investigation Graph]
        FindingsView[Findings & Evidence Inspector]
        CBOMView[CBOM Inventory Viewer]
        WhatIfWorkbench[Decision & What-If Workbench]
    end

    subgraph API["ORCHESTRATION & API LAYER (FastAPI)"]
        ScanRoute[/api/projects/:id/scans]
        FindingRoute[/api/projects/:id/findings]
        WhatIfRoute[/api/whatif/simulate]
        ContextEngine[Context & Narrative Engine]
        RuntimeMgr[Runtime Manager]
    end

    subgraph CORE["ANALYSIS & VERIFICATION ENGINES (Python Packages)"]
        AnalyzerPkg["packages/analyzer<br/>AST Scanner & Reachability"]
        RuntimePkg["packages/runtime<br/>Dynamic Harness & Stack Unwinder"]
        WhatIfPkg["packages/analysis<br/>What-If Simulation Engine"]
        CBOMCompiler["packages/analysis<br/>CycloneDX 1.6 Compiler"]
    end

    subgraph DB["PERSISTENCE LAYER (Relational Database)"]
        DBStore[(ecdat.db SQLite/Postgres<br/>Projects • Scans • Assets<br/>Evidence • RuntimeEvents • Paths)]
    end

    subgraph TARGETS["ANALYZED TARGET ENVIRONMENT"]
        GitRepo[(Source Repositories<br/>Code, Manifests, Configs)]
        Binaries[[Compiled Binaries<br/>PE, ELF, DLLs, SOs]]
        ActiveServices{{Live Running Microservices<br/>Runtime Execution Context}}
    end

    UI <-->|HTTP / REST JSON| API
    ScanRoute --> AnalyzerPkg
    ScanRoute --> RuntimeMgr
    RuntimeMgr --> RuntimePkg
    WhatIfRoute --> WhatIfPkg
    FindingRoute --> ContextEngine
    ContextEngine --> DBStore

    AnalyzerPkg --> GitRepo
    AnalyzerPkg --> Binaries
    RuntimePkg --> ActiveServices

    AnalyzerPkg --> DBStore
    RuntimePkg --> DBStore
    WhatIfPkg --> DBStore
    CBOMCompiler --> DBStore
```

---

### Diagram 2: Ingestion & Scan Lifecycle ("Who Comes In, What Happens, Who Goes Out")
```mermaid
sequenceDiagram
    autonumber
    actor SecurityLead as Security Architect / Judge
    participant UI as Next.js Web App
    participant API as FastAPI Orchestrator
    participant Analyzer as Static AST & Reachability
    participant Runtime as Dynamic Runtime Harness
    participant DB as SQLite / Postgres DB
    participant CBOM as CBOM Reporting Engine

    SecurityLead->>UI: Select Project & Trigger New Scan
    UI->>API: POST /api/projects/{id}/scans {options: include_runtime=true}
    API->>DB: Create ScanRun record (Status: QUEUED -> RUNNING)

    rect rgb(20, 30, 45)
        note over API,Analyzer: Phase 1: Static Discovery & AST Analysis
        API->>Analyzer: scan_repository(repo_path)
        Analyzer->>Analyzer: Parse AST, extract crypto calls, keys, certs, configs
        Analyzer->>DB: Persist raw Evidence & preliminary CryptoAssets
    end

    rect rgb(30, 20, 45)
        note over API,Analyzer: Phase 2: Reachability & Path Construction
        API->>Analyzer: build_reachability_graph()
        Analyzer->>Analyzer: Traverse call graph from Entrypoints to Crypto calls
        Analyzer->>DB: Persist CryptoPaths (REACHABLE / UNREACHABLE)
    end

    rect rgb(20, 45, 30)
        note over API,Runtime: Phase 3: Dynamic Runtime Observation
        API->>Runtime: execute_monitored_scenarios(scenario_list)
        Runtime->>Runtime: Intercept live crypto calls via dynamic hooks
        Runtime->>Runtime: Unwind callstack, capture exact line snippet & args
        Runtime->>DB: Insert RuntimeEvents & mark CryptoPaths as OBSERVED
    end

    rect rgb(45, 30, 20)
        note over API,CBOM: Phase 4: Deterministic Analysis & CBOM Synthesis
        API->>CBOM: generate_cbom(scan_id)
        CBOM->>DB: Fetch normalized assets, keys, and runtime proofs
        CBOM->>DB: Write AnalysisResult & CycloneDX CBOM JSON
    end

    API->>DB: Update ScanRun (Status: COMPLETED)
    API-->>UI: Return Scan Summary & Metrics
    UI-->>SecurityLead: Display Updated Findings, 3D/2D Graph, and CBOM
```

---

### Diagram 3: 4-Tier Verification State Machine
```mermaid
stateDiagram-v2
    [*] --> Discovered: Static AST / Regex Match
    
    Discovered --> Unreachable: No Call Path from Entrypoints
    Discovered --> Reachable: Call Graph Path Verified
    
    Reachable --> Observed: Dynamic Runtime Telemetry Event Captured
    Reachable --> Unobserved: No Runtime Invocation in Test Suite
    
    Observed --> DeclaredMatch: Matches config.yaml declarations
    Observed --> ConfigMismatch: Conflicts with declared governance policies
    
    Unobserved --> DeclaredMatch: Matches config.yaml
    Unobserved --> ConfigMismatch: Conflicts with declared governance policies

    note right of Observed
        Contains live code snippet,
        stack trace, and execution proof.
    end note

    note right of ConfigMismatch
        High-priority risk:
        Code deviates from policy.
    end note
```

---

### Diagram 4: What-If Counterfactual Simulation Flow
```mermaid
flowchart TD
    UserQuery[User Action in Decision Workbench:<br/>'What if we migrate RSA-2048 to ML-KEM-768?'] --> LoadBaseline[Load Baseline ContextAggregate<br/>ScanRun, CryptoAssets, CryptoPaths, KeyContexts]
    
    LoadBaseline --> DeepClone[In-Memory Deep Clone<br/>Isolation Boundary: DB Stays Untouched]
    
    DeepClone --> ApplyMutation[Apply Cryptographic Mutation<br/>Algorithm: RSA-2048 ➔ ML-KEM-768<br/>Key Size: 256 bytes ➔ 1,184 bytes<br/>Security Level: Classical 112-bit ➔ NIST Level 3 PQC]
    
    ApplyMutation --> PropagateGraph[Graph Blast Radius Propagation<br/>Identify Dependent Upstream Microservices<br/>Identify Storage & Transit Size Overhead]
    
    PropagateGraph --> EvalReadiness[Re-evaluate Migration Readiness<br/>Calculate Runway: Old vs New<br/>Calculate Effort: Sprints & Breaking Interfaces]
    
    EvalReadiness --> DiffEngine[What-If Diff Generator<br/>Compare Baseline vs Mutated Scenario]
    
    DiffEngine --> RenderWorkbench[Render Decision Workbench UI<br/>Delta Cards, Blast Radius Nodes, Migration Plan]
```

---

### Diagram 5: Dynamic Runtime Telemetry & Stack Frame Engine
```mermaid
flowchart LR
    subgraph MonitoredCode["RUNNING APPLICATION SERVICE"]
        ServiceReq[Incoming API Request] --> AppLogic[Application Logic]
        AppLogic --> CryptoCall["cryptography.hazmat.primitives.asymmetric.rsa.generate_private_key()"]
    end

    subgraph RuntimeHarness["PACKAGES / RUNTIME / HARNESS.PY"]
        Hook[Dynamic Monkey-Patch / Interceptor]
        FrameUnwinder[Call Stack Frame Inspector<br/>sys._getframe]
        SnippetExtractor[Source Linecache Reader<br/>linecache.getline]
    end

    subgraph TelemetryBus["PERSISTENCE & ENRICHMENT"]
        EventObject["RuntimeEvent Record<br/>{algorithm: 'RSA', key_size: 2048,<br/>file: 'archive.py', line: 14,<br/>snippet: 'key = rsa.generate_private_key(...)',<br/>observed_at: '2026-09-29T14:48:35Z'}"]
        FindingsEnricher[Findings Route API Enrichment]
        UIFindingsCard[UI Finding Section 4:<br/>RUNTIME OBSERVED Card + Code Snippet]
    end

    CryptoCall --> Hook
    Hook --> FrameUnwinder
    FrameUnwinder --> SnippetExtractor
    SnippetExtractor --> EventObject
    EventObject --> FindingsEnricher
    FindingsEnricher --> UIFindingsCard
```

---

## 8. Database Entity-Relationship Model

```mermaid
erDiagram
    PROJECT ||--o{ SCAN_RUN : contains
    SCAN_RUN ||--o{ CRYPTO_ASSET : discovers
    SCAN_RUN ||--o{ EVIDENCE : gathers
    SCAN_RUN ||--o{ RUNTIME_EVENT : captures
    SCAN_RUN ||--o{ CRYPTO_PATH : maps
    SCAN_RUN ||--o{ ANALYSIS_RESULT : computes

    CRYPTO_ASSET ||--o{ EVIDENCE : supported_by
    CRYPTO_PATH ||--o{ EVIDENCE : links
    CRYPTO_PATH ||--o{ RUNTIME_EVENT : verified_by
    CRYPTO_PATH }o--|| KEY_CONTEXT : uses
    CRYPTO_PATH }o--|| DATA_ASSET : protects

    PROJECT {
        string id PK
        string name
        string repository_url
        string branch
        datetime created_at
    }

    SCAN_RUN {
        string id PK
        string project_id FK
        string status
        string commit_sha
        datetime started_at
        datetime completed_at
    }

    CRYPTO_ASSET {
        string id PK
        string scan_id FK
        string asset_type
        string algorithm
        string role
        string quantum_vulnerability
    }

    CRYPTO_PATH {
        string id PK
        string scan_id FK
        string entrypoint
        string source_location
        string reachability_state
        string runtime_state
        string configuration_state
    }

    RUNTIME_EVENT {
        string id PK
        string scan_id FK
        string path_id FK
        string algorithm
        string source_file
        int line_number
        string code_snippet
        datetime timestamp
    }

    KEY_CONTEXT {
        string id PK
        string project_id FK
        string key_id_name
        string provider
        string key_type
    }

    DATA_ASSET {
        string id PK
        string project_id FK
        string name
        string classification
    }
```

---

## 9. Real-World Case Study: The Enterprise_info Transition Walkthrough

To demonstrate the full power of WHAT IF, the platform comes pre-configured with a comprehensive enterprise microservice suite (`Enterprise_info`):

### The Scenario:
- **`archive-service`**: Executes RSA-2048 key generation and signature operations to seal patient health archives. Declared as an internal microservice.
- **`legacy-service`**: Utilizes legacy symmetric algorithms and hardcoded credentials.
- **`partner-service`**: Exchanges tokens over external APIs.
- **`export-service`**: Handles bulk unencrypted exports.
- **Governance Declaration (`crypto.yaml` & `certificates.yaml`)**:
  - Declares company-wide standard: AES-256-GCM and ECC P-384.

### What Happens During a WHAT IF Scan:
1. **Static AST Analysis:** Discovers 8 raw cryptographic assets across 6 services.
2. **Reachability Analysis:** Discovers that 3 paths originate from active REST endpoints (`archive.py:seal_archive`, `export.py:export_data`).
3. **Dynamic Runtime Observation:**
   - Triggers live microservice execution.
   - Captures 4 real runtime events.
   - Extracts live code snippets: `key = rsa.generate_private_key(public_exponent=65537, key_size=2048)`.
   - Elevates 3 paths to **`RUNTIME OBSERVED`**.
4. **Configuration Mismatch Alert:**
   - Flags that `archive-service` declared modern compliance in `crypto.yaml`, but actually executes quantum-vulnerable RSA-2048 at line 14 of `archive.py`.
5. **What-If Simulation:**
   - Security architect loads `archive-service` in the Decision Workbench.
   - Simulates upgrading RSA-2048 to **ML-KEM-768**.
   - Platform reports:
     - Protection runway extends from -3.2 years (immediate quantum exposure) to +25.0 years.
     - Identifies that `partner-service` imports public keys from `archive-service` and will require buffer reallocation for the 1,184-byte public key.
     - Generates sprint remediation plan with 3 discrete engineering tasks.

---

## 10. Summary & Conclusion: Why WHAT IF Represents the Future of Cryptographic Governance

Traditional AppSec is blind to cryptographic context. As the global post-quantum cryptographic transition begins, enterprises cannot afford to guess where their cryptography lives or what will break when it is upgraded.

**WHAT IF delivers:**
1. **Empirical Certainty:** No more guessing whether a security finding is real. Tier 4 runtime telemetry provides indisputable proof with line-level code snippets.
2. **Actionable Governance:** Discovers configuration drift and policy violations across multi-service cloud topologies.
3. **Proactive Simulation:** The What-If Engine transforms cryptographic migration from an anxiety-ridden gamble into a deterministic, predictable engineering sprint.

*WHAT IF bridges the gap between today's classical vulnerabilities and tomorrow's quantum-safe enterprise.*
