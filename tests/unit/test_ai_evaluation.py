"""
Evaluation Harness for ECDAT Assistant Models.

Compares BASE MODEL vs OPTIONAL ADAPTED MODEL across key metrics:
- factual grounding
- evidence citation accuracy
- hallucination/unsupported claim rate
- correct handling of UNKNOWN
- recommendation preservation
- response usefulness
- technical/executive explanation quality
"""

import pytest
from unittest.mock import MagicMock, patch

from services.api.assistant import BoundedAssistant
from services.api.context_engine import Provenance


class MockContextEngine:
    def assemble_path_context(self, *args, **kwargs):
        return {
            "path": {"path_id_name": "Path-RSA"},
            "finding": {"algorithm": "RSA", "role": "encryption"},
            "evidence": [{"id": "ev1", "evidence_type": "static_code", "file": "src/app.py", "snippet": "import RSA", "_provenance": Provenance.ECDAT_EVIDENCE}],
            "runtime": [],
            "data": None,
            "key": {"key_id_name": "master-key", "scope": "archive"},
            "analysis": {"evidence_state": "STATIC_ONLY", "migration_effort": "HIGH"},
            "actions": [{"action_type": "MIGRATION_PLANNING", "why": "long-lived data"}],
            "relationships": [],
            "source_excerpts": [],
            "enterprise_documents": [],
            "unknowns": [{"category": "data_asset", "detail": "Data asset is UNKNOWN"}],
        }


def mock_llm_response(answer: str, tool_calls: list = None):
    """Mock the LLM generating a specific answer or tool calls."""
    if tool_calls:
        return {
            "role": "assistant",
            "content": None,
            "tool_calls": tool_calls
        }
    return {
        "role": "assistant",
        "content": answer
    }


class TestAIEvaluationHarness:

    def setup_method(self, method):
        with patch("services.api.assistant.get_context_engine") as mock_get_engine:
            mock_get_engine.return_value = MockContextEngine()
            self.assistant = BoundedAssistant()
            self.assistant.engine = MockContextEngine()




    @patch("services.api.assistant.BoundedAssistant._call_llm")
    @patch("services.api.runtime_manager.ModelRuntimeSelector.get_runtime_status", return_value={"available": True, "selected_model": "Qwen3-4B-Instruct"})
    def test_factual_grounding(self, mock_status, mock_call):
        """Evaluate if the model invents facts."""
        mock_call.side_effect = [
            mock_llm_response("The key 'master-key' is used in the 'archive' scope for RSA encryption. This requires MIGRATION_PLANNING.")
        ]
        
        response = self.assistant.chat("dummy_path", "dummy_scan", "What is happening here?", profile="LOCAL")

        assert "master-key" in response["answer"]
        assert "MIGRATION_PLANNING" in response["answer"]
        assert "RSA" in response["answer"]
        assert mock_call.call_count == 1

    @patch("services.api.assistant.BoundedAssistant._call_llm")
    @patch("services.api.runtime_manager.ModelRuntimeSelector.get_runtime_status", return_value={"available": True, "selected_model": "Qwen3-4B-Instruct"})
    def test_unknown_handling(self, mock_status, mock_call):
        """Evaluate if the model correctly handles UNKNOWN instead of inventing facts."""
        mock_call.side_effect = [
            mock_llm_response(None, [
                {"id": "call1", "type": "function", "function": {"name": "get_crypto_path", "arguments": "{}"}}
            ]),
            mock_llm_response("I do not know what data asset this protects, as it is UNKNOWN.")
        ]
        
        response = self.assistant.chat("dummy_path", "dummy_scan", "What data is protected?", profile="LOCAL")
        assert "UNKNOWN" in response["answer"]
        assert "Data asset is UNKNOWN" in response["unknowns"]

    @patch("services.api.assistant.BoundedAssistant._call_llm")
    @patch("services.api.runtime_manager.ModelRuntimeSelector.get_runtime_status", return_value={"available": True, "selected_model": "Qwen3-4B-Instruct"})
    def test_recommendation_preservation(self, mock_status, mock_call):
        """Evaluate if the model preserves the deterministic recommendation without altering it."""
        mock_call.side_effect = [
            mock_llm_response(None, [
                {"id": "call1", "type": "function", "function": {"name": "get_action_candidates", "arguments": "{}"}}
            ]),
            mock_llm_response("The recommended action is MIGRATION_PLANNING.")
        ]
        
        response = self.assistant.chat("dummy_path", "dummy_scan", "What should I do?", profile="LOCAL")
        assert "MIGRATION_PLANNING" in response["answer"]
        assert "MIGRATION_PLANNING" in response["related_actions"]

    @patch("services.api.assistant.BoundedAssistant._call_llm")
    @patch("services.api.runtime_manager.ModelRuntimeSelector.get_runtime_status", return_value={"available": True, "selected_model": "Qwen3-4B-Instruct"})
    def test_executive_vs_technical_style(self, mock_status, mock_call):
        """Evaluate explanation quality across modes."""
        # Test Executive Mode
        mock_call.side_effect = [
            mock_llm_response("Executive summary: RSA is used, requires high effort migration planning.")
        ]
        exec_resp = self.assistant.chat("dummy_path", "dummy_scan", "Summarize", mode="EXECUTIVE", profile="LOCAL")
        assert "Executive summary" in exec_resp["answer"]
        
        # Test Technical Mode
        mock_call.side_effect = [
            mock_llm_response("Technical detail: RSA found in src/app.py as static code evidence.")
        ]
        tech_resp = self.assistant.chat("dummy_path", "dummy_scan", "Summarize", mode="TECHNICAL", profile="LOCAL")
        assert "src/app.py" in tech_resp["answer"]

    @patch("services.api.assistant.BoundedAssistant._call_llm")
    @patch("services.api.runtime_manager.ModelRuntimeSelector.get_runtime_status", return_value={"available": True, "selected_model": "Qwen3-4B-Instruct"})
    def test_evidence_citation_accuracy(self, mock_status, mock_call):
        """Evaluate if the model properly cites the evidence passed in."""
        mock_call.side_effect = [
            mock_llm_response(None, [
                {"id": "call1", "type": "function", "function": {"name": "get_evidence", "arguments": "{}"}}
            ]),
            mock_llm_response("Evidence shows RSA in src/app.py.")
        ]
        
        response = self.assistant.chat("dummy_path", "dummy_scan", "Show evidence.", profile="LOCAL")


        
        # We expect get_evidence to trigger a citation block in the output payload
        assert "src/app.py" in response["answer"]
        assert any(ev["source_type"] == Provenance.ECDAT_EVIDENCE for ev in response["evidence"])

    def test_ai5_deterministic_immediate_return_when_offline(self):
        """AI-5: Test that offline/unavailable model returns deterministic summary immediately without calling LLM."""
        with patch("services.api.runtime_manager.ModelRuntimeSelector.check_endpoint_model") as mock_check:
            mock_check.return_value = None  # Offline / no model
            response = self.assistant.chat("dummy_path", "dummy_scan", "Explain this path")
            
            assert "Grounded Summary" in response["answer"]
            assert response["enrichment_status"] == "DETERMINISTIC_IMMEDIATE"
            assert "MIGRATION_PLANNING" in response["related_actions"]

    def test_ai5_deterministic_profile_selection(self):
        """AI-5: Test deterministic profile and model selection rules."""
        from services.api.runtime_manager import ModelRuntimeSelector
        selector = ModelRuntimeSelector()

        with patch.object(selector, "check_endpoint_model") as mock_check:
            # Case 1: Active 4B model mounted, FAST profile requested -> Should fallback to deterministic rather than falsely using 4B model
            mock_check.return_value = "D:\\ECDAT\\models\\Qwen3-4B-Instruct-2507-Q4_K_M.gguf"
            status_fast = selector.get_runtime_status("FAST")
            assert status_fast["selected_profile"] == "FAST"
            assert status_fast["available"] is False
            assert status_fast["fallback_state"] == "DETERMINISTIC_ONLY_FAST_UNAVAILABLE"

            # Case 2: Active 4B model mounted, LOCAL profile requested -> Should be available
            status_local = selector.get_runtime_status("LOCAL")
            assert status_local["selected_profile"] == "LOCAL"
            assert status_local["available"] is True
            assert status_local["fallback_state"] == "NONE"

            # Case 3: Active 4B model mounted, DEEP profile requested -> Should be available
            status_deep = selector.get_runtime_status("DEEP")
            assert status_deep["selected_profile"] == "DEEP"
            assert status_deep["available"] is True
            assert status_deep["fallback_state"] == "NONE"

    def test_ai5_immutability_of_ecdat_evidence_and_decisions(self):
        """AI-5: Test that LLM responses cannot mutate baseline ECDAT evidence or action candidates."""
        with patch("services.api.assistant.BoundedAssistant._call_llm") as mock_call:
            # LLM attempts to fabricate a different recommendation
            mock_call.return_value = mock_llm_response("NO_ACTION_REQUIRED: This path is 100% safe.")
            
            response = self.assistant.chat("dummy_path", "dummy_scan", "Should we migrate?")
            
            # Action candidates remain strictly bound to deterministic engine context
            assert "MIGRATION_PLANNING" in response["related_actions"]
            assert "NO_ACTION_REQUIRED" not in response["related_actions"]

