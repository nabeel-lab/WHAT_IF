"""
ECDAT Local LLM Setup Script
=============================
Downloads and configures Qwen3-4B-Thinking-2507 (Q4_K_M) for local inference.

Usage:
    python setup_local_llm.py

This script:
1. Downloads llama.cpp prebuilt release for Windows (if not present)
2. Downloads Qwen3-4B-Thinking-2507-Q4_K_M.gguf (if not present)
3. Creates a startup script for the local inference server
4. Validates the setup

Requirements:
    - ~3 GB disk space for model weights
    - ~100 MB for llama.cpp
    - 8+ GB RAM recommended
"""

import os
import sys
import platform
import subprocess
import urllib.request
import zipfile
import hashlib
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────

MODELS_DIR = Path(__file__).parent / "models"
LLAMA_DIR = Path(__file__).parent / "llama_cpp"

# Qwen3-4B-Thinking-2507 Q4_K_M — lightweight, suitable for local inference
MODEL_URL = "https://huggingface.co/Qwen/Qwen3-4B-Thinking-2507-GGUF/resolve/main/qwen3-4b-thinking-2507-q4_k_m.gguf"
MODEL_FILENAME = "qwen3-4b-thinking-2507-q4_k_m.gguf"

# llama.cpp release
LLAMA_CPP_VERSION = "b5816"
LLAMA_CPP_URL = f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_CPP_VERSION}/llama-{LLAMA_CPP_VERSION}-bin-win-cpu-x64.zip"
LLAMA_CPP_CUDA_URL = f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_CPP_VERSION}/llama-{LLAMA_CPP_VERSION}-bin-win-cuda-cu12.4.1-x64.zip"

SERVER_PORT = 8080
CONTEXT_SIZE = 4096


def download_file(url: str, dest: Path, desc: str = ""):
    """Download a file with progress indication."""
    if dest.exists():
        print(f"  ✓ {desc or dest.name} already exists")
        return True

    print(f"  ↓ Downloading {desc or dest.name}...")
    print(f"    URL: {url}")

    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Use urllib for simplicity (no extra deps)
        def _progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                pct = min(100, downloaded * 100 // total_size)
                mb_done = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                print(f"\r    {pct}% ({mb_done:.0f}/{mb_total:.0f} MB)", end="", flush=True)

        urllib.request.urlretrieve(url, str(dest), reporthook=_progress)
        print()
        print(f"  ✓ Downloaded {dest.name}")
        return True
    except Exception as e:
        print(f"\n  ✗ Download failed: {e}")
        if dest.exists():
            dest.unlink()
        return False


def setup_llama_cpp() -> Path:
    """Download and extract llama.cpp."""
    LLAMA_DIR.mkdir(parents=True, exist_ok=True)

    # Check if already extracted
    server_exe = LLAMA_DIR / "llama-server.exe"
    if server_exe.exists():
        print(f"  ✓ llama.cpp server already available at {server_exe}")
        return server_exe

    # Try to find in subdirectories (release zips extract into a subdirectory)
    for p in LLAMA_DIR.rglob("llama-server.exe"):
        print(f"  ✓ llama.cpp server found at {p}")
        return p

    # Download
    zip_path = LLAMA_DIR / "llama-cpp.zip"

    # Prefer CUDA if NVIDIA GPU is available
    use_cuda = False
    try:
        result = subprocess.run(["nvidia-smi"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            use_cuda = True
            print("  ℹ NVIDIA GPU detected — downloading CUDA build")
    except Exception:
        print("  ℹ No NVIDIA GPU detected — using CPU build")

    url = LLAMA_CPP_CUDA_URL if use_cuda else LLAMA_CPP_URL
    if not download_file(url, zip_path, "llama.cpp"):
        return None

    # Extract
    print("  ↻ Extracting llama.cpp...")
    try:
        with zipfile.ZipFile(str(zip_path), 'r') as zf:
            zf.extractall(str(LLAMA_DIR))
        print("  ✓ Extracted")
    except Exception as e:
        print(f"  ✗ Extraction failed: {e}")
        return None

    # Find the server executable
    for p in LLAMA_DIR.rglob("llama-server.exe"):
        return p

    print("  ✗ llama-server.exe not found after extraction")
    return None


def setup_model() -> Path:
    """Download the Qwen model weights."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / MODEL_FILENAME

    if not download_file(MODEL_URL, model_path, "Qwen3-4B-Thinking-2507 Q4_K_M"):
        return None

    return model_path


def create_startup_script(server_exe: Path, model_path: Path):
    """Create a .bat startup script for convenience."""
    script_path = Path(__file__).parent / "start_llm_server.bat"

    content = f"""@echo off
echo Starting ECDAT Local LLM Server...
echo Model: {MODEL_FILENAME}
echo Port: {SERVER_PORT}
echo Context: {CONTEXT_SIZE} tokens
echo.
echo Press Ctrl+C to stop.
echo.
"{server_exe}" -m "{model_path}" --port {SERVER_PORT} -c {CONTEXT_SIZE} --host 0.0.0.0
pause
"""

    script_path.write_text(content, encoding="utf-8")
    print(f"  ✓ Created startup script: {script_path}")

    # Also create a PowerShell version
    ps_path = Path(__file__).parent / "start_llm_server.ps1"
    ps_content = f"""# ECDAT Local LLM Server
Write-Host "Starting ECDAT Local LLM Server..." -ForegroundColor Cyan
Write-Host "Model: {MODEL_FILENAME}"
Write-Host "Port: {SERVER_PORT}"
Write-Host "Context: {CONTEXT_SIZE} tokens"
Write-Host ""

& "{server_exe}" -m "{model_path}" --port {SERVER_PORT} -c {CONTEXT_SIZE} --host 0.0.0.0
"""
    ps_path.write_text(ps_content, encoding="utf-8")
    print(f"  ✓ Created PowerShell script: {ps_path}")

    return script_path


def validate_setup(server_exe: Path, model_path: Path) -> bool:
    """Validate the setup is correct."""
    print("\n─── Validation ─────────────────────────────────────────────────────")
    ok = True

    if not server_exe or not server_exe.exists():
        print("  ✗ llama-server.exe not found")
        ok = False
    else:
        print(f"  ✓ Server: {server_exe}")

    if not model_path or not model_path.exists():
        print("  ✗ Model file not found")
        ok = False
    else:
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ Model: {model_path} ({size_mb:.0f} MB)")

    return ok


def main():
    print("=" * 70)
    print("  ECDAT Local LLM Setup")
    print("  Model: Qwen3-4B-Thinking-2507 (Q4_K_M)")
    print("  Runtime: llama.cpp")
    print("=" * 70)

    print("\n─── Step 1: llama.cpp Runtime ───────────────────────────────────────")
    server_exe = setup_llama_cpp()

    print("\n─── Step 2: Model Weights ──────────────────────────────────────────")
    model_path = setup_model()

    if server_exe and model_path:
        print("\n─── Step 3: Startup Script ─────────────────────────────────────────")
        create_startup_script(server_exe, model_path)

    ok = validate_setup(server_exe, model_path)

    if ok:
        print("\n" + "=" * 70)
        print("  ✓ Setup complete!")
        print(f"\n  To start the LLM server:")
        print(f"    .\\start_llm_server.bat")
        print(f"  or")
        print(f"    .\\start_llm_server.ps1")
        print(f"\n  The server will listen on http://localhost:{SERVER_PORT}/v1")
        print(f"  Set LLM_ENDPOINT=http://localhost:{SERVER_PORT}/v1 if using a different port")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("  ✗ Setup incomplete — see errors above")
        print("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    main()
