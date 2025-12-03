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

    // 1. Find transactions to delete
    // We want to delete:
    // 1. Old "Auto:" transactions
    // 2. New transactions with "slots]" in the note
    // 3. Transactions with metadata containing service_id (if metadata column exists)

    let query = supabase
        .from('transactions')
        .select('id')
        .or('note.ilike.Auto:%,note.ilike.%slots]%');

    // Try to check for metadata if possible, but .or with jsonb might be tricky in one go if column doesn't exist.
    // Since we know the user might not have metadata column yet, let's stick to note matching for safety,
    // OR we can try to fetch all and filter in memory if the dataset is small (it likely is for test).
    // But let's trust the 'note' pattern for now as it covers both cases.

    const { data: transactions, error: fetchError } = await query;

    if (fetchError) {
        console.error('Error fetching transactions:', fetchError.message);
        process.exit(1);
    }

    if (!transactions || transactions.length === 0) {
        console.log('No matching transactions found (checked "Auto:" and "slots]").');
        return;
    }

    const ids = transactions.map(t => t.id);
    console.log(`Found ${ids.length} transactions to delete.`);

    // 2. Delete transaction lines
    const { error: linesError } = await supabase
        .from('transaction_lines')
        .delete()
        .in('transaction_id', ids);

    if (linesError) {
        console.error('Error deleting transaction lines:', linesError.message);
        process.exit(1);
    }
    console.log('Deleted associated transaction lines.');

    // 3. Delete transactions
    const { error: txnsError } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

    if (txnsError) {
        console.error('Error deleting transactions:', txnsError.message);
        process.exit(1);
    }
    console.log('Deleted transactions successfully.');
}

cleanup();
