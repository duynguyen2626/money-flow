import { syncAllTransactions } from '../src/services/sheet.service';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual Env Parsing
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            envConfig[key] = value;
        }
    });
}

// Mock Supabase Client for the service (if needed, but service uses its own import)
// We just need to set env vars so the service can pick them up?
// No, the service imports `createClient` from `@/lib/supabase/server`.
// In a script, `@/lib/supabase/server` might fail because it uses `cookies()`.
// We need to mock it or use a version that works in scripts.

// Actually, `sheet.service.ts` imports `createClient` from `@/lib/supabase/server`.
// This will fail in a standalone script.
// I need to modify `sheet.service.ts` to support script usage or mock it.
// Or I can just copy the logic into this script to verify the query.

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl!, supabaseKey!);

const LAM_ID = 'eccde148-a84e-455f-ba96-c8aa0b149ac8';

async function testSync() {
    console.log(`Testing sync for Lam (${LAM_ID})...`);

    const { data, error } = await supabase
        .from('transaction_lines')
        .select(`
      id,
      amount,
      metadata,
      transactions!inner(
        id,
        occurred_at,
        note,
        status,
        tag,
        shop_id,
        shops ( name, logo_url ),
        transaction_lines (
          id,
          type,
          account_id,
          category_id,
          accounts ( name, type, logo_url ),
          categories ( name, type )
        )
      )
    `)
        .eq('person_id', LAM_ID)
        .order('occurred_at', { foreignTable: 'transactions', ascending: true });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    console.log(`Found ${data.length} lines for Lam.`);

    data.forEach((row: any) => {
        console.log(`Line ID: ${row.id}, Amount: ${row.amount}`);
        console.log(`  Tx Note: ${row.transactions.note}`);
        console.log(`  Tx ID: ${row.transactions.id}`);
    });
}

testSync();
