-- Enable RLS on bank_mappings if not already enabled
ALTER TABLE "public"."bank_mappings" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do everything on bank_mappings
CREATE POLICY "Enable all access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
