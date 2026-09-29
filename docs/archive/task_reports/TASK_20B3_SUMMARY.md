# TASK 20B.3 SUMMARY

## ✅ COMPLETED

Added spatial branching, expand/collapse, and focus mode to the investigation graph.

## FILES CREATED

1. **`apps/web/src/lib/investigation-layout-branching.ts`** (308 lines)
   - Branching layout (above/below spine)
   - Descendant/ancestor traversal
   - Expandable/collapsible detection
   - Connected neighborhood for focus

2. **`apps/web/src/components/investigation/RealInvestigationGraphV2.tsx`** (260 lines)
   - Expand/collapse state management
   - Focus mode toggle
   - Visible node calculation
   - Animated transitions (180-320ms)

## FILES MODIFIED

3. **`apps/web/src/app/projects/[projectId]/investigation/page.tsx`**
   - Switch to `RealInvestigationGraphV2`

## KEY FEATURES

### 1. MAIN SPINE (Maintained)
Horizontal flow: Data → Crypto → Key/Cert → Service → Control → Analysis

### 2. BRANCHING
- Well-connected nodes stay on spine (2+ edges)
- Less-connected nodes branch above/below
- Alternating placement (even=above, odd=below)
- 140px branch spacing
- **Only real graph adjacency** from `buildInvestigationGraph()`

### 3. EXPAND/COLLAPSE
- **Expand:** Click +, reveals real descendants, smooth animation (280ms)
- **Collapse:** Click −, hides descendants, keeps parent, smooth animation (280ms)
- Parent always visible
- Selection preserved
- Viewport preserved

### 4. FOCUS MODE
- Toggle button (top-left)
- **On + node selected:** Highlights connected neighborhood (1-level BFS)
- **Dimmed:** Unrelated nodes (40% opacity)
- **Not hidden:** All nodes visible for context

### 5. RECENTER
- **With selection:** Centers on node **without resetting zoom** (300ms)
- **No selection:** Fits entire graph (300ms)

### 6. FIT
- Fits currently visible nodes
- 20% padding
- Preserves selection, expansion, focus state
- 300ms animation

## EVIDENCE STATE

✅ **Preserved from backend:**
- AWS: DISCOVERED → REACHABLE → NOT_OBSERVED
- RSA: DISCOVERED → REACHABLE → RUNTIME_OBSERVED
- HASH: DISCOVERED → REACHABLE → NOT_OBSERVED
- MD5: DISCOVERED → REACHABLE → RUNTIME_OBSERVED

## ANIMATION TIMING

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Focus/Hover | 150-180ms | ease-out |
| Expansion | 280ms | ease-out |
| Collapse | 280ms | ease-out |
| Recenter | 300ms | smooth |
| Fit | 300ms | smooth |

## VALIDATION

✅ Branch expansion works  
✅ Collapse works  
✅ Above/below branches work  
✅ Focus/dimming works  
✅ Recenter works (preserves zoom)  
✅ Fit works (preserves state)  
✅ No fabricated nodes/edges  
✅ Drawer remains integrated  
✅ Evidence preserved  

## NOT IMPLEMENTED

❌ Decision Workbench (future)  
❌ What-If mode (future)  
❌ Backend modifications (intentional)  

## READY FOR

User testing, refinement, then Decision Workbench integration.
