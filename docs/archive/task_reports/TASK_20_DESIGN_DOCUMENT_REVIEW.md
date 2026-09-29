# TASK 20 - DESIGN DOCUMENT REVIEW

## Documents Read

### 1. ECDAT_Spatial_Investigation_UI_Design_Spec.docx ✅
**Method:** Extracted as ZIP, parsed word/document.xml  
**Paragraphs:** 163  
**Tables:** Present (extraction method captured text nodes)  
**Complete:** YES

### 2. Project Documentation ✅
- `README.md` - Main project overview
- `apps/web/README.md` - Frontend setup
- `apps/web/package.json` - Dependencies (Next.js 16, React 19, React Flow 11, Tailwind 4)
- `implementation_plan_phase6.md` - Investigation Map plan
- `infra/database/migrations/*.sql` - Database schema and relationships
- Existing Investigation Workspace implementation

---

## Design Requirements Extracted

### Core Requirements from Actual Design Document:

1. ✅ **Dedicated Investigation Map page** - Separate route, full-screen workspace
2. ✅ **Horizontal spatial composition** - Left-to-right investigation flow
3. ✅ **DSA-style curved branching** - Adapted horizontally, branches above/below spine
4. ✅ **Capsule/strongly-rounded nodes** - NOT sharp rectangles
5. ✅ **Curved relationship edges** - Thin and spatial
6. ✅ **Pan in both axes** - Full X/Y navigation
7. ✅ **Zoom** - Scale navigation
8. ✅ **Focus mode** - Selected path maximum contrast, unrelated dimmed (not hidden)
9. ✅ **Recenter** - Bring selected entity to visual center
10. ✅ **Fit graph** - Reset framing without clearing selection
11. ✅ **Expand/collapse** - Branch expansion/collapse
12. ✅ **Liquid-glass visual language** - Dark depth, translucent surfaces, cool borders
13. ✅ **Evidence Drawer** - Right-side panel, map remains visible
14. ✅ **Runtime conformance** - Static expectation vs Actual observation comparison
15. ✅ **Decision Workbench** - Backend analysis only (no frontend engine)
16. ✅ **What-If interaction** - Baseline → Scenario → Delta
17. ✅ **Real backend relationships only** - No fabrication
18. ✅ **Separate evidence states** - DISCOVERED, REACHABLE, RUNTIME OBSERVED, NOT OBSERVED
19. ✅ **Investigation chain** - Data Asset → Crypto Asset → Key → Service → Controls → Analysis
20. ✅ **Node categories** - Data, Crypto, Key, Certificate, Provider, Service, Control, Analysis

### Authoritative Color Palette:

```typescript
const ECDAT_COLORS = {
  canvas: '#0B0F14',
  glassSurface: '#151C25',
  raisedGlass: '#1C2632',
  primaryText: '#EAF0F6',
  mutedText: '#A8B4C2',
  evidenceTeal: '#60F1D0',
  analysisViolet: '#8B7CFF',
  dataBlue: '#75B7FF',
  keyAmber: '#FFBF72',
  scenarioPink: '#E8A1FF',
  mismatchRed: '#FF7A90',
};
```

### Motion Timing Spec:

```typescript
const MOTION_TIMING = {
  hoverFocus: '120-180ms',
  drawerReveal: '180-240ms',
  branchExpansion: '220-320ms',
  scenarioTransition: '240-360ms',
};
```

### Material Treatment Rules:

- Glass: semi-transparent dark fill, 1px cool border, soft shadow, optional backdrop blur
- Selected nodes: brighter border + small glow (NOT large neon halo)
- Unselected nodes: lower contrast but readable
- Use subtle inner highlights for glass feel
- Use atmospheric gradients behind groups/lanes, NOT behind individual nodes
- Motion ONLY for state changes/navigation, NO continuous animation

### Spatial Composition Rules:

- **Main spine:** Horizontally oriented, visually stronger than branches
- **Branches:** Can extend above and below spine (echoing DSA mind-map)
- **Nodes:** Rounded rectangles/capsule-like, strongly curved corners
- **Connectors:** Thin and curved, visual weight indicates direction
- **Background:** Quiet, spatial, with subtle lane/grid structure
- **Depth:** Use z-depth to separate selected path, drawer, scenario from base graph

---

## Backend Relationship Structure (from Database Schema)

### crypto_paths Table (Core Investigation Chain):

```sql
crypto_paths
├── crypto_asset_id → crypto_assets (Crypto Operation)
├── data_asset_id → data_assets (Protected Data)
├── key_context_id → key_contexts (Key/Certificate/Provider)
└── entrypoint → Service/Entrypoint (text field)
```

### Additional Relationships:

```sql
controls
├── crypto_asset_id → crypto_assets
└── scan_id → scan_runs

dependencies
├── crypto_asset_id → crypto_assets
└── target_type/target_name (Library/Protocol)

reachability_results
├── asset_id → crypto_assets
└── entrypoint (text)

runtime_events
├── asset_id → crypto_assets
├── crypto_path_id → crypto_paths
└── scan_id → scan_runs

analysis_results
├── finding_id → crypto_assets
├── crypto_path_id → crypto_paths
└── analysis_run_id → analysis_runs
```

### Investigation Chain from Backend:

```
Data Asset (data_assets)
    ↓ (via crypto_paths.data_asset_id)
Crypto Asset (crypto_assets)
    ↓ (via crypto_paths.crypto_asset_id)
Key/Certificate (key_contexts, certificates)
    ↓ (via crypto_paths.key_context_id)
Service/Entrypoint (crypto_paths.entrypoint, reachability_results.entrypoint)
    ↓ (via controls.crypto_asset_id)
Controls (controls)
    ↓ (via analysis_results.crypto_path_id)
Analysis (analysis_results)
```

---

## Critical Gaps in Previous Implementation

### My Earlier Task 20 Implementation Was Incomplete:

1. ❌ **Only showed crypto assets** - Missing full investigation chain
2. ❌ **No real relationship edges** - No edges drawn from backend data
3. ❌ **No node categories** - Only one node type (crypto asset)
4. ❌ **No expand/collapse** - Static layout
5. ❌ **No focus mode** - No dimming of unrelated nodes
6. ❌ **Wrong colors** - Used generic slate colors, not the specified palette
7. ❌ **No branch structure** - Just horizontal line, no above/below branching
8. ❌ **No runtime conformance panel** - Missing static vs actual comparison
9. ❌ **No What-If integration** - Not implemented
10. ❌ **Generic glass effect** - Not following the specific material treatment rules

### What Needs to Be Built:

#### 1. Node Categories (7 types):
- DataAssetNode (blue #75B7FF)
- CryptoAssetNode (teal #60F1D0 when observed)
- KeyContextNode (amber #FFBF72)
- CertificateNode (amber #FFBF72)
- ServiceNode (needs definition)
- ControlNode (needs definition)
- AnalysisNode (violet #8B7CFF)

#### 2. Real Relationship Edges:
- Query `crypto_paths` table to get:
  - data_asset_id → crypto_asset_id edges
  - crypto_asset_id → key_context_id edges
  - crypto_asset_id → entrypoint (service) edges
- Query `controls` table for crypto_asset_id → control edges
- Query `analysis_results` for crypto_path_id → analysis edges

#### 3. Graph Interactions:
- Expand: Show children when node clicked
- Collapse: Hide children, preserve context
- Focus: Dim unrelated (opacity reduction), emphasize selected path
- Recenter: Center selected node
- Fit: Reset view to show all nodes

#### 4. Evidence Drawer Updates:
- Runtime Conformance Panel:
  ```
  STATIC EXPECTATION       ACTUAL RUNTIME OBSERVATION
  Algorithm: RSA           Algorithm: RSA
  Operation: encrypt       Operation: generate_private_key
  Provider: cryptography   Provider: cryptography
  Source: archive.py:8     Source: archive.py:8
  
  Result: VERIFIED MATCH
  ```

#### 5. Decision Workbench Integration:
- Current State section
- Why It Matters section
- Protection Runway display
- Migration Effort display
- Action Candidates from backend
- What-If launch button

#### 6. What-If Panel:
- Baseline display
- Scenario overlay
- Delta visualization (improved/worsened/changed/unchanged/new/removed)

---

## Current Implementation Status

### What EXISTS and Works:
- ✅ Basic React Flow setup
- ✅ Supabase data loading (crypto_assets, reachability, runtime_events, analysis)
- ✅ Evidence state distinction (DISCOVERED/REACHABLE/RUNTIME OBSERVED)
- ✅ "NOT OBSERVED" display (not "FAILED")
- ✅ Backend data integrity (no fabrication)

### What NEEDS Implementation:
- ❌ Correct color palette (#0B0F14 canvas, etc.)
- ❌ Full node category system (7 types)
- ❌ Real relationship edges from crypto_paths table
- ❌ Expand/collapse interaction
- ❌ Focus mode with dimming
- ❌ Recenter functionality
- ❌ Branch structure (above/below spine)
- ❌ Runtime conformance panel
- ❌ Decision Workbench complete integration
- ❌ What-If panel
- ❌ Proper material treatment (1px cool borders, subtle glow)
- ❌ Motion timing per spec

---

## Acknowledgment

I have successfully extracted and read the actual design document. The requirements are now clear:

**This is NOT a simple "make it dark" task.**

This is a complete refactor to build:
1. A spatial investigation workspace (not a dashboard)
2. With a proper relationship graph (not just crypto asset cards)
3. Following a specific visual system (not generic dark theme)
4. With real backend relationships (not invented edges)
5. With sophisticated interactions (expand/collapse/focus/branch)
6. Maintaining evidence integrity (separate states, no fabrication)

The design document is explicit and comprehensive. The previous implementation was a partial visual refresh, not the full spatial investigation experience specified.

---

## Next Steps Required

To properly implement this, I need to:

1. **Create node category components** (7 types with proper styling)
2. **Query crypto_paths table** to get real relationships
3. **Build edge system** from backend foreign keys
4. **Implement graph interactions** (expand/collapse/focus)
5. **Add runtime conformance panel** to drawer
6. **Integrate Decision Workbench** properly
7. **Add What-If panel** (calling backend engine)
8. **Apply correct color palette** throughout
9. **Implement proper material treatment** per spec
10. **Test with production build**

This is a multi-hour implementation task that requires careful component architecture and backend integration.

---

## Recommendation

Given the scope and complexity revealed by reading the actual design document, I recommend:

**Option A:** Proceed with full implementation now (will require significant additional work)

**Option B:** Create a phased approach:
- Phase 1: Color palette and material treatment update
- Phase 2: Node category system
- Phase 3: Real relationship edges
- Phase 4: Graph interactions (expand/collapse/focus)
- Phase 5: Runtime conformance and What-If panels

**Option C:** You review this analysis and provide direction on priorities

The design document is clear and authoritative. The implementation scope is now properly understood.
