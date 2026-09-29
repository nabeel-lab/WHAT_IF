-- Phase 7 Consistency
-- Relax constraints on crypto_assets to allow for normalized identity rather than just AST location dumps.
-- Evidence table will now hold the source_file, line_start, line_end, etc.

ALTER TABLE crypto_assets ALTER COLUMN source_file DROP NOT NULL;
ALTER TABLE crypto_assets ALTER COLUMN detector_rule DROP NOT NULL;
ALTER TABLE crypto_assets ALTER COLUMN confidence DROP NOT NULL;

-- In order to cleanly support finding evidence based on the asset, ensure evidence index is present
CREATE INDEX IF NOT EXISTS idx_evidence_asset_id_new ON evidence(asset_id);
