"""
ECDAT Final Integration Test Suite
Tests backend-only correctness: APIs, data flow, runtime events, controls, what-if.

Run: python -m pytest tests/integration/test_final_integration.py -v
"""
import pytest
import requests
import time
import uuid

BASE_URL = "http://localhost:8000"
PROJECT_ID = None  # Populated in session setup

KNOWN_PROJECT_ID = "c371021a-8016-417b-90a0-eed042134927"  # Enterprise_info project

@pytest.fixture(scope="module")
def project_id():
    """Get or create the main test project."""
    res = requests.get(f"{BASE_URL}/projects/")
    assert res.status_code == 200, f"GET /projects/ failed: {res.text}"
    projects = res.json()
    for p in projects:
        if p["id"] == KNOWN_PROJECT_ID:
            return KNOWN_PROJECT_ID
    if projects:
        return projects[0]["id"]
    # Create fresh
    r = requests.post(f"{BASE_URL}/projects/", json={"name": "ECDAT Integration Test"})
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def completed_scan(project_id):
    """Get or trigger a completed scan for the project."""
    scans = requests.get(f"{BASE_URL}/projects/{project_id}/scans").json()
    completed = [s for s in scans if s["status"] == "COMPLETED"]
    if completed:
        return completed[0]["id"]
    
    # Trigger a new scan
    r = requests.post(f"{BASE_URL}/projects/{project_id}/scans", json={
        "project_id": project_id,
        "repository_url": "https://github.com/nabeel-lab/Enterprise_info.git",
        "runtime_enabled": True,
        "context_enabled": True,
    })
    assert r.status_code == 200, f"POST /scans failed: {r.text}"
    scan_id = r.json()["id"]
    
    # Wait for completion (max 120s)
    for _ in range(60):
        time.sleep(2)
        scan_res = requests.get(f"{BASE_URL}/projects/{project_id}/scans/{scan_id}").json()
        if scan_res["scan"]["status"] in ("COMPLETED", "FAILED"):
            break
    
    assert scan_res["scan"]["status"] == "COMPLETED", f"Scan did not complete: {scan_res['scan']}"
    return scan_id


class TestProjectSummary:
    """Test the canonical summary endpoint."""

    def test_summary_returns_200(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        assert r.status_code == 200, r.text

    def test_summary_has_scan_id(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        data = r.json()
        assert data["latest_completed_scan_id"] == completed_scan

    def test_summary_crypto_assets_nonzero(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        data = r.json()
        assert data["discovery"]["crypto_assets"] > 0, f"Expected crypto_assets > 0, got: {data['discovery']}"

    def test_summary_runtime_events_field_present(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        data = r.json()
        # runtime_events should be in verification dict
        assert "runtime_events" in data["verification"], f"Missing runtime_events in: {data['verification']}"

    def test_summary_no_nonsensical_negatives(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        data = r.json()
        disc = data["discovery"]
        verif = data["verification"]
        for key, val in {**disc, **verif}.items():
            assert val >= 0, f"Negative count in summary: {key}={val}"


class TestFindings:
    """Test the canonical findings endpoint."""

    def test_findings_returns_list(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_findings_not_empty(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        data = r.json()
        assert len(data) > 0, "Expected at least one finding"

    def test_findings_have_required_fields(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        for item in r.json():
            assert "finding" in item
            assert "evidence" in item
            assert "reachability" in item
            f = item["finding"]
            assert "id" in f
            assert "name" in f
            assert "algorithm" in f or "asset_type" in f

    def test_finding_detail_no_404(self, project_id, completed_scan):
        """Critical: clicking an asset must not give 'Finding not found'."""
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        findings = r.json()
        assert findings, "No findings to test detail"
        
        first_finding_id = findings[0]["finding"]["id"]
        detail_r = requests.get(
            f"{BASE_URL}/projects/{project_id}/findings/{first_finding_id}/verification"
        )
        assert detail_r.status_code == 200, (
            f"Finding detail returned {detail_r.status_code}: {detail_r.text}"
        )
        assert "finding" in detail_r.json()

    def test_canonical_finding_detail_endpoint(self, project_id, completed_scan):
        """The new canonical /detail endpoint returns all data."""
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        first_id = r.json()[0]["finding"]["id"]
        
        detail = requests.get(
            f"{BASE_URL}/projects/{project_id}/findings/{first_id}/detail?scan_id={completed_scan}"
        )
        assert detail.status_code == 200, detail.text
        data = detail.json()
        
        # Should include all key blocks
        assert "finding" in data
        assert "evidence" in data
        assert "reachability" in data
        assert "runtime" in data
        assert "crypto_paths" in data
        assert "controls" in data

    def test_rsa_finding_not_missing(self, project_id, completed_scan):
        """RSA should be discoverable via the findings table."""
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        algos = [item["finding"].get("algorithm", "").upper() for item in r.json()]
        rsa_found = any("RSA" in a for a in algos)
        assert rsa_found, f"RSA not found in findings. Algos present: {algos}"


class TestRuntimeEvents:
    """Test that runtime events are persisted and correctly correlated."""

    def test_runtime_events_exist_for_scan(self, project_id, completed_scan):
        """Runtime events must be present (scan was run with runtime_enabled=True)."""
        r = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}")
        data = r.json()
        count = data["verification"].get("runtime_events", 0)
        assert count > 0, (
            f"Expected runtime_events > 0, got {count}. "
            "Did the scan pipeline run with runtime_enabled=True?"
        )

    def test_runtime_events_have_asset_id(self, project_id, completed_scan):
        """Runtime events must be correlated to a crypto asset (not null asset_id)."""
        import psycopg2
        db_url = 'postgresql://postgres.fpoerukhvqhoyxeqbsgi:ahhafwSRGR13357%5E%5E@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM runtime_events WHERE scan_id=%s AND asset_id IS NOT NULL",
            (completed_scan,)
        )
        count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM runtime_events WHERE scan_id=%s", (completed_scan,))
        total = cur.fetchone()[0]
        cur.close()
        conn.close()
        assert count > 0, (
            f"All {total} runtime_events have NULL asset_id — correlation is broken"
        )

    def test_runtime_observed_reflected_in_findings(self, project_id, completed_scan):
        """At least one finding should show runtime_observed=True."""
        r = requests.get(f"{BASE_URL}/projects/{project_id}/cbom?scan_id={completed_scan}")
        if r.status_code != 200:
            pytest.skip("CBOM not available")
        cbom = r.json()
        assets = cbom.get("sections", {}).get("crypto_assets", [])
        observed = [a for a in assets if a.get("runtime_observed")]
        assert observed, "No assets show runtime_observed=True in CBOM — correlation failed"


class TestControls:
    """Test that controls are populated for scan assets."""

    def test_controls_not_empty(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/controls?scan_id={completed_scan}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) > 0, "Controls are empty — scan pipeline didn't generate them"

    def test_controls_have_valid_states(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/controls?scan_id={completed_scan}")
        valid_states = {"YES", "NO", "UNKNOWN", "PRESENT", "ABSENT", "NOT_APPLICABLE"}
        for ctrl in r.json():
            assert ctrl["control_state"] in valid_states, (
                f"Invalid control_state: {ctrl['control_state']}"
            )

    def test_controls_include_known_control_types(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/controls?scan_id={completed_scan}")
        names = {c["control_name"] for c in r.json()}
        assert "Post-Quantum Readiness" in names or "Key Custody (KMS/HSM)" in names, (
            f"Expected specific control names, got: {names}"
        )


class TestCryptoPaths:
    """Test CryptoPaths are scan-scoped and properly linked."""

    def test_crypto_paths_scoped_to_scan(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/crypto-paths?scan_id={completed_scan}")
        assert r.status_code == 200, r.text
        paths = r.json()
        # If paths exist, verify scan_id
        for p in paths:
            if p.get("scan_id"):
                assert p["scan_id"] == completed_scan

    def test_crypto_paths_linked_to_assets(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/crypto-paths?scan_id={completed_scan}")
        for path in r.json():
            assert path.get("crypto_asset_id") is not None, (
                f"CryptoPath missing crypto_asset_id: {path}"
            )


class TestAnalysis:
    """Test analysis pipeline produces correct evidence_state with runtime data."""

    def test_analysis_summary_returns(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/analysis/summary?scan_id={completed_scan}")
        assert r.status_code == 200, r.text

    def test_analysis_finding_returns(self, project_id, completed_scan):
        """Get analysis result for the first finding."""
        findings_r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        first_id = findings_r.json()[0]["finding"]["id"]
        
        r = requests.get(f"{BASE_URL}/projects/{project_id}/findings/{first_id}/analysis?scan_id={completed_scan}")
        # May return None or dict, just ensure no 500
        assert r.status_code in (200,), f"Analysis returned {r.status_code}: {r.text}"

    def test_runtime_observed_produces_observed_evidence_state(self, project_id, completed_scan):
        """If runtime events exist for an asset, evidence_state should contain OBSERVED."""
        import psycopg2
        db_url = 'postgresql://postgres.fpoerukhvqhoyxeqbsgi:ahhafwSRGR13357%5E%5E@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Get asset IDs that have runtime events
        cur.execute("""
            SELECT DISTINCT re.asset_id
            FROM runtime_events re
            WHERE re.scan_id = %s AND re.asset_id IS NOT NULL
            LIMIT 5
        """, (completed_scan,))
        observed_asset_ids = [str(row[0]) for row in cur.fetchall()]
        
        if not observed_asset_ids:
            pytest.skip("No runtime events with asset_id — skipping OBSERVED state check")
        
        # Check analysis results for those assets
        cur.execute("""
            SELECT ar.finding_id, ar.evidence_state
            FROM analysis_results ar
            JOIN analysis_runs arn ON arn.id = ar.analysis_run_id
            WHERE arn.scan_id = %s AND ar.finding_id = ANY(%s::uuid[])
        """, (completed_scan, observed_asset_ids))
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        if not results:
            pytest.skip("Analysis hasn't been run yet for this scan")
        
        observed_results = [r for r in results if r[1] and "OBSERVED" in r[1]]
        assert len(observed_results) > 0, (
            f"Assets {observed_asset_ids} have runtime events but analysis_results "
            f"show evidence_state: {[r[1] for r in results]}"
        )


class TestWhatIf:
    """Test the what-if engine via the API."""

    def test_what_if_endpoint_reachable(self, project_id, completed_scan):
        """The what-if endpoint must not 404."""
        findings_r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        first_id = findings_r.json()[0]["finding"]["id"]
        
        r = requests.post(
            f"{BASE_URL}/projects/{project_id}/findings/{first_id}/what-if",
            json={"scenario_type": "INTRODUCE_CRYPTO_ABSTRACTION", "overrides": {}}
        )
        # Allow 200 or 422 (missing fields) but not 404 or 500
        assert r.status_code in (200, 422), f"What-If returned unexpected {r.status_code}: {r.text}"

    def test_what_if_via_whatif_router(self, project_id, completed_scan):
        """Direct what-if router endpoint."""
        findings_r = requests.get(f"{BASE_URL}/projects/{project_id}/findings?scan_id={completed_scan}")
        first_id = findings_r.json()[0]["finding"]["id"]
        
        r = requests.post(
            f"{BASE_URL}/projects/{project_id}/findings/{first_id}/what-if",
            json={"scenario_type": "INTRODUCE_CRYPTO_ABSTRACTION", "overrides": {}}
        )
        assert r.status_code in (200, 404, 422), f"Unexpected: {r.status_code}: {r.text}"


class TestCBOM:
    """Test CBOM correctness."""

    def test_cbom_returns_200(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/cbom?scan_id={completed_scan}")
        assert r.status_code == 200, r.text

    def test_cbom_totals_match_summary(self, project_id, completed_scan):
        summary = requests.get(f"{BASE_URL}/projects/{project_id}/summary?scan_id={completed_scan}").json()
        cbom = requests.get(f"{BASE_URL}/projects/{project_id}/cbom?scan_id={completed_scan}").json()
        
        summary_assets = summary["discovery"]["crypto_assets"]
        cbom_assets = cbom["totals"]["crypto_assets"]
        
        # CBOM crypto_assets (non-cert) + cert_assets should sum to match summary
        # Allow minor discrepancy since summary may count cert assets separately
        assert abs(summary_assets - cbom_assets) <= cbom["totals"]["certificates"], (
            f"CBOM asset count mismatch: summary={summary_assets}, cbom={cbom_assets}"
        )

    def test_cbom_has_sections(self, project_id, completed_scan):
        cbom = requests.get(f"{BASE_URL}/projects/{project_id}/cbom?scan_id={completed_scan}").json()
        assert "sections" in cbom
        sections = cbom["sections"]
        assert "crypto_assets" in sections
        assert "certificates" in sections
        assert "key_metadata" in sections


class TestScanDetail:
    """Test scan detail endpoint returns consistent counts."""

    def test_scan_detail_returns(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/scans/{completed_scan}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "scan" in data
        assert "stages" in data
        assert "counts" in data

    def test_scan_detail_counts_non_negative(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/scans/{completed_scan}")
        counts = r.json()["counts"]
        for k, v in counts.items():
            assert v >= 0, f"Negative count in scan detail: {k}={v}"

    def test_scan_stages_all_terminal(self, project_id, completed_scan):
        r = requests.get(f"{BASE_URL}/projects/{project_id}/scans/{completed_scan}")
        stages = r.json()["stages"]
        non_terminal = [s for s in stages if s["status"] not in ("COMPLETED", "FAILED", "SKIPPED")]
        assert not non_terminal, f"Non-terminal stages after scan completion: {non_terminal}"
