"""
ExplanationProvider abstraction for ECDAT.

Two implementations:
- DeterministicExplanationProvider — template-based, always available
- LocalLLMExplanationProvider     — Qwen3-4B via local llama.cpp endpoint,
                                    consumes EvidenceContextEngine output

The LLM never makes decisions. It only explains supplied, provenance-tagged context.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)


class ExplanationProvider:
    """Base class for evidence explanation providers."""

    def explain_finding(self, verification: Dict[str, Any]) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def explain_path(self, context: Dict[str, Any], question: Optional[str] = None) -> Dict[str, Any]:
        """Explain a crypto path given assembled context from EvidenceContextEngine.
        
        Default implementation returns a structured deterministic summary.
        """
        return self._deterministic_path_summary(context)

    def _deterministic_path_summary(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build a deterministic path explanation from context."""
        path = context.get("path") or {}
        finding = context.get("finding") or {}
        analysis = context.get("analysis") or {}
        actions = context.get("actions") or []
        unknowns = context.get("unknowns") or []

        path_name = path.get("path_id_name", "Unknown path")
        algorithm = finding.get("algorithm", "Unknown")
        role = finding.get("role", "Unknown")

        action_summaries = []
        for a in actions:
            action_summaries.append({
                "action": a.get("action_type", "UNKNOWN"),
                "why": a.get("why", ""),
            })

        return {
            "path_name": path_name,
            "summary": (
                f"Path '{path_name}' uses {algorithm} for {role}. "
                f"Evidence state: {analysis.get('evidence_state', 'UNKNOWN')}. "
                f"Runway: {analysis.get('runway_state', 'UNKNOWN')}."
            ),
            "actions": action_summaries,
            "unknowns": [u.get("detail", "") for u in unknowns],
            "source": "deterministic",
        }


class DeterministicExplanationProvider(ExplanationProvider):
    """Template-based explanation — no AI, always available."""

    def explain_finding(self, verification: Dict[str, Any]) -> List[Dict[str, Any]]:
        explained_evidence = []
        finding = verification["finding"]
        for ev in verification.get("evidence", []):
            ev_type = ev.get("evidence_type", "unknown")

            if ev_type == "static_code":
                what_proves = (
                    f"A {finding.get('role', 'cryptographic')} operation using {finding.get('algorithm', 'an algorithm')} "
                    f"exists at this source location."
                )
                what_not_proves = "Static evidence alone does not prove this code path is executed at runtime."
            elif ev_type == "configuration":
                what_proves = (
                    f"A configuration declaration explicitly names {finding.get('algorithm', 'an algorithm')} "
                    f"as the expected algorithm for this service."
                )
                what_not_proves = "Configuration evidence does not confirm the running binary uses this configuration."
            elif ev_type == "certificate":
                what_proves = (
                    f"A TLS/X.509 certificate using {finding.get('algorithm', 'an algorithm')} "
                    f"was found at this file path."
                )
                what_not_proves = "Certificate presence does not confirm active use in serving traffic."
            else:
                what_proves = "This evidence record was collected during the scan."
                what_not_proves = "Further context is required to assess significance."

            runtime_note = "NOT OBSERVED at runtime."
            for rv in (verification.get("runtime") or []):
                rv_locator = rv.get("source_locator") or ""
                ev_file = ev.get("file") or ""

                reachability = verification.get("reachability")
                reach_entrypoint = None
                if isinstance(reachability, dict):
                    reach_entrypoint = reachability.get("entrypoint")

                if ev_file in rv_locator or rv.get("entrypoint") == reach_entrypoint:
                    runtime_note = f"OBSERVED during controlled {rv.get('entrypoint', 'execution')} execution."
                    break

            explained_evidence.append({
                **ev,
                "what_is_this": f"{'Static code evidence' if ev_type == 'static_code' else 'Configuration evidence' if ev_type == 'configuration' else 'Certificate evidence'}: {finding.get('algorithm', '')} {finding.get('role', '')}",
                "where": ev.get("file"),
                "how_detected": ev.get("detector", ""),
                "what_proves": what_proves,
                "what_not_proves": what_not_proves,
                "runtime_note": runtime_note,
            })
        return explained_evidence


class LocalLLMExplanationProvider(ExplanationProvider):
    """Explanation provider that uses a local Qwen3 model via llama.cpp.
    
    Consumes EvidenceContextEngine output for rich, provenance-aware explanations.
    Falls back to DeterministicExplanationProvider when the model is unavailable.
    """

    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or os.environ.get("LLM_ENDPOINT", "http://localhost:8080/v1")
        self.fallback = DeterministicExplanationProvider()
        self._model_available: Optional[bool] = None

    def _check_model(self) -> bool:
        """Check if the local or remote LLM is available."""
        groq_key = os.environ.get("QROQ") or os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_KEY") or os.environ.get("GROQ") or os.environ.get("XAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if groq_key and groq_key.strip():
            self._model_available = True
            return True

        from services.api.runtime_manager import get_runtime_selector
        status = get_runtime_selector().get_runtime_status()
        self._model_available = status["available"]
        return self._model_available

    def _call_llm(self, system_prompt: str, user_prompt: str, timeout: float = 30.0) -> Optional[str]:
        """Make a single LLM call and return the content string."""
        groq_key = os.environ.get("QROQ") or os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_KEY") or os.environ.get("GROQ") or os.environ.get("XAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if groq_key:
            endpoint = "https://api.groq.com/openai/v1"
            primary_model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
            candidate_models = [primary_model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
            candidate_models = list(dict.fromkeys([m.strip() for m in candidate_models if m and m.strip()]))
            headers = {"Authorization": f"Bearer {groq_key.strip()}", "Content-Type": "application/json"}
        else:
            endpoint = self.endpoint
            candidate_models = ["qwen"]
            headers = {}

        for candidate in candidate_models:
            try:
                with httpx.Client(timeout=timeout) as client:
                    resp = client.post(
                        f"{endpoint}/chat/completions",
                        headers=headers,
                        json={
                            "model": candidate,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt},
                            ],
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"},
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
                    logger.warning(f"Explanations candidate {candidate} returned status {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                logger.error(f"LLM call to {candidate} failed: {e}")
        return None


    # ─── Finding-level explanation (AI-1 contract) ────────────────────────

    def explain_finding(self, verification: Dict[str, Any]) -> List[Dict[str, Any]]:
        if os.environ.get("USE_LOCAL_LLM", "true").lower() == "false":
            return self.fallback.explain_finding(verification)

        if not self._check_model():
            return self.fallback.explain_finding(verification)

        explained_evidence = []
        finding = verification["finding"]

        for ev in verification.get("evidence", []):
            try:
                system_prompt = (
                    "You are an expert cryptographic analyst. "
                    "Explain what the given evidence proves and does not prove. "
                    "Do not make decisions. Return ONLY valid JSON."
                )

                user_prompt = json.dumps({
                    "task": "explain_evidence",
                    "algorithm": finding.get("algorithm", "unknown"),
                    "role": finding.get("role", "unknown"),
                    "evidence_type": ev.get("evidence_type", "unknown"),
                    "file": ev.get("file", "unknown"),
                    "snippet": ev.get("snippet", ""),
                    "output_schema": {
                        "what_is_this": "short title",
                        "what_proves": "1-2 sentences",
                        "what_not_proves": "1-2 sentences",
                        "runtime_note": "observation status",
                    }
                })

                content = self._call_llm(system_prompt, user_prompt, timeout=15.0)
                if content:
                    parsed = json.loads(content)
                    explained_evidence.append({
                        **ev,
                        "what_is_this": parsed.get("what_is_this", ""),
                        "where": ev.get("file"),
                        "how_detected": ev.get("detector", ""),
                        "what_proves": parsed.get("what_proves", ""),
                        "what_not_proves": parsed.get("what_not_proves", ""),
                        "runtime_note": parsed.get("runtime_note", ""),
                    })
                    continue
            except Exception as e:
                logger.error(f"LLM explanation failed for evidence {ev.get('id')}: {e}")

            # Per-evidence fallback
            det = self.fallback.explain_finding({
                "finding": finding, "evidence": [ev],
                "runtime": verification.get("runtime"),
                "reachability": verification.get("reachability"),
            })
            if det:
                explained_evidence.append(det[0])

        return explained_evidence

    # ─── Path-level explanation (AI-2: context-aware) ─────────────────────

    def explain_path(self, context: Dict[str, Any], question: Optional[str] = None) -> Dict[str, Any]:
        """Generate a rich, context-aware explanation for a crypto path.
        
        Uses the full EvidenceContextEngine output to produce grounded explanations.
        """
        if os.environ.get("USE_LOCAL_LLM", "true").lower() == "false":
            return self._deterministic_path_summary(context)

        if not self._check_model():
            return self._deterministic_path_summary(context)

        # Build a bounded prompt from context
        prompt_context = self._build_llm_context(context)

        system_prompt = (
            "You are a cryptographic security analyst embedded in the ECDAT investigation system. "
            "You explain cryptographic evidence to security engineers. "
            "RULES:\n"
            "- Only reference facts from the provided ECDAT evidence\n"
            "- Clearly distinguish VERIFIED evidence from UNKNOWN gaps\n"
            "- Never invent relationships or evidence\n"
            "- Never override ECDAT analysis decisions\n"
            "- Enterprise documents are policy context, NOT runtime evidence\n"
            "- Keep explanations concise and actionable\n"
            "Return ONLY valid JSON."
        )

        user_prompt = json.dumps({
            "task": "explain_crypto_path",
            "question": question or "Explain this cryptographic path and its security posture.",
            "context": prompt_context,
            "output_schema": {
                "path_name": "string",
                "summary": "2-4 sentence overview",
                "evidence_assessment": "what the evidence proves",
                "gaps": ["list of unknowns"],
                "actions": [{"action": "type", "why": "reason"}],
                "enterprise_context": "relevant policy context or null",
                "source": "local_llm",
            }
        })

        content = self._call_llm(system_prompt, user_prompt, timeout=30.0)
        if content:
            try:
                parsed = json.loads(content)
                parsed["source"] = "local_llm"
                return parsed
            except json.JSONDecodeError:
                logger.error("LLM returned invalid JSON for path explanation")

        return self._deterministic_path_summary(context)

    def _build_llm_context(self, context: Dict[str, Any]) -> dict:
        """Build a bounded context payload for the LLM prompt.
        
        Strips internal metadata and limits sizes to stay within token budget.
        """
        def _clean(item):
            """Remove internal provenance tags for the LLM prompt."""
            if isinstance(item, dict):
                return {k: v for k, v in item.items() if not k.startswith("_")}
            return item

        path = _clean(context.get("path") or {})
        finding = _clean(context.get("finding") or {})
        analysis = _clean(context.get("analysis") or {})

        # Bounded evidence (max 5 items)
        evidence = [_clean(e) for e in (context.get("evidence") or [])[:5]]

        # Bounded runtime (max 3 items)
        runtime = [_clean(r) for r in (context.get("runtime") or [])[:3]]

        # Single items
        data = _clean(context.get("data") or {})
        key = _clean(context.get("key") or {})
        migration = _clean(context.get("migration") or {})
        reachability = _clean(context.get("reachability") or {})

        # Actions (max 5)
        actions = [_clean(a) for a in (context.get("actions") or [])[:5]]

        # Relationships (max 5)
        relationships = [_clean(r) for r in (context.get("relationships") or [])[:5]]

        # Source excerpts (max 3, truncated)
        source_excerpts = []
        for exc in (context.get("source_excerpts") or [])[:3]:
            cleaned = _clean(exc)
            if cleaned.get("excerpt") and len(cleaned["excerpt"]) > 500:
                cleaned["excerpt"] = cleaned["excerpt"][:500] + "..."
            source_excerpts.append(cleaned)

        # Enterprise docs (max 2, truncated)
        enterprise = []
        for doc in (context.get("enterprise_documents") or [])[:2]:
            cleaned = _clean(doc)
            if cleaned.get("text") and len(cleaned["text"]) > 500:
                cleaned["text"] = cleaned["text"][:500] + "..."
            enterprise.append(cleaned)

        # Unknowns
        unknowns = [_clean(u) for u in (context.get("unknowns") or [])]

        return {
            "path": path,
            "finding": finding,
            "evidence": evidence,
            "runtime": runtime,
            "reachability": reachability,
            "data": data,
            "key": key,
            "migration": migration,
            "analysis": analysis,
            "actions": actions,
            "relationships": relationships,
            "source_excerpts": source_excerpts,
            "enterprise_documents": enterprise,
            "unknowns": unknowns,
        }


def get_explanation_provider() -> ExplanationProvider:
    """Factory: returns LocalLLM provider (with fallback) or pure deterministic."""
    if os.environ.get("USE_LOCAL_LLM", "true").lower() == "true":
        return LocalLLMExplanationProvider()
    return DeterministicExplanationProvider()
