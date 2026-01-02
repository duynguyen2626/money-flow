-- Add bank_type column to batches table
ALTER TABLE "public"."batches"
ADD COLUMN IF NOT EXISTS "bank_type" text NOT NULL DEFAULT 'VIB';
-- Add check constraint for allowed bank types (optional but good practice)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'batches_bank_type_check'
) THEN
ALTER TABLE "public"."batches"
ADD CONSTRAINT "batches_bank_type_check" CHECK ("bank_type" IN ('VIB', 'MBB'));
END IF;
END $$;