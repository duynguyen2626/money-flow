module.exports = [
"[project]/src/services/installment.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"000df4e68cfedcf00f07db889e3432a08baff9aa0a":"getPendingInstallmentTransactions","001952aa41c1594e3bb250edd952e4a2363204fdf7":"getCompletedInstallments","00351b6d44ad498543339136e8b15fd9ffa8963819":"getActiveInstallments","005700c14ce671fefd4e3c48344a3b89271cf4b3b0":"getAccountsWithActiveInstallments","00693af0ce6df5c9efbbdfdca56e42976545d48a32":"getInstallments","4007c6689233aa775973ccca5c6f34902ee482161f":"getInstallmentRepayments","4009fcbe24fa0fb03a55e40e1b166a4a4a6042ee09":"createManualInstallment","4054ec15565d20ea8d5c9fb0a1942241314aa9b708":"convertTransactionToInstallment","4069d0a2a1f6824cd416927b32a6fa9dfed1b6f58e":"processBatchInstallments","408a4a40f034eeba5d7417234e1a7b54f159575a87":"getInstallmentById","40d33651e3398d04d0cb7f2b299d513add10971f2f":"settleEarly","40f657475bf93df5e77cd61090acef79fdf00d13e9":"checkAndAutoSettleInstallment","60c439ed9499e4ebc6177f4438728205a447572c0f":"processMonthlyPayment"},"",""] */ __turbopack_context__.s([
    "checkAndAutoSettleInstallment",
    ()=>checkAndAutoSettleInstallment,
    "convertTransactionToInstallment",
    ()=>convertTransactionToInstallment,
    "createManualInstallment",
    ()=>createManualInstallment,
    "getAccountsWithActiveInstallments",
    ()=>getAccountsWithActiveInstallments,
    "getActiveInstallments",
    ()=>getActiveInstallments,
    "getCompletedInstallments",
    ()=>getCompletedInstallments,
    "getInstallmentById",
    ()=>getInstallmentById,
    "getInstallmentRepayments",
    ()=>getInstallmentRepayments,
    "getInstallments",
    ()=>getInstallments,
    "getPendingInstallmentTransactions",
    ()=>getPendingInstallmentTransactions,
    "processBatchInstallments",
    ()=>processBatchInstallments,
    "processMonthlyPayment",
    ()=>processMonthlyPayment,
    "settleEarly",
    ()=>settleEarly
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/addMonths.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)");
;
;
;
;
;
async function getInstallments() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('installments').select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:people(name))').order('created_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function getInstallmentById(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('installments').select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:people(name))').eq('id', id).single();
    if (error) throw error;
    return data;
}
async function getActiveInstallments() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('installments').select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name), person:people(name))').eq('status', 'active').order('next_due_date', {
        ascending: true
    });
    if (error) throw error;
    return data;
}
async function getAccountsWithActiveInstallments() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // [Single-Table Migration] Get account_id directly from transactions table
    // instead of the deprecated line items table.
    const { data, error } = await supabase.from('installments').select('original_transaction:transactions(account_id)').eq('status', 'active');
    if (error) throw error;
    const accountIds = new Set();
    data?.forEach((item)=>{
        // In single-table design, account_id is directly on transactions
        if (item.original_transaction?.account_id) {
            accountIds.add(item.original_transaction.account_id);
        }
    });
    return Array.from(accountIds);
}
async function getCompletedInstallments() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('installments').select('*, original_transaction:transactions(account:accounts!transactions_account_id_fkey(id, name))').eq('status', 'completed').order('created_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function getPendingInstallmentTransactions() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('transactions').select('*').eq('is_installment', true).is('installment_plan_id', null).order('occurred_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function checkAndAutoSettleInstallment(planId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch Plan
    const { data: plan, error: planError } = await supabase.from('installments').select('*').eq('id', planId).single();
    if (planError || !plan) return;
    // 2. Calculate Total Paid from Transactions
    // We sum all transactions linked to this plan.
    // Assuming positive amount = repayment/income (reducing debt).
    // Note: 'expense' could also be linked if it's a correction? 
    // Usually repayments are 'repayment' (income) or 'income'.
    const { data: txns, error: txnError } = await supabase.from('transactions').select('amount, type').eq('installment_plan_id', planId);
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
    txns?.forEach((t)=>{
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
    const updates = {
        remaining_amount: remaining
    };
    if (remaining <= 1000 && plan.status === 'active') {
        updates.status = 'completed';
    } else if (remaining > 1000 && plan.status === 'completed') {
        // Re-open if payment deleted?
        updates.status = 'active';
    }
    await supabase.from('installments').update(updates).eq('id', planId);
    return {
        success: true,
        remaining,
        status: updates.status || plan.status
    };
}
async function convertTransactionToInstallment(payload) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DEFAULT_USER_ID;
    // 1. Fetch Original Transaction (single-table: amount is directly on transactions)
    const { data: txn, error: txnError } = await supabase.from('transactions').select('*').eq('id', payload.transactionId).single();
    if (txnError || !txn) throw new Error('Transaction not found');
    // [Single-Table Migration] Amount is now directly on transaction
    const totalAmount = Math.abs(txn.amount || 0);
    if (totalAmount <= 0) throw new Error('Invalid transaction amount');
    const monthlyAmount = Math.ceil(totalAmount / payload.term);
    const name = payload.name || txn.note || 'Installment Plan';
    // 2. Create Installment
    const { data: installment, error: createError } = await supabase.from('installments').insert({
        original_transaction_id: payload.transactionId,
        owner_id: userId,
        debtor_id: payload.debtorId || null,
        name: name,
        total_amount: totalAmount,
        conversion_fee: payload.fee,
        term_months: payload.term,
        monthly_amount: monthlyAmount,
        start_date: new Date().toISOString(),
        remaining_amount: totalAmount,
        next_due_date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(new Date(), 1).toISOString(),
        status: 'active',
        type: payload.type
    }).select().single();
    if (createError) throw createError;
    // 3. Update Original Transaction
    await supabase.from('transactions').update({
        installment_plan_id: installment.id
    }).eq('id', payload.transactionId);
    // 4. Handle Conversion Fee (if any)
    if (payload.fee > 0) {
        // Create an expense transaction for the fee
        const { createTransaction } = await __turbopack_context__.A("[project]/src/services/transaction.service.ts [app-route] (ecmascript, async loader)");
        await createTransaction({
            occurred_at: new Date().toISOString(),
            note: `Conversion Fee: ${name}`,
            type: 'expense',
            source_account_id: txn.account_id || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND,
            amount: payload.fee,
            category_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].BANK_FEE,
            tag: 'FEE'
        });
    }
    return installment;
}
async function createManualInstallment(payload) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DEFAULT_USER_ID;
    const monthlyAmount = Math.ceil(payload.totalAmount / payload.term);
    const { data: installment, error } = await supabase.from('installments').insert({
        owner_id: userId,
        debtor_id: payload.debtorId || null,
        name: payload.name,
        total_amount: payload.totalAmount,
        conversion_fee: payload.fee,
        term_months: payload.term,
        monthly_amount: monthlyAmount,
        start_date: payload.startDate || new Date().toISOString(),
        remaining_amount: payload.totalAmount,
        next_due_date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(new Date(payload.startDate || new Date()), 1).toISOString(),
        status: 'active',
        type: payload.type,
        original_transaction_id: null
    }).select().single();
    if (error) throw error;
    return installment;
}
async function processMonthlyPayment(installmentId, amountPaid) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: installment, error: fetchError } = await supabase.from('installments').select('*').eq('id', installmentId).single();
    if (fetchError || !installment) throw new Error('Installment not found');
    const newRemaining = Math.max(0, installment.remaining_amount - amountPaid);
    const newStatus = newRemaining <= 0 ? 'completed' : 'active';
    const nextDueDate = newStatus === 'active' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(new Date(installment.next_due_date || new Date()), 1).toISOString() : null;
    const { error: updateError } = await supabase.from('installments').update({
        remaining_amount: newRemaining,
        status: newStatus,
        next_due_date: nextDueDate
    }).eq('id', installmentId);
    if (updateError) throw updateError;
    return true;
}
async function settleEarly(installmentId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { error: updateError } = await supabase.from('installments').update({
        remaining_amount: 0,
        status: 'settled_early',
        next_due_date: null
    }).eq('id', installmentId);
    if (updateError) throw updateError;
    return true;
}
async function processBatchInstallments(date) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const targetDate = date ? new Date(date) : new Date();
    const monthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toYYYYMMFromDate"])(targetDate);
    const legacyMonthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLegacyMMMYYFromDate"])(targetDate);
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
    const legacyBatchName = legacyMonthTag ? `Installments ${legacyMonthTag}` : null;
    let batchId;
    const { data: existingBatches } = await supabase.from('batches').select('id, name').in('name', legacyBatchName ? [
        batchName,
        legacyBatchName
    ] : [
        batchName
    ]).limit(1);
    const existingBatch = Array.isArray(existingBatches) ? existingBatches[0] : null;
    if (existingBatch) {
        batchId = existingBatch.id;
    } else {
        const { data: newBatch, error: createError } = await supabase.from('batches').insert({
            name: batchName,
            source_account_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND,
            status: 'draft'
        }).select().single();
        if (createError) throw createError;
        batchId = newBatch.id;
    }
    // 3. Create Batch Items for each installment
    for (const inst of installments){
        // Check if item already exists for this installment in this batch
        // We can check metadata
        const { data: existingItem } = await supabase.from('batch_items').select('id').eq('batch_id', batchId).contains('metadata', {
            installment_id: inst.id
        }).single();
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
        await supabase.from('batch_items').insert({
            batch_id: batchId,
            receiver_name: 'Installment Payment',
            target_account_id: null,
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
            metadata: {
                installment_id: inst.id
            }
        });
    }
}
async function getInstallmentRepayments(planId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('transactions').select(`
            id,
            occurred_at,
            amount,
            note,
            type,
            created_by,
            profiles:created_by ( name )
        `).eq('installment_plan_id', planId).order('occurred_at', {
        ascending: false
    });
    if (error) {
        console.error('Error fetching installment repayments:', error);
        return [];
    }
    return data;
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getInstallments,
    getInstallmentById,
    getActiveInstallments,
    getAccountsWithActiveInstallments,
    getCompletedInstallments,
    getPendingInstallmentTransactions,
    checkAndAutoSettleInstallment,
    convertTransactionToInstallment,
    createManualInstallment,
    processMonthlyPayment,
    settleEarly,
    processBatchInstallments,
    getInstallmentRepayments
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getInstallments, "00693af0ce6df5c9efbbdfdca56e42976545d48a32", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getInstallmentById, "408a4a40f034eeba5d7417234e1a7b54f159575a87", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getActiveInstallments, "00351b6d44ad498543339136e8b15fd9ffa8963819", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountsWithActiveInstallments, "005700c14ce671fefd4e3c48344a3b89271cf4b3b0", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getCompletedInstallments, "001952aa41c1594e3bb250edd952e4a2363204fdf7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getPendingInstallmentTransactions, "000df4e68cfedcf00f07db889e3432a08baff9aa0a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(checkAndAutoSettleInstallment, "40f657475bf93df5e77cd61090acef79fdf00d13e9", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(convertTransactionToInstallment, "4054ec15565d20ea8d5c9fb0a1942241314aa9b708", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(createManualInstallment, "4009fcbe24fa0fb03a55e40e1b166a4a4a6042ee09", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(processMonthlyPayment, "60c439ed9499e4ebc6177f4438728205a447572c0f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(settleEarly, "40d33651e3398d04d0cb7f2b299d513add10971f2f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(processBatchInstallments, "4069d0a2a1f6824cd416927b32a6fa9dfed1b6f58e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_59b2c4e49353e66c503ff99109bd4451$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getInstallmentRepayments, "4007c6689233aa775973ccca5c6f34902ee482161f", null);
}),
"[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-route] (ecmascript)").vendored['react-rsc'].ReactServerDOMTurbopackServer; //# sourceMappingURL=react-server-dom-turbopack-server.js.map
}),
"[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* eslint-disable import/no-extraneous-dependencies */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "registerServerReference", {
    enumerable: true,
    get: function() {
        return _server.registerServerReference;
    }
});
const _server = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-route] (ecmascript)"); //# sourceMappingURL=server-reference.js.map
}),
"[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._59b2c4e49353e66c503ff99109bd4451/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureServerEntryExports", {
    enumerable: true,
    get: function() {
        return ensureServerEntryExports;
    }
});
function ensureServerEntryExports(actions) {
    for(let i = 0; i < actions.length; i++){
        const action = actions[i];
        if (typeof action !== 'function') {
            throw Object.defineProperty(new Error(`A "use server" file can only export async functions, found ${typeof action}.\nRead more: https://nextjs.org/docs/messages/invalid-use-server-value`), "__NEXT_ERROR_CODE", {
                value: "E352",
                enumerable: false,
                configurable: true
            });
        }
    }
} //# sourceMappingURL=action-validate.js.map
}),
];

//# sourceMappingURL=_89f7d589._.js.map