-- Migration: Update batch_items for bank type filtering
-- Description: Add index on batch_id for efficient filtering by bank type
-- Date: 2026-01-15

-- Check if batch_items table exists and add index
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_items'
    ) THEN
        -- Add index for efficient joins with batches
        CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON batch_items(batch_id);
        
        -- Add index for status filtering
        CREATE INDEX IF NOT EXISTS idx_batch_items_status ON batch_items(status);
        
        -- Composite index for common queries
        CREATE INDEX IF NOT EXISTS idx_batch_items_batch_status ON batch_items(batch_id, status);
    END IF;
END $$;

COMMENT ON INDEX idx_batch_items_batch_id IS 'Efficient filtering of items by batch (used with bank_type join)';

COMMENT ON INDEX idx_batch_items_status IS 'Quick status filtering (pending, confirmed, etc.)';