"""
EvidenceContextEngine — Assembles bounded, provenance-tagged context
for the LocalLLMExplanationProvider.

Architecture:
  1. STRUCTURED ECDAT EVIDENCE — direct DB queries for the selected path
  2. GRAPH TRAVERSAL — relationship walking via crypto_paths join tables
  3. SOURCE CONTEXT — file/callsite lookup from evidence records
  4. ENTERPRISE KNOWLEDGE — optional document store (pluggable)

Every retrieved item retains a provenance tag:
  ECDAT_EVIDENCE | ECDAT_GRAPH | SOURCE_CODE | ENTERPRISE_DOCUMENT | UNKNOWN
"""

import os
import hashlib
import logging
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Protocol
from pathlib import Path

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Provenance tags
# ─────────────────────────────────────────────────────────────────────────────

class Provenance:
    ECDAT_EVIDENCE = "ECDAT_EVIDENCE"
    ECDAT_GRAPH = "ECDAT_GRAPH"
    SOURCE_CODE = "SOURCE_CODE"
    ENTERPRISE_DOCUMENT = "ENTERPRISE_DOCUMENT"
    UNKNOWN = "UNKNOWN"


def _tag(item: dict, provenance: str, source_table: str = "") -> dict:
    """Attach provenance metadata to a context item."""
    return {
        **item,
        "_provenance": provenance,
        "_source": source_table,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Document Store — pluggable interface
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EnterpriseDocument:
    """Metadata + text for an ingested enterprise document."""
    doc_id: str
    title: str
    source: str          # e.g. "upload", "url", "sharepoint"
    doc_type: str        # e.g. "crypto_policy", "migration_standard"
    version: str = ""
    content_hash: str = ""
    ingested_at: float = 0.0
    text: str = ""       # extracted plaintext

    def to_dict(self) -> dict:
        return asdict(self)


class EnterpriseDocumentStore(Protocol):
    """Interface for enterprise document retrieval.
    
    First version uses keyword search.
    Designed so embeddings/reranking can be added later
    without changing the context engine.
    """
    def search(self, query: str, max_results: int = 5) -> List[EnterpriseDocument]:
        ...

    def get_by_id(self, doc_id: str) -> Optional[EnterpriseDocument]:
        ...

    def ingest(self, title: str, source: str, doc_type: str,
               text: str, version: str = "") -> EnterpriseDocument:
        ...


class FileSystemDocumentStore:
    """Simple filesystem-backed enterprise document store.
    
    Stores documents as .txt files in a configurable directory.
    Uses keyword matching for retrieval.
    Designed to be replaced by a vector store if needed later.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or os.environ.get(
            "ENTERPRISE_DOCS_DIR", "enterprise_docs"
        ))
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._index_file = self.base_dir / "_index.json"
        self._index: List[dict] = []
        self._load_index()

    def _load_index(self):
        import json
        if self._index_file.exists():
            try:
                self._index = json.loads(self._index_file.read_text(encoding="utf-8"))
            except Exception:
                self._index = []

    def _save_index(self):
        import json
        self._index_file.write_text(
            json.dumps(self._index, indent=2),
            encoding="utf-8"
        )

    def ingest(self, title: str, source: str, doc_type: str,
               text: str, version: str = "") -> EnterpriseDocument:
        content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        doc_id = f"{doc_type}_{content_hash}"
        
        doc = EnterpriseDocument(
            doc_id=doc_id,
            title=title,
            source=source,
            doc_type=doc_type,
            version=version,
            content_hash=content_hash,
            ingested_at=time.time(),
            text=text,
        )

        # Write text file
        (self.base_dir / f"{doc_id}.txt").write_text(text, encoding="utf-8")

        # Update index
        self._index = [d for d in self._index if d["doc_id"] != doc_id]
        self._index.append(doc.to_dict())
        self._save_index()

        return doc

    def search(self, query: str, max_results: int = 5) -> List[EnterpriseDocument]:
        """Keyword search across ingested documents."""
        query_lower = query.lower()
        query_terms = query_lower.split()
        
        scored: List[tuple] = []
        for meta in self._index:
            doc_text = ""
            doc_path = self.base_dir / f"{meta['doc_id']}.txt"
            if doc_path.exists():
                try:
                    doc_text = doc_path.read_text(encoding="utf-8").lower()
                except Exception:
                    continue
            
            # Simple term-frequency scoring
            score = sum(doc_text.count(term) for term in query_terms)
            # Boost title matches
            title_lower = meta.get("title", "").lower()
            score += sum(10 for term in query_terms if term in title_lower)
            
            if score > 0:
                doc = EnterpriseDocument(**{k: meta.get(k, "") for k in EnterpriseDocument.__dataclass_fields__})
                doc.text = doc_path.read_text(encoding="utf-8") if doc_path.exists() else ""
                scored.append((score, doc))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:max_results]]

    def get_by_id(self, doc_id: str) -> Optional[EnterpriseDocument]:
        for meta in self._index:
            if meta["doc_id"] == doc_id:
                doc = EnterpriseDocument(**{k: meta.get(k, "") for k in EnterpriseDocument.__dataclass_fields__})
                doc_path = self.base_dir / f"{doc_id}.txt"
                doc.text = doc_path.read_text(encoding="utf-8") if doc_path.exists() else ""
                return doc
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Source Code Retriever — deterministic file/callsite lookup
# ─────────────────────────────────────────────────────────────────────────────

class SourceCodeRetriever:
    """Retrieves source excerpts from the scanned repository.
    
    Uses evidence file paths to locate exact callsites.
    Returns bounded excerpts with provenance.
    """

    def __init__(self, repo_root: Optional[str] = None):
        self.repo_root = Path(repo_root) if repo_root else None

    def get_excerpt(self, file_path: str, line: Optional[int] = None,
                    context_lines: int = 5) -> Optional[dict]:
        """Return a bounded source excerpt with provenance."""
        if not self.repo_root or not file_path:
            return None
        
        full_path = self.repo_root / file_path
        if not full_path.exists() or not full_path.is_file():
            return None
        
        try:
            content = full_path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()
            
            if line and line > 0:
                start = max(0, line - context_lines - 1)
                end = min(len(lines), line + context_lines)
                excerpt_lines = lines[start:end]
                excerpt = "\n".join(excerpt_lines)
            else:
                # No specific line — return first 20 lines
                excerpt = "\n".join(lines[:20])
                start = 0
                end = min(len(lines), 20)
            
            return _tag({
                "file": file_path,
                "line": line,
                "start_line": start + 1,
                "end_line": end,
                "excerpt": excerpt,
                "total_lines": len(lines),
            }, Provenance.SOURCE_CODE, f"file:{file_path}")
        except Exception as e:
            logger.warning(f"Failed to read source file {file_path}: {e}")
            return None

    def search_symbol(self, symbol: str, file_paths: Optional[List[str]] = None) -> List[dict]:
        """Search for a symbol across evidence files."""
        if not self.repo_root:
            return []
        
        results = []
        search_paths = []
        
        if file_paths:
            search_paths = [self.repo_root / fp for fp in file_paths]
        else:
            # Only search Python/config files to keep it bounded
            for ext in ("*.py", "*.java", "*.go", "*.yaml", "*.yml", "*.json", "*.xml", "*.conf"):
                search_paths.extend(self.repo_root.rglob(ext))
        
        for fp in search_paths[:100]:  # Bounded to 100 files max
            if not fp.exists() or not fp.is_file():
                continue
            try:
                content = fp.read_text(encoding="utf-8", errors="replace")
                if symbol.lower() in content.lower():
                    lines = content.splitlines()
                    for i, line_text in enumerate(lines):
                        if symbol.lower() in line_text.lower():
                            rel_path = str(fp.relative_to(self.repo_root))
                            results.append(_tag({
                                "file": rel_path,
                                "line": i + 1,
                                "content": line_text.strip(),
                            }, Provenance.SOURCE_CODE, f"file:{rel_path}"))
                            if len(results) >= 10:  # Bounded
                                return results
            except Exception:
                continue
        
        return results


# ─────────────────────────────────────────────────────────────────────────────
# Context Cache — avoid rebuilding for multiple questions on same path
# ─────────────────────────────────────────────────────────────────────────────

class ContextCache:
    """Simple in-memory LRU cache for assembled path contexts."""

    def __init__(self, max_entries: int = 32):
        self._cache: Dict[str, tuple] = {}  # key -> (timestamp, context)
        self._max = max_entries

    def get(self, key: str) -> Optional[dict]:
        entry = self._cache.get(key)
        if entry:
            return entry[1]
        return None

    def put(self, key: str, context: dict):
        if len(self._cache) >= self._max:
            # Evict oldest
            oldest_key = min(self._cache, key=lambda k: self._cache[k][0])
            del self._cache[oldest_key]
        self._cache[key] = (time.time(), context)

    def invalidate(self, key: Optional[str] = None):
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()


# ─────────────────────────────────────────────────────────────────────────────
# EvidenceContextEngine — the main assembler
# ─────────────────────────────────────────────────────────────────────────────

class EvidenceContextEngine:
    """
    Assembles bounded, provenance-tagged context for LLM explanations.
    
    Responsibilities:
    - Accept a selected crypto_path_id and optional user question
    - Determine relevant context sources
    - Retrieve only necessary information
    - Produce a bounded structured context package
    - Preserve provenance for every item
    
    The LLM receives this context — it never gets unrestricted DB access.
    """

    def __init__(
        self,
        db_client=None,
        source_retriever: Optional[SourceCodeRetriever] = None,
        enterprise_store: Optional[EnterpriseDocumentStore] = None,
        cache: Optional[ContextCache] = None,
    ):
        if db_client is None:
            from services.api.db import supabase
            db_client = supabase
        self.db = db_client
        self.source = source_retriever or SourceCodeRetriever()
        self.enterprise = enterprise_store
        self.cache = cache or ContextCache()

    # ─── Public API ──────────────────────────────────────────────────────

    def assemble_path_context(
        self,
        crypto_path_id: str,
        scan_id: str,
        question: Optional[str] = None,
        use_cache: bool = True,
    ) -> dict:
        """
        Assemble full context for a selected crypto path.
        
        Returns a structured context package with clear provenance separation:
        - VERIFIED ECDAT EVIDENCE
        - SOURCE CODE CONTEXT
        - ENTERPRISE KNOWLEDGE
        - UNKNOWN / MISSING
        """
        cache_key = f"{crypto_path_id}:{scan_id}"
        if use_cache:
            cached = self.cache.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for path {crypto_path_id}")
                # Enterprise docs are question-dependent, re-query them
                if question and self.enterprise:
                    cached["enterprise_documents"] = self._get_enterprise_context(question)
                return cached

        # 1. Fetch the path itself
        path = self._fetch_path(crypto_path_id)
        if not path:
            return self._empty_context(crypto_path_id, scan_id, "Path not found")

        # 2. Fetch the crypto asset (finding)
        finding = self._fetch_finding(path.get("crypto_asset_id"))

        # 3. Fetch all ECDAT evidence for this path
        evidence = self._fetch_evidence(path, scan_id)

        # 4. Fetch runtime events scoped to this path
        runtime = self._fetch_runtime(path, scan_id)

        # 5. Fetch data asset (path-scoped)
        data = self._fetch_data_asset(path.get("data_asset_id"))

        # 6. Fetch key context (path-scoped)
        key = self._fetch_key_context(path.get("key_context_id"))

        # 7. Fetch migration context
        migration = self._fetch_migration_context(path.get("crypto_asset_id"))

        # 8. Fetch analysis result for this path
        analysis, actions = self._fetch_analysis(scan_id, path.get("crypto_asset_id"), crypto_path_id)

        # 9. Fetch reachability
        reachability = self._fetch_reachability(path.get("crypto_asset_id"))

        # 10. Graph traversal — connected relationships
        relationships = self._traverse_relationships(path, scan_id)

        # 11. Source code excerpts from evidence locations
        source_excerpts = self._get_source_excerpts(evidence, finding)

        # 12. Enterprise documents (question-dependent)
        enterprise_docs = []
        if question and self.enterprise:
            enterprise_docs = self._get_enterprise_context(question)

        # 13. Identify unknowns
        unknowns = self._identify_unknowns(
            path, finding, evidence, runtime, data, key, migration, analysis, reachability
        )

        context = {
            "path": _tag(path, Provenance.ECDAT_EVIDENCE, "crypto_paths"),
            "finding": _tag(finding, Provenance.ECDAT_EVIDENCE, "crypto_assets") if finding else None,
            "evidence": evidence,
            "runtime": runtime,
            "reachability": _tag(reachability, Provenance.ECDAT_EVIDENCE, "reachability_results") if reachability else None,
            "data": _tag(data, Provenance.ECDAT_EVIDENCE, "data_assets") if data else None,
            "key": _tag(key, Provenance.ECDAT_EVIDENCE, "key_contexts") if key else None,
            "migration": _tag(migration, Provenance.ECDAT_EVIDENCE, "migration_contexts") if migration else None,
            "analysis": _tag(analysis, Provenance.ECDAT_EVIDENCE, "analysis_results") if analysis else None,
            "actions": actions,
            "relationships": relationships,
            "source_excerpts": source_excerpts,
            "enterprise_documents": enterprise_docs,
            "unknowns": unknowns,
            "_meta": {
                "crypto_path_id": crypto_path_id,
                "scan_id": scan_id,
                "question": question,
            }
        }

        if use_cache:
            self.cache.put(cache_key, context)

        return context

    def assemble_entity_context(
        self,
        entity_type: str,
        entity_id: str,
        scan_id: str,
        question: Optional[str] = None,
        use_cache: bool = True,
    ) -> dict:
        """
        Assemble bounded, provenance-tagged context for a specific entity type
        (FINDING, PATH, DATA_ASSET, KEY_CONTEXT, CONTROL, READINESS, EVIDENCE, CBOM).
        """
        entity_type_upper = (entity_type or "PATH").upper()

        if entity_type_upper in ("PATH", "CRYPTO_PATH") and entity_id != "GENERAL":
            return self.assemble_path_context(entity_id, scan_id, question, use_cache)

        cache_key = f"entity:{entity_type_upper}:{entity_id}:{scan_id}"
        if use_cache:
            cached = self.cache.get(cache_key)
            if cached:
                if question and self.enterprise:
                    cached["enterprise_documents"] = self._get_enterprise_context(question)
                return cached

        # Case 1: FINDING (crypto_asset)
        if entity_type_upper == "FINDING":
            finding = self._fetch_finding(entity_id)
            if not finding:
                return self._empty_context(entity_id, scan_id, "Finding not found")
            
            # Find a linked crypto path if one exists
            paths_res = self.db.table("crypto_paths").select("*").eq("crypto_asset_id", entity_id).execute()
            linked_paths = paths_res.data or []
            first_path_id = linked_paths[0]["id"] if linked_paths else None
            
            if first_path_id:
                base_ctx = self.assemble_path_context(first_path_id, scan_id, question, use_cache=False)
                base_ctx["_meta"]["entity_type"] = "FINDING"
                base_ctx["_meta"]["entity_id"] = entity_id
                return base_ctx

            evidence = self._fetch_evidence({"crypto_asset_id": entity_id}, scan_id)
            runtime = self._fetch_runtime({"crypto_asset_id": entity_id}, scan_id)
            reachability = self._fetch_reachability(entity_id)
            migration = self._fetch_migration_context(entity_id)
            analysis, actions = self._fetch_analysis(scan_id, entity_id, "")
            source_excerpts = self._get_source_excerpts(evidence, finding)
            unknowns = self._identify_unknowns(
                {}, finding, evidence, runtime, None, None, migration, analysis, reachability
            )

            context = {
                "path": None,
                "finding": _tag(finding, Provenance.ECDAT_EVIDENCE, "crypto_assets"),
                "evidence": evidence,
                "runtime": runtime,
                "reachability": _tag(reachability, Provenance.ECDAT_EVIDENCE, "reachability_results") if reachability else None,
                "data": None,
                "key": None,
                "migration": _tag(migration, Provenance.ECDAT_EVIDENCE, "migration_contexts") if migration else None,
                "analysis": _tag(analysis, Provenance.ECDAT_EVIDENCE, "analysis_results") if analysis else None,
                "actions": actions,
                "relationships": [],
                "source_excerpts": source_excerpts,
                "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
                "unknowns": unknowns,
                "_meta": {
                    "entity_type": "FINDING",
                    "entity_id": entity_id,
                    "scan_id": scan_id,
                    "question": question,
                }
            }
            if use_cache: self.cache.put(cache_key, context)
            return context

        # Case 2: DATA_ASSET
        if entity_type_upper == "DATA_ASSET":
            data = self._fetch_data_asset(entity_id)
            paths_res = self.db.table("crypto_paths").select("*").eq("data_asset_id", entity_id).execute()
            linked_paths = paths_res.data or []
            
            unknowns = []
            if not data:
                unknowns.append(_tag({"category": "data_asset", "detail": "Data asset record not found"}, Provenance.UNKNOWN))
            if not linked_paths:
                unknowns.append(_tag({"category": "crypto_paths", "detail": "No crypto paths currently protect this data asset"}, Provenance.UNKNOWN))

            context = {
                "path": None,
                "finding": None,
                "evidence": [],
                "runtime": [],
                "reachability": None,
                "data": _tag(data, Provenance.ECDAT_EVIDENCE, "data_assets") if data else None,
                "key": None,
                "migration": None,
                "analysis": None,
                "actions": [],
                "relationships": [_tag(p, Provenance.ECDAT_GRAPH, "crypto_paths") for p in linked_paths],
                "source_excerpts": [],
                "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
                "unknowns": unknowns,
                "_meta": {
                    "entity_type": "DATA_ASSET",
                    "entity_id": entity_id,
                    "scan_id": scan_id,
                    "question": question,
                }
            }
            if use_cache: self.cache.put(cache_key, context)
            return context

        # Case 3: KEY_CONTEXT
        if entity_type_upper in ("KEY", "KEY_CONTEXT"):
            key = self._fetch_key_context(entity_id)
            paths_res = self.db.table("crypto_paths").select("*").eq("key_context_id", entity_id).execute()
            linked_paths = paths_res.data or []
            
            unknowns = []
            if not key:
                unknowns.append(_tag({"category": "key_context", "detail": "Key context record not found"}, Provenance.UNKNOWN))
            unknowns.append(_tag({"category": "access_control", "detail": "IAM / key access permissions are NOT verified by ECDAT"}, Provenance.UNKNOWN))

            context = {
                "path": None,
                "finding": None,
                "evidence": [],
                "runtime": [],
                "reachability": None,
                "data": None,
                "key": _tag(key, Provenance.ECDAT_EVIDENCE, "key_contexts") if key else None,
                "migration": None,
                "analysis": None,
                "actions": [],
                "relationships": [_tag(p, Provenance.ECDAT_GRAPH, "crypto_paths") for p in linked_paths],
                "source_excerpts": [],
                "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
                "unknowns": unknowns,
                "_meta": {
                    "entity_type": "KEY_CONTEXT",
                    "entity_id": entity_id,
                    "scan_id": scan_id,
                    "question": question,
                }
            }
            if use_cache: self.cache.put(cache_key, context)
            return context

        # Case 4: CONTROL
        if entity_type_upper == "CONTROL":
            ctrl_res = self.db.table("controls").select("*").eq("id", entity_id).execute()
            control = ctrl_res.data[0] if ctrl_res.data else None
            finding = self._fetch_finding(control.get("crypto_asset_id")) if control else None
            evidence = self._fetch_evidence({"crypto_asset_id": control.get("crypto_asset_id")}, scan_id) if control else []

            context = {
                "path": None,
                "finding": _tag(finding, Provenance.ECDAT_EVIDENCE, "crypto_assets") if finding else None,
                "evidence": evidence,
                "runtime": [],
                "reachability": None,
                "data": None,
                "key": None,
                "migration": None,
                "analysis": None,
                "actions": [],
                "relationships": [_tag(control, Provenance.ECDAT_EVIDENCE, "controls")] if control else [],
                "source_excerpts": [],
                "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
                "unknowns": [],
                "_meta": {
                    "entity_type": "CONTROL",
                    "entity_id": entity_id,
                    "scan_id": scan_id,
                    "question": question,
                }
            }
            if use_cache: self.cache.put(cache_key, context)
            return context

        # Case 5: CBOM (Cryptographic Bill of Materials Inventory)
        if entity_type_upper == "CBOM":
            assets_res = self.db.table("crypto_assets").select("*").eq("scan_id", scan_id).execute()
            certs_res = self.db.table("certificates").select("*").eq("scan_id", scan_id).execute()
            keys_res = self.db.table("key_contexts").select("*").eq("scan_id", scan_id).execute()
            scans_res = self.db.table("scan_runs").select("*").eq("id", scan_id).execute()

            assets = assets_res.data or []
            certs = certs_res.data or []
            keys = keys_res.data or []
            scan = scans_res.data[0] if scans_res.data else {}

            cbom_data = {
                "scan_id": scan_id,
                "commit_sha": scan.get("commit_sha"),
                "files_scanned": scan.get("files_scanned", 0),
                "total_crypto_assets": len(assets),
                "total_certificates": len(certs),
                "total_keys": len(keys),
                "crypto_assets": [_tag(a, Provenance.ECDAT_EVIDENCE, "crypto_assets") for a in assets],
                "certificates": [_tag(c, Provenance.ECDAT_EVIDENCE, "certificates") for c in certs],
                "key_metadata": [_tag(k, Provenance.ECDAT_EVIDENCE, "key_contexts") for k in keys],
            }

            context = {
                "path": None,
                "finding": None,
                "evidence": [],
                "runtime": [],
                "reachability": None,
                "data": None,
                "key": None,
                "migration": None,
                "analysis": None,
                "actions": [],
                "relationships": [],
                "source_excerpts": [],
                "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
                "unknowns": [],
                "cbom": cbom_data,
                "_meta": {
                    "entity_type": "CBOM",
                    "entity_id": scan_id,
                    "scan_id": scan_id,
                    "question": question,
                }
            }
            if use_cache: self.cache.put(cache_key, context)
            return context

        # Default / Fallback for READINESS, EVIDENCE, GENERAL
        finding = self._fetch_finding(entity_id) if entity_id and entity_id != "GENERAL" else None
        context = {
            "path": None,
            "finding": _tag(finding, Provenance.ECDAT_EVIDENCE, "crypto_assets") if finding else None,
            "evidence": [],
            "runtime": [],
            "reachability": None,
            "data": None,
            "key": None,
            "migration": None,
            "analysis": None,
            "actions": [],
            "relationships": [],
            "source_excerpts": [],
            "enterprise_documents": self._get_enterprise_context(question) if question and self.enterprise else [],
            "unknowns": [],
            "_meta": {
                "entity_type": entity_type_upper,
                "entity_id": entity_id,
                "scan_id": scan_id,
                "question": question,
            }
        }
        if use_cache: self.cache.put(cache_key, context)
        return context

    # ─── Private: ECDAT Evidence Retrieval ────────────────────────────────

    def _fetch_path(self, crypto_path_id: str) -> Optional[dict]:
        res = self.db.table("crypto_paths").select("*").eq("id", crypto_path_id).execute()
        return res.data[0] if res.data else None

    def _fetch_finding(self, asset_id: Optional[str]) -> Optional[dict]:
        if not asset_id:
            return None
        res = self.db.table("crypto_assets").select("*").eq("id", asset_id).execute()
        return res.data[0] if res.data else None

    def _fetch_evidence(self, path: dict, scan_id: str) -> List[dict]:
        asset_id = path.get("crypto_asset_id")
        if not asset_id:
            return []
        res = self.db.table("evidence").select("*").eq("asset_id", asset_id).execute()
        return [_tag(e, Provenance.ECDAT_EVIDENCE, "evidence") for e in (res.data or [])]

    def _fetch_runtime(self, path: dict, scan_id: str) -> List[dict]:
        path_id = path.get("id")
        asset_id = path.get("crypto_asset_id")
        
        # Prefer path-scoped runtime events
        if path_id:
            res = self.db.table("runtime_events").select("*")\
                .eq("scan_id", scan_id).eq("crypto_path_id", path_id).execute()
            if res.data:
                return [_tag(r, Provenance.ECDAT_EVIDENCE, "runtime_events") for r in res.data]
        
        # Fall back to asset+entrypoint match
        if asset_id:
            res = self.db.table("runtime_events").select("*")\
                .eq("scan_id", scan_id).eq("asset_id", asset_id).execute()
            entrypoint = path.get("entrypoint")
            events = res.data or []
            if entrypoint:
                events = [e for e in events if not e.get("entrypoint") or e["entrypoint"] == entrypoint]
            return [_tag(r, Provenance.ECDAT_EVIDENCE, "runtime_events") for r in events]
        
        return []

    def _fetch_data_asset(self, data_asset_id: Optional[str]) -> Optional[dict]:
        if not data_asset_id:
            return None
        res = self.db.table("data_assets").select("*").eq("id", data_asset_id).execute()
        return res.data[0] if res.data else None

    def _fetch_key_context(self, key_context_id: Optional[str]) -> Optional[dict]:
        if not key_context_id:
            return None
        res = self.db.table("key_contexts").select("*").eq("id", key_context_id).execute()
        return res.data[0] if res.data else None

    def _fetch_migration_context(self, asset_id: Optional[str]) -> Optional[dict]:
        if not asset_id:
            return None
        res = self.db.table("migration_contexts").select("*").eq("crypto_asset_id", asset_id).execute()
        return res.data[0] if res.data else None

    def _fetch_reachability(self, asset_id: Optional[str]) -> Optional[dict]:
        if not asset_id:
            return None
        res = self.db.table("reachability_results").select("*").eq("asset_id", asset_id).execute()
        return res.data[0] if res.data else None

    def _fetch_analysis(self, scan_id: str, asset_id: Optional[str], 
                        crypto_path_id: str) -> tuple:
        """Fetch the analysis result and action candidates for this path."""
        if not asset_id:
            return None, []
        
        # Get latest analysis run for this scan
        ar_res = self.db.table("analysis_runs").select("id")\
            .eq("scan_id", scan_id).order("created_at", desc=True).limit(1).execute()
        if not ar_res.data:
            return None, []
        
        run_id = ar_res.data[0]["id"]
        
        # Prefer path-scoped result
        res = self.db.table("analysis_results").select("*")\
            .eq("analysis_run_id", run_id).eq("crypto_path_id", crypto_path_id).execute()
        
        if not res.data:
            # Fall back to finding-level result
            res = self.db.table("analysis_results").select("*")\
                .eq("analysis_run_id", run_id).eq("finding_id", asset_id).execute()
        
        if not res.data:
            return None, []
        
        analysis = res.data[0]
        
        # Fetch action candidates
        cands_res = self.db.table("action_candidates").select("*")\
            .eq("analysis_result_id", analysis["id"]).execute()
        actions = [_tag(c, Provenance.ECDAT_EVIDENCE, "action_candidates") for c in (cands_res.data or [])]
        
        return analysis, actions

    # ─── Private: Graph Traversal ─────────────────────────────────────────

    def _traverse_relationships(self, path: dict, scan_id: str) -> List[dict]:
        """Walk the crypto dependency graph from this path.
        
        Returns only directly connected entities — no recursive unbounded walk.
        """
        relationships = []
        asset_id = path.get("crypto_asset_id")
        
        if not asset_id:
            return relationships
        
        # 1. Other paths sharing the same crypto asset
        sibling_paths = self.db.table("crypto_paths").select("id, path_id_name, entrypoint, data_asset_id, key_context_id")\
            .eq("scan_id", scan_id).eq("crypto_asset_id", asset_id)\
            .neq("id", path["id"]).execute()
        for sp in (sibling_paths.data or []):
            relationships.append(_tag({
                "type": "SHARES_CRYPTO_ASSET",
                "target_type": "crypto_path",
                "target_id": sp["id"],
                "target_name": sp.get("path_id_name", ""),
                "entrypoint": sp.get("entrypoint"),
            }, Provenance.ECDAT_GRAPH, "crypto_paths"))
        
        # 2. Other paths sharing the same key
        key_id = path.get("key_context_id")
        if key_id:
            key_siblings = self.db.table("crypto_paths").select("id, path_id_name, entrypoint, crypto_asset_id")\
                .eq("scan_id", scan_id).eq("key_context_id", key_id)\
                .neq("id", path["id"]).execute()
            for ks in (key_siblings.data or []):
                relationships.append(_tag({
                    "type": "SHARES_KEY",
                    "target_type": "crypto_path",
                    "target_id": ks["id"],
                    "target_name": ks.get("path_id_name", ""),
                    "entrypoint": ks.get("entrypoint"),
                    "shared_key_id": key_id,
                }, Provenance.ECDAT_GRAPH, "crypto_paths"))
        
        # 3. Other paths sharing the same data asset
        data_id = path.get("data_asset_id")
        if data_id:
            data_siblings = self.db.table("crypto_paths").select("id, path_id_name, entrypoint, crypto_asset_id")\
                .eq("scan_id", scan_id).eq("data_asset_id", data_id)\
                .neq("id", path["id"]).execute()
            for ds in (data_siblings.data or []):
                relationships.append(_tag({
                    "type": "PROTECTS_SAME_DATA",
                    "target_type": "crypto_path",
                    "target_id": ds["id"],
                    "target_name": ds.get("path_id_name", ""),
                    "entrypoint": ds.get("entrypoint"),
                    "shared_data_id": data_id,
                }, Provenance.ECDAT_GRAPH, "crypto_paths"))

        # 4. Controls on this asset
        ctrls = self.db.table("controls").select("*").eq("crypto_asset_id", asset_id).execute()
        for ctrl in (ctrls.data or []):
            relationships.append(_tag({
                "type": "HAS_CONTROL",
                "target_type": "control",
                "target_id": ctrl["id"],
                "control_name": ctrl.get("control_name"),
                "control_state": ctrl.get("control_state"),
            }, Provenance.ECDAT_GRAPH, "controls"))

        # 5. Certificates on this asset
        certs = self.db.table("certificates").select("*").eq("crypto_asset_id", asset_id).execute()
        for cert in (certs.data or []):
            relationships.append(_tag({
                "type": "HAS_CERTIFICATE",
                "target_type": "certificate",
                "target_id": cert["id"],
                "subject": cert.get("subject"),
                "issuer": cert.get("issuer"),
                "not_after": cert.get("not_after"),
            }, Provenance.ECDAT_GRAPH, "certificates"))
        
        return relationships

    # ─── Private: Source Code ─────────────────────────────────────────────

    def _get_source_excerpts(self, evidence: List[dict], finding: Optional[dict]) -> List[dict]:
        """Extract source excerpts from evidence file locations."""
        excerpts = []
        seen_files = set()
        
        for ev in evidence:
            file_path = ev.get("file")
            line = ev.get("line")
            if not file_path or file_path in seen_files:
                continue
            seen_files.add(file_path)
            
            excerpt = self.source.get_excerpt(file_path, line)
            if excerpt:
                excerpts.append(excerpt)
        
        # Also try the finding's source_file if not already covered
        if finding and finding.get("source_file"):
            sf = finding["source_file"]
            if sf not in seen_files:
                excerpt = self.source.get_excerpt(sf, finding.get("line_start"))
                if excerpt:
                    excerpts.append(excerpt)
        
        return excerpts

    # ─── Private: Enterprise Documents ────────────────────────────────────

    def _get_enterprise_context(self, question: str) -> List[dict]:
        """Retrieve relevant enterprise documents for the question."""
        if not self.enterprise:
            return []
        
        try:
            docs = self.enterprise.search(question, max_results=3)
            return [
                _tag({
                    "doc_id": doc.doc_id,
                    "title": doc.title,
                    "doc_type": doc.doc_type,
                    "source": doc.source,
                    "version": doc.version,
                    "text": doc.text[:2000],  # Bounded excerpt
                }, Provenance.ENTERPRISE_DOCUMENT, f"enterprise:{doc.doc_id}")
                for doc in docs
            ]
        except Exception as e:
            logger.warning(f"Enterprise document search failed: {e}")
            return []

    # ─── Private: Unknown Identification ──────────────────────────────────

    def _identify_unknowns(self, path, finding, evidence, runtime, data, key,
                           migration, analysis, reachability) -> List[dict]:
        """Identify what is missing or unknown in the assembled context."""
        unknowns = []
        
        if not finding:
            unknowns.append(_tag({
                "category": "finding",
                "detail": "No crypto asset linked to this path",
            }, Provenance.UNKNOWN))
        
        if not evidence:
            unknowns.append(_tag({
                "category": "evidence",
                "detail": "No evidence records found for this path's crypto asset",
            }, Provenance.UNKNOWN))
        
        if not runtime:
            unknowns.append(_tag({
                "category": "runtime",
                "detail": "No runtime observations for this path — runtime behavior is unknown",
            }, Provenance.UNKNOWN))
        
        if not reachability:
            unknowns.append(_tag({
                "category": "reachability",
                "detail": "No reachability analysis performed for this asset",
            }, Provenance.UNKNOWN))
        elif reachability.get("status") == "UNKNOWN":
            unknowns.append(_tag({
                "category": "reachability",
                "detail": "Reachability status is UNKNOWN — cannot determine if code executes",
            }, Provenance.UNKNOWN))
        
        if not data:
            unknowns.append(_tag({
                "category": "data_asset",
                "detail": "No data asset linked — cannot assess data protection requirements",
            }, Provenance.UNKNOWN))
        
        if not key and finding and finding.get("role") not in ("hashing", "checksum"):
            unknowns.append(_tag({
                "category": "key_context",
                "detail": "No key context linked — key scope and concentration unknown",
            }, Provenance.UNKNOWN))
        
        if not migration:
            unknowns.append(_tag({
                "category": "migration",
                "detail": "No migration context — effort estimation unavailable",
            }, Provenance.UNKNOWN))
        
        if not analysis:
            unknowns.append(_tag({
                "category": "analysis",
                "detail": "No analysis result — recommendations not yet computed",
            }, Provenance.UNKNOWN))
        
        return unknowns

    # ─── Utility ──────────────────────────────────────────────────────────

    def _empty_context(self, crypto_path_id: str, scan_id: str, reason: str) -> dict:
        return {
            "path": None,
            "finding": None,
            "evidence": [],
            "runtime": [],
            "reachability": None,
            "data": None,
            "key": None,
            "migration": None,
            "analysis": None,
            "actions": [],
            "relationships": [],
            "source_excerpts": [],
            "enterprise_documents": [],
            "unknowns": [_tag({"category": "path", "detail": reason}, Provenance.UNKNOWN)],
            "_meta": {
                "crypto_path_id": crypto_path_id,
                "scan_id": scan_id,
                "question": None,
            }
        }


# ─────────────────────────────────────────────────────────────────────────────
# Module-level factory
# ─────────────────────────────────────────────────────────────────────────────

_engine_instance: Optional[EvidenceContextEngine] = None

def get_context_engine() -> EvidenceContextEngine:
    """Get or create the singleton context engine."""
    global _engine_instance
    if _engine_instance is None:
        # Auto-detect repo root from environment
        repo_root = os.environ.get("SCAN_REPO_ROOT")
        source_retriever = SourceCodeRetriever(repo_root) if repo_root else SourceCodeRetriever()
        
        # Enterprise doc store — only if configured
        enterprise_store = None
        enterprise_dir = os.environ.get("ENTERPRISE_DOCS_DIR")
        if enterprise_dir:
            enterprise_store = FileSystemDocumentStore(enterprise_dir)
        
        _engine_instance = EvidenceContextEngine(
            source_retriever=source_retriever,
            enterprise_store=enterprise_store,
        )
    return _engine_instance
