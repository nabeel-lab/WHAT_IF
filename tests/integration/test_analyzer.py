from pathlib import Path
from packages.analyzer.scanner import Scanner

def test_rsa_detection():
    rules_dir = Path(__file__).parent.parent.parent / "rules" / "crypto"
    target_dir = Path(__file__).parent.parent / "fixtures" / "CareVault"
    
    scanner = Scanner(str(rules_dir))
    result = scanner.scan_directory(str(target_dir))
    
    assert len(result.errors) == 0
    
    # Check that we found findings
    assert len(result.findings) > 0
    
    findings_by_id = {f.detector_rule: f for f in result.findings}
    
    # PY-RSA-001: direct operation
    assert "PY-RSA-001" in findings_by_id
    f1 = findings_by_id["PY-RSA-001"]
    assert f1.confidence == "HIGH"
    assert f1.source_file.endswith("archive.py")
    
    # PY-RSA-002: primitive construction
    assert "PY-RSA-002" in findings_by_id
    f2 = findings_by_id["PY-RSA-002"]
    assert f2.confidence == "MEDIUM"
    assert f2.source_file.endswith("auth.py")
    
    # PY-RSA-003: import
    assert "PY-RSA-003" in findings_by_id

    # Check AES and Hash
    assert "PY-HASH-001" in findings_by_id
    f3 = findings_by_id["PY-HASH-001"]
    assert f3.confidence == "HIGH"
    assert f3.algorithm == "SHA256"

    assert "PY-AES-001" in findings_by_id
    f4 = findings_by_id["PY-AES-001"]
    assert f4.confidence == "MEDIUM"
    assert f4.algorithm == "AES"

    assert "PY-SYM-001" in findings_by_id
    f5 = findings_by_id["PY-SYM-001"]
    assert f5.confidence == "HIGH"
    assert f5.role == "encryption"

