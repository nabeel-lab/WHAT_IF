import ast
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel

class Finding(BaseModel):
    name: str
    asset_type: str
    algorithm: str
    role: str
    source_file: str
    line_start: int
    line_end: int
    library: str
    detector_rule: str
    confidence: str
    snippet: str

class ScanResult(BaseModel):
    findings: List[Finding]
    errors: List[Dict[str, str]]

class CryptoVisitor(ast.NodeVisitor):
    def __init__(self, filepath: Path, lines: List[str]):
        self.findings: List[Finding] = []
        self.filepath = filepath
        self.lines = lines

    def add_finding(self, node: ast.AST, name, asset_type, algo, role, rule, confidence):
        snippet = self.lines[node.lineno - 1].strip() if hasattr(node, 'lineno') else ""
        self.findings.append(Finding(
            name=name,
            asset_type=asset_type,
            algorithm=algo,
            role=role,
            source_file=str(self.filepath.name),
            line_start=getattr(node, 'lineno', 0),
            line_end=getattr(node, 'end_lineno', 0),
            library="Unknown",
            detector_rule=rule,
            confidence=confidence,
            snippet=snippet
        ))

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name):
                module = node.func.value.id
                method = node.func.attr
                
                # RSA
                if module == "rsa":
                    if method in ["encrypt", "decrypt"]:
                        role = "encryption" if method == "encrypt" else "decryption"
                        self.add_finding(node, f"Detected RSA {role} usage", "operation", "RSA", role, "PY-RSA-001", "HIGH")
                    elif method == "generate_private_key":
                        self.add_finding(node, "RSA primitive construction detected", "primitive", "RSA", "key generation", "PY-RSA-002", "MEDIUM")
                    elif method in ["sign", "verify"]:
                        role = "signing" if method == "sign" else "verification"
                        self.add_finding(node, f"Detected RSA {role} usage", "operation", "RSA", role, "PY-RSA-004", "HIGH")
                
                # Hashlib
                elif module == "hashlib":
                    if method in ["sha256", "sha1", "md5", "sha512"]:
                        self.add_finding(node, f"Detected {method.upper()} hash usage", "operation", method.upper(), "hashing", "PY-HASH-001", "HIGH")
                
                # Cryptography generic cipher
                elif module == "cipher":
                    if method in ["encryptor", "decryptor"]:
                        role = "encryption" if method == "encryptor" else "decryption"
                        self.add_finding(node, f"Detected symmetric {role} usage", "operation", "Symmetric", role, "PY-SYM-001", "HIGH")
                        
                elif module == "algorithms" and method == "AES":
                    self.add_finding(node, "AES primitive construction detected", "primitive", "AES", "encryption", "PY-AES-001", "MEDIUM")

            elif isinstance(node.func.value, ast.Attribute):
                # Handle nested like boto3.client
                pass
                
        # Handle AWS KMS / boto3
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == 'client':
                if getattr(node.func.value, 'id', '') == 'boto3':
                    if node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value == 'kms':
                        self.add_finding(node, "AWS KMS Cloud Service Initialization", "cloud_service", "AWS KMS", "key management", "PY-AWS-KMS-001", "HIGH")
            elif node.func.attr == 'generate_data_key':
                self.add_finding(node, "AWS KMS Data Key Generation", "operation", "AWS KMS", "key generation", "PY-AWS-KMS-002", "HIGH")

        # Handle direct imports like `sha256()`
        if isinstance(node.func, ast.Name):
            if node.func.id in ["sha256", "sha1", "md5", "sha512"]:
                self.add_finding(node, f"Detected {node.func.id.upper()} hash usage", "operation", node.func.id.upper(), "hashing", "PY-HASH-001", "HIGH")
            elif node.func.id == "AES":
                self.add_finding(node, "AES primitive construction detected", "primitive", "AES", "encryption", "PY-AES-001", "MEDIUM")

        self.generic_visit(node)

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            if alias.name == "rsa":
                self.add_finding(node, "RSA library import detected", "library", "RSA", "unknown", "PY-RSA-003", "LOW")
            elif alias.name == "hashlib":
                self.add_finding(node, "Hashlib library import detected", "library", "Hash", "unknown", "PY-HASH-002", "LOW")
            elif alias.name == "boto3":
                self.add_finding(node, "AWS boto3 library import detected", "library", "AWS", "cloud SDK", "PY-AWS-001", "LOW")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module == "cryptography.hazmat.primitives.asymmetric":
            for alias in node.names:
                if alias.name == "rsa":
                    self.add_finding(node, "RSA library import detected", "library", "RSA", "unknown", "PY-RSA-003", "LOW")
        elif node.module == "cryptography.hazmat.primitives.ciphers":
            for alias in node.names:
                if alias.name == "algorithms":
                    self.add_finding(node, "Cryptography algorithms import detected", "library", "Symmetric", "unknown", "PY-SYM-002", "LOW")
        elif node.module == "hashlib":
            for alias in node.names:
                if alias.name in ["sha256", "md5", "sha1"]:
                    self.add_finding(node, f"{alias.name.upper()} import detected", "library", alias.name.upper(), "unknown", "PY-HASH-002", "LOW")
        self.generic_visit(node)

class Scanner:
    def __init__(self, rules_dir: str):
        self.rules_dir = Path(rules_dir).resolve()

    def scan_directory(self, target_dir: str) -> ScanResult:
        target_path = Path(target_dir).resolve()
        findings = []
        errors = []

        for p in target_path.rglob("*.py"):
            try:
                content = p.read_text(encoding="utf-8")
                lines = content.splitlines()
                tree = ast.parse(content, filename=str(p))
                visitor = CryptoVisitor(p, lines)
                visitor.visit(tree)
                findings.extend(visitor.findings)
            except Exception as e:
                errors.append({"file": str(p), "error_message": str(e)})

        return ScanResult(findings=findings, errors=errors)
