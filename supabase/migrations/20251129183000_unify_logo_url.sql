-- Migrate data from img_url to logo_url if logo_url is null
UPDATE accounts
SET logo_url = img_url
WHERE logo_url IS NULL AND img_url IS NOT NULL;

-- Drop img_url column
ALTER TABLE accounts
DROP COLUMN img_url;
