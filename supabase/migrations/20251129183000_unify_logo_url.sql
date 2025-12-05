DO $$
BEGIN
    -- Check if img_url column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'img_url') THEN
        -- Migrate data
        UPDATE accounts
        SET logo_url = img_url
        WHERE logo_url IS NULL AND img_url IS NOT NULL;

        -- Drop column
        ALTER TABLE accounts DROP COLUMN img_url;
    END IF;
END $$;
