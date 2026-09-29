import os
from pathlib import Path
from typing import List, Dict, Any
from cryptography import x509
from cryptography.hazmat.backends import default_backend

class CertificateParser:
    def __init__(self, target_dir: str):
        self.target_dir = Path(target_dir).resolve()
        
    def parse_all(self) -> List[Dict[str, Any]]:
        results = []
        for ext in ["*.crt", "*.cer", "*.pem"]:
            for cert_file in self.target_dir.rglob(ext):
                try:
                    cert_data = cert_file.read_bytes()
                    cert = x509.load_pem_x509_certificate(cert_data, default_backend())
                    
                    # Extract attributes safely
                    subject = cert.subject.rfc4514_string() if cert.subject else "Unknown"
                    issuer = cert.issuer.rfc4514_string() if cert.issuer else "Unknown"
                    
                    valid_from = cert.not_valid_before_utc.isoformat() if hasattr(cert, 'not_valid_before_utc') else getattr(cert, 'not_valid_before').isoformat()
                    valid_until = cert.not_valid_after_utc.isoformat() if hasattr(cert, 'not_valid_after_utc') else getattr(cert, 'not_valid_after').isoformat()
                    
                    sig_alg = cert.signature_algorithm_oid._name if hasattr(cert.signature_algorithm_oid, '_name') else "Unknown"
                    
                    pub_key = cert.public_key()
                    from cryptography.hazmat.primitives.asymmetric import rsa, ec
                    
                    pub_key_alg = "Unknown"
                    key_size = 0
                    curve_name = None
                    
                    if isinstance(pub_key, rsa.RSAPublicKey):
                        pub_key_alg = "RSA"
                        key_size = pub_key.key_size
                    elif isinstance(pub_key, ec.EllipticCurvePublicKey):
                        pub_key_alg = "EC"
                        key_size = pub_key.key_size
                        curve_name = pub_key.curve.name
                        
                    # Extract SANs
                    sans = []
                    try:
                        ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                        sans = [alts.value for alts in ext.value]
                    except x509.ExtensionNotFound:
                        pass
                        
                    results.append({
                        "file_path": str(cert_file),
                        "subject": subject,
                        "issuer": issuer,
                        "valid_from": valid_from,
                        "valid_until": valid_until,
                        "signature_algorithm": sig_alg,
                        "public_key_algorithm": pub_key_alg,
                        "key_size": key_size,
                        "curve_name": curve_name,
                        "sans": sans
                    })
                except Exception as e:
                    print(f"Error parsing {cert_file}: {e}")
                    
        return results
