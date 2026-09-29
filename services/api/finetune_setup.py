"""
ECDAT Local LLM Fine-Tuning Setup
===================================
Generates a versioned JSONL instruction dataset and provides
a LoRA/QLoRA training configuration path for enterprise adaptation.

Usage:
    python finetune_setup.py
"""

import os
import json
import uuid
import datetime
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent / "finetuning"
DATASET_DIR = BASE_DIR / "datasets"
CONFIG_DIR = BASE_DIR / "configs"
VERSION = "v1.0"

# Enterprise Terminology / Style guidelines to bake into the model
ENTERPRISE_STYLE = "Executive style: clear, concise, actionable. Technical style: grounded, provenance-aware, explicit."

# ─── Dataset Generation ───────────────────────────────────────────────────────

def generate_dataset(output_path: Path):
    """Generate a small instruction tuning dataset for ECDAT adaptation."""
    
    examples = [
        # 1. Evidence Explanation
        {
            "messages": [
                {"role": "system", "content": f"You are a cryptographic security assistant explaining ECDAT investigation results. Mode: TECHNICAL."},
                {"role": "user", "content": "Explain the evidence for this RSA path."},
                {"role": "assistant", "content": "The evidence indicates RSA is used for encryption in `services/archive/archive.py:8`. This is STATIC evidence, meaning the code exists, but it does not prove execution on its own. However, runtime observation on `/archive` confirms this path is executed in production."}
            ]
        },
        # 2. Unknown Handling
        {
            "messages": [
                {"role": "system", "content": "You are a cryptographic security assistant explaining ECDAT investigation results. Mode: TECHNICAL."},
                {"role": "user", "content": "What data does this MD5 hash protect?"},
                {"role": "assistant", "content": "I do not have evidence of the data asset this MD5 hash protects. The data asset linkage is UNKNOWN in the current context."}
            ]
        },
        # 3. Recommendation Explanation
        {
            "messages": [
                {"role": "system", "content": "You are a cryptographic security assistant explaining ECDAT investigation results. Mode: EXECUTIVE."},
                {"role": "user", "content": "Why is migration planning recommended here?"},
                {"role": "assistant", "content": "Migration planning is recommended because this path uses RSA to protect long-lived sensitive data (required confidentiality until 2036). The protection runway for this data requires immediate planning to transition to quantum-safe algorithms before the data expires."}
            ]
        },
        # 4. Key-Scope Explanation
        {
            "messages": [
                {"role": "system", "content": "You are a cryptographic security assistant explaining ECDAT investigation results. Mode: TECHNICAL."},
                {"role": "user", "content": "What is the blast radius of this key?"},
                {"role": "assistant", "content": "This path shares the key `archive-master-v1` with 4 other paths. The key scope spans both `archive` and `backup` services, indicating a concentrated risk if the key were compromised."}
            ]
        },
        # 5. What-If Explanation
        {
            "messages": [
                {"role": "system", "content": "You are a cryptographic security assistant explaining ECDAT investigation results. Mode: TECHNICAL."},
                {"role": "user", "content": "What happens if we reduce data retention?"},
                {"role": "assistant", "content": "If data retention is reduced to 2027, the protection runway improves from NEEDS_PLANNING to COMFORTABLE. This is because the data will expire before quantum threats are projected to materialize."}
            ]
        },
        # 6. Executive Summarization
        {
            "messages": [
                {"role": "system", "content": "You are a cryptographic security assistant explaining ECDAT investigation results. Mode: EXECUTIVE."},
                {"role": "user", "content": "Give me a summary of this path."},
                {"role": "assistant", "content": "Path-RSA uses RSA for encryption in the archive service. It is actively running in production and protects highly sensitive patient data. Migration planning is required due to long-term data retention requirements."}
            ]
        }
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
            
    print(f"  ✓ Generated instruction dataset: {output_path}")
    return output_path


def generate_training_config(config_path: Path, dataset_path: Path):
    """Generate a LoRA/QLoRA training configuration (unsloth/peft style)."""
    
    config = {
        "model_name_or_path": "Qwen/Qwen3-4B-Thinking-2507",
        "dataset": str(dataset_path.absolute()),
        "output_dir": str((BASE_DIR / "lora_weights").absolute()),
        "lora_r": 16,
        "lora_alpha": 32,
        "lora_dropout": 0.05,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "batch_size": 2,
        "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4,
        "num_train_epochs": 3,
        "fp16": True,
        "optim": "adamw_8bit"
    }

    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print(f"  ✓ Generated LoRA training configuration: {config_path}")
    return config_path


def check_hardware():
    """Check if the system has a GPU capable of fine-tuning."""
    print("\n─── Hardware Check ─────────────────────────────────────────────────")
    import subprocess
    try:
        result = subprocess.run(["nvidia-smi"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("  ✓ NVIDIA GPU detected.")
            print("  ℹ Fine-tuning Qwen3-4B with QLoRA requires ~6-8GB VRAM.")
            return True
        else:
            print("  ✗ NVIDIA GPU not detected (nvidia-smi failed).")
            return False
    except Exception:
        print("  ✗ NVIDIA GPU not detected.")
        return False


def main():
    print("=" * 70)
    print("  ECDAT Enterprise Adaptation - Fine-Tuning Setup")
    print(f"  Version: {VERSION}")
    print("=" * 70)

    dataset_file = DATASET_DIR / f"ecdat_instruct_{VERSION}.jsonl"
    config_file = CONFIG_DIR / f"qlora_config_{VERSION}.json"

    print("\n─── Step 1: Instruction Dataset ─────────────────────────────────────")
    generate_dataset(dataset_file)

    print("\n─── Step 2: Training Configuration ──────────────────────────────────")
    generate_training_config(config_file, dataset_file)

    has_gpu = check_hardware()

    print("\n" + "=" * 70)
    if has_gpu:
        print("  ✓ Hardware looks capable of running the fine-tuning job.")
        print("  To train, use a framework like Unsloth or HF PEFT with the generated config.")
    else:
        print("  ⚠ No suitable GPU found for local fine-tuning.")
        print("  Hardware Requirement: NVIDIA GPU with at least 8GB VRAM (e.g., RTX 3060/4060).")
        print("  Do NOT fake a training run. Run this configuration on a capable machine.")
    print("=" * 70)


if __name__ == "__main__":
    main()
