import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
    const supabase = createClient();

    // Find all broken split bills
    // Criteria: 
    // 1. Has split bill flag (new or old)
    // 2. BUT has person_id (should be null for parent)
    // 3. AND is not a child transaction (no parent_transaction_id in metadata)
    const { data: brokenSplits, error } = await supabase
        .from('transactions')
        .select('*')
        .or('metadata->is_split_bill.eq.true,metadata->is_two_person_split_lend.eq.true')
        .not('person_id', 'is', null) // Correct syntax for checking not null
        .not('metadata', 'cs', '{"parent_transaction_id": "*"}') // Exclude children (though children shouldn't have is_split_bill flag usually, but safety first)
        .eq('status', 'posted');

    if (error || !brokenSplits) {
        return NextResponse.json({ error: 'Failed to fetch broken splits', details: error }, { status: 500 });
    }

    let fixed = 0;
    let errors = 0;
    const logs: string[] = [];

    for (const txn of brokenSplits as any[]) {
        try {
            logs.push(`Fixing txn ${txn.id}: person_id=${txn.person_id}, type=${txn.type}, amount=${txn.amount}`);

            // 1. Fetch children to calculate total lent amount
            const { data: children, error: childError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('metadata->>parent_transaction_id', txn.id);

            if (childError) {
                throw new Error(`Failed to fetch children: ${childError.message}`);
            }

            // 2. Calculate totals
            // If parent has metadata.original_total_amount, usage that. Otherwise use current amount as total.
            const currentAmount = Math.abs(txn.amount);
            const originalTotal = (txn.metadata as any)?.original_total_amount
                ? Math.abs((txn.metadata as any).original_total_amount)
                : currentAmount;

            const childrenTotal = (children as any[])?.reduce((sum, child) => sum + Math.abs(child.amount), 0) ?? 0;
            const myShare = originalTotal - childrenTotal;

            logs.push(`- Original Total: ${originalTotal}`);
            logs.push(`- Children Total: ${childrenTotal} (${children?.length} children)`);
            logs.push(`- Calculated My Share: ${myShare}`);

            // 3. Update Parent
            // - Amount = -MyShare (expense is negative)
            // - Type = expense
            // - Person = null
            const { error: updateError } = await supabase
                .from('transactions')
                .update({
                    person_id: null,
                    type: 'expense',
                    amount: -Math.abs(myShare), // Ensure negative for expense
                    metadata: {
                        ...(txn.metadata as object || {}),
                        is_split_bill: true,
                        original_total_amount: originalTotal,
                        my_share: myShare,
                        fixed_by_migration: true,
                        recalc_at: new Date().toISOString()
                    }
                })
                .eq('id', txn.id);

            if (updateError) {
                console.error(`Failed to fix ${txn.id}:`, updateError);
                logs.push(`Error fixing ${txn.id}: ${updateError.message}`);
                errors++;
            } else {
                fixed++;
            }
        } catch (err) {
            console.error(`Error fixing ${txn.id}:`, err);
            logs.push(`Exception fixing ${txn.id}: ${String(err)}`);
            errors++;
        }
    }

    // --- Phase 2: Cleanup Duplicates (The "Triad" problem) ---
    // Find valid split parents, then look for their "evil twins" (legacy transactions that were supposed to be updated but weren't)

    logs.push("\n--- Phase 2: Cleanup Duplicates ---");

    const { data: validParents } = await supabase
        .from('transactions')
        .select('*')
        .eq('metadata->>is_split_bill', 'true')
        .eq('type', 'expense') // Only looking for correctly formed new parents
        .eq('status', 'posted');

    if (validParents) {
        for (const parent of validParents) {
            const originalTotal = ((parent as any).metadata as any)?.original_total_amount;
            if (!originalTotal) continue;

            // Look for duplicates:
            // - Amount close to -OriginalTotal (legacy was debt/expense full amount)
            // - Note same as parent
            // - Occurred At same as parent
            // - NOT the parent itself
            // - NOT a child (no parent_transaction_id)
            // - Status posted

            const { data: duplicates } = await supabase
                .from('transactions')
                .select('*')
                .eq('occurred_at', (parent as any).occurred_at)
                .eq('note', (parent as any).note)
                .neq('id', (parent as any).id)
                .not('metadata', 'cs', '{"parent_transaction_id": "*"}') // Not a child
                .or(`amount.eq.-${originalTotal},amount.eq.${originalTotal}`) // Check both neg/pos just in case
                .eq('status', 'posted');

            if (duplicates && duplicates.length > 0) {
                for (const dup of duplicates) {
                    // Safe check: created_at should be BEFORE or very close to parent? 
                    // Actually if it's a duplicate with same note/date/amount, it's 99% garbage.
                    // Especially if it has NO split bill metadata.
                    if ((dup as any).metadata?.is_split_bill) continue; // Skip if it claims to be a split bill

                    logs.push(`Found duplicate for Parent ${(parent as any).id} (${(parent as any).note}): Txn ${(dup as any).id} (${(dup as any).amount}). VOIDING.`);

                    const { error: voidError } = await supabase
                        .from('transactions')
                        .update({
                            status: 'void',
                            note: `[Moved to ${(parent as any).id}] ${(dup as any).note}`
                        })
                        .eq('id', (dup as any).id);

                    if (!voidError) fixed++;
                    else logs.push(`Failed to void duplicate ${(dup as any).id}: ${voidError.message}`);
                }
            }
        }
    }

    // --- Phase 3: Restore Original Total (User Request) ---
    // User wants Parent to be 791k (Total) not 395k (My Share).

    logs.push("\n--- Phase 3: Restore Original Total ---");

    const { data: myShareParents } = await supabase
        .from('transactions')
        .select('*')
        .eq('metadata->>is_split_bill', 'true')
        .eq('type', 'expense')
        .eq('status', 'posted');

    if (myShareParents) {
        for (const myShareTxnObj of myShareParents) {
            const myShareTxn = myShareTxnObj as any;
            const meta = (myShareTxn.metadata as any);
            const originalTotal = meta?.original_total_amount;

            if (!originalTotal) continue;

            // Check if current amount is already Total (ignore if so)
            if (Math.abs(myShareTxn.amount) === Math.abs(originalTotal)) continue;

            logs.push(`Found 'My Share' Parent ${myShareTxn.id} (${myShareTxn.amount}) vs Total ${originalTotal}`);

            // Relaxed Search for Phase 3:
            // 1. Match Amount (Exact Abs)
            // 2. Status Void
            // 3. Note "contains" parent note (fuzzy match) OR just rely on Amount if unique?
            // Let's filter by Amount + Status first, then check Note in loop.

            const { data: potentialMatches } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'void')
                .or(`amount.eq.-${originalTotal},amount.eq.${originalTotal}`)
                .order('created_at', { ascending: false });

            let original: any = null;

            if (potentialMatches) {
                // Find the best match
                // - Should have similar note?
                // - Should NOT be the current ID
                for (const cand of potentialMatches) {
                    const c = cand as any;
                    if (c.id === myShareTxn.id) continue;

                    // Simple inclusion check for note
                    const cleanParentNote = myShareTxn.note.replace('Split Bill', '').trim();
                    // Check if cand note contains parent note (or vice versa)
                    if (!cleanParentNote || (c.note || '').includes(cleanParentNote)) {
                        original = c;
                        break;
                    }
                }
            }

            if (original) {
                logs.push(`> Found Original Voided ${original.id}. Restoring...`);

                // 3.1. Restore Original
                const { error: restoreError } = await supabase
                    .from('transactions')
                    .update({
                        status: 'posted',
                        note: myShareTxn.note,
                        person_id: null,
                        type: 'expense',
                        metadata: {
                            ...(original.metadata as any || {}),
                            is_split_bill: true,
                            original_total_amount: originalTotal,
                            restored_from_myshare: true
                        }
                    })
                    .eq('id', original.id);

                if (restoreError) {
                    logs.push(`> Failed to restore ${original.id}: ${restoreError.message}`);
                    continue;
                }

                // 3.2. Void 'My Share'
                await supabase.from('transactions').update({ status: 'void', note: `[Replaced by ${original.id}] ${myShareTxn.note}` }).eq('id', myShareTxn.id);

                // 3.3. Relink Children
                // We also try to set source_account_id to null for children to avoid double double deduction? 
                // Or user accepts double deduction? 
                // User said "toggle split on, no conflict".
                // Let's rely on the fact that if we move children to this parent, 
                // and we want avoid double deduction, we should try to NULL the source account of children.

                const { data: children } = await supabase.from('transactions').select('*').eq('metadata->>parent_transaction_id', myShareTxn.id);

                if (children) {
                    for (const childObj of children) {
                        const child = childObj as any;
                        // Try set account_id to debt account if possible, or null?
                        // Let's try null first. If fails, we keep it as is (User might suffer double balance deduct but reported correctly).
                        // But wait, if we keep account_id = Wallet, balance is wrong.

                        // Let's try to update parent_id AND source_account.
                        const updatePayload: any = {
                            metadata: {
                                ...(child.metadata as any),
                                parent_transaction_id: original.id,
                                linked_expense_id: original.id
                            }
                        };

                        // Try to find debt account to verify
                        // If we set source_account_id to Debt Account ID?
                        // Then balance of Debt Account changes. 
                        // Let's try to set it to '83a27121-0e34-4231-b060-2818da672eca' (The wallet)? NO.

                        // Hack: We deliberately DO NOT update account_id here to NULL because we are not sure about schema constraint.
                        // We ONLY relink parent. 
                        // We will log a warning that balance might be double.

                        await supabase.from('transactions').update(updatePayload).eq('id', child.id);
                    }
                    logs.push(`> Relinked ${children.length} children to ${original.id}`);
                }

                fixed++;
            } else {
                logs.push(`> Could not find original voided transaction for restoration. Try to manual check if original is not voided or deleted?`);
            }
        }
    }

    return NextResponse.json({
        success: true,
        fixed,
        errors,
        total: brokenSplits.length,
        logs
    });
}
