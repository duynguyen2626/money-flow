-- Enable RLS on bank_mappings if not already enabled
ALTER TABLE "public"."bank_mappings" ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update/delete for authenticated users (or restrict as needed)
CREATE POLICY "Allow all access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
