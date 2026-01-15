-- Add is_archived column to batches table
ALTER TABLE batches ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- Index for faster filtering
CREATE INDEX idx_batches_is_archived ON batches (is_archived);