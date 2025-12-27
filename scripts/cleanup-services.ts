import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually
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
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Connecting to Supabase...');

    // 1. Delete Transactions (Distributions & Payments)
    console.log('Step 1: finding transactions to delete...');

    // We look for:
    // - Service Distributions (Note contains "Slot:")
    // - Service Payments (Note contains "Payment for Service")
    // - Metadata contains 'service_id'

    const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, note, metadata')
        .or('note.ilike.%Slot:%,note.ilike.Payment for Service%');

    if (fetchError) {
        console.error('Error fetching transactions:', fetchError.message);
    } else if (transactions && transactions.length > 0) {
        const ids = transactions.map(t => t.id);
        console.log(`Found ${ids.length} transactions to delete.`);

        // Delete transactions
        const { error: txnsError } = await supabase
            .from('transactions')
            .delete()
            .in('id', ids);

        if (txnsError) console.error('Error deleting transactions:', txnsError.message);
        else console.log('Deleted transactions.');
    } else {
        console.log('No service transactions found.');
    }

    // 2. Delete Service Members
    console.log('Step 2: Deleting service members...');
    const { error: membersError } = await supabase
        .from('service_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (membersError) console.error('Error deleting service members:', membersError.message);
    else console.log('Deleted service members.');

    // 3. Delete Subscriptions (Services)
    console.log('Step 3: Deleting subscriptions...');
    const { error: servicesError } = await supabase
        .from('subscriptions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (servicesError) console.error('Error deleting subscriptions:', servicesError.message);
    else console.log('Deleted subscriptions.');

    // 4. Delete Bot Configs
    console.log('Step 4: Deleting bot configs...');
    const { error: botsError } = await supabase
        .from('bot_configs')
        .delete()
        .like('key', 'service_%');

    if (botsError) console.error('Error deleting bot configs:', botsError.message);
    else console.log('Deleted bot configs.');

    console.log('Cleanup complete.');
}

cleanup();
