import { createClient } from '../lib/supabase/server';
import { resolveCashbackPolicy } from '../services/cashback/policy-resolver';
import { parseCashbackConfig } from '../lib/cashback';

async function backfill() {
    console.log('--- Starting Cashback Metadata Backfill ---');
    // Note: createClient from server needs env vars. 
    // In script context or dev, ensure service role if needed or local env.
    const supabase = createClient();

    // 1. Fetch entries with NULL metadata
    const { data: entries, error } = await supabase
        .from('cashback_entries')
        .select(`
      id,
      transaction_id,
      account_id,
      amount,
      mode,
      transactions!inner (
        id,
        amount,
        category_id,
        occurred_at,
        persisted_cycle_tag,
        category_name:categories(name)
      ),
      accounts!inner (
        id,
        cashback_config
      )
    `)
        .is('metadata', null);

    if (error) {
        console.error('Error fetching entries:', error);
        return;
    }

    if (!entries || entries.length === 0) {
        console.log('No entries found with NULL metadata.');
        return;
    }

    console.log(`Found ${entries.length} entries to backfill.`);

    for (const row of entries) {
        const entry = row as any;
        const txn = entry.transactions as any;
        const acc = entry.accounts as any;

        try {
            // We need cycle totals. For backfill, we might approximate or fetch.
            // But resolveCashbackPolicy depends on spent_amount for levels.
            // Fetching spent_amount from cashback_cycles for that txn's cycle.
            const cycleTag = txn.persisted_cycle_tag;
            const { data: cycle } = await supabase
                .from('cashback_cycles')
                .select('spent_amount')
                .eq('account_id', acc.id)
                .eq('cycle_tag', cycleTag)
                .maybeSingle();

            const policy = resolveCashbackPolicy({
                account: acc,
                categoryId: txn.category_id,
                amount: Math.abs(txn.amount),
                cycleTotals: { spent: (cycle as any)?.spent_amount ?? 0 },
                categoryName: txn.category_name?.name
            });

            console.log(`Updating entry ${entry.id} for txn ${txn.id} with reason: ${policy.metadata.reason}`);

            const { error: updateError } = await supabase
                .from('cashback_entries')
                .update({ metadata: policy.metadata })
                .eq('id', entry.id);

            if (updateError) {
                console.error(`Failed to update entry ${entry.id}:`, updateError);
            }
        } catch (e) {
            console.error(`Error processing entry ${entry.id}:`, e);
        }
    }

    console.log('--- Backfill Completed ---');
}

backfill().catch(console.error);
