# TASK 20B.4 SUMMARY

## ✅ COMPLETED

Transformed the investigation drawer into a comprehensive evidence console with runtime conformance analysis.

## FILES CREATED

1. **`EnhancedInvestigationDrawer.tsx`** (650+ lines) - Full evidence console with:
   - Entity header with evidence pills
   - Investigation path summary (clickable linked entities)
   - Static evidence sections
   - Runtime conformance panel
   - Data/key/certificate context
   - Analysis results
   - "Why This Matters" section
   - Decision Workbench + What-If entry points

## FILES MODIFIED

2. **`investigation/page.tsx`** - Switch to enhanced drawer

## DRAWER SECTIONS

### 1. Entity Header
- Type, name, evidence state pills (DISCOVERED, REACHABLE, RUNTIME OBS/NOT OBS)

### 2. Investigation Path
- Connected From/To relationships
- Clickable entities → select in graph
- Preserves viewport

### 3. Static Evidence
- Algorithm, role, type, library, source file:line

### 4. Runtime Conformance
- **If observed:** VERIFIED MATCH with static vs actual comparison
- **If not observed:** NOT OBSERVED with clear explanation
- NO fabricated failures

### 5. Context Sections
- Data: classification, sensitivity, criticality
- Key: algorithm, scope, rotation, custody
- Certificate: algorithm, issuer, validity

### 6. Analysis
- Readiness, protection runway, migration effort, agility
- Action candidates

### 7. Why This Matters
- Evidence-backed bullet points
- NO risk scores

### 8. Decision Entry Points
- "Open Decision Workbench" button
- "Explore What-If" button
- Pass entity context (not fully wired yet)

## RUNTIME CONFORMANCE

### RSA/MD5 (Observed)
```
✓ VERIFIED MATCH
Static: RSA-2048 → Actual: RSA-2048
```

### AWS/HASH (Not Observed)
```
NOT OBSERVED
Static and reachability evidence exists, but no 
runtime observation was captured.
```

## VALIDATION

✅ RSA: Runtime observed, conformance visible  
✅ MD5: Runtime observed, conformance visible  
✅ AWS: Reachable, NOT OBSERVED (no fabrication)  
✅ HASH: Reachable, NOT OBSERVED (no fabrication)  
✅ Linked entities real (from graph edges)  
✅ Click entity → select in graph  
✅ Viewport preserved  
✅ Drawer state syncs with graph  

## SPATIAL BEHAVIOR

✅ Opening drawer preserves: viewport, zoom, expansion, selection, focus  
✅ Closing drawer returns to graph  
✅ Linked entity navigation updates both drawer and graph  
✅ No navigation away from Investigation page  

## GLASS DESIGN

- Surfaces: #151C25, #1C2632
- Text: #EAF0F6 (primary), #A8B4C2 (muted)
- Evidence: #60F1D0 (teal for observed)
- Backdrop blur, subtle borders, smooth transitions

## NOT IMPLEMENTED

❌ Decision Workbench redesign (entry point only)  
❌ What-If implementation (entry point only)  
❌ Backend modifications  
❌ Risk score calculation  

## READY FOR

User testing, then full Decision Workbench and What-If integration.
