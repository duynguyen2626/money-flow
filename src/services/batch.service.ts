import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { addMonths } from 'date-fns'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'
import { isLegacyMMMYY, isYYYYMM, normalizeMonthTag, toLegacyMMMYYFromDate, toYYYYMMFromDate } from '@/lib/month-tag'

export type Batch = Database['public']['Tables']['batches']['Row']
export type BatchItem = Database['public']['Tables']['batch_items']['Row']
export type FundBatchResult = {
    transactionId: string | null
    totalAmount: number
    fundedAmount: number
    createdTransaction: boolean
    status: 'funded' | 'additional_funded' | 'already_funded'
    sourceAccountId: string
}

export async function getBatches() {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function getBatchById(id: string) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batches')
        .select('*, batch_items(*, target_account:accounts(name, type, cashback_config))')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function createBatch(batch: Database['public']['Tables']['batches']['Insert']) {
    const supabase: any = createClient()

    if (!batch.source_account_id) {
        batch.source_account_id = SYSTEM_ACCOUNTS.DRAFT_FUND
    }

    console.log('Creating batch with data:', JSON.stringify(batch, null, 2))

    const { data, error } = await supabase
        .from('batches')
        .insert(batch as any)
        .select()
        .single()

    if (error) {
        console.error('Error creating batch:', error)
        throw error
    }
    console.log('Batch created successfully:', data)
    return data
}

export async function updateBatch(id: string, batch: Database['public']['Tables']['batches']['Update']) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batches')
        .update(batch as any)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteBatch(id: string) {
    const supabase: any = createClient()
    const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function addBatchItem(item: Database['public']['Tables']['batch_items']['Insert']) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batch_items')
        .insert(item as any)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateBatchItem(id: string, item: Database['public']['Tables']['batch_items']['Update']) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batch_items')
        .update(item as any)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteBatchItem(id: string) {
    const supabase: any = createClient()
    const { error } = await supabase
        .from('batch_items')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function confirmBatchItem(itemId: string, targetAccountId?: string) {
    const supabase: any = createClient()

    // 1. Fetch Item
    const { data: item, error: itemError } = await supabase
        .from('batch_items')
        .select('*, batch:batches(name)')
        .eq('id', itemId)
        .single()

    if (itemError || !item) throw new Error('Item not found')
    if (item.status === 'confirmed') return // Already confirmed

    // Use provided targetAccountId or fallback to item's target
    const finalTargetId = targetAccountId || item.target_account_id;
    if (!finalTargetId) throw new Error('No target account specified');

    // Set category: Default to Credit Payment, override to Online Services if note matches
    let categoryId = SYSTEM_CATEGORIES.CREDIT_PAYMENT;
    const noteLower = item.note?.toLowerCase() || '';
    if (noteLower.includes('online service')) {
        categoryId = SYSTEM_CATEGORIES.ONLINE_SERVICES;
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null // Use null if no user (will rely on RLS default)

    // Phase 7X: Smart Installment Matching
    let installmentPlanId: string | null = null;
    let isInstallment = item.is_installment_payment; // Prioritize checkbox

    if (isInstallment) {
        // Find active installments for this account
        // Note: We use raw query here to avoid circular deps or heavy imports if possible,
        // but importing types is fine.
        const { data: activePlans } = await supabase
            .from('installments')
            .select('id, monthly_amount, remaining_amount')
            .eq('status', 'active')
            .order('created_at', { ascending: true }); // Oldest first

        if (activePlans && activePlans.length > 0) {
            // 1. Filter by Account? 
            // Wait, installments are linked to an Original Transaction.
            // That transaction has an Account ID.
            // We need to filter plans where original_transaction.account_id == finalTargetId
            // But the above query didn't join.

            // Let's re-query with join
            const { data: accountPlans } = await supabase
                .from('installments')
                .select('id, monthly_amount, remaining_amount, original_transaction:transactions!inner(account_id)')
                .eq('status', 'active')
                .eq('original_transaction.account_id', finalTargetId)
                .order('created_at', { ascending: true });

            if (accountPlans && accountPlans.length > 0) {
                const itemAmount = Math.abs(item.amount);

                // Try to find exact match on monthly amount (allow small diff < 1000 VND)
                const matchedPlan = accountPlans.find((p: any) => Math.abs(p.monthly_amount - itemAmount) < 1000);

                if (matchedPlan) {
                    installmentPlanId = matchedPlan.id;
                } else {
                    // If only one active plan exists, assume it's that one? 
                    // Risk: Paying wrong plan.
                    // Better strategy: If I marked it as installment manually, likely I want to pay the one matching amount.
                    // If no match, maybe I just log it?
                    // Let's fallback to the Oldest Active Plan if only 1 exists?
                    if (accountPlans.length === 1) {
                        installmentPlanId = accountPlans[0].id;
                    }
                }
            }
        }
    }

    // 2. Create Transaction (Draft Fund -> Target) [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: item.note,
            status: 'posted',
            tag: 'BATCH_AUTO',
            created_by: userId,
            category_id: categoryId,
            // Single-table fields
            account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
            target_account_id: finalTargetId,
            amount: Math.abs(item.amount),
            type: 'transfer',
            is_installment: isInstallment,
            installment_plan_id: installmentPlanId
        })
        .select()
        .single()

    if (txnError) throw txnError

    // Phase 7X: Auto-Settle Trigger
    if (installmentPlanId) {
        import('./installment.service').then(({ checkAndAutoSettleInstallment }) => {
            checkAndAutoSettleInstallment(installmentPlanId!);
        }).catch(err => console.error("Failed to auto-settle batch installment", err));
    }

    // 3. Update Item Status
    const { error: updateError } = await supabase
        .from('batch_items')
        .update({
            status: 'confirmed',
            transaction_id: txn.id,
            target_account_id: finalTargetId, // Update target if changed
            is_confirmed: true
        })
        .eq('id', itemId)

    if (updateError) throw updateError

    // 4. Recalculate Balances
    const { recalculateBalance } = await import('./account.service')
    await recalculateBalance(SYSTEM_ACCOUNTS.DRAFT_FUND)
    await recalculateBalance(finalTargetId)

    return true
}

/**
 * Revert a batch item when its transaction is voided.
 * This resets the item to 'funded' (Pending) so it can be processed again.
 */
export async function revertBatchItem(transactionId: string) {
    const supabase: any = createClient()

    // 1. Find the batch item linked to this transaction
    const { data: item, error: itemError } = await supabase
        .from('batch_items')
        .select('id')
        .eq('transaction_id', transactionId)
        .single()

    if (itemError || !item) {
        // It's possible this transaction isn't linked to a batch item. Just ignore.
        return false;
    }

    // 2. Reset item status
    const { error: updateError } = await supabase
        .from('batch_items')
        .update({
            status: 'funded', // Reset to Pending/Funded
            transaction_id: null,
            is_confirmed: false
        })
        .eq('id', item.id)

    if (updateError) throw updateError

    return true
}


/**
 * Get pending batch items for a specific account
 * Used for "Confirm Money Received" feature on Account Cards
 */
export async function getPendingBatchItemsByAccount(accountId: string) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batch_items')
        .select('id, amount, receiver_name, note, batch_id, batch:batches(name)')
        .eq('target_account_id', accountId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as any[]
}

/**
 * Parse Excel data and create batch items
 * Expected format: Tab-separated values
 * Column 0: STT (number)
 * Column 1: Bank Code - Bank Name (e.g., "314 - NH Quốc tế VIB")
 * Column 2: Full Bank Name (e.g., "NH TMCP Quốc tế Việt Nam")
 */
export async function importBatchItemsFromExcel(
    batchId: string,
    excelData: string,
    batchTag?: string
): Promise<{ success: number; errors: string[] }> {
    const supabase: any = createClient()
    const lines = excelData.trim().split('\n')
    const results = { success: 0, errors: [] as string[] }

    // 1. Fetch Batch to get Bank Type
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('bank_type')
        .eq('id', batchId)
        .single()

    const bankType = batch?.bank_type || 'VIB' // Default to VIB

    // Get all accounts for lookup
    const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, account_number')

    const accountByName = new Map(accounts?.map((a: any) => [a.name.toLowerCase(), a.id]) || [])
    const accountByNumber = new Map(accounts?.map((a: any) => [a.account_number, a.id]) || [])

    // Get all bank mappings for lookup (name -> code)
    const { data: bankMappings } = await supabase
        .from('bank_mappings')
        .select('*')

    // Create lookup map: Normalized Name -> Code
    const bankMap = new Map<string, string>();
    bankMappings?.forEach((b: any) => {
        if (b.bank_name) bankMap.set(b.bank_name.toLowerCase(), b.bank_code);
        if (b.short_name) bankMap.set(b.short_name.toLowerCase(), b.bank_code);
        if (b.bank_code) bankMap.set(b.bank_code.toLowerCase(), b.bank_code);
    });

    // Helper to find bank code (VIB style)
    const findBankCode = (input: string): string => {
        const lower = input.toLowerCase().trim();
        if (bankMap.has(lower)) return bankMap.get(lower)!;
        for (const [key, code] of bankMap.entries()) {
            if (lower.includes(key)) return code;
        }
        return input;
    };

    // Helper to extract short name
    const extractShortName = (fullName: string): string => {
        const parts = fullName.trim().split(/\s+/);
        return parts[parts.length - 1] || fullName;
    };

    // --- MBB Helper: Extract Code from "Name (Code)" ---
    // Example: "Nông nghiệp... (VBA)" -> VBA
    const extractMbbBankCode = (input: string): string => {
        const match = input.match(/\(([^)]+)\)$/);
        if (match && match[1]) {
            return match[1].trim();
        }
        return input; // Fallback
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Skip header
        if (line.toLowerCase().includes('stt') || line.toLowerCase().includes('danh sách')) {
            continue
        }

        try {
            const columns = line.split('\t')
            if (columns.length < 3) {
                results.errors.push(`Line ${i + 1}: Not enough columns`)
                continue
            }

            let receiverName = '';
            let bankNumber = '';
            let bankNameRaw = '';
            let amount = 0;
            let note = '';
            let bankCode = '';

            if (bankType === 'MBB') {
                // MBB Format: 
                // Col 0: STT (Ord No)
                // Col 1: Account No
                // Col 2: Beneficiary Name
                // Col 3: Beneficiary Bank (Name (Code))
                // Col 4: Amount
                // Col 5: Detail

                // Usually STT is first. Let's assume strict format:
                // If columns[0] is digit, assume STT.
                // MBB from user request: STT | Acc | Name | Bank | Amount | Content

                // Let's implement strict column mapping for MBB
                // 1 | 999 | NAME | Bank(Code) | 1000 | Note

                // Sometimes the user might exclude STT? Let's check.
                // If col 0 is digit and col 1 is digit -> likely Ok.
                // If col 0 is digit(Acc) and col 1 is Text(Name) -> No STT?

                let offset = 0;
                // Heuristic: If Col 0 is small digit (<1000) and Col 1 is Account No (Digits), it's STT
                // But Account No is also digits.
                // Let's rely on standard copy.
                // Try offset logic similar to original but tuned for MBB.

                // Is Col 0 the Account No?
                // Mbb: Col 1 is Acc No?
                // Sample: "1" (STT) "Account" ...

                if (/^\d+$/.test(columns[0]) && columns.length >= 6) {
                    // Check if Col 1 looks like Account Number
                    offset = 1;
                }

                bankNumber = columns[offset]?.trim() || '';
                receiverName = columns[offset + 1]?.trim() || '';
                bankNameRaw = columns[offset + 2]?.trim() || '';
                const amountStr = columns[offset + 3]?.trim() || '0';
                amount = parseInt(amountStr.replace(/\D/g, '')) || 0;
                note = columns[offset + 4]?.trim() || '';

                bankCode = extractMbbBankCode(bankNameRaw);

            } else {
                // VIB (Legacy) / Default Logic
                // Detect Format A vs B

                let offset = 0
                if (/^\d+$/.test(columns[0]?.trim()) && columns.length >= 6) {
                    offset = 1
                }

                const col1 = columns[offset]?.trim();
                const col2 = columns[offset + 1]?.trim();

                const isCol1Digits = /^\d+$/.test(col1.replace(/\s/g, ''));
                const isNewFormat = isCol1Digits; // Account No first

                if (isNewFormat) {
                    bankNumber = col1;
                    receiverName = col2;
                    bankNameRaw = columns[offset + 2]?.trim() || '';
                    const amountStr = columns[offset + 3]?.trim();
                    amount = amountStr ? parseInt(amountStr.replace(/\D/g, '')) : 0;
                    note = columns[offset + 4]?.trim() || '';
                } else {
                    receiverName = col1;
                    bankNumber = col2;
                    bankNameRaw = columns[offset + 2]?.trim() || '';
                    const amountStr = columns[offset + 3]?.trim();
                    amount = amountStr ? parseInt(amountStr.replace(/\D/g, '')) : 0;
                    note = columns[offset + 4]?.trim() || '';
                }

                bankCode = findBankCode(bankNameRaw);
            }

            // Common Logic for Note & Insertion
            const finalBankName = bankCode !== bankNameRaw ? bankCode : bankNameRaw;

            if (batchTag) {
                const shortName = extractShortName(receiverName);
                const code = bankCode !== bankNameRaw ? bankCode : 'BANK';
                const smartNote = `${code}-${shortName}-${batchTag}`;
                note = smartNote.toUpperCase();
            }

            let targetAccountId = accountByNumber.get(bankNumber)
            if (!targetAccountId) {
                targetAccountId = accountByName.get(receiverName.toLowerCase())
            }

            const { error: insertError } = await supabase
                .from('batch_items')
                .insert({
                    batch_id: batchId,
                    receiver_name: receiverName,
                    target_account_id: targetAccountId || null,
                    amount: amount,
                    note: note,
                    bank_name: finalBankName,
                    bank_number: bankNumber,
                    card_name: '',
                    status: 'pending'
                })

            if (insertError) {
                results.errors.push(`Line ${i + 1}: ${insertError.message}`)
            } else {
                results.success++
            }
        } catch (error: any) {
            results.errors.push(`Line ${i + 1}: ${error.message}`)
        }
    }

    return results
}

export async function fundBatch(batchId: string): Promise<FundBatchResult> {
    const supabase: any = createClient()

    // 1. Fetch Batch Details (to get Source Account and Name)
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(amount)')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')
    if (!batch.source_account_id) throw new Error('Batch has no source account')

    const batchItems = Array.isArray(batch.batch_items) ? batch.batch_items : []
    if (batchItems.length === 0) throw new Error('Batch has no items to fund')

    // 2. Calculate Total Amount
    const totalAmount = batchItems.reduce((sum: number, item: any) => sum + Math.abs(item.amount), 0)
    if (totalAmount <= 0) throw new Error('Batch has no amount to fund')

    const {
        data: { user }
    } = await supabase.auth.getUser()
    const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID

    // 3. Check if already funded and if we need to update
    if (batch.status === 'funded') {
        // Calculate how much is already funded
        // We can check all transactions linked to this batch?
        // Or just check the 'funding_transaction_id' if we only support one?
        // The current schema has 'funding_transaction_id' on the batch.
        // If we want to support multiple, we might need to query transactions by note or tag?
        // For now, let's assume we just want to ADD the difference.

        // [Single-Table Migration] Get amount directly from funding transaction
        let currentFundedAmount = 0;
        if (batch.funding_transaction_id) {
            const { data: fundingTxn } = await supabase
                .from('transactions')
                .select('amount')
                .eq('id', batch.funding_transaction_id)
                .single();

            if (fundingTxn) {
                currentFundedAmount = Math.abs(fundingTxn.amount || 0);
            }
        }

        const diff = totalAmount - currentFundedAmount;

        if (diff <= 0) {
            return {
                transactionId: null,
                totalAmount,
                fundedAmount: currentFundedAmount,
                createdTransaction: false,
                status: 'already_funded',
                sourceAccountId: batch.source_account_id
            }
        }

        const metadata = { batch_id: batch.id, type: 'batch_funding_additional' }

        const nameParts = batch.name.split(' ')
        const tag = nameParts[nameParts.length - 1]

        // [Single-Table Schema] Create transfer transaction directly
        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .insert({
                occurred_at: new Date().toISOString(),
                note: `[Waiting] Fund More Batch: ${batch.name} (Additional ${diff})`,
                status: 'posted',
                tag: tag,
                created_by: userId,
                account_id: batch.source_account_id,
                target_account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
                amount: diff,
                type: 'transfer',
                metadata: metadata
            })
            .select()
            .single()

        if (txnError) throw txnError

        if (!batch.funding_transaction_id) {
            await supabase
                .from('batches')
                .update({ funding_transaction_id: txn.id })
                .eq('id', batchId)
        }

        // Recalculate Balances
        const { recalculateBalance } = await import('./account.service')
        await recalculateBalance(batch.source_account_id)
        await recalculateBalance(SYSTEM_ACCOUNTS.BATCH_CLEARING)

        return {
            transactionId: txn.id,
            totalAmount,
            fundedAmount: diff,
            createdTransaction: true,
            status: 'additional_funded',
            sourceAccountId: batch.source_account_id
        }
    }

    // --- NEW FUNDING (Original Logic) ---

    // 3. Extract Tag from Name (e.g. "CKL 2025-11" -> "2025-11")
    const nameParts = batch.name.split(' ')
    const rawTag = nameParts[nameParts.length - 1]
    const tag = normalizeMonthTag(rawTag) ?? rawTag
    const metadata = { batch_id: batch.id, type: 'batch_funding' }

    // 4. Create Transaction [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: `Transfer to Trung gian CKL - ${batch.name}`,
            status: 'posted',
            tag: tag,
            created_by: userId,
            account_id: batch.source_account_id,
            target_account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
            amount: totalAmount,
            type: 'transfer',
            metadata: metadata
        })
        .select()
        .single()

    if (txnError) throw txnError

    // 5. Update Batch Status
    const { error: updateError } = await supabase
        .from('batches')
        .update({
            status: 'funded',
            funding_transaction_id: txn.id
        })
        .eq('id', batchId)

    if (updateError) throw updateError

    // 6. Recalculate Balances
    const { recalculateBalance } = await import('./account.service')
    await recalculateBalance(batch.source_account_id)
    await recalculateBalance(SYSTEM_ACCOUNTS.BATCH_CLEARING)

    return {
        transactionId: txn.id,
        totalAmount,
        fundedAmount: totalAmount,
        createdTransaction: true,
        status: 'funded',
        sourceAccountId: batch.source_account_id
    }
}

export async function getAccountBatchStats(accountId: string) {
    const supabase: any = createClient()

    const { data: items, error } = await supabase
        .from('batch_items')
        .select('amount, status, batch:batches(is_template, status)')
        .eq('target_account_id', accountId)
        .in('status', ['pending', 'confirmed'])

    if (error) {
        // If no items found, return empty stats
        return { waiting: 0, confirmed: 0 }
    }

    // Filter out template batches and calculate sums
    const filteredItems = items?.filter((item: any) => !item.batch?.is_template) || [];

    const waiting = filteredItems.filter((i: any) => i.status === 'pending').reduce((sum: number, i: any) => sum + Math.abs(i.amount), 0)
    const confirmed = filteredItems.filter((i: any) => i.status === 'confirmed').reduce((sum: number, i: any) => sum + Math.abs(i.amount), 0)

    return { waiting, confirmed }
}

export async function getAccountsWithPendingBatchItems() {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('batch_items')
        .select('target_account_id')
        .eq('status', 'pending')

    if (error) throw error

    // Return unique account IDs
    const accountIds = new Set(data.map((item: any) => item.target_account_id).filter(Boolean))
    return Array.from(accountIds) as string[]
}

export async function sendBatchToSheet(batchId: string) {
    const supabase: any = createClient()

    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*)')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')
    if (!batch.sheet_link) throw new Error('No sheet link configured')

    const items = (batch.batch_items || []).filter((item: any) => item.status === 'pending')

    // Fetch bank mappings to lookup codes - FILTER BY BANK_TYPE
    const { data: bankMappings } = await supabase
        .from('bank_mappings')
        .select('bank_code, bank_name, short_name')
        .eq('bank_type', batch.bank_type || 'VIB')

    const bankMap = new Map()
    const bankObjMap = new Map() // Store full objects for proper formatting
    bankMappings?.forEach((b: any) => {
        if (b.bank_name) bankMap.set(b.bank_name.toLowerCase(), b.bank_code)
        if (b.short_name) bankMap.set(b.short_name.toLowerCase(), b.bank_code)
        bankObjMap.set(b.bank_code, b)
    })

    const payload = {
        bank_type: (batch.bank_type || 'VIB').toUpperCase(),
        sheet_name: batch.sheet_name,
        items: items.map((item: any) => {
            let bankName = item.bank_name || ''
            // Only try to format if it doesn't look like it's already formatted
            // VIB: "Code - Name", MBB: "Name (Code)"
            const isVibFormatted = bankName.includes(' - ')
            const isMbbFormatted = /\(.+\)$/.test(bankName)

            if (bankName && !isVibFormatted && !isMbbFormatted) {
                // Try to find code by name or short name
                const code = bankMap.get(bankName.toLowerCase())
                if (code) {
                    const bankObj = bankObjMap.get(code)
                    if (batch.bank_type === 'MBB') {
                        // MBB Format: Use bank_name from database (e.g., "Ngoại thương Việt Nam (VCB)")
                        const mbbName = bankObj?.bank_name || bankName
                        bankName = `${mbbName} (${code})`
                    } else {
                        // VIB Format: Use short_name (e.g., "203 - Vietcombank")
                        const vibName = bankObj?.short_name || bankName
                        bankName = `${code} - ${vibName}`
                    }
                }
            }

            return {
                receiver_name: item.receiver_name || '',
                bank_number: item.bank_number || '',
                amount: item.amount || 0,
                note: item.note || '',
                bank_name: bankName
            }
        })
    }

    try {
        const response = await fetch(batch.sheet_link, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
            const result = await response.json()
            return { success: true, count: items.length, gasResult: result }
        } else {
            const text = await response.text()
            console.error('GAS returned non-JSON response (likely HTML error or login page). First 500 chars:', text.substring(0, 500))
            throw new Error(`Google Script returned an invalid response (HTML). Likely a deployment or permission issue. Preview: ${text.substring(0, 100)}...`)
        }
    } catch (e) {
        console.error('Failed to send items to sheet', e)
        throw e
    }
}

export async function confirmBatchSource(batchId: string, realAccountId: string) {
    const supabase: any = createClient()

    // 1. Get Batch
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')

    if (batch.source_account_id !== SYSTEM_ACCOUNTS.DRAFT_FUND) {
        throw new Error('Batch source is not Draft Fund')
    }

    // 2. Calculate Total Amount (from funding transaction) [Single-Table Migration]
    if (!batch.funding_transaction_id) throw new Error('Batch not funded yet')

    const { data: fundingTxn } = await supabase
        .from('transactions')
        .select('amount')
        .eq('id', batch.funding_transaction_id)
        .single()

    const amount = Math.abs(fundingTxn?.amount || 0)

    if (amount <= 0) throw new Error('No funded amount found')

    const {
        data: { user }
    } = await supabase.auth.getUser()
    const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID

    // 3. Create Transfer: Real -> Draft [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: `Confirm Source for Batch: ${batch.name}`,
            status: 'posted',
            tag: 'BATCH_CONFIRM',
            created_by: userId,
            account_id: realAccountId,
            target_account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
            amount: amount,
            type: 'transfer'
        })
        .select()
        .single()

    if (txnError) throw txnError

    // 4. Update Batch Source
    const { error: updateError } = await supabase
        .from('batches')
        .update({ source_account_id: realAccountId })
        .eq('id', batchId)

    if (updateError) throw updateError

    // 5. Recalculate Balances
    const { recalculateBalance } = await import('./account.service')
    await recalculateBalance(realAccountId)
    await recalculateBalance(SYSTEM_ACCOUNTS.DRAFT_FUND)

    return true
}

export async function cloneBatch(batchId: string, newTag: string) {
    const supabase: any = createClient()

    const { data: originalBatch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*)')
        .eq('id', batchId)
        .single()

    if (batchError || !originalBatch) throw new Error('Original batch not found')

    let newName = originalBatch.name
    const nameParts = originalBatch.name.split(' ')
    const lastPart = nameParts[nameParts.length - 1]

    const normalizedNewTag = normalizeMonthTag(newTag) ?? newTag
    const hasMonthTagAtEnd = isYYYYMM(lastPart) || isLegacyMMMYY(lastPart)

    if (hasMonthTagAtEnd) {
        nameParts[nameParts.length - 1] = normalizedNewTag
        newName = nameParts.join(' ')
    } else {
        newName = `${originalBatch.name} ${normalizedNewTag}`
    }

    const { data: newBatch, error: createError } = await supabase
        .from('batches')
        .insert({
            name: newName,
            sheet_link: originalBatch.sheet_link,
            source_account_id: originalBatch.source_account_id,
            status: 'draft',
            is_template: false
        })
        .select()
        .single()

    if (createError) throw createError

    const items = originalBatch.batch_items || []
    if (items.length > 0) {
        const newItems = items.map((item: any) => ({
            batch_id: newBatch.id,
            receiver_name: item.receiver_name,
            target_account_id: item.target_account_id,
            amount: item.amount,
            note: item.note,
            bank_name: item.bank_name,
            card_name: item.card_name,
            status: 'pending'
        }))

        const { error: itemsError } = await supabase
            .from('batch_items')
            .insert(newItems)

        if (itemsError) throw itemsError
    }

    return newBatch
}

export async function updateBatchCycle(batchId: string, action: 'prev' | 'next') {
    const supabase: any = createClient()

    // 1. Fetch Batch
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*)')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')

    // 2. Detect Current Tag
    const tagRegex = /(\d{4}-(0[1-9]|1[0-2]))|([A-Za-z]{3}\d{2})/
    const match = batch.name.match(tagRegex)
    const currentTag = match ? match[0] : null

    if (!currentTag) throw new Error('Could not detect month tag (e.g. 2025-12 or NOV24) in batch name')

    const normalizedCurrentTag = normalizeMonthTag(currentTag) ?? currentTag
    if (!isYYYYMM(normalizedCurrentTag)) {
        throw new Error(`Invalid month tag in batch name: ${currentTag}`)
    }

    // 3. Calculate New Tag
    const [yearStr, monthStr] = normalizedCurrentTag.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const currentDate = new Date(year, month - 1, 1)
    const newDate = addMonths(currentDate, action === 'next' ? 1 : -1)
    const newTag = toYYYYMMFromDate(newDate)

    // 4. Update Batch Name
    const newName = batch.name.replace(currentTag, newTag)
    await supabase.from('batches').update({ name: newName }).eq('id', batchId)

    // 5. Update Batch Items
    const items = batch.batch_items || []
    const sourceTags = [currentTag, normalizedCurrentTag]
    for (const item of items) {
        if (!item.note) continue

        let updatedNote = item.note
        for (const sourceTag of sourceTags) {
            if (updatedNote.includes(sourceTag)) {
                updatedNote = updatedNote.split(sourceTag).join(newTag)
            }
        }

        if (updatedNote !== item.note) {
            await supabase
                .from('batch_items')
                .update({ note: updatedNote })
                .eq('id', item.id)
        }
    }

    return { success: true, oldTag: normalizedCurrentTag, newTag }
}

export async function updateBatchNoteMode(batchId: string, mode: 'previous' | 'current') {
    const supabase: any = createClient()

    // 1. Get Batch Items
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*)')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')

    const items = batch.batch_items || []
    if (items.length === 0) return { success: true, count: 0 }

    // 2. Determine Month Tags
    const today = new Date()
    const currentMonthTag = toYYYYMMFromDate(today)
    const prevMonthTag = toYYYYMMFromDate(addMonths(today, -1))
    const currentLegacyMonthTag = toLegacyMMMYYFromDate(today)
    const prevLegacyMonthTag = toLegacyMMMYYFromDate(addMonths(today, -1))

    const targetTag = mode === 'current' ? currentMonthTag : prevMonthTag
    const sourceTags =
        mode === 'current'
            ? [prevMonthTag, prevLegacyMonthTag]
            : [currentMonthTag, currentLegacyMonthTag]

    // 3. Update Notes
    let updatedCount = 0
    const updates = items.map((item: any) => {
        let note = item.note || ''
        let didChange = false

        for (const sourceTag of sourceTags) {
            if (sourceTag && note.includes(sourceTag)) {
                note = note.split(sourceTag).join(targetTag)
                didChange = true
            }
        }

        if (didChange) {
            updatedCount++
            return { id: item.id, note }
        }
        // If note doesn't have source tag, but we want to enforce the target tag?
        // For now, only swap if source tag exists to avoid messing up other notes.
        return null
    }).filter(Boolean)

    if (updates.length === 0) return { success: true, count: 0 }

    // 4. Perform Bulk Update
    // Supabase doesn't have a simple bulk update for different values in one go via SDK easily without RPC or loop.
    // We'll use a loop for now as batch size is usually small (<50).
    // Optimization: Use upsert if possible, but we only want to update note.

    for (const update of updates) {
        await supabase
            .from('batch_items')
            .update({ note: update.note })
            .eq('id', update.id)
    }

    return { success: true, count: updatedCount }
}
