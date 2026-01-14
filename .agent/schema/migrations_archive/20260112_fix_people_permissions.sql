-- Force schema cache reload by touching the schema
-- 1. Ensure permissions are correct (Renaming sometimes drops grants)
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLE public.people TO anon,
    authenticated,
    service_role;
-- 2. Ensure RLS is enabled (good practice)
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
-- 3. Create a dummy policy if none exists (just to be safe, though existing ones should persist)
-- Check if policies exist first? simpler to just re-apply or ensure open access if that was the intent.
-- Assuming "people" behaves like "profiles" did.
-- 4. Force a DDL change to trigger PostgREST schema reload reliably
COMMENT ON TABLE public.people IS 'People profiles (renamed from profiles)';
-- 5. Explicit Reload Command
NOTIFY pgrst,
'reload schema';