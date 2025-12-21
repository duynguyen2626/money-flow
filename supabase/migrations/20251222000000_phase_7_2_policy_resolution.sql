-- Phase 7.2: Cashback Policy Resolution Documentation
-- This migration adds comments documenting the policy resolution order
-- and creates an index for analytics queries

-- Document the metadata column structure and resolution order
COMMENT ON COLUMN cashback_entries.metadata IS 
'Policy attribution metadata (Phase 7.2). Structure:
{
  "policySource": "category_rule" | "level_default" | "program_default" | "legacy",
  "reason": "Human-readable explanation",
  "rate": 0.01,
  "levelId": "uuid",
  "levelName": "LEVEL 1",
  "levelMinSpend": 5000000,
  "ruleId": "uuid",
  "categoryId": "uuid",
  "ruleMaxReward": 300000
}

Resolution order:
1. Category Rule (if category matches a rule in active level)
2. Level Default (if spending qualifies for a level)
3. Program Default (fallback to account base rate)

The policy resolver (src/services/cashback/policy-resolver.ts) is the single 
source of truth for rate determination.';

-- Add index for policy source queries (useful for analytics and debugging)
CREATE INDEX IF NOT EXISTS idx_cashback_entries_policy_source 
ON cashback_entries ((metadata->>'policySource'));

-- Add index for level queries
CREATE INDEX IF NOT EXISTS idx_cashback_entries_level_id 
ON cashback_entries ((metadata->>'levelId'));

-- Add index for category rule queries
CREATE INDEX IF NOT EXISTS idx_cashback_entries_category_id 
ON cashback_entries ((metadata->>'categoryId'));
