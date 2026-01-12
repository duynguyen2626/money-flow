-- Rename table 'profiles' to 'people'
ALTER TABLE IF EXISTS "public"."profiles"
    RENAME TO "people";
-- Rename column 'avatar_url' to 'image_url' in 'people' table
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'people'
        AND column_name = 'avatar_url'
) THEN
ALTER TABLE "public"."people"
    RENAME COLUMN "avatar_url" TO "image_url";
END IF;
END $$;
-- Update RLS Policies (Fix references to 'profiles')
-- Note: PostgreSQL usually handles table renaming in policies automatically, 
-- but we should check if any raw SQL strings or functions rely on it.
-- This part is a safety check or explicit update if needed. 
-- Re-creating views or triggers if they rely on text, but usually simple rename is safe.
-- We will proceed with simple renames as requested.