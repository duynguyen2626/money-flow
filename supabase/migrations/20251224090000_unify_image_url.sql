DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='logo_url') THEN
    ALTER TABLE public.accounts RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='logo_url') THEN
    ALTER TABLE public.shops RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='logo_url') THEN
    ALTER TABLE public.categories RENAME COLUMN logo_url TO image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_mappings' AND column_name='logo_url') THEN
    ALTER TABLE public.bank_mappings RENAME COLUMN logo_url TO image_url;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
