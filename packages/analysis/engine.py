import uuid
from typing import List, Optional, Dict
from datetime import datetime, timezone
import json

from services.api.models import (
    ContextAggregate, 
    AnalysisResultModel, 
    ActionCandidateModel,
    AnalysisAggregate
)

# Deterministic versioned policy
ANALYSIS_VERSION = "phase5-v1"

class TwoClockModel:
    @staticmethod
    def calculate_runway(required_until: Optional[str], migration_effort: str) -> tuple[str, str, str, str]:
        """
        Returns (runway_state, runway_basis, required_protection_until, change_lead_time)
        """
        if not required_until:
            return "UNKNOWN", "Required protection end date not evidenced.", "UNKNOWN", "UNKNOWN"
            
        # Deterministic lead time mapping based on policy phase5-v1
        lead_time_map = {
            "LOW": "3 months",
            "MEDIUM": "9 months",
            "HIGH": "18 months",
            "UNKNOWN": "UNKNOWN"
        }
        
        change_lead_time = lead_time_map.get(migration_effort, "UNKNOWN")
        if change_lead_time == "UNKNOWN":
            return "UNKNOWN", "Migration effort unknown; cannot project lead time.", required_until, change_lead_time
            
        # Simplified deterministic date logic for demo purposes
        try:
            req_year = int(required_until.split("-")[0])
        except:
            req_year = 2030
            
        if req_year > 2030 and migration_effort in ["LOW", "MEDIUM"]:
            return "COMFORTABLE", "Protection horizon significantly exceeds change lead time.", required_until, change_lead_time
        elif req_year <= 2030 and migration_effort == "HIGH":
            return "NEEDS_PLANNING", "Required protection horizon overlaps projected change lead time.", required_until, change_lead_time
        elif req_year <= 2026:
            return "URGENT", "Protection horizon is imminent or expired.", required_until, change_lead_time
        else:
            return "WATCH", "Protection horizon is within planning visibility.", required_until, change_lead_time

class MigrationEffortEngine:
    @staticmethod
    def calculate(touchpoints: int, abstraction: bool, external: bool) -> str:
        if touchpoints > 3 or external:
            return "HIGH"
        elif touchpoints > 0 and not abstraction:
            return "MEDIUM"
        elif abstraction:
            return "LOW"
        return "UNKNOWN"

class CryptoAgilityEngine:
    @staticmethod
    def calculate(abstraction: bool, hardcoded: bool) -> str:
        if abstraction and not hardcoded:
            return "READY"
        elif abstraction and hardcoded:
            return "PARTIALLY_READY"
        elif not abstraction:
            return "LOW_READINESS"
        return "UNKNOWN"

class AnalysisEngine:
    @staticmethod
    def analyze(context: ContextAggregate, crypto_path_id: Optional[uuid.UUID] = None) -> AnalysisAggregate:
        finding = context.finding
        
        # 1. Evidence State Normalization
        discovery_state = "FOUND"
        reachability_state = context.reachability.status if context.reachability else "UNKNOWN"
        runtime_state = "OBSERVED" if (context.runtime and len(context.runtime) > 0) else "NOT OBSERVED"
        config_state = "MISMATCH" if context.mismatch else ("DECLARED" if context.config_declared else "NOT DECLARED")
        
        evidence_state = f"{discovery_state} | {reachability_state} | {runtime_state} | {config_state}"
        
        # 2. Coverage
        missing = []
        if reachability_state == "UNKNOWN": missing.append("reachability")
        if runtime_state == "NOT OBSERVED" and reachability_state != "UNKNOWN": missing.append("runtime_observation")
        if not context.data_assets: missing.append("protected_data")
        
        if not missing:
            evidence_coverage = "COMPLETE"
        elif len(missing) <= 2:
            evidence_coverage = "PARTIAL"
        else:
            evidence_coverage = "INSUFFICIENT"
            
        # 3. Touchpoints & Migration
        touchpoints = context.migration_context.direct_crypto_call_sites if context.migration_context else 0
        abstraction = bool(context.migration_context and context.migration_context.provider_abstraction)
        external = bool(context.migration_context and context.migration_context.external_dependencies > 0)
        
        migration_effort = MigrationEffortEngine.calculate(touchpoints, abstraction, external)
        crypto_agility = CryptoAgilityEngine.calculate(abstraction, touchpoints > 0)
        
        # 4. Runway
        req_until = context.data_assets[0].required_confidentiality_until if context.data_assets else None
        runway_state, runway_basis, req_prot_until, change_lead = TwoClockModel.calculate_runway(req_until, migration_effort)
        
        # 5. Key Concentration & Exposure Reduction state evaluation
        key_ctx = context.key_contexts[0] if context.key_contexts else None
        key_concentration_state = "UNKNOWN"
        is_broad_key_scope = False
        if key_ctx:
            scope_str = (key_ctx.scope or "").lower()
            domains_val = getattr(key_ctx, "domains", None)
            rot_val = getattr(key_ctx, "rotation_policy", None) or getattr(key_ctx, "rotation_state", None) or ""
            if "+" in scope_str or "multiple" in scope_str or "shared" in scope_str or (domains_val and domains_val > 1):
                key_concentration_state = "CONCENTRATED"
                is_broad_key_scope = True
            elif key_ctx.scope:
                key_concentration_state = "ISOLATED"
            else:
                key_concentration_state = "UNKNOWN"

        algo = (finding.algorithm or "").upper()
        is_weak_or_broken = algo in ["MD5", "SHA1", "DES", "3DES", "RC4"]
        req_year_val = None
        if req_until:
            try:
                req_year_val = int(req_until.split("-")[0])
            except:
                req_year_val = None

        if is_weak_or_broken:
            exposure_reduction_state = "EXPOSED"
        elif req_year_val is not None and req_year_val <= 2026:
            exposure_reduction_state = "REDUCIBLE"
        elif context.data_assets:
            exposure_reduction_state = "MONITORED"
        else:
            exposure_reduction_state = "UNKNOWN"

        res = AnalysisResultModel(
            id=uuid.uuid4(),
            analysis_run_id=uuid.uuid4(), # placeholder, patched later
            finding_id=finding.id,
            crypto_path_id=crypto_path_id,
            evidence_state=evidence_state,
            evidence_coverage=evidence_coverage,
            required_protection_until=req_prot_until,
            change_lead_time=change_lead,
            runway_state=runway_state,
            runway_basis=runway_basis,
            planning_assumptions="Lead-time policy phase5-v1",
            migration_effort=migration_effort,
            crypto_agility_state=crypto_agility,
            key_concentration_state=key_concentration_state,
            exposure_reduction_state=exposure_reduction_state,
            created_at=datetime.now(timezone.utc)
        )
        
        candidates = []
        
        # Rule 1: Static-only / insufficient evidence -> INVESTIGATE
        # Semantic rule: UNKNOWN must mean an evidence/visibility gap. It must not automatically become high risk or an aggressive migration action.
        if runtime_state == "NOT OBSERVED" or reachability_state == "UNKNOWN" or evidence_coverage == "INSUFFICIENT":
            why_detail = (
                "Cryptographic path discovered statically but has not been confirmed active via runtime execution."
                if runtime_state == "NOT OBSERVED" else
                "Evidence is insufficient to establish reachability or data context."
            )
            candidates.append(ActionCandidateModel(
                id=uuid.uuid4(),
                analysis_result_id=res.id,
                action_type="INVESTIGATE",
                why=why_detail,
                supporting_evidence={"finding": str(finding.id), "evidence_state": evidence_state},
                missing_evidence={"missing_dimensions": missing},
                created_at=datetime.now(timezone.utc)
            ))
            
        # Rule 2: Runtime/configuration mismatch or downgrade evidence -> INVESTIGATE / FIX
        is_mismatch = bool(context.mismatch)
        if not is_mismatch and context.config_declared and context.config_observed:
            decl = context.config_declared.upper().split("-")[0]
            obs = context.config_observed.upper().split("-")[0]
            if decl != obs and decl not in obs and obs not in decl:
                is_mismatch = True

        if is_mismatch:
            candidates.append(ActionCandidateModel(
                id=uuid.uuid4(),
                analysis_result_id=res.id,
                action_type="INVESTIGATE",
                why=f"Configuration mismatch: declared algorithm '{context.config_declared}' differs from observed behavior '{context.config_observed or runtime_state}'.",
                supporting_evidence={"declared": context.config_declared, "observed": context.config_observed},
                missing_evidence={"mismatch": True},
                created_at=datetime.now(timezone.utc)
            ))

        # Only evaluate active remediation actions when the path is confirmed at runtime
        if runtime_state == "OBSERVED":
            # Rule 3: Live classical public-key path + long-lived/high-value protected data -> MIGRATE / HYBRID direction
            is_classical_pk = algo in ["RSA", "EC", "ECDSA", "DSA", "DH"]
            is_long_lived = (req_year_val is not None and req_year_val >= 2030) or runway_state in ["NEEDS_PLANNING", "URGENT"]
            if is_classical_pk and is_long_lived:
                candidates.append(ActionCandidateModel(
                    id=uuid.uuid4(),
                    analysis_result_id=res.id,
                    action_type="MIGRATION_PLANNING",
                    why="Runtime-observed classical public-key cryptography protects data with a required protection horizon exceeding the quantum vulnerability horizon.",
                    supporting_evidence={"algorithm": algo, "runtime": "OBSERVED", "runway": runway_state, "required_until": req_until},
                    created_at=datetime.now(timezone.utc)
                ))

            # Rule 4: Broad key scope / missing epochs / excessive key reuse -> REDUCE BLAST RADIUS
            if is_broad_key_scope:
                candidates.append(ActionCandidateModel(
                    id=uuid.uuid4(),
                    analysis_result_id=res.id,
                    action_type="REDUCE_BLAST_RADIUS",
                    why=f"Key '{key_ctx.key_id_name}' scope spans multiple services/domains with manual rotation policy, creating excessive blast radius.",
                    supporting_evidence={"key_id": key_ctx.key_id_name, "scope": key_ctx.scope, "concentration": key_concentration_state},
                    created_at=datetime.now(timezone.utc)
                ))

            # Rule 6: Clearly unnecessary retention / exposure reduction condition -> REDUCE DATA EXPOSURE
            if is_weak_or_broken or exposure_reduction_state == "REDUCIBLE":
                why_exposure = (
                    f"Cryptographic algorithm {algo} is cryptographically broken and vulnerable to collision attacks in production."
                    if is_weak_or_broken else
                    f"Protected data retention horizon ({req_until}) is short-lived or expired; reduce retention exposure."
                )
                candidates.append(ActionCandidateModel(
                    id=uuid.uuid4(),
                    analysis_result_id=res.id,
                    action_type="REDUCE_DATA_EXPOSURE",
                    why=why_exposure,
                    supporting_evidence={"algorithm": algo, "exposure": exposure_reduction_state, "required_until": req_until},
                    created_at=datetime.now(timezone.utc)
                ))

            # Rule 5: Multiple direct crypto call sites + weak abstraction -> IMPROVE CRYPTO AGILITY / PREPARE AGILITY
            if crypto_agility == "LOW_READINESS":
                candidates.append(ActionCandidateModel(
                    id=uuid.uuid4(),
                    analysis_result_id=res.id,
                    action_type="PREPARE",
                    why=f"Application has {touchpoints} direct crypto call sites without an abstraction layer, inhibiting cryptographic agility.",
                    supporting_evidence={"touchpoints": touchpoints, "abstraction": abstraction},
                    created_at=datetime.now(timezone.utc)
                ))
            
        if not candidates:
            candidates.append(ActionCandidateModel(
                id=uuid.uuid4(),
                analysis_result_id=res.id,
                action_type="MONITOR",
                why="No urgent intervention required based on current evidence.",
                supporting_evidence={"runway": runway_state, "coverage": evidence_coverage},
                created_at=datetime.now(timezone.utc)
            ))
            
        return AnalysisAggregate(analysis_result=res, action_candidates=candidates)
