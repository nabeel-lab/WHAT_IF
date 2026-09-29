import pytest
from pathlib import Path
from packages.analyzer.reachability import ReachabilityAnalyzer
from packages.analyzer.scanner import Finding

def test_reachability_archive():
    target_dir = Path(__file__).parent.parent / "fixtures" / "CareVault"
    analyzer = ReachabilityAnalyzer(str(target_dir))
    
    # Mock finding for RSA encrypt in archive.py
    f = Finding(
        name="Detected RSA encryption usage",
        asset_type="operation",
        algorithm="RSA",
        role="encryption",
        source_file="archive.py",
        line_start=5,
        line_end=5,
        library="Unknown",
        detector_rule="PY-RSA-001",
        confidence="HIGH",
        snippet="rsa.encrypt(data, pubkey)"
    )
    
    status, ep = analyzer.analyze_finding(f)
    assert status == "REACHABLE"
    assert ep == "/archive"

def test_unreachable_fixture():
    target_dir = Path(__file__).parent.parent / "fixtures" / "CareVault"
    analyzer = ReachabilityAnalyzer(str(target_dir))
    
    # Mock finding for Hash in test fixture
    f = Finding(
        name="Detected SHA256 hash usage",
        asset_type="operation",
        algorithm="SHA256",
        role="hashing",
        source_file="test_crypto.py",
        line_start=10,
        line_end=10,
        library="Unknown",
        detector_rule="PY-HASH-001",
        confidence="HIGH",
        snippet="hashlib.sha256()"
    )
    
    status, ep = analyzer.analyze_finding(f)
    assert status == "UNREACHABLE"
    assert ep is None
