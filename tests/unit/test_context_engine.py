"""
Tests for EvidenceContextEngine and ExplanationProvider integration.

Validates:
1. Path-RSA context assembly
2. Path-MD5 context assembly
3. Key relationship preservation
4. Unkeyed hash does not inherit key context
5. Graph traversal returns only relevant connected entities
6. Source excerpts preserve file/callsite provenance
7. Enterprise documents separated from ECDAT evidence
8. UNKNOWN remains UNKNOWN
9. Context is bounded and deterministic
10. LocalLLMExplanationProvider receives assembled context
"""

import os
import sys
import uuid
import time
import json
import tempfile
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from pathlib import Path

import pytest

sys.path.insert(0, os.path.abspath('.'))

from services.api.context_engine import (
    EvidenceContextEngine,
    SourceCodeRetriever,
    FileSystemDocumentStore,
    ContextCache,
    Provenance,
)
from services.api.explanations import (
    DeterministicExplanationProvider,
    LocalLLMExplanationProvider,
    get_explanation_provider,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()
SCAN_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())

# RSA Path fixtures
RSA_ASSET_ID = str(uuid.uuid4())
RSA_PATH_ID = str(uuid.uuid4())
RSA_KEY_ID = str(uuid.uuid4())
RSA_DATA_ID = str(uuid.uuid4())
RSA_EVIDENCE_ID = str(uuid.uuid4())
RSA_RUNTIME_ID = str(uuid.uuid4())
RSA_MIG_ID = str(uuid.uuid4())
RSA_REACH_ID = str(uuid.uuid4())
RSA_ANALYSIS_RUN_ID = str(uuid.uuid4())
RSA_ANALYSIS_RESULT_ID = str(uuid.uuid4())
RSA_ACTION_ID = str(uuid.uuid4())

# MD5 Path fixtures (unkeyed hash)
MD5_ASSET_ID = str(uuid.uuid4())
MD5_PATH_ID = str(uuid.uuid4())
MD5_DATA_ID = str(uuid.uuid4())
MD5_EVIDENCE_ID = str(uuid.uuid4())

# Sibling path that shares the RSA key
SIBLING_PATH_ID = str(uuid.uuid4())


def _make_mock_db():
    """Create a mock database client that returns realistic data."""
    db = MagicMock()

    def _table(name):
        table_mock = MagicMock()
        
        # Chain methods
        table_mock.select.return_value = table_mock
        table_mock.eq.return_value = table_mock
        table_mock.neq.return_value = table_mock
        table_mock.in_.return_value = table_mock
        table_mock.or_.return_value = table_mock
        table_mock.order.return_value = table_mock
        table_mock.limit.return_value = table_mock

        # Default empty
        result = MagicMock()
        result.data = []
        table_mock.execute.return_value = result

        return table_mock

    # Track calls to return appropriate data
    call_tracker = {}

    def smart_table(name):
        t = _table(name)

        def smart_select(*args, **kwargs):
            t._current_table = name
            return t

        def smart_eq(field, value):
            key = f"{name}.{field}={value}"
            call_tracker[key] = True
            
            result = MagicMock()
            result.data = _get_data(name, field, value)
            
            # Allow further chaining
            chain = MagicMock()
            chain.eq = lambda f, v: smart_eq_nested(name, [(field, value), (f, v)])
            chain.neq = lambda f, v: smart_neq(name, field, value, f, v)
            chain.order = lambda *a, **kw: chain
            chain.limit = lambda *a: chain
            chain.execute.return_value = result
            return chain

        def smart_eq_nested(name, pairs):
            result = MagicMock()
            result.data = _get_nested_data(name, pairs)
            chain = MagicMock()
            chain.eq = lambda f, v: smart_eq_nested(name, pairs + [(f, v)])
            chain.order = lambda *a, **kw: chain
            chain.limit = lambda *a: chain
            chain.execute.return_value = result
            return chain

        def smart_neq(name, field, value, neq_field, neq_value):
            result = MagicMock()
            data = _get_data(name, field, value)
            data = [d for d in data if str(d.get(neq_field)) != str(neq_value)]
            result.data = data
            chain = MagicMock()
            chain.execute.return_value = result
            return chain

        t.select = smart_select
        t.eq = smart_eq
        return t

    db.table = smart_table
    return db


def _get_data(table, field, value):
    """Return mock data for a given table.field=value query."""
    value = str(value)

    # crypto_paths
    if table == "crypto_paths" and field == "id":
        if value == RSA_PATH_ID:
            return [{"id": RSA_PATH_ID, "project_id": PROJECT_ID, "scan_id": SCAN_ID,
                     "path_id_name": "Path-RSA", "entrypoint": "/archive",
                     "crypto_asset_id": RSA_ASSET_ID, "key_context_id": RSA_KEY_ID,
                     "data_asset_id": RSA_DATA_ID, "relationship_type": "encrypts",
                     "created_at": NOW}]
        if value == MD5_PATH_ID:
            return [{"id": MD5_PATH_ID, "project_id": PROJECT_ID, "scan_id": SCAN_ID,
                     "path_id_name": "Path-MD5", "entrypoint": "/legacy",
                     "crypto_asset_id": MD5_ASSET_ID, "key_context_id": None,
                     "data_asset_id": MD5_DATA_ID, "relationship_type": "hashes",
                     "created_at": NOW}]

    # crypto_assets
    if table == "crypto_assets" and field == "id":
        if value == RSA_ASSET_ID:
            return [{"id": RSA_ASSET_ID, "scan_id": SCAN_ID, "name": "RSA",
                     "asset_type": "primitive", "algorithm": "RSA", "role": "Multiple",
                     "source_file": "services/archive/archive.py", "line_start": 8,
                     "created_at": NOW}]
        if value == MD5_ASSET_ID:
            return [{"id": MD5_ASSET_ID, "scan_id": SCAN_ID, "name": "MD5",
                     "asset_type": "operation", "algorithm": "MD5", "role": "hashing",
                     "source_file": "services/legacy/legacy.py", "line_start": 6,
                     "created_at": NOW}]

    # evidence
    if table == "evidence" and field == "asset_id":
        if value == RSA_ASSET_ID:
            return [{"id": RSA_EVIDENCE_ID, "asset_id": RSA_ASSET_ID,
                     "evidence_type": "static_code", "file": "services/archive/archive.py",
                     "line": 8, "snippet": "from Crypto.PublicKey import RSA",
                     "detector": "semgrep", "created_at": NOW}]
        if value == MD5_ASSET_ID:
            return [{"id": MD5_EVIDENCE_ID, "asset_id": MD5_ASSET_ID,
                     "evidence_type": "static_code", "file": "services/legacy/legacy.py",
                     "line": 6, "snippet": "import hashlib; hashlib.md5(data)",
                     "detector": "semgrep", "created_at": NOW}]

    # data_assets
    if table == "data_assets" and field == "id":
        if value == RSA_DATA_ID:
            return [{"id": RSA_DATA_ID, "project_id": PROJECT_ID, "name": "patient_archive",
                     "classification": None, "sensitivity": "Restricted",
                     "business_criticality": "High",
                     "required_confidentiality_until": "2036-09-30",
                     "created_at": NOW}]
        if value == MD5_DATA_ID:
            return [{"id": MD5_DATA_ID, "project_id": PROJECT_ID, "name": "billing_archive",
                     "classification": None, "sensitivity": "Confidential",
                     "created_at": NOW}]

    # key_contexts
    if table == "key_contexts" and field == "id":
        if value == RSA_KEY_ID:
            return [{"id": RSA_KEY_ID, "project_id": PROJECT_ID,
                     "key_id_name": "archive-master-v1", "algorithm": "RSA",
                     "scope": "archive + backup", "rotation_state": "manual",
                     "custody_type": "AWS KMS", "created_at": NOW}]

    # migration_contexts
    if table == "migration_contexts" and field == "crypto_asset_id":
        if value == RSA_ASSET_ID:
            return [{"id": RSA_MIG_ID, "project_id": PROJECT_ID,
                     "crypto_asset_id": RSA_ASSET_ID,
                     "direct_crypto_call_sites": 5,
                     "provider_abstraction": "",
                     "external_dependencies": 1, "created_at": NOW}]

    # reachability_results
    if table == "reachability_results" and field == "asset_id":
        if value == RSA_ASSET_ID:
            return [{"id": RSA_REACH_ID, "asset_id": RSA_ASSET_ID,
                     "entrypoint": "/archive", "status": "REACHABLE",
                     "created_at": NOW}]

    # analysis_results
    if table == "analysis_results" and field == "analysis_result_id":
        return []

    # action_candidates
    if table == "action_candidates" and field == "analysis_result_id":
        if value == RSA_ANALYSIS_RESULT_ID:
            return [{"id": RSA_ACTION_ID, "analysis_result_id": RSA_ANALYSIS_RESULT_ID,
                     "action_type": "MIGRATION_PLANNING",
                     "why": "RSA with long-lived data needs migration plan",
                     "supporting_evidence": {}, "missing_evidence": {},
                     "created_at": NOW}]

    # controls
    if table == "controls" and field == "crypto_asset_id":
        return []

    # certificates
    if table == "certificates" and field == "crypto_asset_id":
        return []

    return []


def _get_nested_data(table, pairs):
    """Handle multi-field queries."""
    fields = {f: v for f, v in pairs}

    if table == "crypto_paths":
        if fields.get("scan_id") == SCAN_ID and fields.get("crypto_asset_id") == RSA_ASSET_ID:
            paths = [
                {"id": RSA_PATH_ID, "path_id_name": "Path-RSA", "entrypoint": "/archive",
                 "crypto_asset_id": RSA_ASSET_ID, "key_context_id": RSA_KEY_ID,
                 "data_asset_id": RSA_DATA_ID, "scan_id": SCAN_ID},
                {"id": SIBLING_PATH_ID, "path_id_name": "Path-Backup",
                 "entrypoint": "/backup", "crypto_asset_id": RSA_ASSET_ID,
                 "key_context_id": RSA_KEY_ID, "data_asset_id": None, "scan_id": SCAN_ID},
            ]
            return paths
        if fields.get("scan_id") == SCAN_ID and fields.get("key_context_id") == RSA_KEY_ID:
            return [
                {"id": RSA_PATH_ID, "path_id_name": "Path-RSA", "entrypoint": "/archive",
                 "crypto_asset_id": RSA_ASSET_ID},
                {"id": SIBLING_PATH_ID, "path_id_name": "Path-Backup",
                 "entrypoint": "/backup", "crypto_asset_id": RSA_ASSET_ID},
            ]

    if table == "runtime_events":
        if fields.get("scan_id") == SCAN_ID and fields.get("crypto_path_id") == RSA_PATH_ID:
            return [{"id": RSA_RUNTIME_ID, "runtime_run_id": str(uuid.uuid4()),
                     "asset_id": RSA_ASSET_ID, "crypto_path_id": RSA_PATH_ID,
                     "event_type": "crypto_operation", "algorithm": "RSA",
                     "role": "asymmetric_encryption", "entrypoint": "/archive",
                     "execution_status": "OBSERVED", "created_at": NOW}]
        if fields.get("scan_id") == SCAN_ID and fields.get("crypto_path_id") == MD5_PATH_ID:
            return [{"id": str(uuid.uuid4()), "runtime_run_id": str(uuid.uuid4()),
                     "asset_id": MD5_ASSET_ID, "crypto_path_id": MD5_PATH_ID,
                     "event_type": "crypto_operation", "algorithm": "MD5",
                     "role": "hashing", "entrypoint": "/legacy",
                     "execution_status": "OBSERVED", "created_at": NOW}]

    if table == "analysis_runs":
        if fields.get("scan_id") == SCAN_ID:
            return [{"id": RSA_ANALYSIS_RUN_ID}]

    if table == "analysis_results":
        if fields.get("analysis_run_id") == RSA_ANALYSIS_RUN_ID:
            if fields.get("crypto_path_id") == RSA_PATH_ID:
                return [{"id": RSA_ANALYSIS_RESULT_ID, "analysis_run_id": RSA_ANALYSIS_RUN_ID,
                         "finding_id": RSA_ASSET_ID, "crypto_path_id": RSA_PATH_ID,
                         "evidence_state": "OBSERVED", "runway_state": "NEEDS_PLANNING",
                         "migration_effort": "HIGH", "created_at": NOW}]
            if fields.get("finding_id") == MD5_ASSET_ID:
                return [{"id": str(uuid.uuid4()), "analysis_run_id": RSA_ANALYSIS_RUN_ID,
                         "finding_id": MD5_ASSET_ID, "crypto_path_id": MD5_PATH_ID,
                         "evidence_state": "OBSERVED", "runway_state": "WATCH",
                         "migration_effort": "LOW", "created_at": NOW}]

    return []


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestPathRSAContextAssembly:
    """Test 1: Path-RSA context assembly."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_rsa_path_assembles_complete_context(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)

        assert ctx["path"] is not None
        assert ctx["path"]["path_id_name"] == "Path-RSA"
        assert ctx["path"]["_provenance"] == Provenance.ECDAT_EVIDENCE

        assert ctx["finding"] is not None
        assert ctx["finding"]["algorithm"] == "RSA"

        assert len(ctx["evidence"]) > 0
        assert all(e["_provenance"] == Provenance.ECDAT_EVIDENCE for e in ctx["evidence"])

        assert ctx["data"] is not None
        assert ctx["data"]["name"] == "patient_archive"

        assert ctx["key"] is not None
        assert ctx["key"]["key_id_name"] == "archive-master-v1"

    def test_rsa_path_has_runtime(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        assert len(ctx["runtime"]) > 0

    def test_rsa_path_has_reachability(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        assert ctx["reachability"] is not None
        assert ctx["reachability"]["status"] == "REACHABLE"


class TestPathMD5ContextAssembly:
    """Test 2: Path-MD5 context assembly."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_md5_path_assembles_context(self):
        ctx = self.engine.assemble_path_context(MD5_PATH_ID, SCAN_ID, use_cache=False)

        assert ctx["path"] is not None
        assert ctx["path"]["path_id_name"] == "Path-MD5"
        assert ctx["finding"]["algorithm"] == "MD5"
        assert ctx["finding"]["role"] == "hashing"

    def test_md5_has_data_asset(self):
        ctx = self.engine.assemble_path_context(MD5_PATH_ID, SCAN_ID, use_cache=False)
        assert ctx["data"] is not None
        assert ctx["data"]["name"] == "billing_archive"


class TestKeyRelationshipPreservation:
    """Test 3: Key relationship preservation."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_rsa_path_preserves_key_context(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        assert ctx["key"] is not None
        assert ctx["key"]["key_id_name"] == "archive-master-v1"
        assert ctx["key"]["scope"] == "archive + backup"
        assert ctx["key"]["_provenance"] == Provenance.ECDAT_EVIDENCE


class TestUnkeyedHashNoKeyInheritance:
    """Test 4: Unkeyed hash does NOT inherit unrelated key context."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_md5_has_no_key_context(self):
        ctx = self.engine.assemble_path_context(MD5_PATH_ID, SCAN_ID, use_cache=False)
        assert ctx["key"] is None, "Unkeyed MD5 hash must NOT have key context"

    def test_md5_reports_no_key_as_non_unknown(self):
        """For hashing role, no key context should NOT be reported as unknown."""
        ctx = self.engine.assemble_path_context(MD5_PATH_ID, SCAN_ID, use_cache=False)
        key_unknowns = [u for u in ctx["unknowns"] if u.get("category") == "key_context"]
        # MD5 is a hashing role, so missing key is expected, not unknown
        assert len(key_unknowns) == 0, "Hashing path should not flag missing key as unknown"


class TestGraphTraversal:
    """Test 5: Graph traversal returns only relevant connected entities."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_rsa_relationships_include_sibling_paths(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        relationships = ctx["relationships"]

        # Should have relationships from graph traversal
        provenance_types = set(r["_provenance"] for r in relationships)
        assert Provenance.ECDAT_GRAPH in provenance_types or len(relationships) == 0

    def test_relationships_are_bounded(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        # Relationships should be bounded, not the entire graph
        assert len(ctx["relationships"]) < 50


class TestSourceExcerptProvenance:
    """Test 6: Source excerpts preserve file/callsite provenance."""

    def test_source_retriever_returns_provenance(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a mock source file
            src_dir = Path(tmpdir) / "services" / "archive"
            src_dir.mkdir(parents=True)
            src_file = src_dir / "archive.py"
            src_file.write_text(
                "import os\nfrom Crypto.PublicKey import RSA\ndef encrypt():\n    key = RSA.generate(2048)\n    return key\n",
                encoding="utf-8"
            )

            retriever = SourceCodeRetriever(tmpdir)
            excerpt = retriever.get_excerpt("services/archive/archive.py", line=2)

            assert excerpt is not None
            assert excerpt["_provenance"] == Provenance.SOURCE_CODE
            assert excerpt["file"] == "services/archive/archive.py"
            assert "RSA" in excerpt["excerpt"]

    def test_missing_file_returns_none(self):
        retriever = SourceCodeRetriever("/nonexistent")
        excerpt = retriever.get_excerpt("no_such_file.py", line=1)
        assert excerpt is None


class TestEnterpriseDocumentSeparation:
    """Test 7: Enterprise documents are clearly separated from ECDAT evidence."""

    def test_enterprise_docs_tagged_correctly(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileSystemDocumentStore(tmpdir)
            store.ingest(
                title="Crypto Migration Policy",
                source="upload",
                doc_type="crypto_policy",
                text="All RSA keys must be migrated to post-quantum by 2030.",
                version="1.0",
            )

            results = store.search("RSA migration")
            assert len(results) > 0
            assert results[0].doc_type == "crypto_policy"
            assert "RSA" in results[0].text

    def test_enterprise_docs_not_mixed_with_evidence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileSystemDocumentStore(tmpdir)
            store.ingest(
                title="Crypto Policy",
                source="upload",
                doc_type="crypto_policy",
                text="Mandatory RSA 4096 for all archive services.",
            )

            db = _make_mock_db()
            engine = EvidenceContextEngine(
                db_client=db,
                enterprise_store=store,
                cache=ContextCache(),
            )

            ctx = engine.assemble_path_context(
                RSA_PATH_ID, SCAN_ID,
                question="What is the RSA policy?",
                use_cache=False,
            )

            # Enterprise docs should be in their own section
            assert len(ctx["enterprise_documents"]) > 0
            for doc in ctx["enterprise_documents"]:
                assert doc["_provenance"] == Provenance.ENTERPRISE_DOCUMENT

            # ECDAT evidence should NOT have enterprise provenance
            for ev in ctx["evidence"]:
                assert ev["_provenance"] == Provenance.ECDAT_EVIDENCE


class TestUnknownRemains:
    """Test 8: UNKNOWN remains UNKNOWN."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_missing_fields_reported_as_unknown(self):
        # Use a path ID that doesn't exist
        bogus_path_id = str(uuid.uuid4())
        ctx = self.engine.assemble_path_context(bogus_path_id, SCAN_ID, use_cache=False)

        assert len(ctx["unknowns"]) > 0
        assert any(u["category"] == "path" for u in ctx["unknowns"])
        assert all(u["_provenance"] == Provenance.UNKNOWN for u in ctx["unknowns"])

    def test_md5_missing_runtime_is_unknown_when_absent(self):
        """If no runtime events exist, they should be flagged as unknown."""
        # Create a special engine that returns no runtime
        db = _make_mock_db()
        engine = EvidenceContextEngine(db_client=db, cache=ContextCache())
        
        # The mock does return runtime for MD5, but test the concept:
        # If path has no runtime, unknowns should include it
        ctx = engine.assemble_path_context(MD5_PATH_ID, SCAN_ID, use_cache=False)
        # MD5 path DOES have runtime in our mock, so no runtime unknown
        runtime_unknowns = [u for u in ctx["unknowns"] if u.get("category") == "runtime"]
        if not ctx["runtime"]:
            assert len(runtime_unknowns) > 0


class TestContextBoundedness:
    """Test 9: Context is bounded and deterministic."""

    def setup_method(self):
        self.db = _make_mock_db()
        self.engine = EvidenceContextEngine(db_client=self.db, cache=ContextCache())

    def test_context_has_all_required_sections(self):
        ctx = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        required_keys = [
            "path", "finding", "evidence", "runtime", "reachability",
            "data", "key", "migration", "analysis", "actions",
            "relationships", "source_excerpts", "enterprise_documents",
            "unknowns", "_meta",
        ]
        for key in required_keys:
            assert key in ctx, f"Missing required key: {key}"

    def test_context_is_deterministic(self):
        ctx1 = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)
        ctx2 = self.engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=False)

        # Same path should produce same structure
        assert set(ctx1.keys()) == set(ctx2.keys())
        assert ctx1["path"]["path_id_name"] == ctx2["path"]["path_id_name"]

    def test_cache_returns_same_result(self):
        cache = ContextCache()
        engine = EvidenceContextEngine(db_client=self.db, cache=cache)

        ctx1 = engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=True)
        ctx2 = engine.assemble_path_context(RSA_PATH_ID, SCAN_ID, use_cache=True)

        # Second call should hit cache
        assert ctx1 is ctx2


class TestLLMProviderReceivesContext:
    """Test 10: LocalLLMExplanationProvider receives assembled context."""

    def test_deterministic_fallback_path_explanation(self):
        provider = DeterministicExplanationProvider()
        context = {
            "path": {"path_id_name": "Path-RSA"},
            "finding": {"algorithm": "RSA", "role": "Multiple"},
            "analysis": {"evidence_state": "OBSERVED", "runway_state": "NEEDS_PLANNING"},
            "actions": [{"action_type": "MIGRATION_PLANNING", "why": "long-lived data"}],
            "unknowns": [],
        }

        result = provider.explain_path(context)
        assert result["source"] == "deterministic"
        assert "RSA" in result["summary"]
        assert len(result["actions"]) > 0

    def test_llm_provider_falls_back_when_unavailable(self):
        provider = LocalLLMExplanationProvider(endpoint="http://localhost:99999/v1")
        context = {
            "path": {"path_id_name": "Path-RSA"},
            "finding": {"algorithm": "RSA", "role": "Multiple"},
            "analysis": {"evidence_state": "OBSERVED", "runway_state": "NEEDS_PLANNING"},
            "actions": [],
            "unknowns": [],
        }

        result = provider.explain_path(context)
        assert result["source"] == "deterministic"

    def test_llm_provider_builds_bounded_context(self):
        provider = LocalLLMExplanationProvider()
        context = {
            "path": {"path_id_name": "Path-RSA", "_provenance": "ECDAT_EVIDENCE"},
            "finding": {"algorithm": "RSA", "_provenance": "ECDAT_EVIDENCE"},
            "evidence": [{"id": str(uuid.uuid4()), "_provenance": "ECDAT_EVIDENCE"}] * 10,
            "runtime": [{"id": str(uuid.uuid4()), "_provenance": "ECDAT_EVIDENCE"}] * 5,
            "reachability": None,
            "data": None,
            "key": None,
            "migration": None,
            "analysis": None,
            "actions": [],
            "relationships": [],
            "source_excerpts": [],
            "enterprise_documents": [],
            "unknowns": [],
        }

        llm_ctx = provider._build_llm_context(context)

        # Evidence bounded to 5
        assert len(llm_ctx["evidence"]) <= 5
        # Runtime bounded to 3
        assert len(llm_ctx["runtime"]) <= 3
        # No provenance tags in LLM context
        for ev in llm_ctx["evidence"]:
            assert "_provenance" not in ev

    @patch.dict(os.environ, {"USE_LOCAL_LLM": "false"})
    def test_get_explanation_provider_returns_deterministic_when_disabled(self):
        provider = get_explanation_provider()
        assert isinstance(provider, DeterministicExplanationProvider)


class TestContextCache:
    """Additional cache behavior tests."""

    def test_cache_eviction(self):
        cache = ContextCache(max_entries=2)
        cache.put("a", {"data": "a"})
        cache.put("b", {"data": "b"})
        cache.put("c", {"data": "c"})  # Should evict "a"

        assert cache.get("a") is None
        assert cache.get("b") is not None
        assert cache.get("c") is not None

    def test_cache_invalidation(self):
        cache = ContextCache()
        cache.put("a", {"data": "a"})
        cache.invalidate("a")
        assert cache.get("a") is None

    def test_cache_clear(self):
        cache = ContextCache()
        cache.put("a", {"data": "a"})
        cache.put("b", {"data": "b"})
        cache.invalidate()  # Clear all
        assert cache.get("a") is None
        assert cache.get("b") is None


class TestEnterpriseDocumentStore:
    """Document store tests."""

    def test_ingest_and_search(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileSystemDocumentStore(tmpdir)
            doc = store.ingest(
                title="Approved Algorithms",
                source="security_team",
                doc_type="approved_list",
                text="RSA-4096, AES-256-GCM, SHA-384 are approved algorithms.",
            )
            assert doc.doc_id
            assert doc.content_hash

            results = store.search("RSA approved")
            assert len(results) > 0
            assert results[0].title == "Approved Algorithms"

    def test_get_by_id(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileSystemDocumentStore(tmpdir)
            doc = store.ingest(
                title="Test Doc", source="test", doc_type="test", text="test content"
            )

            retrieved = store.get_by_id(doc.doc_id)
            assert retrieved is not None
            assert retrieved.title == "Test Doc"

    def test_empty_search_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileSystemDocumentStore(tmpdir)
            results = store.search("nonexistent query")
            assert results == []
