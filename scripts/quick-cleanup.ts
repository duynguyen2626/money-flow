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

    // Find transactions to delete
    // Criteria: tag='DEC25' OR note contains 'Slot:' OR note contains 'Auto:'
    const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, note, tag')
        .or('tag.eq.DEC25,note.ilike.%Slot:%,note.ilike.Auto:%');

    if (fetchError) {
        console.error('Error fetching transactions:', fetchError.message);
        return;
    }

    if (!transactions || transactions.length === 0) {
        console.log('No matching transactions found.');
        return;
    }

    const ids = transactions.map(t => t.id);
    console.log(`Found ${ids.length} transactions to delete.`);

    // Delete lines first
    const { error: linesError } = await supabase
        .from('transaction_lines')
        .delete()
        .in('transaction_id', ids);

    if (linesError) {
        console.error('Error deleting transaction lines:', linesError.message);
        return;
    }
    console.log('Deleted transaction lines.');

    // Delete transactions
    const { error: txnsError } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

    if (txnsError) {
        console.error('Error deleting transactions:', txnsError.message);
        return;
    }
    console.log('Deleted transactions.');
}

cleanup();
