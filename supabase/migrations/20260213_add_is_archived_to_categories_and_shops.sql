-- Add is_archived column to categories table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_archived') THEN
        ALTER TABLE "categories" ADD COLUMN "is_archived" BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add is_archived column to shops table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'is_archived') THEN
        ALTER TABLE "shops" ADD COLUMN "is_archived" BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
