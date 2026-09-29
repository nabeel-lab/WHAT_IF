# ECDAT Demo Runbook

Follow this golden path to demonstrate the value of ECDAT. The presentation proves ECDAT is evidence-first, capable of deep context mapping, and completely dynamic.

### Step 1: Clean State
1. If needed, run a reset on the demo project via the API or DB to ensure a clean slate. 
2. Open ECDAT locally (`http://localhost:3000`).

### Step 2: Investigation Initialization
1. Navigate to the `Enterprise_info` project.
2. The Overview should state "No completed scan".
3. Click **Configure Scan** and trigger the scan against `https://github.com/nabeel-lab/Enterprise_info.git`.

### Step 3: Discovery & Verification
1. Watch the scan stages progress (Discovery, Reachability, Runtime, Context).
2. Go to the **Project Overview**. Show the explicit asset counts and verified runtime paths.

### Step 4: Deep Path Analysis
1. Open **Findings**.
2. Select a finding that is **Runtime Observed**.
3. Point out the hierarchical **Crypto Path**: `entrypoint -> file -> algorithm -> key -> data asset`.
4. Emphasize that these connections are derived from evidence, not guessing.

### Step 5: Deterministic Insight
1. Scroll down to the **Analysis Engine Interpretation**.
2. Show the **Protection Runway** and **Migration Effort**. Explain that these are calculated deterministically from the evidence (e.g. data retention dates vs expected algorithmic breaks).

### Step 6: Counterfactuals (What-If)
1. Open the **What-If Analysis** panel.
2. Select **Introduce Crypto Abstraction**.
3. Run the scenario. Show the **Calculated Deltas** comparing Immutable Baseline vs Scenario Analysis.
4. Export the scenario via the **Export Scenario JSON** button. Emphasize this was in-memory and did not alter history.

### Step 7: Export & Audit
1. Return to **Project Overview**.
2. Click **Export Evidence CBOM** to show the hierarchical standard-compatible JSON.
3. Click **Download Investigation Report** to show the compiled baseline summary.

### Step 8: The Dynamic Mutation Proof
1. Switch to your terminal or GitHub UI.
2. Push a commit to `nabeel-lab/Enterprise_info` that introduces a new cryptographic primitive (e.g. new AES usage).
3. Return to ECDAT. Run a **new scan**.
4. Navigate to **Scan History & Mutation Proof**.
5. Select the two scans and hit **Compare**.
6. Show the calculated deltas (e.g., `Crypto assets: 15 -> 16`), proving ECDAT dynamically adapts to enterprise reality.
