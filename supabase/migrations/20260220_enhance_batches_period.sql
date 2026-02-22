-- Migration: Enhance batches with period and cutoff
-- Description: Add period to batches and cutoff_day to batch_settings
-- Date: 2026-02-20
-- Add period column to batches
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'before' CHECK (period IN ('before', 'after'));
-- Add cutoff_day to batch_settings
ALTER TABLE batch_settings
ADD COLUMN IF NOT EXISTS cutoff_day INTEGER DEFAULT 15;
-- Update existing batches to 'before' if period is null
UPDATE batches
SET period = 'before'
WHERE period IS NULL;