-- 1. Enable RLS on bank_mappings (good practice)
ALTER TABLE bank_mappings ENABLE ROW LEVEL SECURITY;

-- 2. Allow everyone (anon and authenticated) to READ bank_mappings
-- This fixes the issue of data not showing in the tab
DROP POLICY IF EXISTS "Allow public read access" ON bank_mappings;
CREATE POLICY "Allow public read access" ON bank_mappings
  FOR SELECT USING (true);

-- 3. Allow authenticated users to INSERT/UPDATE/DELETE (optional, if you want UI management later)
-- For now, import uses Service Role Key so this isn't strictly needed for import, 
-- but good for future "Edit" features in the UI.
DROP POLICY IF EXISTS "Allow authenticated full access" ON bank_mappings;
CREATE POLICY "Allow authenticated full access" ON bank_mappings
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Drop unnecessary table 'bank_items' if it exists
-- We use 'batch_items' and 'bank_mappings', so 'bank_items' is likely a typo/unused.
DROP TABLE IF EXISTS bank_items;
