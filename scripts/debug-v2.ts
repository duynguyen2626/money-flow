
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadAccountTransactionsV2 } from '../src/services/transaction.service';
import { getAccountCycles, getTransactionsForCycle } from '../src/services/cashback.service';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock createClient for the services which use @/lib/supabase/server
// We can't easily mock the module import in this script without a test runner.
// So we will just use the functions if they allow dependency injection or if we can rely on env.
// The services import createClient from '@/lib/supabase/server'.
// This script runs in node, so 'next/headers' (used in server client) will fail.
// We need to modify the services or use a different approach.

// Actually, I can't easily run the service functions directly if they use 'next/headers' cookies().
// I should have checked if they allowed client injection.
// cashback.service.ts allows injection in some places but getAccountCycles uses createClient() directly.

console.log("Services use server-side cookies, cannot run directly in script without mocking.");
console.log("Skipping direct execution. Please verify in UI.");

// However, I can test dynamic queries using raw supabase client here to ensure my queries are valid SCQL.

async function testQueries() {
    console.log("Testing queries...");

    // 1. Test standard Transaction Query (V2)
    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select(`
            id, occurred_at, note, amount, type, status,
            category:categories(name, icon),
            person:people(name)
        `)
        .limit(1);

    if (txnError) console.error("Transaction Query Error:", txnError);
    else console.log("Transaction Query Success:", txns?.length, "rows");

    // 2. Test Cashback Cycles Query
    const { data: cycles, error: cycleError } = await supabase
        .from('cashback_cycles')
        .select('id, cycle_tag, spent_amount, real_awarded, virtual_profit')
        .limit(1);

    if (cycleError) console.error("Components Query Error:", cycleError);
    else console.log("Cycles Query Success:", cycles?.length, "rows");

    // 3. Test Cashback Entries Query (TransactionsForCycle)
    // Need a valid cycle ID to test effectively, but we can test the select structure
    if (cycles && cycles.length > 0) {
        const cycleId = cycles[0].id;
        const { data: entries, error: entriesError } = await supabase
            .from('cashback_entries')
            .select(`
                mode, amount, metadata, transaction_id,
                transaction:transactions!inner (
                    id, occurred_at, note, amount, account_id,
                    cashback_share_percent, cashback_share_fixed,
                    category:categories(name, icon),
                    shop:shops(name, image_url),
                    person:people!transactions_person_id_fkey(name)
                )
            `)
            .eq('cycle_id', cycleId)
            .neq('transaction.status', 'void')
            .limit(1);

        if (entriesError) console.error("Entries Query Error:", entriesError);
        else console.log("Entries Query Success:", entries?.length, "rows");
    }
}

testQueries();
