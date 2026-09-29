"""
Conversational Assistant for ECDAT.

Provides a bounded, tool-using loop around the local LLM.
The LLM is an explanation layer, NOT a decision engine.
It uses tools mapped to the EvidenceContextEngine to answer user queries.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

from services.api.context_engine import get_context_engine, Provenance

logger = logging.getLogger(__name__)


class BoundedAssistant:
    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or os.environ.get("LLM_ENDPOINT", "http://localhost:8080/v1")
        self.engine = get_context_engine()
        self.max_loops = 5

    def _call_llm(self, messages: List[Dict[str, str]], tools: List[Dict[str, Any]] = None, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
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
            payload = {
                "model": candidate,
                "messages": messages,
                "temperature": 0.1,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
                
            try:
                with httpx.Client(timeout=timeout) as client:
                    resp = client.post(f"{endpoint}/chat/completions", json=payload, headers=headers)
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]
                    logger.warning(f"Groq candidate model {candidate} returned status {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                logger.error(f"LLM call to {candidate} failed: {e}")
        return None


    def _get_tools_schema(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_crypto_path",
                    "description": "Get the base crypto path details",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_evidence",
                    "description": "Get static and configuration evidence for the path",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_runtime_evidence",
                    "description": "Get runtime observation evidence for the path",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_data_asset",
                    "description": "Get data asset sensitivity and requirements",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_key_context",
                    "description": "Get key metadata, scope, and custody",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_related_paths",
                    "description": "Get related paths (sharing same key, asset, or data)",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_analysis_result",
                    "description": "Get the deterministic analysis result and migration effort",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_action_candidates",
                    "description": "Get the recommended action candidates",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_source_context",
                    "description": "Get source code excerpts around call sites",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_cbom_inventory",
                    "description": "Get the Cryptographic Bill of Materials (CBOM) inventory summary, assets, certs, and keys",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_enterprise_documents",
                    "description": "Search enterprise security guidelines and policy documents",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search term for security policy"}
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

    def _execute_tool(self, name: str, args: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool safely against pre-assembled context."""
        def clean(data):
            if isinstance(data, list):
                return [{k: v for k, v in item.items() if not k.startswith("_")} if isinstance(item, dict) else item for item in data]
            elif isinstance(data, dict):
                return {k: v for k, v in data.items() if not k.startswith("_")}
            return data

        if name == "get_crypto_path":
            return {"path": clean(context.get("path"))}
        elif name == "get_evidence":
            return {"evidence": clean(context.get("evidence", []))}
        elif name == "get_runtime_evidence":
            return {"runtime": clean(context.get("runtime", []))}
        elif name == "get_data_asset":
            return {"data_asset": clean(context.get("data"))}
        elif name == "get_key_context":
            return {"key_context": clean(context.get("key"))}
        elif name == "get_related_paths":
            return {"relationships": clean(context.get("relationships", []))}
        elif name == "get_analysis_result":
            return {"analysis": clean(context.get("analysis")), "reachability": clean(context.get("reachability")), "migration": clean(context.get("migration"))}
        elif name == "get_action_candidates":
            return {"actions": clean(context.get("actions", []))}
        elif name == "get_source_context":
            return {"source_excerpts": clean(context.get("source_excerpts", []))}
        elif name == "get_cbom_inventory":
            return {"cbom": clean(context.get("cbom", {}))}
        elif name == "search_enterprise_documents":
            query = args.get("query", "")
            if not query:
                return {"error": "Query required"}
            docs = self.engine._get_enterprise_context(query)
            return {"enterprise_documents": docs}
        else:
            return {"error": f"Unknown tool: {name}"}

    def chat(self, crypto_path_id: Optional[str], scan_id: str, question: str, mode: str = "TECHNICAL", history: List[Dict[str, str]] = None, profile: str = "LOCAL", entity_type: Optional[str] = None, entity_id: Optional[str] = None) -> Dict[str, Any]:
        """Run the conversational loop with immediate deterministic fallback if offline."""
        from services.api.runtime_manager import get_runtime_selector
        runtime_selector = get_runtime_selector()
        runtime_status = runtime_selector.get_runtime_status(profile)

        # Pre-assemble context based on entity_type or crypto_path_id
        if entity_type and entity_id:
            context = self.engine.assemble_entity_context(entity_type, entity_id, scan_id, question=question, use_cache=True)
        elif crypto_path_id:
            context = self.engine.assemble_path_context(crypto_path_id, scan_id, question=question, use_cache=True)
        else:
            context = self.engine.assemble_entity_context("GENERAL", "GENERAL", scan_id, question=question, use_cache=True)
        
        # Grounded Deterministic Summary
        path_info = context.get("path") or {}
        finding_info = context.get("finding") or {}
        analysis_info = context.get("analysis") or {}
        data_info = context.get("data") or {}
        key_info = context.get("key") or {}
        actions_list = context.get("actions") or []
        unknowns_list = context.get("unknowns") or []
        cbom_info = context.get("cbom") or {}

        path_name = path_info.get("path_id_name") or finding_info.get("name") or data_info.get("name") or key_info.get("key_id_name") or entity_type or "Context"
        algorithm = finding_info.get("algorithm") or path_info.get("algorithm") or "Specified Algorithm"
        role = finding_info.get("role") or path_info.get("role") or "Cryptographic Operation"
        action_names = [a.get("action_type") for a in actions_list if a.get("action_type")]
        unknown_details = [u.get("detail") for u in unknowns_list if u.get("detail")]

        if (entity_type and entity_type.upper() == "CBOM") or cbom_info:
            tot_assets = cbom_info.get("total_crypto_assets", len(cbom_info.get("crypto_assets", [])))
            tot_certs = cbom_info.get("total_certificates", len(cbom_info.get("certificates", [])))
            tot_keys = cbom_info.get("total_keys", len(cbom_info.get("key_metadata", [])))
            deterministic_summary = (
                f"CBOM Inventory: {tot_assets} Cryptographic Assets, "
                f"{tot_certs} X.509 Certificates, {tot_keys} Key Metadata entries discovered in scan {scan_id[:8]}."
            )
        else:
            deterministic_summary = (
                f"Grounded Summary ({path_name}): Uses {algorithm} for {role}. "
                f"Evidence state: {analysis_info.get('evidence_state', 'VERIFIED')}. "
                f"Runway: {analysis_info.get('runway_state', 'GROUNDED')}."
            )

        if not runtime_status["available"]:
            return {
                "answer": deterministic_summary,
                "evidence": [{
                    "source_type": Provenance.ECDAT_EVIDENCE,
                    "reference": "deterministic_analysis",
                    "claim": deterministic_summary
                }],
                "unknowns": unknown_details[:5],
                "related_actions": action_names,
                "enrichment_status": "DETERMINISTIC_IMMEDIATE"
            }

        # Build comprehensive verified facts for system prompt
        context_facts = []
        if cbom_info:
            context_facts.append(f"CBOM Inventory: {cbom_info.get('total_crypto_assets', 0)} Cryptographic Assets, {cbom_info.get('total_certificates', 0)} Certificates, {cbom_info.get('total_keys', 0)} Keys.")
            if cbom_info.get("crypto_assets"):
                assets_str = ", ".join([f"{a.get('name')} ({a.get('algorithm')})" for a in cbom_info["crypto_assets"][:8]])
                context_facts.append(f"Discovered Assets: {assets_str}")
            if cbom_info.get("certificates"):
                certs_str = ", ".join([f"{c.get('subject')} ({c.get('public_key_algorithm', 'RSA')})" for c in cbom_info["certificates"][:5]])
                context_facts.append(f"Certificates: {certs_str}")
            if cbom_info.get("key_metadata"):
                keys_str = ", ".join([f"{k.get('key_id_name')} ({k.get('key_type')})" for k in cbom_info["key_metadata"][:5]])
                context_facts.append(f"Key Metadata: {keys_str}")
        if finding_info:
            context_facts.append(f"Target Logical Asset: {finding_info.get('name', algorithm)} (Algorithm: {algorithm}, Role: {role}, Library: {finding_info.get('library', 'standard')})")
        if context.get("evidence"):
            ev_list = context["evidence"]
            ev_summary = f"{len(ev_list)} static callsite(s): " + ", ".join([f"{e.get('file')}:{e.get('line')}" for e in ev_list[:3]])
            context_facts.append(f"Static AST Evidence: {ev_summary}")
        if context.get("runtime"):
            rt_list = context["runtime"]
            context_facts.append(f"Runtime Telemetry: RUNTIME OBSERVED ({len(rt_list)} events captured)")
        elif entity_type and entity_type.upper() in ("FINDING", "PATH"):
            context_facts.append("Runtime Telemetry: NOT OBSERVED during live workload trace")
        if context.get("reachability"):
            rb = context["reachability"]
            context_facts.append(f"Static Reachability: {rb.get('status')} from entrypoint {rb.get('entrypoint')}")
        if data_info:
            context_facts.append(f"Protected Data Asset: {data_info.get('name')} (Sensitivity: {data_info.get('sensitivity_level', 'RESTRICTED')}, Confidentiality Required Until: {data_info.get('required_confidentiality_until', 'Unknown')})")
        if key_info:
            context_facts.append(f"Cryptographic Key: {key_info.get('key_id_name')} (Type: {key_info.get('key_type')}, Rotation: {key_info.get('rotation_state')})")
        if analysis_info:
            context_facts.append(f"Two-Clock Posture: Runway State={analysis_info.get('runway_state')}, Migration Effort={analysis_info.get('migration_effort')}, Crypto Agility={analysis_info.get('crypto_agility_state')}. Evaluation Basis: {analysis_info.get('runway_basis')}")
        if actions_list:
            context_facts.append(f"Recommended Action Candidates: " + "; ".join([f"{a.get('action_type')}: {a.get('why')}" for a in actions_list[:3]]))
        if unknown_details:
            context_facts.append(f"Verified Evidence Gaps / Unknowns: " + "; ".join(unknown_details[:3]))

        facts_block = "\n".join([f"- {fact}" for fact in context_facts]) if context_facts else "- No specific entity context available"

        system_prompt = f"""You are a cryptographic security assistant explaining ECDAT investigation findings.
Mode: {mode}

GROUND TRUTH FACTS ALREADY VERIFIED BY ECDAT:
{facts_block}

RULES:
- You ONLY explain verified ECDAT evidence and recommendations.
- You CANNOT contradict ECDAT decisions, evidence state, or migration effort.
- Enterprise documents are POLICY context, NOT verified runtime evidence.
- Every factual claim MUST cite evidence provenance: [ECDAT VERIFIED], [SOURCE CODE], [ENTERPRISE DOCUMENT], or [UNKNOWN].
- If evidence is missing, state that it is [UNKNOWN]. Do not invent it.
- NEVER output raw tool JSON. Synthesize a clear, helpful, expert answer for the user.
"""
        
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": question})
        tools = self._get_tools_schema()
        
        used_evidence = []
        unknowns_found = []
        related_actions = []
        
        for _ in range(self.max_loops):
            msg = self._call_llm(messages, tools)
            if not msg:
                break
                
            messages.append(msg)
            
            if msg.get("tool_calls"):
                for tool_call in msg["tool_calls"]:
                    fn_name = tool_call["function"]["name"]
                    try:
                        args = json.loads(tool_call["function"]["arguments"])
                    except:
                        args = {}
                        
                    tool_res = self._execute_tool(fn_name, args, context)
                    
                    if fn_name == "get_action_candidates" and tool_res.get("actions"):
                        related_actions.extend([a.get("action_type") for a in tool_res["actions"] if a.get("action_type")])
                        
                    if "unknowns" in tool_res and tool_res["unknowns"]:
                        unknowns_found.extend([u.get("detail") for u in tool_res["unknowns"] if u.get("detail")])
                        
                    if fn_name == "search_enterprise_documents":
                        for doc in tool_res.get("enterprise_documents", []):
                            used_evidence.append({
                                "source_type": Provenance.ENTERPRISE_DOCUMENT,
                                "reference": doc.get("title", "Policy"),
                                "claim": doc.get("text", "")[:100] + "..."
                            })
                    elif fn_name in ["get_evidence", "get_runtime_evidence", "get_analysis_result"]:
                        used_evidence.append({
                            "source_type": Provenance.ECDAT_EVIDENCE,
                            "reference": fn_name.replace("get_", ""),
                            "claim": "Used as basis for explanation"
                        })
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(tool_res)
                    })
            else:
                break

        # Collect final answer from the last assistant message with text content
        final_answer = None
        for m in reversed(messages):
            if m.get("role") == "assistant" and m.get("content") and not m.get("tool_calls"):
                final_answer = m.get("content").strip()
                break

        # If model executed tools but loop terminated before producing final text, ask for synthesis
        if not final_answer:
            synthesis_prompt = messages + [{
                "role": "user",
                "content": "Synthesize your concise explanation based on the verified ECDAT evidence above. Include provenance tags: [ECDAT VERIFIED], [SOURCE CODE], [ENTERPRISE DOCUMENT], or [UNKNOWN]."
            }]
            synth_msg = self._call_llm(synthesis_prompt, tools=None)
            if synth_msg and synth_msg.get("content"):
                final_answer = synth_msg.get("content").strip()

        # If answer is empty or raw JSON string, safely use deterministic summary
        if not final_answer or (final_answer.startswith("{") and final_answer.endswith("}")):
            final_answer = deterministic_summary

        # Populate fallback evidence pills if none explicitly tagged
        if not used_evidence:
            if context.get("evidence"):
                for ev in context["evidence"][:3]:
                    used_evidence.append({
                        "source_type": Provenance.ECDAT_EVIDENCE,
                        "reference": f"{ev.get('file', 'callsite')}:{ev.get('line', '')}",
                        "claim": f"Static detection of {algorithm} ({ev.get('detector', 'AST')})"
                    })
            elif context.get("finding"):
                used_evidence.append({
                    "source_type": Provenance.ECDAT_EVIDENCE,
                    "reference": "crypto_assets",
                    "claim": f"Logical asset {algorithm} performing {role}"
                })
            elif cbom_info:
                used_evidence.append({
                    "source_type": Provenance.ECDAT_EVIDENCE,
                    "reference": "cbom_inventory",
                    "claim": f"{cbom_info.get('total_crypto_assets', 0)} assets, {cbom_info.get('total_certificates', 0)} certs"
                })

        return {
            "answer": final_answer,
            "evidence": used_evidence[:5],
            "unknowns": list(set(unknowns_found or unknown_details))[:5],
            "related_actions": list(set(related_actions or action_names)),
            "enrichment_status": "LLM_ENRICHED"
        }

def get_assistant() -> BoundedAssistant:
    return BoundedAssistant()
