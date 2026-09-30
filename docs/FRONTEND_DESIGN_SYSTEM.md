# ECDAT Master Frontend Design System

> **Enterprise Cryptographic Discovery, Analysis & Transition Platform**  
> *Architectural Specification for the ECDAT Spatial Investigation & Liquid Glass Visual Language.*

---

## 1. Visual Philosophy & Core Objective

The ECDAT frontend is not a generic cybersecurity dashboard or AI SaaS template. It is an **authored digital instrument** built for precision cryptographic discovery, call-graph reachability, dynamic runtime evidence inspection, and post-quantum migration simulation.

### The Contrast
| Traditional "AI SaaS" Template (Avoided) | ECDAT Digital Instrument (Achieved) |
| :--- | :--- |
| Giant centered headings with 3 generic cards | Atmospheric spatial canvas with high-information telemetry |
| Milky white glassmorphism and heavy blurs | Translucent dark liquid glass with edge refraction |
| Random purple-blue enterprise gradients | Semantic tonal fields with sharp intentional accents |
| Dominating, intrusive chatbot dialogs | Contextual embedded instruments (*Explain, Why, Verify*) |
| Generic cards stacked endlessly | Rails, consoles, spatial graphs, and progressive disclosure |
| Generic Inter/Roboto typography | Technical pairing: `Outfit` (display/sans) + `JetBrains Mono` (code) |

---

## 2. Typography System

Typography must maintain crisp legibility over dark translucent surfaces. System default fonts (`Arial`, `Roboto`, `Inter`, `Space Grotesk`) are strictly avoided.

### Font Hierarchy
- **Display & Interface Font:** `Outfit` (Weights: 400, 500, 600, 700, 800)  
  *Geometric, balanced, engineered feel with distinctive apertures and clean technical proportion.*
- **Technical & Evidence Monospace:** `JetBrains Mono` (Weights: 400, 500, 600, 700)  
  *Used exclusively for cryptographic identifiers, key ARNs, hashes, file paths, line numbers, call stack unwinding, bytecode offsets, and execution timestamps.*

### Scale & Application
| Role | Size / Leading | Weight | Font | Example Use |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Title** | `1.75rem (28px) / 1.2` | 700 | Outfit | Page Header, Landing Hero |
| **Section Header** | `1.125rem (18px) / 1.3` | 600 | Outfit | Finding Detail Sections, Drawer Headers |
| **Body Primary** | `0.875rem (14px) / 1.5` | 400/500 | Outfit | Descriptions, narrative analysis, options |
| **Technical Label** | `0.6875rem (11px) / 1.4` | 600 | JetBrains Mono | Table column headers, taxonomy tags, badges |
| **Code / Evidence** | `0.75rem (12px) / 1.6` | 400/500 | JetBrains Mono | Stack traces, source line snippets, CBOM JSON |

---

## 3. Color & Lighting Tokens

Color conveys cryptographic semantic state. It is never sprayed casually as rainbow decoration.

### Foundations & Surfaces
- **Canvas Base (`#0B0F14`):** Deep charcoal/black spatial environment.
- **Glass Surface (`#151C25` / `rgba(21, 28, 37, 0.72)`):** Primary floating consoles, tables, drawers.
- **Raised Glass (`#1C2632` / `rgba(28, 38, 50, 0.85)`):** Active selections, modals, elevated controls.
- **Text Primary (`#EAF0F6`):** Pure readable bone-white with subtle cool undertone.
- **Text Muted (`#A8B4C2`):** Calm steel grey for metadata and secondary labels.

### Semantic Accents
| Accent Token | Hex Value | Semantic Meaning in ECDAT |
| :--- | :--- | :--- |
| **Evidence** | `#60F1D0` (Teal) | Runtime observed, dynamic telemetry, verified truth, system health |
| **Analysis** | `#8B7CFF` (Violet) | Call-graph reachability, AST AST, algorithmic classification |
| **Data** | `#75B7FF` (Blue) | Protected data assets, PII storage, confidentiality horizons |
| **Key / Cert** | `#FFBF72` (Amber) | KMS keys, X.509 certificates, static-only warnings, pending reviews |
| **Scenario** | `#E8A1FF` (Magenta) | What-If counterfactual mutations, simulated upgrade deltas |
| **Mismatch** | `#FF7A90` (Rose/Red) | Governance policy violations, quantum-vulnerable primitives, failures |

---

## 4. Depth System: The Liquid Glass Hierarchy

ECDAT defines three explicit physical elevation levels:

```
Level 1: ENVIRONMENT (Deep black spatial background + subtle dot grid & radial illumination)
    │
    ├── Level 2: GLASS SURFACE (Translucent dark surface, backdrop-blur, 1px border, 0 4px shadow)
    │       │   • Global application shell & instrument rails
    │       │   • Inventory consoles & CBOM tables
    │       │   • Unfocused spatial mind-map nodes
    │       │
    │       └── Level 3: RAISED GLASS (Elevated dark surface, stronger refraction, inner highlight)
    │               • Contextual evidence drawer
    │               • Focused & selected spatial nodes
    │               • What-If delta comparison workbench
    │               • Source intake modals
```

---

## 5. Navigation Principles: The Instrument Shell

Instead of an administrative CRUD sidebar, the global shell operates as a **cryptographic investigation instrument**:

1. **Persistent Provenance Bar:** Always displays active Project, Source Repository, Target Branch, Active Scan ID, and 4-Tier Verification State indicators.
2. **Four Ergonomic Workgroups:**
   - **INVESTIGATE:** Overview, Cryptographic Inventory (Findings), Spatial Canvas (Mind-Map)
   - **UNDERSTAND:** Interprocedural Paths, Data Assets, Key Contexts, Security Controls, Raw Evidence
   - **DECIDE:** Quantum Readiness & Two-Clock Posture, Decision Workbench / What-If Sandbox
   - **ARTIFACTS:** CycloneDX 1.6 CBOM, Compliance Reports, Historical Scan Diffs
3. **Spatial Navigation:** Fast toggles between 2D spatial canvas view and tabular console views for any asset or path.

---

## 6. Spatial Investigation UI Rules

The spatial canvas is the centerpiece of ECDAT:
- **Horizontal Flow (Left-to-Right):** Follows the verified cryptographic continuum:
  `DATA ASSET → CRYPTO PRIMITIVE → KEY / CERTIFICATE → SERVICE ENTRYPOINT → SECURITY CONTROL → ANALYSIS DECISION`
- **Smooth Bezier Curves:** Inter-node dependencies are rendered via dynamic cubic bezier links with subtle gradient coloring matching source and target node semantics.
- **Capsule Nodes:** Nodes feature rounded capsule geometries with distinct color rings, status pips, and occurrence counts.
- **Progressive Disclosure:** Clicking any node reveals sub-branches (e.g. Reachability path, Runtime events, Protected data assets) without cluttering the global viewport.
- **Side Inspection Console:** A 440px liquid glass drawer slides in seamlessly, providing immediate line-level code evidence, call traces, and direct links to simulate migrations.

---

## 7. Contextual AI Surfacing Rules

AI capability must exist as a **subtle, embedded technical tool**, never an overbearing chatbot:
- **No Giant Chat Windows:** No persistent floating chatbot avatars or massive promotional AI banners.
- **Contextual Inquiries:** Micro-actions embedded directly on findings, data assets, and What-If deltas:
  - `[ Ask ECDAT: "Why is RSA-2048 flagged as reachable?" ]`
  - `[ Explain Evidence: "Analyze runtime stack frame #2" ]`
  - `[ Verify Policy: "Compare crypto.yaml vs observed AES-128" ]`
- **Strict Grounding:** The assistant only generates answers backed by verified SQLite/Postgres rows and line snippets from the current scan run.

---

## 8. Microinteractions & Motion Philosophy

- **Physics-Informed:** Subtle 150ms-250ms transitions for selection, hover elevation, and drawer reveal.
- **No Decorative Gimmicks:** No floating particles, no perpetual bouncing icons, no gratuitous parallax scrolling.
- **Directional State Illumination:** When What-If mode is activated, the ambient surface shifts gently toward Scenario Magenta (`#E8A1FF`), signalling an in-memory counterfactual sandbox.
