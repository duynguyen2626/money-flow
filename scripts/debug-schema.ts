import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSchemaAndTxns() {
    console.log('--- Checking Subscriptions Schema ---');
    // We can't easily check schema directly via JS client, but we can check if a query with shop_id works
    const { data: service, error: serviceError } = await supabase
        .from('subscriptions')
        .select('id, name, shop_id')
        .limit(1);

    if (serviceError) {
        console.error('Error fetching subscriptions:', serviceError);
    } else {
        console.log('Subscriptions table has shop_id column:', service && service.length > 0 ? 'Yes' : 'Empty table');
        if (service && service.length > 0) {
            console.log('Sample service:', service[0]);
        }
    }

    console.log('\n--- Checking Recent Transactions (Last 10) ---');
    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select(`
            id, note, shop_id, created_at,
            shops ( name, logo_url )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (txnError) {
        console.error('Error fetching transactions:', txnError);
    } else {
        txns.forEach(t => {
            console.log(`\nTx: ${t.note}`);
            console.log(`  Created: ${t.created_at}`);
            console.log(`  Shop ID: ${t.shop_id}`);
            console.log(`  Shop Name: ${t.shops?.name}`);
        });
    }
}

debugSchemaAndTxns();
