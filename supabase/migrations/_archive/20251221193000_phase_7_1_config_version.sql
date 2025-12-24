-- Add cashback_config_version to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cashback_config_version INTEGER NOT NULL DEFAULT 1;

-- Update existing accounts to have version 1 (though DEFAULT already handles it)
UPDATE accounts SET cashback_config_version = 1 WHERE cashback_config_version IS NULL;
