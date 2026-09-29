-- Migration 015: Security cleanup - never persist raw provider credentials in database
-- Persist only masked preview, account login, scope, and status
ALTER TABLE provider_connections DROP COLUMN IF EXISTS access_token;
