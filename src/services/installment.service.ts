'use server';

import { createClient } from '@/lib/supabase/server';
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants';
import { addMonths } from 'date-fns';
import { toLegacyMMMYYFromDate, toYYYYMMFromDate } from '@/lib/month-tag'

export type InstallmentStatus = 'active' | 'completed' | 'settled_early' | 'cancelled';
export type InstallmentType = 'credit_card' | 'p2p_lending';

export interface Installment {
    id: string;
    created_at: string;
    original_transaction_id: string | null;
    owner_id: string;
    debtor_id: string | null;
    name: string;
    total_amount: number;
    conversion_fee: number;
    term_months: number;
    monthly_amount: number;
    start_date: string;
    remaining_amount: number;
    next_due_date: string | null;
    status: InstallmentStatus;
    type: InstallmentType;
    original_transaction?: {
        account_id?: string;
        account?: {
            name: string;
        } | null;
        person?: {
            name: string;
        } | null;
    } | null;
}

export async function getInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:profiles(name))')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Installment[];
}

export async function getInstallmentById(id: string) {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:profiles(name))')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Installment;
}

export async function getActiveInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:profiles(name))')
        .eq('status', 'active')
        .order('next_due_date', { ascending: true });

    if (error) throw error;
    return data as Installment[];
}

export async function getAccountsWithActiveInstallments() {
    const supabase: any = createClient();
    // [Single-Table Migration] Get account_id directly from transactions table
    // instead of the deprecated line items table.

    const { data, error } = await supabase
        .from('installments')
        .select('original_transaction:transactions(account_id)')
        .eq('status', 'active');

    if (error) throw error;

    const accountIds = new Set<string>();
    data?.forEach((item: any) => {
        // In single-table design, account_id is directly on transactions
        if (item.original_transaction?.account_id) {
            accountIds.add(item.original_transaction.account_id);
        }
    });

    return Array.from(accountIds);
}

export async function getCompletedInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name))')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Installment[];
}

export async function getPendingInstallmentTransactions() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_installment', true)
        .is('installment_plan_id', null)
        .order('occurred_at', { ascending: false });


    if (error) throw error;
    return data;
}

// Phase 7X: Auto-Settlement Logic
export async function checkAndAutoSettleInstallment(planId: string) {
    const supabase: any = createClient();

    // 1. Fetch Plan
    const { data: plan, error: planError } = await supabase
        .from('installments')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError || !plan) return;

    // 2. Calculate Total Paid from Transactions
    // We sum all transactions linked to this plan.
    // Assuming positive amount = repayment/income (reducing debt).
    // Note: 'expense' could also be linked if it's a correction? 
    // Usually repayments are 'repayment' (income) or 'income'.
    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('installment_plan_id', planId);

    if (txnError) return;

    // Filter base types: repayment/income are positive. expense are negative.
    // We want to sum the EFFECTIVE repayment amount.
    // If user enters 'expense' linked to plan, does it mean they spent MORE? 
    // Or they paid the bank? 
    // Convention: Transactions linked to installment plan are REPAYMENTS.
    // Normalized input ensures repayments are positive? 
    // Actually, createTransaction normalizes `income` to positive abs(amount).
    // `expense` to negative abs(amount).

    // So we just sum the amount. If sum > 0, it means we paid.
    // If sum < 0, it means we added debt? (Maybe interest?)

    let totalPaid = 0;
    txns?.forEach((t: any) => {
        // Only count positive amounts as repayment?
        // Or just sum everything?
        // If I make a mistake and add an expense, it increases debt. 
        // That seems correct for "remaining amount".
        // remaining = total_amount - (sum(amount) where amount > 0?)
        // Let's assume all transactions linked are repayments.

        // However, the original transaction (the purchase) might be linked?
        // No, original transaction is linked via `original_transaction_id` column on installment, 
        // NOT `installment_plan_id` on transaction (unless we backfill).
        // Usually `installment_plan_id` is for repayments.

        // Refund? If I get a refund for an installment item?
        // We will just sum `amount`.

        // Constraint: Installment is usually on a Credit Card (Liability).
        // Income/Repayment on Liability = Positive (Reduces Debt).
        // Expense on Liability = Negative (Increases Debt).
        // So Remaining = Initial_Total - Sum(Transactions.amount)
        // Wait. Initial_Total is positive (e.g. 10M).
        // If I pay 1M (Income), amount is +1M.
        // Remaining = 10M - 1M = 9M.
        // If I spend 1M (Expense/Fee), amount is -1M.
        // Remaining = 10M - (-1M) = 11M.
        // This logic holds.

        totalPaid += t.amount || 0;
    });

    const remaining = plan.total_amount - totalPaid;

    // 3. Update Installment
    const updates: any = {
        remaining_amount: remaining
    };

    if (remaining <= 1000 && plan.status === 'active') { // 1000 VND epsilon
        updates.status = 'completed';
    } else if (remaining > 1000 && plan.status === 'completed') {
        // Re-open if payment deleted?
        updates.status = 'active';
    }

    await supabase
        .from('installments')
        .update(updates)
        .eq('id', planId);

    return { success: true, remaining, status: updates.status || plan.status };
}

export async function convertTransactionToInstallment(payload: {
    transactionId: string;
    term: number;
    fee: number;
    type: InstallmentType;
    debtorId?: string;
    name?: string; // Optional override
}) {
    const supabase: any = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID;

    // 1. Fetch Original Transaction (single-table: amount is directly on transactions)
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', payload.transactionId)
        .single();

    if (txnError || !txn) throw new Error('Transaction not found');

    // [Single-Table Migration] Amount is now directly on transaction
    const totalAmount = Math.abs(txn.amount || 0);

    if (totalAmount <= 0) throw new Error('Invalid transaction amount');

    const monthlyAmount = Math.ceil(totalAmount / payload.term);
    const name = payload.name || txn.note || 'Installment Plan';

    // 2. Create Installment
    const { data: installment, error: createError } = await supabase
        .from('installments')
        .insert({
            original_transaction_id: payload.transactionId,
            owner_id: userId,
            debtor_id: payload.debtorId || null,
            name: name,
            total_amount: totalAmount,
            conversion_fee: payload.fee,
            term_months: payload.term,
            monthly_amount: monthlyAmount,
            start_date: new Date().toISOString(), // Start now? Or next month? Usually starts now.
            remaining_amount: totalAmount,
            next_due_date: addMonths(new Date(), 1).toISOString(), // First payment due next month?
            status: 'active',
            type: payload.type
        })
        .select()
        .single();

    if (createError) throw createError;

    // 3. Update Original Transaction
    await supabase
        .from('transactions')
        .update({ installment_plan_id: installment.id })
        .eq('id', payload.transactionId);

    // 4. Handle Conversion Fee (if any)
    if (payload.fee > 0) {
        // Create an expense transaction for the fee
        const { createTransaction } = await import('./transaction.service');
        await createTransaction({
            occurred_at: new Date().toISOString(),
            note: `Conversion Fee: ${name}`,
            type: 'expense',
            source_account_id: txn.account_id || SYSTEM_ACCOUNTS.DRAFT_FUND, // Fallback?
            amount: payload.fee,
            category_id: SYSTEM_CATEGORIES.BANK_FEE, // Need to ensure this exists or use fallback
            tag: 'FEE'
        });
    }

    return installment;
}

export async function createManualInstallment(payload: {
    name: string;
    totalAmount: number;
    term: number;
    fee: number;
    type: InstallmentType;
    debtorId?: string;
    startDate?: string;
}) {
    const supabase: any = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID;

    const monthlyAmount = Math.ceil(payload.totalAmount / payload.term);

    const { data: installment, error } = await supabase
        .from('installments')
        .insert({
            owner_id: userId,
            debtor_id: payload.debtorId || null,
            name: payload.name,
            total_amount: payload.totalAmount,
            conversion_fee: payload.fee,
            term_months: payload.term,
            monthly_amount: monthlyAmount,
            start_date: payload.startDate || new Date().toISOString(),
            remaining_amount: payload.totalAmount,
            next_due_date: addMonths(new Date(payload.startDate || new Date()), 1).toISOString(),
            status: 'active',
            type: payload.type,
            original_transaction_id: null
        })
        .select()
        .single();

    if (error) throw error;
    return installment;
}

export async function processMonthlyPayment(installmentId: string, amountPaid: number) {
    const supabase: any = createClient();

    const { data: installment, error: fetchError } = await supabase
        .from('installments')
        .select('*')
        .eq('id', installmentId)
        .single();

    if (fetchError || !installment) throw new Error('Installment not found');

    const newRemaining = Math.max(0, installment.remaining_amount - amountPaid);
    const newStatus = newRemaining <= 0 ? 'completed' : 'active';
    const nextDueDate = newStatus === 'active'
        ? addMonths(new Date(installment.next_due_date || new Date()), 1).toISOString()
        : null;

    const { error: updateError } = await supabase
        .from('installments')
        .update({
            remaining_amount: newRemaining,
            status: newStatus,
            next_due_date: nextDueDate
        })
        .eq('id', installmentId);

    if (updateError) throw updateError;
    return true;
}

export async function settleEarly(installmentId: string) {
    const supabase: any = createClient();

    const { error: updateError } = await supabase
        .from('installments')
        .update({
            remaining_amount: 0,
            status: 'settled_early',
            next_due_date: null
        })
        .eq('id', installmentId);

    if (updateError) throw updateError;
    return true;
}

export async function processBatchInstallments(date?: string) {
    const supabase: any = createClient();
    const targetDate = date ? new Date(date) : new Date();
    const monthTag = toYYYYMMFromDate(targetDate)
    const legacyMonthTag = toLegacyMMMYYFromDate(targetDate)

    // 1. Get Active Installments
    const installments = await getActiveInstallments();

    if (installments.length === 0) return;

    // 2. Find or Create Batch for this month
    // We need a batch to put these items in.
    // Let's look for a batch named "Installments [MonthTag]" or similar.
    // Or maybe we add to the "Draft Fund" batch if it exists?
    // Requirement says: "Create a batch_item for the monthly due."
    // It doesn't specify WHICH batch.
    // Let's assume we create a dedicated batch "Installments [MonthTag]" if not exists.

    const batchName = `Installments ${monthTag}`;
    const legacyBatchName = legacyMonthTag ? `Installments ${legacyMonthTag}` : null
    let batchId: string;

    const { data: existingBatches } = await supabase
        .from('batches')
        .select('id, name')
        .in('name', legacyBatchName ? [batchName, legacyBatchName] : [batchName])
        .limit(1);

    const existingBatch = Array.isArray(existingBatches) ? existingBatches[0] : null

    if (existingBatch) {
        batchId = existingBatch.id;
    } else {
        const { data: newBatch, error: createError } = await supabase
            .from('batches')
            .insert({
                name: batchName,
                source_account_id: SYSTEM_ACCOUNTS.DRAFT_FUND, // Default source
                status: 'draft'
            })
            .select()
            .single();

        if (createError) throw createError;
        batchId = newBatch.id;
    }

    // 3. Create Batch Items for each installment
    for (const inst of installments) {
        // Check if item already exists for this installment in this batch
        // We can check metadata
        const { data: existingItem } = await supabase
            .from('batch_items')
            .select('id')
            .eq('batch_id', batchId)
            .contains('metadata', { installment_id: inst.id })
            .single();

        if (existingItem) continue; // Already processed

        // Create Item
        // Note: "Installment: {Name} (Month X/{Term})"
        // We need to calculate which month this is.
        // Start Date vs Current Date.
        // Simple diff in months.
        const start = new Date(inst.start_date);
        const current = targetDate;
        const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth()) + 1;

        // Cap at term
        const monthNum = Math.min(Math.max(1, diffMonths), inst.term_months);

        await supabase
            .from('batch_items')
            .insert({
                batch_id: batchId,
                receiver_name: 'Installment Payment',
                target_account_id: null, // No specific target yet, or maybe the credit card?
                // If it's a credit card installment, we are paying the credit card company?
                // Actually, for "Credit Card Installment", it's usually just an expense on the card.
                // But here we are "repaying" the installment plan?
                // The requirement says: "Trừ remaining_amount trong bảng installments." when confirmed.
                // And "Tạo 1 giao dịch transfer (hoặc repayment) để trừ tiền trong tài khoản thật."
                // So target_account_id should probably be the Credit Card Account if we want to record payment TO it?
                // Or maybe we just record an expense?
                // Let's leave target_account_id null for now and let user select, OR
                // if we know the credit card account from the original transaction, use it?
                // We don't store original account in installment table, but we can fetch it.
                amount: inst.monthly_amount,
                note: `Installment: ${inst.name} (Month ${monthNum}/${inst.term_months})`,
                status: 'pending',
                metadata: { installment_id: inst.id }
            });
    }
}

export async function getInstallmentRepayments(planId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            id,
            occurred_at,
            amount,
            note,
            type,
            created_by,
            profiles:created_by ( name )
        `)
        .eq('installment_plan_id', planId)
        .order('occurred_at', { ascending: false });

    if (error) {
        console.error('Error fetching installment repayments:', error);
        return [];
    }
    return data;
}
