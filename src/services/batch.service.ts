import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { addMonths, format, parse } from 'date-fns'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'

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
        .select('*, batch_items(*, target_account:accounts(name, type))')
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

    const { data, error } = await supabase
        .from('batches')
        .insert(batch as any)
        .select()
        .single()

    if (error) throw error
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

    // [M2-SP1] Fix: Map Category for Online Services
    let categoryId = null;
    const noteLower = item.note?.toLowerCase() || '';
    if (noteLower.includes('online service')) {
        categoryId = SYSTEM_CATEGORIES.ONLINE_SERVICES;
    }

    // 2. Create Transaction (Draft Fund -> Target)
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: item.note,
            status: 'posted',
            tag: 'BATCH_AUTO',
            created_by: SYSTEM_ACCOUNTS.DEFAULT_USER_ID,
            category_id: categoryId
        })
        .select()
        .single()

    if (txnError) throw txnError

    // 3. Create Transaction Lines
    const lines = [
        {
            transaction_id: txn.id,
            account_id: SYSTEM_ACCOUNTS.DRAFT_FUND, // Use Draft Fund
            amount: -Math.abs(item.amount),
            type: 'credit'
        },
        {
            transaction_id: txn.id,
            account_id: finalTargetId,
            amount: Math.abs(item.amount),
            type: 'debit',
            receiver_name: item.receiver_name,
            bank_name: item.bank_name,
            bank_number: item.bank_number,
            card_name: item.card_name
        }
    ]

    const { error: linesError } = await supabase
        .from('transaction_lines')
        .insert(lines)

    if (linesError) throw linesError

    // 4. Update Item Status
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

    // 5. Recalculate Balances
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

    // Get all accounts for lookup
    const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, account_number')

    const accountByName = new Map(accounts?.map((a: any) => [a.name.toLowerCase(), a.id]) || [])
    const accountByNumber = new Map(accounts?.map((a: any) => [a.account_number, a.id]) || [])

    // Get all bank mappings for lookup
    const { data: bankMappings } = await supabase
        .from('bank_mappings')
        .select('*')

    const bankCodeMap = new Map(bankMappings?.map((b: any) => [b.bank_code, b]) || [])

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Skip header row if it contains "STT" or "Danh sách"
        if (line.toLowerCase().includes('stt') || line.toLowerCase().includes('danh sách')) {
            continue
        }

        try {
            // Split by tab
            const columns = line.split('\t')

            if (columns.length < 3) {
                results.errors.push(`Line ${i + 1}: Not enough columns (need at least 3)`)
                continue
            }

            // Detect format:
            // Format A: STT | Receiver | Bank Number | Bank Name | Amount | Note
            // Format B: Receiver | Bank Number | Bank Name | Amount | Note

            let offset = 0
            // If first column is digits and we have enough columns, assume it's STT
            if (/^\d+$/.test(columns[0]?.trim()) && columns.length >= 5) {
                offset = 1
            }

            const receiverName = columns[offset]?.trim() || ''
            const bankNumber = columns[offset + 1]?.trim() || ''
            const bankName = columns[offset + 2]?.trim() || ''

            const amountStr = columns[offset + 3]?.trim()
            const amount = amountStr ? parseInt(amountStr.replace(/\D/g, '')) : 0

            let note = columns[offset + 4]?.trim() || ''

            // Append batch tag to note if present
            if (batchTag) {
                if (!note) {
                    note = batchTag
                } else if (!note.includes(batchTag)) {
                    note = `${note} ${batchTag}`
                }
            }

            // Try to find target account by bank number first, then name
            let targetAccountId = accountByNumber.get(bankNumber)
            if (!targetAccountId) {
                targetAccountId = accountByName.get(receiverName.toLowerCase())
            }

            // Insert batch item
            const { error: insertError } = await supabase
                .from('batch_items')
                .insert({
                    batch_id: batchId,
                    receiver_name: receiverName,
                    target_account_id: targetAccountId || null,
                    amount: amount,
                    note: note,
                    bank_name: bankName,
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

        // Fetch the existing funding transaction to check its amount
        let currentFundedAmount = 0;
        if (batch.funding_transaction_id) {
            const { data: lines } = await supabase
                .from('transaction_lines')
                .select('amount')
                .eq('transaction_id', batch.funding_transaction_id)
                .eq('account_id', batch.source_account_id)
                .eq('type', 'credit'); // Money leaving source

            if (lines && lines.length > 0) {
                currentFundedAmount = lines.reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);
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

        const lineMetadata = { batch_id: batch.id, type: 'batch_funding_additional' }

        const nameParts = batch.name.split(' ')
        const tag = nameParts[nameParts.length - 1]

        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .insert({
                occurred_at: new Date().toISOString(),
                note: `[Waiting] Fund More Batch: ${batch.name} (Additional ${diff})`,
                status: 'posted',
                tag: tag, // Use the same tag
                created_by: userId
            })
            .select()
            .single()

        if (txnError) throw txnError

        const lines = [
            {
                transaction_id: txn.id,
                account_id: batch.source_account_id,
                amount: -diff,
                type: 'credit',
                metadata: lineMetadata
            },
            {
                transaction_id: txn.id,
                account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
                amount: diff,
                type: 'debit',
                metadata: lineMetadata
            }
        ]

        const { error: linesError } = await supabase
            .from('transaction_lines')
            .insert(lines)

        if (linesError) throw linesError

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

    // 3. Extract Tag from Name (e.g. "CKL NOV25" -> "NOV25")
    const nameParts = batch.name.split(' ')
    const tag = nameParts[nameParts.length - 1]
    const lineMetadata = { batch_id: batch.id, type: 'batch_funding' }

    // 4. Create Transaction Header
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: `Transfer to Trung gian CKL - ${batch.name}`,
            status: 'posted',
            tag: tag,
            created_by: userId
        })
        .select()
        .single()

    if (txnError) throw txnError

    // 5. Create Transaction Lines (Transfer: Source -> Clearing)
    // Source Account: Credit (Decrease)
    // Clearing Account: Debit (Increase)
    const lines = [
        {
            transaction_id: txn.id,
            account_id: batch.source_account_id,
            amount: -totalAmount, // Credit
            type: 'credit',
            metadata: lineMetadata
        },
        {
            transaction_id: txn.id,
            account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
            amount: totalAmount, // Debit
            type: 'debit',
            metadata: lineMetadata
        }
    ]

    const { error: linesError } = await supabase
        .from('transaction_lines')
        .insert(lines)

    if (linesError) throw linesError

    // 6. Update Batch Status
    const { error: updateError } = await supabase
        .from('batches')
        .update({
            status: 'funded',
            funding_transaction_id: txn.id
        })
        .eq('id', batchId)

    if (updateError) throw updateError

    // 7. Recalculate Balances
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

    const items = batch.batch_items || []

    if (items.length === 0) return { success: true, count: 0 }

    // Fetch bank mappings to lookup codes
    const { data: bankMappings } = await supabase
        .from('bank_mappings')
        .select('bank_code, bank_name, short_name')

    const bankMap = new Map()
    bankMappings?.forEach((b: any) => {
        if (b.bank_name) bankMap.set(b.bank_name.toLowerCase(), b.bank_code)
        if (b.short_name) bankMap.set(b.short_name.toLowerCase(), b.bank_code)
    })

    const payload = {
        items: items.map((item: any) => {
            let bankName = item.bank_name || ''
            if (bankName && !bankName.includes(' - ')) {
                // Try to find code by name or short name
                const code = bankMap.get(bankName.toLowerCase())
                if (code) {
                    bankName = `${code} - ${bankName}`
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
        await fetch(batch.sheet_link, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        return { success: true, count: items.length }
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

    // 2. Calculate Total Amount (from funding transaction)
    if (!batch.funding_transaction_id) throw new Error('Batch not funded yet')

    const { data: lines } = await supabase
        .from('transaction_lines')
        .select('amount')
        .eq('transaction_id', batch.funding_transaction_id)
        .eq('account_id', SYSTEM_ACCOUNTS.DRAFT_FUND)
        .eq('type', 'credit')

    const amount = lines?.reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0) || 0

    if (amount <= 0) throw new Error('No funded amount found')

    const {
        data: { user }
    } = await supabase.auth.getUser()
    const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID

    // 3. Create Transfer: Real -> Draft
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: `Confirm Source for Batch: ${batch.name}`,
            status: 'posted',
            tag: 'BATCH_CONFIRM',
            created_by: userId
        })
        .select()
        .single()

    if (txnError) throw txnError

    const transferLines = [
        {
            transaction_id: txn.id,
            account_id: realAccountId,
            amount: -amount,
            type: 'credit'
        },
        {
            transaction_id: txn.id,
            account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
            amount: amount,
            type: 'debit'
        }
    ]

    const { error: linesError } = await supabase
        .from('transaction_lines')
        .insert(transferLines)

    if (linesError) throw linesError

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

    try {
        const parsedDate = parse(lastPart, 'MMMyy', new Date())
        if (!isNaN(parsedDate.getTime())) {
            nameParts[nameParts.length - 1] = newTag
            newName = nameParts.join(' ')
        } else {
            newName = `${originalBatch.name} ${newTag}`
        }
    } catch (e) {
        newName = `${originalBatch.name} ${newTag}`
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
    // Assume format "... MMMyy" (e.g. "DEC25")
    const nameParts = batch.name.split(' ')
    const currentTag = nameParts.find((p: string) => /^[A-Z]{3}\d{2}$/.test(p))

    if (!currentTag) throw new Error('Could not detect month tag (e.g. DEC25) in batch name')

    // 3. Calculate New Tag
    const currentDate = parse(currentTag, 'MMMyy', new Date())
    const newDate = addMonths(currentDate, action === 'next' ? 1 : -1)
    const newTag = format(newDate, 'MMMyy').toUpperCase()

    // 4. Update Batch Name
    const newName = batch.name.replace(currentTag, newTag)
    await supabase.from('batches').update({ name: newName }).eq('id', batchId)

    // 5. Update Batch Items
    const items = batch.batch_items || []
    for (const item of items) {
        if (item.note && item.note.includes(currentTag)) {
            const newNote = item.note.replace(currentTag, newTag)
            await supabase
                .from('batch_items')
                .update({ note: newNote })
                .eq('id', item.id)
        }
    }

    return { success: true, oldTag: currentTag, newTag }
}
