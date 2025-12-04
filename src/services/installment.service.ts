'use server';

import { createClient } from '@/lib/supabase/server';
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants';
import { addMonths, format } from 'date-fns';

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
}

export async function getInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Installment[];
}

export async function getActiveInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('status', 'active')
        .order('next_due_date', { ascending: true });

    if (error) throw error;
    return data as Installment[];

}

export async function getCompletedInstallments() {
    const supabase: any = createClient();
    const { data, error } = await supabase
        .from('installments')
        .select('*')
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

    // 1. Fetch Original Transaction
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .select('*, transaction_lines(*)')
        .eq('id', payload.transactionId)
        .single();

    if (txnError || !txn) throw new Error('Transaction not found');

    // Calculate Total Amount from lines (assuming simple expense for now)
    // For credit card expense, it's usually the credit amount on the source account?
    // Or the debit amount on the category?
    // Let's assume the user selects a transaction and we take the total amount.
    // We should probably look at the lines.
    const lines = txn.transaction_lines || [];
    // Find the amount. Usually it's the sum of debits (positive) or credits (negative).
    // Let's take the absolute sum of credits (money leaving).
    const totalAmount = lines
        .filter((l: any) => l.type === 'credit')
        .reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);

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
            source_account_id: lines[0]?.account_id || SYSTEM_ACCOUNTS.DRAFT_FUND, // Fallback?
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
    const monthTag = format(targetDate, 'MMMyy').toUpperCase();

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
    let batchId: string;

    const { data: existingBatch } = await supabase
        .from('batches')
        .select('id')
        .eq('name', batchName)
        .single();

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
