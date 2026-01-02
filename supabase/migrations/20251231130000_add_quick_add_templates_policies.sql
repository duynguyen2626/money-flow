-- Add RLS policies for quick_add_templates table
-- Allow users to manage their own templates
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "quick_add_templates_select_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_insert_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_update_own" ON public.quick_add_templates;
DROP POLICY IF EXISTS "quick_add_templates_delete_own" ON public.quick_add_templates;
-- Create policies
CREATE POLICY "quick_add_templates_select_own" ON public.quick_add_templates FOR
SELECT USING (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_insert_own" ON public.quick_add_templates FOR
INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_update_own" ON public.quick_add_templates FOR
UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "quick_add_templates_delete_own" ON public.quick_add_templates FOR DELETE USING (auth.uid() = profile_id);
-- Enable RLS
ALTER TABLE public.quick_add_templates ENABLE ROW LEVEL SECURITY;