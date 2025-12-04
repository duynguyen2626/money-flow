import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env');
const localEnvPath = path.resolve(__dirname, '../.env.local');
let envConfig = '';

if (fs.existsSync(localEnvPath)) {
    envConfig = fs.readFileSync(localEnvPath, 'utf8');
} else if (fs.existsSync(envPath)) {
    envConfig = fs.readFileSync(envPath, 'utf8');
} else {
    console.error('No .env or .env.local found');
    process.exit(1);
}
const env: Record<string, string> = {};
envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }

    env[key] = value;
});

console.log('Loaded Env Keys:', Object.keys(env));

// Use Service Role Key for Admin updates
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Missing Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Debugging Service Transaction ---');

    // 1. Check DRAFT_FUND
    const DRAFT_FUND_ID = '88888888-9999-9999-9999-111111111111';
    const DEFAULT_USER_ID = '917455ba-16c0-42f9-9cea-264f81a3db66';

    const { data: draftFund, error: draftError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', DRAFT_FUND_ID)
        .single();

    if (draftError) {
        console.error('Error fetching DRAFT_FUND:', draftError.message);
    } else {
        console.log('DRAFT_FUND found:', draftFund ? 'Yes' : 'No');
        console.log('DRAFT_FUND Owner:', draftFund?.owner_id);

        if (draftFund && !draftFund.owner_id) {
            console.log('Fixing DRAFT_FUND owner...');
            const { error: updateError } = await supabase
                .from('accounts')
                .update({ owner_id: DEFAULT_USER_ID })
                .eq('id', DRAFT_FUND_ID);

            if (updateError) console.error('Error updating DRAFT_FUND:', updateError.message);
            else console.log('DRAFT_FUND owner updated to:', DEFAULT_USER_ID);
        }
    }

    // 2. List all services and their transaction counts for DEC25
    const { data: services, error: serviceError } = await supabase
        .from('subscriptions')
        .select('id, name, price'); // Fetch price

    if (serviceError) {
        console.error('Error fetching services:', serviceError.message);
        return;
    }

    console.log(`Found ${services.length} services.`);

    for (const service of services) {
        console.log(`Service: ${service.name} (${service.id}) - Price: ${service.price} - ShopID: ${(service as any).shop_id}`); // Log ShopID
        const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .contains('metadata', { service_id: service.id, month_tag: 'DEC25' });

        if (countError) {
            console.error(`Error counting txns for ${service.name}:`, countError.message);
        } else {
            console.log(`Service: ${service.name} (${service.id}) - DEC25 Txns: ${count}`);
        }
    }

    // 3. Inspect Transactions for YouTube (or iCloud)
    console.log('\n--- Inspecting Transactions ---');
    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select(`
            id, note, metadata,
            transaction_lines (
                id, amount, type, person_id,
                profiles (name)
            )
        `)
        .ilike('tag', 'DEC25')
        .order('created_at', { ascending: false });

    if (txnError) {
        console.error('Error fetching transactions:', txnError);
    } else {
        console.log(`Found ${txns.length} transactions for DEC25.`);
        txns.forEach(t => {
            console.log(`Tx: ${t.note} (ID: ${t.id})`);
            t.transaction_lines.forEach((l: any) => {
                if (l.type === 'debit' && l.person_id) {
                    console.log(`  - Line: ${l.profiles?.name} (ID: ${l.person_id}) - Amount: ${l.amount}`);
                }
            });
        });
    }
    // 4. Check Sheet Links
    console.log('\n--- Inspecting Sheet Links ---');
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, sheet_link');

    if (profError) {
        console.error('Error fetching profiles:', profError);
    } else {
        console.log(`Found ${profiles.length} profiles.`);
        profiles.forEach(p => {
            console.log(`  - ${p.name}: ${p.sheet_link ? p.sheet_link.substring(0, 50) + '...' : 'NONE'}`);
        });
    }
    // 5. Check Reported IDs
    console.log('\n--- Inspecting Reported IDs ---');
    const reportedIds = [
        '11607abf-76ef-4c01-9ccb-00468fda22f5',
        '334cf400-b004-4be7-abf3-e0b5e424c618',
        '889881c8-9a9c-43c5-a1ba-e3ac6ee14175',
        'b4a45eba-403b-4c43-8428-9a5156009fc1',
        '45c07d6f-b51b-42e7-ab52-591b68533dd3'
    ];

    const { data: reportedTxns, error: repError } = await supabase
        .from('transactions')
        .select(`
            id, note, metadata,
            transaction_lines (
                id, amount, type, person_id,
                profiles (name)
            )
        `)
        .in('id', reportedIds);

    if (repError) {
        console.error('Error fetching reported IDs:', repError);
    } else {
        reportedTxns.forEach(t => {
            console.log(`Tx: ${t.note} (ID: ${t.id})`);
            t.transaction_lines.forEach((l: any) => {
                if (l.type === 'debit' && l.person_id) {
                    console.log(`  - Line: ${l.profiles?.name} (ID: ${l.person_id}) - Amount: ${l.amount}`);
                }
            });
        });
    }
}

main();
