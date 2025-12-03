import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually to avoid 'dotenv' dependency
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
    const sqlFile = process.argv[2];
    if (!sqlFile) {
        console.error('Usage: npx tsx scripts/run-sql.ts <path-to-sql-file>');
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), sqlFile);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        process.exit(1);
    }

    console.log(`Connecting to Supabase at ${supabaseUrl}...`);

    // Simple connection check (optional, but good for feedback)
    const { error: healthError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (healthError) {
        console.error('Connection failed:', healthError.message);
        process.exit(1);
    }
    console.log('Connection successful.');

    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    console.log(`Executing SQL from ${sqlFile}...`);

    // Supabase JS client doesn't support raw SQL execution directly via public API usually, 
    // unless using the rpc() to call a function that runs SQL, or using pg library directly.
    // HOWEVER, for "paste once" convenience without installing 'pg', we can try to use a stored procedure if available,
    // OR we assume the user has a function `exec_sql` (common pattern) or we just use the `pg` driver if installed.
    // BUT, this project likely doesn't have `pg` configured for direct connection easily without connection string.
    // The user asked to "run migrate on terminal code".

    // If we don't have a generic exec_sql function, we can't run arbitrary SQL via supabase-js.
    // Let's check if we can use the `pg` driver.

    try {
        // Attempt to use postgres.js or pg if available, otherwise warn.
        // Since we are in a Next.js project, we might not have direct DB access configured in scripts.
        // BUT, we can use the `postgres` package if it's in package.json?
        // Let's try to use the `supabase-js` `rpc` if there is a function, otherwise we might be stuck.

        // ALTERNATIVE: Use the `psql` command string if the user has the connection string.
        // But the user wants "paste once".

        // Let's assume we can use `rpc('exec_sql', { query: sqlContent })` if it exists.
        // If not, we might need to instruct the user to use the dashboard.

        // WAIT. The user asked for a command to run migrate.
        // Maybe they mean `npx supabase db reset`? No, "paste once".

        // Let's try to use `postgres` (postgres.js) which is often used with Drizzle/Prisma, 
        // or just `pg`.

        // Let's check package.json first? No, I'll just try to use `rpc` first.
        // If that fails, I'll print the SQL and say "Please run this in Supabase SQL Editor".

        // Actually, the user might have `exec_sql` function.

        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (error) {
            // If exec_sql doesn't exist, we can't run arbitrary SQL via JS client easily.
            console.error('Error executing SQL via RPC (exec_sql might not exist):', error.message);
            console.log('Fallback: Trying to use direct Postgres connection if DATABASE_URL is present...');

            if (process.env.DATABASE_URL) {
                // We can try to require 'postgres' or 'pg'
                try {
                    const postgres = require('postgres');
                    const sql = postgres(process.env.DATABASE_URL);
                    await sql.unsafe(sqlContent);
                    console.log('SQL executed successfully via direct connection.');
                    await sql.end();
                    process.exit(0);
                } catch (e) {
                    console.error('Failed to use `postgres` driver:', e);
                    try {
                        const { Client } = require('pg');
                        const client = new Client({ connectionString: process.env.DATABASE_URL });
                        await client.connect();
                        await client.query(sqlContent);
                        await client.end();
                        console.log('SQL executed successfully via `pg` driver.');
                        process.exit(0);
                    } catch (e2) {
                        console.error('Failed to use `pg` driver:', e2);
                        console.error('Could not execute SQL. Please run the SQL in Supabase Dashboard.');
                    }
                }
            } else {
                console.error('DATABASE_URL not found in .env.local. Cannot connect directly.');
            }
        } else {
            console.log('SQL executed successfully via RPC.');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

runSql();
