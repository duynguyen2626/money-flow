import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertTransactionCashback } from '@/services/cashback.service';
import { TransactionWithDetails } from '@/types/moneyflow.types';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const txnId = searchParams.get('id');

    if (!txnId) {
        return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch full transaction details needed for upsert
    // Fetch transaction details
    // We simplify the query to avoid relationship errors. 
    // The cashback service re-fetches the account config internally.
    const { data: txn, error } = await supabase
        .from('transactions')
        .select(`
            *,
            categories(name)
        `)
        .eq('id', txnId)
        .single();

    if (error || !txn) {
        return NextResponse.json({ error: 'Transaction not found', details: error }, { status: 404 });
    }

    // Normalize to TransactionWithDetails
    // Note: The specific shape depends on your mapper, but upsertTransactionCashback mainly needs:
    // id, type, amount, account_id, occurred_at, tag, cashback_mode, cashback_share_percent, cashback_share_fixed
    // and attached account info for config.
    // The service fetches account again, so we just need the transaction fields.

    // We need to cast or ensure shape. upsertTransactionCashback expects TransactionWithDetails
    // which implies some joined fields. However, the service internally fetches account again.
    // Let's rely on the service to do its job, but we must pass a valid object.
    // Our select above is quite comprehensive.

    // Actually upsertTransactionCashback takes `TransactionWithDetails`.
    // Let's try to simulate checking if the entry exists first.

    const { data: existingEntry } = await supabase
        .from('cashback_entries')
        .select('*')
        .eq('transaction_id', txnId)
        .maybeSingle();

    try {
        // Force re-run logic
        const payload = {
            ...txn,
            category_name: (txn as any).categories?.name
        };
        await upsertTransactionCashback(payload as unknown as TransactionWithDetails);

        // Fetch result
        const { data: newEntry } = await supabase
            .from('cashback_entries')
            .select('*')
            .eq('transaction_id', txnId)
            .single();

        return NextResponse.json({
            success: true,
            message: 'Recalculated cashback',
            before: existingEntry,
            after: newEntry,
            transaction_amount: txn.amount,
            cashback_fixed: txn.cashback_share_fixed,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
