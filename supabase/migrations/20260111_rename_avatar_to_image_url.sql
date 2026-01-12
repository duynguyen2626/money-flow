-- Rename avatar_url to image_url in profiles table
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'avatar_url'
) THEN
ALTER TABLE profiles
    RENAME COLUMN avatar_url TO image_url;
END IF;
END $$;