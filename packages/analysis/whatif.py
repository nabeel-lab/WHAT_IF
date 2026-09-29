import uuid
import datetime
from typing import Dict, Any, List, Optional

from services.api.models import ContextAggregate, WhatIfRequest, WhatIfResponse, WhatIfDelta
from packages.analysis.engine import AnalysisEngine, ANALYSIS_VERSION

SCENARIO_ENGINE_VERSION = "whatif-v1"

class DeltaEngine:
    @staticmethod
    def compare_readiness(baseline: str, simulated: str) -> str:
        if baseline == simulated:
            return "UNCHANGED"
        if simulated == "UNKNOWN":
            return "UNKNOWN"
        
        ranks = {"UNKNOWN": 0, "LOW_READINESS": 1, "PARTIALLY_READY": 2, "READY": 3}
        if ranks.get(simulated, 0) > ranks.get(baseline, 0):
            return "IMPROVED"
        return "WORSENED"

    @staticmethod
    def compare_effort(baseline: str, simulated: str) -> str:
        if baseline == simulated:
            return "UNCHANGED"
        if simulated == "UNKNOWN":
            return "UNKNOWN"
            
        ranks = {"UNKNOWN": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        if ranks.get(simulated, 0) > ranks.get(baseline, 0):
            return "IMPROVED"
        return "WORSENED"

    @staticmethod
    def compare_runway(baseline: str, simulated: str) -> str:
        if baseline == simulated:
            return "UNCHANGED"
        if simulated == "UNKNOWN":
            return "UNKNOWN"
            
        ranks = {"UNKNOWN": 0, "URGENT": 1, "NEEDS_PLANNING": 2, "WATCH": 3, "COMFORTABLE": 4}
        if ranks.get(simulated, 0) > ranks.get(baseline, 0):
            return "IMPROVED"
        return "WORSENED"

class WhatIfEngine:
    @staticmethod
    def simulate(
        baseline_context: ContextAggregate, 
        request: WhatIfRequest, 
        baseline_scan_id: str,
        baseline_analysis_version: str,
        crypto_path_id: Optional[uuid.UUID] = None
    ) -> WhatIfResponse:
        
        # 1. Clone the context strictly
        simulated_context = baseline_context.model_copy(deep=True)
        
        assumptions = []
        unknowns = []
        
        # 2. Strict allowlist validation and mutation
        scenario_type = request.scenario_type
        overrides = request.overrides
        
        if scenario_type == "INTRODUCE_CRYPTO_ABSTRACTION":
            if "crypto_abstraction" in overrides and overrides["crypto_abstraction"]:
                if simulated_context.migration_context:
                    sim_mc = simulated_context.migration_context
                    sim_mc.provider_abstraction = "SIMULATED_ABSTRACTION"
                    assumptions.append(f"All {sim_mc.direct_crypto_call_sites} direct call sites are hypothetically migrated behind an abstraction.")
                    assumptions.append("Provider interface supports the affected operations.")
                    unknowns.append("Production deployment behavior under abstraction.")
                    unknowns.append("Performance impact of abstraction layer.")
                else:
                    unknowns.append("Migration context is missing; abstraction simulation may be incomplete.")
                    
        elif scenario_type == "REDUCE_DATA_RETENTION":
            retention_date = overrides.get("retention_end_date")
            if retention_date and simulated_context.data_assets:
                simulated_context.data_assets[0].required_confidentiality_until = retention_date
                assumptions.append(f"Data retention horizon reduced to {retention_date}.")
            else:
                unknowns.append("No data asset available to apply retention override.")
                
        elif scenario_type == "HARDEN_CURRENT_DEPLOYMENT":
            if overrides.get("key_separation") and simulated_context.key_contexts:
                simulated_context.key_contexts[0].scope = "Strict Domain Separation"
                assumptions.append("Key separation strictly enforced across domains.")
            if overrides.get("rotation_policy") and simulated_context.key_contexts:
                simulated_context.key_contexts[0].rotation_state = "Automated"
                assumptions.append("Automated rotation policy implemented.")
                
        elif scenario_type == "MIGRATION_PLANNING":
            if overrides.get("provider_dependency_resolved") and simulated_context.migration_context:
                simulated_context.migration_context.external_dependencies = 0
                assumptions.append("External provider dependency successfully resolved.")
            if overrides.get("rollback_supported") and simulated_context.migration_context:
                simulated_context.migration_context.rollback_support = "Yes"
                assumptions.append("Robust rollback support implemented.")
                
        elif scenario_type == "HYBRID_MIGRATION":
            support_evidenced = overrides.get("migration_supported", False)
            if support_evidenced:
                assumptions.append("Hybrid migration protocol officially supported.")
                if simulated_context.migration_context:
                    simulated_context.migration_context.migration_effort_band = "Medium"
            else:
                unknowns.append("Required protocol/provider compatibility for hybrid migration is Unknown.")

        # 3. Re-run identical analysis engine
        effective_path_id = crypto_path_id or getattr(request, 'crypto_path_id', None)
        baseline_agg = AnalysisEngine.analyze(baseline_context, effective_path_id)
        simulated_agg = AnalysisEngine.analyze(simulated_context, effective_path_id)
        
        # 4. Generate Deltas
        deltas = []
        
        # Readiness
        deltas.append(WhatIfDelta(
            dimension="Crypto Agility",
            baseline_value=baseline_agg.analysis_result.crypto_agility_state,
            simulated_value=simulated_agg.analysis_result.crypto_agility_state,
            delta=DeltaEngine.compare_readiness(
                baseline_agg.analysis_result.crypto_agility_state or "UNKNOWN", 
                simulated_agg.analysis_result.crypto_agility_state or "UNKNOWN"
            )
        ))
        
        # Effort
        deltas.append(WhatIfDelta(
            dimension="Migration Effort",
            baseline_value=baseline_agg.analysis_result.migration_effort,
            simulated_value=simulated_agg.analysis_result.migration_effort,
            delta=DeltaEngine.compare_effort(
                baseline_agg.analysis_result.migration_effort or "UNKNOWN", 
                simulated_agg.analysis_result.migration_effort or "UNKNOWN"
            )
        ))
        
        # Runway
        deltas.append(WhatIfDelta(
            dimension="Protection Runway",
            baseline_value=baseline_agg.analysis_result.runway_state,
            simulated_value=simulated_agg.analysis_result.runway_state,
            delta=DeltaEngine.compare_runway(
                baseline_agg.analysis_result.runway_state or "UNKNOWN", 
                simulated_agg.analysis_result.runway_state or "UNKNOWN"
            )
        ))
        
        # Date
        deltas.append(WhatIfDelta(
            dimension="Required Protection Until",
            baseline_value=baseline_agg.analysis_result.required_protection_until,
            simulated_value=simulated_agg.analysis_result.required_protection_until,
            delta="CHANGED" if baseline_agg.analysis_result.required_protection_until != simulated_agg.analysis_result.required_protection_until else "UNCHANGED"
        ))

        # Action Candidates Changes
        base_actions = {c.action_type for c in baseline_agg.action_candidates}
        sim_actions = {c.action_type for c in simulated_agg.action_candidates}
        
        for added in sim_actions - base_actions:
            deltas.append(WhatIfDelta(
                dimension=f"Action Candidate: {added}",
                baseline_value="Absent",
                simulated_value="Present",
                delta="NEW"
            ))
            
        for removed in base_actions - sim_actions:
            deltas.append(WhatIfDelta(
                dimension=f"Action Candidate: {removed}",
                baseline_value="Present",
                simulated_value="Absent",
                delta="REMOVED"
            ))
            
        # 5. Build reproducible response
        return WhatIfResponse(
            scenario_id=str(uuid.uuid4())[:8],
            scenario_type=scenario_type,
            overrides=overrides,
            baseline_scan_id=str(baseline_scan_id),
            baseline_analysis_version=baseline_analysis_version,
            scenario_engine_version=SCENARIO_ENGINE_VERSION,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            baseline=baseline_agg,
            scenario=simulated_agg,
            deltas=deltas,
            assumptions=assumptions,
            unknowns=unknowns
        )
