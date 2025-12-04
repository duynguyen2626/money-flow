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

async function debugIcons() {
    console.log('--- Debugging Shop Icons ---');

    // 1. Fetch recent transactions with "Youtube" or "iCloud" in the note
    const { data: txns, error } = await supabase
        .from('transactions')
        .select(`
            id, note, shop_id,
            shops ( id, name, logo_url )
        `)
        .or('note.ilike.%Youtube%,note.ilike.%iCloud%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    console.log(`Found ${txns.length} transactions:`);
    txns.forEach(t => {
        console.log(`\nTx: ${t.note}`);
        console.log(`  ID: ${t.id}`);
        console.log(`  Shop ID: ${t.shop_id}`);
        console.log(`  Shop Name: ${t.shops?.name}`);
        console.log(`  Shop Logo: ${t.shops?.logo_url}`);
    });

    // 2. Check the Service definitions to see if they have shop_id
    console.log('\n--- Checking Service Definitions ---');
    const { data: services, error: serviceError } = await supabase
        .from('subscriptions')
        .select('id, name, shop_id, shops(name, logo_url)');

    if (serviceError) {
        console.error('Error fetching services:', serviceError);
    } else {
        services.forEach(s => {
            console.log(`Service: ${s.name}`);
            console.log(`  Shop ID: ${s.shop_id}`);
            console.log(`  Shop Name: ${s.shops?.name}`);
            console.log(`  Shop Logo: ${s.shops?.logo_url}`);
        });
    }
}

debugIcons();
