-- Add bank_type column to bank_mappings table
ALTER TABLE "public"."bank_mappings"
ADD COLUMN IF NOT EXISTS "bank_type" TEXT DEFAULT 'VIB';
-- Drop old unique constraint on bank_code
ALTER TABLE "public"."bank_mappings" DROP CONSTRAINT IF EXISTS "bank_mappings_bank_code_key";
-- Add composite unique constraint on (bank_code, bank_type)
-- Add composite unique constraint on (bank_code, bank_type)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_mappings_bank_code_bank_type_key'
) THEN
ALTER TABLE "public"."bank_mappings"
ADD CONSTRAINT "bank_mappings_bank_code_bank_type_key" UNIQUE ("bank_code", "bank_type");
END IF;
END $$;
-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bank_mappings_bank_type ON "public"."bank_mappings" ("bank_type");