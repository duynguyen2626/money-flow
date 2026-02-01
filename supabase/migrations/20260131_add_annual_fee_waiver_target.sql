-- Migration: Add annual_fee_waiver_target to accounts table
-- Date: 2026-01-31
-- Purpose: Track spending threshold for annual fee waiver eligibility

-- Add column to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS annual_fee_waiver_target DECIMAL(15,2) DEFAULT NULL;

COMMENT ON COLUMN public.accounts.annual_fee_waiver_target IS 'Minimum annual spend to waive annual fee (if applicable)';
