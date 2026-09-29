import sys
import os
import datetime
import importlib
import traceback
import linecache
from pathlib import Path
from typing import List, Optional, Dict, Any
from unittest.mock import patch, MagicMock

class RuntimeEvent:
    def __init__(
        self,
        algorithm: str,
        role: str,
        entrypoint: str,
        file: str,
        line: int,
        operation: str = "unknown",
        snippet: str = ""
    ):
        self.algorithm = algorithm
        self.role = role
        self.entrypoint = entrypoint
        self.source_file = file.replace("\\", "/") if file else ""
        self.source_line = line
        self.operation = operation
        self.snippet = snippet
        self.started_at = datetime.datetime.now(datetime.timezone.utc)
        self.completed_at = self.started_at
        self.execution_status = "OBSERVED"
        self.error_message = None
        self.crypto_asset_id = None
        self.crypto_path_id = None
        self.project_id = None
        self.scan_id = None


class MockRequest:
    def __init__(self, path: str, body: bytes = b"runtime_test_payload"):
        self.path = path
        self.body = body


class RuntimeHarness:
    def __init__(self, target_dir: str):
        self.target_dir = os.path.abspath(target_dir)
        self.events: List[RuntimeEvent] = []
        self.current_entrypoint: Optional[str] = None
        self._orig_funcs: Dict[str, Any] = {}
        self._mock_boto_patcher = None

    def _extract_caller(self) -> tuple[Optional[str], Optional[int], str]:
        """
        Dynamically walk up the Python call stack to find the exact caller
        within self.target_dir, without hardcoding any file paths or line numbers.
        """
        frame = sys._getframe(2)
        while frame:
            fname = frame.f_code.co_filename
            abs_fname = os.path.abspath(fname)
            if abs_fname.lower().startswith(self.target_dir.lower()):
                rel_file = os.path.relpath(abs_fname, self.target_dir).replace("\\", "/")
                line_no = frame.f_lineno
                snippet = linecache.getline(abs_fname, line_no).strip()
                return rel_file, line_no, snippet
            frame = frame.f_back
        return None, None, ""

    def setup_instrumentation(self):
        """
        Instrument standard cryptographic libraries transparently.
        When invoked, real crypto calls execute and dynamically record the caller's file,
        line number, and actual code snippet.
        """
        # 1. Instrument RSA
        try:
            import cryptography.hazmat.primitives.asymmetric.rsa as rsa_mod
            if "rsa_generate" not in self._orig_funcs:
                self._orig_funcs["rsa_generate"] = rsa_mod.generate_private_key
            orig_rsa = self._orig_funcs["rsa_generate"]

            def wrapped_rsa_gen(*args, **kwargs):
                rf, ln, sn = self._extract_caller()
                if rf:
                    self.events.append(RuntimeEvent(
                        algorithm="RSA",
                        role="key_wrapping",
                        entrypoint=self.current_entrypoint or "/archive",
                        file=rf,
                        line=ln or 0,
                        operation="generate_private_key",
                        snippet=sn
                    ))
                return orig_rsa(*args, **kwargs)

            rsa_mod.generate_private_key = wrapped_rsa_gen
        except Exception:
            pass

        # 2. Instrument EC
        try:
            import cryptography.hazmat.primitives.asymmetric.ec as ec_mod
            if "ec_generate" not in self._orig_funcs:
                self._orig_funcs["ec_generate"] = ec_mod.generate_private_key
            orig_ec = self._orig_funcs["ec_generate"]

            def wrapped_ec_gen(*args, **kwargs):
                rf, ln, sn = self._extract_caller()
                if rf:
                    self.events.append(RuntimeEvent(
                        algorithm="EC",
                        role="signing",
                        entrypoint=self.current_entrypoint or "/partner",
                        file=rf,
                        line=ln or 0,
                        operation="generate_private_key",
                        snippet=sn
                    ))
                return orig_ec(*args, **kwargs)

            ec_mod.generate_private_key = wrapped_ec_gen
        except Exception:
            pass

        # 3. Instrument AESGCM
        try:
            import cryptography.hazmat.primitives.ciphers.aead as aead_mod
            if "aesgcm" not in self._orig_funcs:
                self._orig_funcs["aesgcm"] = aead_mod.AESGCM
            orig_aes = self._orig_funcs["aesgcm"]

            harness_ref = self
            class WrappedAESGCM:
                def __init__(self, key):
                    self._inner = orig_aes(key)

                def encrypt(self, *args, **kwargs):
                    rf, ln, sn = harness_ref._extract_caller()
                    if rf:
                        harness_ref.events.append(RuntimeEvent(
                            algorithm="AES",
                            role="encryption",
                            entrypoint=harness_ref.current_entrypoint or "/export",
                            file=rf,
                            line=ln or 0,
                            operation="encrypt",
                            snippet=sn
                        ))
                    return self._inner.encrypt(*args, **kwargs)

                def decrypt(self, *args, **kwargs):
                    return self._inner.decrypt(*args, **kwargs)

                @classmethod
                def generate_key(cls, bit_length):
                    return orig_aes.generate_key(bit_length)

            aead_mod.AESGCM = WrappedAESGCM
        except Exception:
            pass

        # 4. Instrument hashlib (MD5 & SHA-256)
        try:
            import hashlib
            if "hashlib_md5" not in self._orig_funcs:
                self._orig_funcs["hashlib_md5"] = hashlib.md5
            orig_md5 = self._orig_funcs["hashlib_md5"]

            def wrapped_md5(*args, **kwargs):
                rf, ln, sn = self._extract_caller()
                if rf:
                    self.events.append(RuntimeEvent(
                        algorithm="MD5",
                        role="hashing",
                        entrypoint=self.current_entrypoint or "/legacy",
                        file=rf,
                        line=ln or 0,
                        operation="md5",
                        snippet=sn
                    ))
                return orig_md5(*args, **kwargs)

            hashlib.md5 = wrapped_md5
        except Exception:
            pass

        # 5. Mock boto3 (AWS KMS) safely if boto3 is imported
        try:
            if "boto3" not in sys.modules:
                mock_boto = MagicMock()
                sys.modules["boto3"] = mock_boto

            import boto3
            self._mock_boto_patcher = patch("boto3.client")
            mock_client = self._mock_boto_patcher.start()
            mock_kms = MagicMock()

            def kms_generate_data_key(*args, **kwargs):
                rf, ln, sn = self._extract_caller()
                if rf:
                    self.events.append(RuntimeEvent(
                        algorithm="AWS KMS",
                        role="provider",
                        entrypoint=self.current_entrypoint or "/archive",
                        file=rf,
                        line=ln or 0,
                        operation="generate_data_key",
                        snippet=sn or "boto3.client('kms').generate_data_key(...)"
                    ))
                return {"CiphertextBlob": b"wrapped_key", "Plaintext": b"raw_key"}

            mock_kms.generate_data_key.side_effect = kms_generate_data_key
            mock_client.return_value = mock_kms
        except Exception:
            pass

    def teardown_instrumentation(self):
        """Restore all original library functions and stop mocks."""
        try:
            if "rsa_generate" in self._orig_funcs:
                import cryptography.hazmat.primitives.asymmetric.rsa as rsa_mod
                rsa_mod.generate_private_key = self._orig_funcs["rsa_generate"]

            if "ec_generate" in self._orig_funcs:
                import cryptography.hazmat.primitives.asymmetric.ec as ec_mod
                ec_mod.generate_private_key = self._orig_funcs["ec_generate"]

            if "aesgcm" in self._orig_funcs:
                import cryptography.hazmat.primitives.ciphers.aead as aead_mod
                aead_mod.AESGCM = self._orig_funcs["aesgcm"]

            if "hashlib_md5" in self._orig_funcs:
                import hashlib
                hashlib.md5 = self._orig_funcs["hashlib_md5"]

            if self._mock_boto_patcher:
                self._mock_boto_patcher.stop()
        except Exception:
            pass

    def discover_scenarios(self) -> List[Dict[str, Any]]:
        """
        Dynamically discover services and modules in target_dir that can be executed.
        """
        p_target = Path(self.target_dir)
        scenarios = []

        for py_file in p_target.rglob("*.py"):
            if "test" in py_file.name.lower() or "__pycache__" in py_file.as_posix():
                continue

            rel = py_file.relative_to(p_target).as_posix()
            parts = rel.split("/")
            svc_name = parts[0].replace("-service", "") if len(parts) > 1 else py_file.stem
            entrypoint = f"/{svc_name}"

            scenarios.append({
                "name": svc_name,
                "file": py_file,
                "rel_path": rel,
                "dir": py_file.parent,
                "module_name": py_file.stem,
                "entrypoint": entrypoint
            })

        return scenarios

    def run_scenarios(self, scenario_names: Optional[List[str]] = None) -> List[RuntimeEvent]:
        """
        Executes discovered or specified scenarios with dynamic instrumentation active.
        Captures real events, file paths, line numbers, and code snippets.
        """
        sys.path.insert(0, self.target_dir)
        self.setup_instrumentation()

        all_scenarios = self.discover_scenarios()
        if scenario_names:
            active_scenarios = [s for s in all_scenarios if s["name"] in scenario_names or any(sc in s["rel_path"] for sc in scenario_names)]
        else:
            active_scenarios = all_scenarios

        try:
            for sc in active_scenarios:
                self.current_entrypoint = sc["entrypoint"]
                sc_dir = str(sc["dir"])
                if sc_dir not in sys.path:
                    sys.path.insert(0, sc_dir)

                try:
                    mod = importlib.import_module(sc["module_name"])
                    # Check for standard entrypoints
                    if hasattr(mod, "handle_request"):
                        req = MockRequest(sc["entrypoint"])
                        mod.handle_request(req)
                    elif hasattr(mod, "archive_data"):
                        mod.archive_data("patient_record_data")
                    elif hasattr(mod, "sign_payload"):
                        mod.sign_payload(b"runtime_sign_test")
                    elif hasattr(mod, "export_data"):
                        mod.export_data()
                    elif hasattr(mod, "hash_legacy"):
                        mod.hash_legacy(b"legacy_record_data")
                    elif hasattr(mod, "main"):
                        mod.main()
                except Exception as e:
                    # Log and continue remaining scenarios
                    print(f"Runtime execution of scenario {sc['name']} notice: {e}")
                finally:
                    self.current_entrypoint = None
                    if sc_dir in sys.path:
                        sys.path.remove(sc_dir)
        finally:
            self.teardown_instrumentation()
            if self.target_dir in sys.path:
                sys.path.remove(self.target_dir)

        return self.events

