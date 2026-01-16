-- Migration: Create batch_settings table
-- Description: Store sheet URLs and webhook configurations per bank type
-- Date: 2026-01-15

-- Create batch_settings table
CREATE TABLE IF NOT EXISTS batch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_type TEXT NOT NULL UNIQUE CHECK (bank_type IN ('MBB', 'VIB')),

-- Google Sheets integration
sheet_url TEXT,
sheet_name TEXT, -- Optional: Sheet tab name

-- Webhook integration
webhook_url TEXT, webhook_enabled BOOLEAN DEFAULT false,

-- Bank branding
image_url TEXT, -- Bank icon/logo URL

-- Metadata
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),

-- Constraints
CONSTRAINT valid_sheet_url CHECK (
        sheet_url IS NULL OR 
        sheet_url ~ '^https://script\.google\.com/macros/s/.+/exec$'
    ),
    CONSTRAINT valid_webhook_url CHECK (
        webhook_url IS NULL OR 
        webhook_url ~ '^https?://.+'
    )
);

-- Add comments for documentation
COMMENT ON TABLE batch_settings IS 'Configuration settings for batch processing per bank type (MBB/VIB)';

COMMENT ON COLUMN batch_settings.sheet_url IS 'Google Apps Script URL. Format: https://script.google.com/macros/s/{SCRIPT_ID}/exec';

COMMENT ON COLUMN batch_settings.webhook_url IS 'Optional webhook URL for auto-sync after batch operations';

COMMENT ON COLUMN batch_settings.image_url IS 'Bank icon/logo image URL for display in UI';

-- Seed default settings
INSERT INTO
    batch_settings (
        bank_type,
        sheet_url,
        webhook_url
    )
VALUES ('MBB', NULL, NULL),
    ('VIB', NULL, NULL)
ON CONFLICT (bank_type) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_batch_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_batch_settings_updated_at
    BEFORE UPDATE ON batch_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_settings_updated_at();

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE batch_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their batch settings" ON batch_settings FOR SELECT USING (true);
-- CREATE POLICY "Users can update their batch settings" ON batch_settings FOR UPDATE USING (true);