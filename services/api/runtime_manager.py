"""
Adaptive AI Runtime Manager and Hardware Detector for ECDAT.

Provides:
- Lightweight, zero-SDK hardware detection (CPU, NVIDIA GPU, AMD GPU, Intel GPU, Intel NPU)
- Deterministic Profile & Model Selector (FAST, LOCAL, DEEP)
- Asynchronous Enrichment Loop with immediate deterministic output
- Safety & Latency Controls (Bounded concurrency, strict timeouts)
"""

import os
import subprocess
import shutil
import logging
import asyncio
from typing import Dict, Any, Optional
from enum import Enum
import httpx

logger = logging.getLogger(__name__)


class AcceleratorType(str, Enum):
    CPU_ONLY = "CPU_ONLY"
    NVIDIA_GPU = "NVIDIA_GPU"
    AMD_GPU = "AMD_GPU"
    INTEL_GPU = "INTEL_GPU"
    INTEL_NPU = "INTEL_NPU"
    UNKNOWN_ACCELERATOR = "UNKNOWN_ACCELERATOR"


class AIProfile(str, Enum):
    FAST = "FAST"
    LOCAL = "LOCAL"
    DEEP = "DEEP"


class HardwareDetector:
    """Lightweight hardware detector with zero vendor SDK requirements."""

    @staticmethod
    def detect() -> Dict[str, Any]:
        accelerator = AcceleratorType.CPU_ONLY
        details = "Intel Core CPU execution"

        # 1. NVIDIA GPU via nvidia-smi
        if shutil.which("nvidia-smi"):
            try:
                res = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                    capture_output=True, text=True, timeout=2.0
                )
                if res.returncode == 0 and res.stdout.strip():
                    accelerator = AcceleratorType.NVIDIA_GPU
                    details = res.stdout.strip().split("\n")[0]
            except Exception as e:
                logger.debug(f"NVIDIA check failed: {e}")

        # 2. AMD GPU via rocm-smi if not NVIDIA
        if accelerator == AcceleratorType.CPU_ONLY and shutil.which("rocm-smi"):
            accelerator = AcceleratorType.AMD_GPU
            details = "AMD ROCm GPU detected"

        # 3. Intel GPU / NPU check via Windows wmic / dxdiag / environment if on Windows
        if accelerator == AcceleratorType.CPU_ONLY and os.name == "nt":
            try:
                res = subprocess.run(
                    ["powershell", "-Command", "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"],
                    capture_output=True, text=True, timeout=2.0
                )
                if res.returncode == 0 and "Intel" in res.stdout:
                    if "Arc" in res.stdout or "Iris" in res.stdout:
                        accelerator = AcceleratorType.INTEL_GPU
                        details = res.stdout.strip()
            except Exception:
                pass

        return {
            "device": os.name,
            "accelerator": accelerator.value,
            "details": details,
            "has_acceleration": accelerator != AcceleratorType.CPU_ONLY,
        }


class ModelRuntimeSelector:
    """Deterministic selector for model profiles and availability."""

    def __init__(self):
        self.enabled = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
        self.async_enrichment_enabled = os.environ.get("ENABLE_ASYNC_ENRICHMENT", "true").lower() == "true"
        self.groq_api_key = os.environ.get("QROQ") or os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_KEY") or os.environ.get("GROQ") or os.environ.get("XAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.groq_model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
        
        # Endpoints and models per profile
        self.endpoints = {
            AIProfile.FAST: os.environ.get("FAST_LLM_ENDPOINT") or os.environ.get("LLM_ENDPOINT", "http://localhost:8080/v1"),
            AIProfile.LOCAL: os.environ.get("LOCAL_LLM_ENDPOINT") or os.environ.get("LLM_ENDPOINT", "http://localhost:8080/v1"),
            AIProfile.DEEP: os.environ.get("DEEP_LLM_ENDPOINT") or os.environ.get("LLM_ENDPOINT", "http://localhost:8080/v1"),
        }
        
        self.configured_models = {
            AIProfile.FAST: os.environ.get("FAST_MODEL_PATH"),
            AIProfile.LOCAL: os.environ.get("LOCAL_MODEL_PATH", "D:\\ECDAT\\models\\Qwen3-4B-Instruct-2507-Q4_K_M.gguf"),
            AIProfile.DEEP: os.environ.get("DEEP_MODEL_PATH", "D:\\ECDAT\\models\\Qwen3-4B-Thinking-2507-Q4_K_M.gguf"),
        }

        self.default_profile_name = os.environ.get("AI_PROFILE", AIProfile.FAST.value).upper()

    def check_endpoint_model(self, endpoint: str) -> Optional[str]:
        """Check endpoint for currently mounted GGUF model or Groq API key."""
        if not self.enabled:
            return None
        if self.groq_api_key and self.groq_api_key.strip():
            return f"groq:{self.groq_model}"

        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.get(f"{endpoint}/models")
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models") or data.get("data") or []
                    if models:
                        return models[0].get("id") or models[0].get("name")
        except Exception:
            pass
        return None

    def get_runtime_status(self, requested_profile: Optional[str] = None) -> Dict[str, Any]:
        hw = HardwareDetector.detect()
        target_profile_name = (requested_profile or self.default_profile_name).upper()
        
        try:
            target_profile = AIProfile[target_profile_name]
        except KeyError:
            target_profile = AIProfile.FAST

        endpoint = self.endpoints[target_profile]
        active_model = self.check_endpoint_model(endpoint)

        is_available = False
        fallback_state = "NONE"
        selected_model = "deterministic_fallback"

        if self.enabled and active_model:
            if active_model.startswith("groq:"):
                is_available = True
                selected_model = active_model
                hw["accelerator"] = "GROQ_CLOUD_NPU"
                hw["details"] = "Groq Cloud Llama-3.3 / Qwen Ultra-Fast Inference"
            elif target_profile == AIProfile.FAST:
                configured_fast = self.configured_models[AIProfile.FAST]
                if configured_fast and (configured_fast in active_model or active_model in configured_fast):
                    is_available = True
                    selected_model = active_model
                elif not configured_fast and ("small" in active_model.lower() or "mini" in active_model.lower() or "0.5b" in active_model.lower() or "1.5b" in active_model.lower()):
                    is_available = True
                    selected_model = active_model
                else:
                    is_available = False
                    fallback_state = "DETERMINISTIC_ONLY_FAST_UNAVAILABLE"
                    selected_model = f"deterministic_only (4B model '{os.path.basename(active_model)}' not used as FAST)"
            else:
                is_available = True
                selected_model = active_model

        if not is_available and fallback_state == "NONE":
            fallback_state = "DETERMINISTIC_FALLBACK"

        return {
            "device": hw["device"],
            "accelerator": hw["accelerator"],
            "hardware_details": hw["details"],
            "selected_profile": target_profile.value,
            "selected_model": selected_model,
            "endpoint": "https://api.groq.com/openai/v1" if self.groq_api_key else endpoint,
            "available": is_available,
            "fallback_state": fallback_state,
            "enabled": self.enabled,
            "async_enrichment_enabled": self.async_enrichment_enabled,
            "provider": "groq" if self.groq_api_key else "local_llamacpp"
        }



# Global Runtime Selector Instance
_runtime_selector = ModelRuntimeSelector()

def get_runtime_selector() -> ModelRuntimeSelector:
    return _runtime_selector
