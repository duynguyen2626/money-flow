# Fix RLS Error for Bank Mappings

You are encountering a "row-level security policy" error because the `bank_mappings` table has RLS enabled but no policy allowing inserts, and the `SUPABASE_SERVICE_ROLE_KEY` is missing from your environment variables.

## Option 1: Run Migration (Recommended)

Run the following command to apply the RLS policy that allows authenticated users to manage bank mappings:

```bash
npx supabase migration up
```
Or if you are using a remote project:
```bash
npx supabase db push
```

The migration file is located at: `supabase/migrations/20251127235500_add_rls_to_bank_mappings.sql`

## Option 2: Add Service Role Key

Add your Supabase Service Role Key to `.env.local` to allow the server to bypass RLS:

1.  Go to your Supabase Dashboard -> Project Settings -> API.
2.  Copy the `service_role` secret.
3.  Add it to `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

4.  Restart the development server (`npm run dev`).
