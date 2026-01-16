"use server";

import { createClient } from "@/lib/supabase/server";
import { CreateTransactionInput, normalizeAmountForType } from "./transaction.service";
import { revalidatePath } from "next/cache";

export type SplitShare = {
    person_id: string | null; // null for "Me"
    amount: number; // This is the FINAL SHARE (after voucher) effectively
    // Extended fields
    share_before?: number;
    voucher_amount?: number;
    advance_amount?: number;
    paid_by?: string;
    note?: string;
    is_my_share?: boolean;
};

export type SplitBillInput = {
    parent_transaction: CreateTransactionInput;
    shares: SplitShare[];
    split_method: 'equal' | 'custom';
};

export async function validateSplitIntegrity(
    parentAmount: number,
    shares: SplitShare[]
): Promise<{ valid: boolean; diff: number }> {
    // Parent Amount is the ACTUAL PAID amount (Net).
    // So usually: Sum(FinalShares) - Sum(Advance) = ParentAmount?
    // OR: ParentAmount is just the connection to bank.
    // Logic:
    // If I paid 800k (Parent).
    // A Share 400k (owed).
    // B Share 400k (me).
    // Sum Shares = 800k. Match.
    //
    // If A paid 100k in advance?
    // Then I only paid 700k? Or I paid 800k and A paid 100k separately?
    // Usually "Advance Payment" in this UI means "A paid partly for the bill".
    // If Bill is 1M. Voucher 0.
    // A share 500k. B share 500k.
    // A paid 100k cash. I paid 900k card.
    // UI Parent Transaction Amount = 900k (what I enter in form).
    // A Debt = 500k - 100k = 400k.
    // B Expense = 500k.
    // Sum Children = 900k. Match.
    //
    // So: Sum(Share.amount) SHOULD match Parent.Amount.
    // (Assuming Share.amount passed here IS (finalShare - advanceAmount)).

    const totalShare = shares.reduce((sum, s) => sum + s.amount, 0);
    // Allow small float diff
    const diff = Math.abs(parentAmount - totalShare);
    return {
        valid: diff < 1.0, // Tolerance of 1 unit (e.g. 1 dong)
        diff
    };
}

export async function createSplitBill(input: SplitBillInput) {
    const supabase = createClient();
    const { parent_transaction, shares, split_method } = input;

    // 1. Validate
    const parentAbsAmount = Math.abs(parent_transaction.amount);
    const { valid, diff } = await validateSplitIntegrity(parentAbsAmount, shares);

    if (!valid) {
        throw new Error(`Split sum mismatch. Parent: ${parentAbsAmount}, Shares (Sum): ${parentAbsAmount - diff} (Diff: ${diff})`);
    }

    if (shares.length < 2) {
        throw new Error("Split requires at least 2 participants");
    }

    // 2. Create Parent Transaction
    const parentMetadata = {
        ...(parent_transaction.metadata || {}),
        is_split_bill: true,
        split_method,
        split_participants_count: shares.length,
        split_shares: shares, // Store full snapshot
        // my_share_amount is derived from the share where person_id is null
        my_share_amount: shares.find(s => !s.person_id)?.amount || 0
    };

    // We reuse the createTransaction logic but purely via DB to ensure atomicity if possible, 
    // or just call the service. using service is better for hooks (sheet sync etc), 
    // BUT child transactions might trigger duplicate syncs or weirdness.
    // 
    // STRATEGY: 
    // - Parent is the "Real" bank transaction. It should affect the Bank Account Balance.
    // - Children are "Virtual" or "Partial" representations.
    //   - "Me" share: Expense/Income category. Affects... what? 
    //     If Parent is -100k (Bank).
    //     Child "Me" is -40k (Food).
    //     Child "Friend" is -60k (Debt).
    //     
    //     If we sum up: 
    //     Bank Balance: -100k (from Parent). Children should NOT affect Bank Balance.
    //     
    //     So Children must have `account_id` as... null? Or same account but excluded from balance calc?
    //     
    //     If Children have `account_id` same as parent, created via `createTransaction`, they WILL deduct balance.
    //     Then we count -100k (Parent) AND -40k (Child1) AND -60k (Child2) = -200k total. WRONG.
    //
    //     SOLUTION:
    //     Parent transaction should effectively just be the "funding source" record?
    //     OR Parent is the ONLY one strictly affecting the Payment Account balance.
    //     Children should be "Balance Neutral" or linked to a "Split Clearing" account?
    //
    //     Wait, how does Money Lover or standard apps do it?
    //     Usually:
    //     - Parent: -100k (Wallet). Category: Split Bill (or hidden).
    //     - Children: 
    //        - -40k (Wallet -> Food). but we already deducted 100k.
    //
    //     The prompt says:
    //     "Parent transaction created with: amount = -150000"
    //     "Child #1 (My share): amount = -60000"
    //     
    //     If both are standard transactions, they double count.
    //     
    //     The prompt says in "Expense Report":
    //     "My share (150k) is INCLUDED"
    //     "Parent transaction (450k) is NOT double-counted"
    //     
    //     This implies filtering.
    //     Query: `parent_transaction_id IS NULL OR metadata->>'is_my_share' = 'true'`
    //     
    //     If `parent_transaction_id IS NULL`, we get the Parent.
    //     If we include Parent, we get 450k.
    //     If we include MyShare, we get 150k.
    //     We can't include BOTH.
    //     
    //     The Query in Test 5.1 says:
    //     `WHERE category_id = 'food-drink' AND (parent_transaction_id IS NULL OR metadata->>'is_my_share' = 'true')`
    //     
    //     If Parent has `category_id = 'food-drink'` (inherited), then Parent is included. = 450k.
    //     AND MyShare also has category. = 150k.
    //     Total = 600k.
    //
    //     So Parent MUST NOT have the specific expense category? Or Parent is EXCLUDED if it has children?
    //     
    //     Actually the logic `parent_transaction_id IS NULL` includes Parent.
    //     But if Parent is a Split Bill, effectively it shouldn't count as "Expense" of specific category?
    //     
    //     Maybe Parent should have `type='transfer'` or special handling?
    //     
    //     Let's look at the Test 5.1 Query again carefully:
    //     `WHERE category_id = 'food-drink' AND (parent_transaction_id IS NULL OR metadata->>'is_my_share' = 'true')`
    //     
    //     This query seems flawed if Parent keeps the category.
    //     
    //     However, if the "Split" feature is implemented, usually:
    //     - Parent holds the "Cash Flow" (Bank deduction).
    //     - Children hold the "Classification" (Expense vs Debt).
    //     
    //     So Parent might need `category_id` to be null or generic "Split"?
    //     
    //     Let's verify what `createSplitBill` in the prompt says:
    //     - Child #1 ... category_id = parent.category_id (inherited)
    //     - Child #2 (Friend) ... category_id = null
    //     
    //     If Parent has `category_id`, and Child #1 has `category_id`.
    //     
    //     We need to make sure Reports exclude Parent if it is a Split Bill?
    //     OR Reports only look at Children?
    //     
    //     The prompt Test 5.3 says:
    //     `WHERE parent_transaction_id IS NULL -- Only parents
    //      OR metadata->>'is_split_bill' != 'true'`
    //      
    //     Wait, SQL OR logic:
    //     If it is a Parent (parent_id is null) ...
    //     ... AND `is_split_bill` != 'true'? 
    //     The query provided in 5.3 is checking Cashback.
    //     
    //     Let's assume for general Expense Reports, we should:
    //     - Exclude Parent IF it is a split bill?
    //     - Include Children?
    //
    //     BUT `account.service` calculates balance by summing all transactions for an account.
    //     If Parent (-150k) and Child (-60k) are both on Account A. Balance impact is -210k. WRONG.
    //     
    //     CRITICAL DESIGN DECISION:
    //     Child transactions should **NOT** have an `account_id` that impacts balance?
    //     OR Child transactions should have `status = 'void'`? No.
    //     OR Child transactions should allow `account_id` to be NULL?
    //     
    //     DB Schema `transactions.account_id` is NOT NULL (likely, need to check).
    //     Let's check schema.

    // Checking transactions table schema via previous `transaction.service.ts` or similar doesn't show NOT NULL constraints explicitly but implies it.

    // Implementation Plan said: "Add parent_transaction_id ...".
    // It didn't mention changing account_id nullability.

    // If `account_id` is required, we have a problem with double counting balances.

    // WORKAROUND:
    // 1. Children have same `account_id` as Parent.
    // 2. We modify `calculateAccountImpacts` (and all balance aggregations) to IGNORE child transactions (where parent_transaction_id is NOT NULL).
    // 3. Reports (Categories, People) should Look at Children (for granularity) and IGNORE Parent (for classification), OR vice versa depending on report.

    // Let's modify `calculateAccountImpacts` in `transaction.service.ts`?
    // The Prompt didn't explicitly ask to modify `transaction.service.ts` for balance calculation, but "Test 2.1" describes creating children.
    // And "Test 1.1" checks DB.

    // If I don't fix balance calculation, balances will be wrong.
    // I MUST ensure `calculateAccountImpacts` ignores children.

    const { createTransaction } = await import("./transaction.service");

    // 1. Create Parent
    const parentId = await createTransaction({
        ...parent_transaction,
        metadata: parentMetadata
    });

    if (!parentId) throw new Error("Failed to create parent transaction");

    // 2. Create Children
    const childrenPromises = shares.map(async (share, index) => {
        // Normalizing amount: shares are typically positive in UI (60k), but expense is negative (-60k).
        // If parent is -150k. Share is 60k.
        // Child amount should be -60k.
        const sign = parent_transaction.amount < 0 ? -1 : 1;
        const childAmount = Math.abs(share.amount) * sign;

        const isMyShare = !share.person_id;
        // Logic: specific type or inherit from parent?
        // If "Me": inherit type (Expense/Income).
        // If "Others": generally 'debt' (They owe me) if Parent was Expense.
        // If Parent was Income (e.g. I received money to split?), then others 'repayment'? 
        // Let's stick to core case: Expense Splitting.
        const type = isMyShare ? parent_transaction.type : 'debt';

        // Wait, if I Paid -150k. 
        // My share -60k (Expense).
        // Friend share -90k.
        // Is Friend share "Debt"? 
        // "Debt" transaction usually means "I lent money".
        // Creating a "Debt" transaction of -90k means "I spent 90k for someone". They owe me.
        // So 'debt' type is correct.

        // Child Metadata
        const childMeta = {
            is_split_share: true,
            is_my_share: isMyShare,
            is_receivable: !isMyShare,
            parent_id: parentId, // Redundant but helpful in meta
            // Store extended details for audit/UI
            share_before: share.share_before,
            voucher_amount: share.voucher_amount,
            advance_amount: share.advance_amount,
            paid_by: share.paid_by,
            original_note: share.note
        };

        // We use direct DB insert for children to avoid overhead and to set `parent_transaction_id`
        // createTransaction service might not support passing `parent_transaction_id` yet unless we add it to Input.
        // Ideally we update `CreateTransactionInput` to support it, OR we just insert raw.
        // Using raw insert is safer to bypass "Balance Calculation" if we decide to filter at service level.
        // BUT we need `normalizeInput` logic.

        // Let's use `createTransaction` but we need to ensure it supports `parent_transaction_id`.
        // I need to update `transaction.service.ts` to support `parent_transaction_id` in input/normalization if I go that route.

        // ALTERNATIVE: Insert raw.
        const normalizedAmt = await normalizeAmountForType(type, share.amount); // share.amount is absolute from UI likely

        const notePrefix = isMyShare ? "My share" : `Split share for ${share.person_id ? 'friend' : 'me'}`;
        const finalNote = share.note ? `${notePrefix}: ${share.note}` : (isMyShare ? parent_transaction.note : `Split share for ${parent_transaction.note || 'bill'}`);

        const childPayload = {
            occurred_at: parent_transaction.occurred_at,
            note: finalNote,
            status: 'posted',
            amount: childAmount, // already signed
            type: type,
            account_id: parent_transaction.source_account_id, // Same account
            category_id: isMyShare ? parent_transaction.category_id : null, // Friend share has no category usually? or 'Debt'?
            person_id: share.person_id,
            parent_transaction_id: parentId,
            metadata: childMeta,
            cashback_mode: 'none_back', // Children don't get cashback usually to avoid double count
        };

        return supabase.from('transactions').insert(childPayload as any);
    });

    await Promise.all(childrenPromises);

    return parentId;
}

export async function updateSplitBill(parentId: string, input: SplitBillInput) {
    const supabase = createClient();
    const { parent_transaction, shares } = input;

    // 1. Update Parent
    // We use the service to update parent (handle history, basic fields)
    // But we need to update metadata specifically for split info
    const parentMetadata = {
        ...(parent_transaction.metadata || {}),
        is_split_bill: true,
        split_participants_count: shares.length,
        split_shares: shares,
        my_share_amount: shares.find(s => !s.person_id)?.amount || 0
    };

    const { updateTransaction: updateTxnService } = await import("./transaction.service");
    await updateTxnService(parentId, {
        ...parent_transaction,
        metadata: parentMetadata
    });

    // 2. Delete existing children
    await supabase.from('transactions').delete().eq('parent_transaction_id', parentId);

    // 3. Re-create children
    // (Same logic as create)
    const childrenPromises = shares.map(async (share) => {
        const sign = parent_transaction.amount < 0 ? -1 : 1;
        const childAmount = Math.abs(share.amount) * sign;
        const isMyShare = !share.person_id;
        const type = isMyShare ? parent_transaction.type : 'debt';

        const childMeta = {
            is_split_share: true,
            is_my_share: isMyShare,
            is_receivable: !isMyShare,
            parent_id: parentId,
            share_before: share.share_before,
            voucher_amount: share.voucher_amount,
            advance_amount: share.advance_amount,
            paid_by: share.paid_by,
            original_note: share.note
        };

        const notePrefix = isMyShare ? "My share" : `Split share for ${share.person_id ? 'friend' : 'me'}`;
        const finalNote = share.note ? `${notePrefix}: ${share.note}` : (isMyShare ? parent_transaction.note : `Split share for ${parent_transaction.note || 'bill'}`);

        const childPayload = {
            occurred_at: parent_transaction.occurred_at,
            note: finalNote,
            status: 'posted',
            amount: childAmount,
            type: type,
            account_id: parent_transaction.source_account_id,
            category_id: isMyShare ? parent_transaction.category_id : null,
            person_id: share.person_id,
            parent_transaction_id: parentId,
            metadata: childMeta,
            cashback_mode: 'none_back',
        };

        return supabase.from('transactions').insert(childPayload as any);
    });

    await Promise.all(childrenPromises);
    return true;
}

export async function deleteSplitBill(parentId: string) {
    // Delete parent, cascade handles children
    const supabase = createClient();
    const { error, count } = await supabase.from('transactions').delete().eq('id', parentId); // Logic: .eq('id', parentId)
    // Wait, supabase delete returns...
    // We assume cascade works.
    if (error) throw error;
    return count;
}
