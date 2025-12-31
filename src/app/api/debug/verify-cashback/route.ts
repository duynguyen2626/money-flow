import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTransaction, updateTransaction, deleteTransaction } from '@/services/transaction.service';

export async function GET() {
    const supabase = createClient();
    const logs: string[] = [];
    function log(msg: string) { logs.push(msg); }

    try {
        log('Starting Cashback Verification...');

        // 1. Find a Credit Card Account
        const { data: accounts } = await supabase.from('accounts').select('id, name').eq('type', 'credit_card').limit(1);

        if (!accounts || accounts.length === 0) {
            log('❌ No credit card account found for testing.');
            return NextResponse.json({ logs });
        }

        const account = (accounts as any)[0];
        log(`✅ Found Credit Card: ${account.name}`);

        // 2. Scenario 1: Real Fixed Cashback
        log('--- Case 1: Real Fixed (Spending 100, Cashback 10) ---');
        const t1Id = await createTransaction({
            amount: 100,
            occurred_at: new Date().toISOString(),
            type: 'expense',
            source_account_id: account.id, // For expense, source_account_id is the credit card
            cashback_mode: 'real_fixed',
            cashback_share_fixed: 10,
            note: 'VERIFY_AUTO_TEST'
        });

        if (!t1Id) throw new Error('Failed to create t1');
        log(`Created Txn: ${t1Id}`);

        // Verify Entry
        const { data: entry1 } = await supabase.from('cashback_entries').select('*').eq('transaction_id', t1Id).single();
        if (entry1 && (entry1 as any).mode === 'real' && (entry1 as any).amount === 10) {
            log('✅ Entry 1 Correct: Mode=real, Amount=10');
        } else {
            log(`❌ Entry 1 Failed: ${JSON.stringify(entry1)}`);
        }

        // 3. Scenario 2: Virtual Profit (None Back)
        log('--- Case 2: Update to None Back (Virtual) ---');
        await updateTransaction(t1Id, {
            amount: 100,
            occurred_at: new Date().toISOString(), // Use fresh or same date
            type: 'expense',
            source_account_id: account.id,
            // account_id removed as it is not in CreateTransactionInput
            cashback_mode: 'none_back',
            cashback_share_fixed: undefined,
            note: 'VERIFY_AUTO_TEST_UPDATED'
        });

        // Add delay for async operations if needed? No, await should be enough.

        const { data: entry2 } = await supabase.from('cashback_entries').select('*').eq('transaction_id', t1Id).single();
        if (entry2 && (entry2 as any).mode === 'virtual') {
            log(`✅ Entry 2 Correct: Mode=virtual, Amount=${(entry2 as any).amount}`);
        } else {
            log(`❌ Entry 2 Failed: ${JSON.stringify(entry2)}`);
        }

        // 4. Scenario 3: Voluntary Overflow
        log('--- Case 3: Update to Voluntary (5) ---');
        await updateTransaction(t1Id, {
            amount: 100,
            occurred_at: new Date().toISOString(),
            type: 'expense',
            source_account_id: account.id,
            cashback_mode: 'voluntary',
            cashback_share_fixed: 5,
            note: 'VERIFY_AUTO_TEST_VOLUNTARY'
        });

        const { data: entry3 } = await supabase.from('cashback_entries').select('*').eq('transaction_id', t1Id).single();
        if (entry3 && (entry3 as any).mode === 'voluntary' && (entry3 as any).amount === 5) {
            log('✅ Entry 3 Correct: Mode=voluntary, Amount=5');
        } else {
            log(`❌ Entry 3 Failed: ${JSON.stringify(entry3)}`);
        }

        // 5. Cleanup
        log('--- Cleanup ---');
        await deleteTransaction(t1Id);
        const { data: entry4 } = await supabase.from('cashback_entries').select('*').eq('transaction_id', t1Id).maybeSingle();
        if (!entry4) {
            log('✅ Entry Deleted Successfully');
        } else {
            log('❌ Entry Still Exists');
        }

        log('Verification Complete.');

        return NextResponse.json({ logs });
    } catch (e: any) {
        log(`ERROR: ${e.message}`);
        console.error(e);
        return NextResponse.json({ logs, error: e.message }, { status: 500 });
    }
}
