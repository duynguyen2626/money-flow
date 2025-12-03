-- Hotfix for Phase 62
-- Rename subscription_id to service_id in service_members table
ALTER TABLE public.service_members RENAME COLUMN subscription_id TO service_id;
