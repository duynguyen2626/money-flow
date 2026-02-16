-- Migration: Add account ownership fields
-- Date: 2026-02-16
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'accounts'
        AND column_name = 'holder_type'
) THEN
ALTER TABLE "public"."accounts"
ADD COLUMN "holder_type" text DEFAULT 'me' CHECK (holder_type IN ('me', 'relative', 'other'));
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'accounts'
        AND column_name = 'holder_person_id'
) THEN
ALTER TABLE "public"."accounts"
ADD COLUMN "holder_person_id" uuid REFERENCES "public"."people"("id") ON DELETE
SET NULL;
END IF;
END $$;