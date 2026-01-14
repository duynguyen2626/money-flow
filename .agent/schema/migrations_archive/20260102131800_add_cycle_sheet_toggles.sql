-- Add per-cycle toggle overrides to person_cycle_sheets
-- These allow individual cycles to override the master settings from profiles table
ALTER TABLE person_cycle_sheets
ADD COLUMN IF NOT EXISTS show_bank_account BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS show_qr_image BOOLEAN DEFAULT NULL;
-- Add comments explaining the inheritance behavior
COMMENT ON COLUMN person_cycle_sheets.show_bank_account IS 'Per-cycle override for showing bank account. NULL = inherit from profiles.sheet_show_bank_account, TRUE/FALSE = override master setting';
COMMENT ON COLUMN person_cycle_sheets.show_qr_image IS 'Per-cycle override for sending QR image. NULL = inherit from profiles.sheet_show_qr_image, TRUE/FALSE = override master setting';
-- Create index for faster lookups when checking cycle settings
CREATE INDEX IF NOT EXISTS idx_person_cycle_sheets_person_cycle ON person_cycle_sheets(person_id, cycle_tag);