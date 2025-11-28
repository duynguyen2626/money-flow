AGENT TASK: TEST SUPABASE CLI INTEGRATION

Context:
We are switching from Manual SQL Editor to Supabase CLI workflows.
We need to verify if the Agent can execute CLI commands successfully.

Objective:

Create a migration to create a dummy table cli_test.

Push the migration to the remote database.

Instructions for Agent:

Generate Migration:
Run command: supabase migration new create_cli_test_table

Write SQL:
Locate the created file in supabase/migrations/ and write this content:

CREATE TABLE IF NOT EXISTS "public"."cli_test" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO "public"."cli_test" ("message") VALUES ('Hello from VS Code CLI!');


Apply Migration:
Run command: supabase db push

Cleanup (After Testing):
The migration file `20251128120000_drop_cli_test.sql` already exists to clean up the test table.
Run command: supabase db push

Report:
Confirm if the command executed successfully.