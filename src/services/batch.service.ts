import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { addMonths, format, parse } from 'date-fns'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'

export type Batch = Database['public']['Tables']['batches']['Row']
export type BatchItem = Database['public']['Tables']['batch_items']['Row']

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

export async function confirmBatchItem(itemId: string) {
    const supabase: any = createClient()

    // 1. Fetch Item
    const { data: item, error: itemError } = await supabase
        .from('batch_items')
        .select('*, batch:batches(name)')
        .eq('id', itemId)
        .single()

    if (itemError || !item) throw new Error('Item not found')
    if (item.status === 'confirmed') return // Already confirmed

    // 2. Create Transaction (CKL -> Target)
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: item.note,
            status: 'posted',
            tag: 'BATCH_AUTO',
            created_by: SYSTEM_ACCOUNTS.DEFAULT_USER_ID
        })
        .select()
        .single()

    if (txnError) throw txnError

    // 3. Create Transaction Lines
    const lines = [
        {
            transaction_id: txn.id,
            account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
            amount: -Math.abs(item.amount),
            type: 'credit'
        },
        {
            transaction_id: txn.id,
            account_id: item.target_account_id,
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
            is_confirmed: true
        })
        .eq('id', itemId)

    if (updateError) throw updateError

    return true
}

/**
 * Void a confirmed batch item and its associated transaction
 * This will reverse the balance changes and mark both item and transaction as voided
 */
export async function voidBatchItem(itemId: string) {
    const supabase: any = createClient()

    // 1. Fetch Item with transaction details
    const { data: item, error: itemError } = await supabase
        .from('batch_items')
        .select('*')
        .eq('id', itemId)
        .single()

    if (itemError || !item) throw new Error('Item not found')
    if (item.status !== 'confirmed') throw new Error('Only confirmed items can be voided')
    if (!item.transaction_id) throw new Error('No transaction found for this item')

    // 2. Fetch transaction lines to reverse balances
    const { data: lines, error: linesError } = await supabase
        .from('transaction_lines')
        .select('*')
        .eq('transaction_id', item.transaction_id)

    if (linesError) throw linesError

    // 3. Reverse the balance changes for each account
    for (const line of lines) {
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', line.account_id)
            .single()

        if (accountError) continue // Skip if account not found

        // Reverse the transaction: subtract what was added, add what was subtracted
        const newBalance = account.current_balance - line.amount

        await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', line.account_id)
    }

    // 4. Void the transaction
    const { error: voidError } = await supabase
        .from('transactions')
        .update({ status: 'void' })
        .eq('id', item.transaction_id)

    if (voidError) throw voidError

    // 5. Update item status to voided
    const { error: updateError } = await supabase
        .from('batch_items')
        .update({
            status: 'voided',
            is_confirmed: false
        })
        .eq('id', itemId)

    if (updateError) throw updateError

    return true
}


export async function cloneBatch(originalBatchId: string, forcedNewTag?: string) {
    const supabase: any = createClient()

    // 1. Fetch original batch
    const { data: originalBatch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*)')
        .eq('id', originalBatchId)
        .single()

    if (batchError || !originalBatch) throw new Error('Original batch not found')

    // 2. Calculate new name/tag
    // Expected format: "CKL NOV25" -> "CKL DEC25"
    // We try to find a date tag in the name
    let newName = originalBatch.name + ' (Copy)'
    let oldTag = ''
    let newTag = ''

    const nameParts = originalBatch.name.split(' ')
    const potentialTag = nameParts[nameParts.length - 1] // e.g., NOV25

    try {
        const parsedDate = parse(potentialTag, 'MMMyy', new Date())
        if (!isNaN(parsedDate.getTime())) {
            oldTag = potentialTag

            if (forcedNewTag) {
                newTag = forcedNewTag
            } else {
                const nextMonth = addMonths(parsedDate, 1)
                newTag = format(nextMonth, 'MMMyy').toUpperCase()
            }

            // Replace last part with new tag
            nameParts[nameParts.length - 1] = newTag
            newName = nameParts.join(' ')
        } else if (forcedNewTag) {
            // If we can't parse the old tag but have a forced new tag, just append it
            newName = originalBatch.name + ' ' + forcedNewTag
            newTag = forcedNewTag
        }
    } catch (e) {
        // Ignore parsing error, just append Copy
        console.log('Could not parse date tag from batch name', e)
        if (forcedNewTag) {
            newName = originalBatch.name + ' ' + forcedNewTag
            newTag = forcedNewTag
        }
    }

    // 3. Create new batch
    const { data: newBatch, error: createError } = await supabase
        .from('batches')
        .insert({
            name: newName,
            source_account_id: originalBatch.source_account_id,
            sheet_link: originalBatch.sheet_link,
            status: 'draft'
        })
        .select()
        .single()

    if (createError) throw createError

    // 4. Clone items
    if (originalBatch.batch_items && originalBatch.batch_items.length > 0) {
        const newItems = originalBatch.batch_items.map((item: any) => {
            let newNote = item.note
            if (oldTag && newTag && item.note) {
                newNote = item.note.replace(oldTag, newTag)
            } else if (newTag && item.note) {
                // If we didn't find an old tag but have a new tag, maybe we should append? 
                // Or just leave it. The requirement says "replace".
                // Let's try to replace if the note contains the old tag (if we found one)
            }

            return {
                batch_id: newBatch.id,
                receiver_name: item.receiver_name,
                target_account_id: item.target_account_id,
                amount: item.amount,
                note: newNote,
                bank_name: item.bank_name,
                bank_number: item.bank_number,
                card_name: item.card_name,
                status: 'pending'
            }
        })

        const { error: itemsError } = await supabase
            .from('batch_items')
            .insert(newItems)

        if (itemsError) throw itemsError
    }

    return newBatch
}

export async function sendBatchToSheet(batchId: string) {
    const supabase: any = createClient()

    // Fetch batch details + items
    const { data, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(*, target_account:accounts(name, type))')
        .eq('id', batchId)
        .single()

    if (batchError || !data) throw new Error('Batch not found')

    // Fetch bank mappings to lookup codes
    const { data: bankMappings } = await supabase
        .from('bank_mappings')
        .select('bank_code, short_name')

    const bankCodeMap = new Map(bankMappings?.map((b: any) => [b.short_name, b.bank_code]) || [])

    const batch = data as any

    if (!batch.sheet_link) {
        throw new Error('Vui lòng cấu hình Link Sheet cho lô này')
    }

    const payload = {
        batchName: batch.name,
        items: batch.batch_items.map((item: any) => {
            let bankName = item.bank_name || ''
            // Try to find bank code
            if (bankName) {
                const code = bankCodeMap.get(bankName)
                if (code) {
                    bankName = `${code} - ${bankName}`
                }
            }

            return {
                receiver_name: item.receiver_name || item.target_account?.name || 'Unknown',
                bank_number: item.bank_number || '',
                bank_name: bankName,
                amount: item.amount,
                note: item.note
            }
        })
    }

    try {
        const response = await fetch(batch.sheet_link, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            throw new Error(`Failed to send to sheet: ${response.statusText}`)
        }

        return true
    } catch (error) {
        console.error('Error sending to sheet:', error)
        throw error
    }
}

export async function checkAndAutoCloneBatches() {
    const supabase: any = createClient()
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonthTag = format(today, 'MMMyy').toUpperCase()

    // 1. Fetch templates that need cloning
    // Condition: is_template = true AND auto_clone_day <= currentDay AND (last_cloned_month_tag != currentMonthTag OR last_cloned_month_tag IS NULL)
    const { data: templates, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_template', true)
        .lte('auto_clone_day', currentDay)

    if (error) throw error
    if (!templates || templates.length === 0) return []

    const clonedBatches = []

    for (const template of templates) {
        // Double check the month tag to avoid duplicate cloning in the same month
        if (template.last_cloned_month_tag === currentMonthTag) {
            continue
        }

        try {
            // Clone with current month tag
            const newBatch = await cloneBatch(template.id, currentMonthTag)

            // Update template's last_cloned_month_tag
            await supabase
                .from('batches')
                .update({ last_cloned_month_tag: currentMonthTag })
                .eq('id', template.id)

            clonedBatches.push(newBatch)
        } catch (e) {
            console.error(`Failed to auto-clone batch ${template.id}`, e)
        }
    }

    return clonedBatches
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

export async function fundBatch(batchId: string) {
    const supabase: any = createClient()

    // 1. Fetch Batch Details (to get Source Account and Name)
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, batch_items(amount)')
        .eq('id', batchId)
        .single()

    if (batchError || !batch) throw new Error('Batch not found')
    if (batch.status === 'funded') throw new Error('Batch already funded')
    if (!batch.source_account_id) throw new Error('Batch has no source account')

    // 2. Calculate Total Amount
    const totalAmount = batch.batch_items.reduce((sum: number, item: any) => sum + item.amount, 0)
    if (totalAmount <= 0) throw new Error('Batch has no amount to fund')

    // 3. Extract Tag from Name (e.g. "CKL NOV25" -> "NOV25")
    const nameParts = batch.name.split(' ')
    const tag = nameParts[nameParts.length - 1]

    // 4. Create Transaction Header
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            occurred_at: new Date().toISOString(),
            note: `Funding Batch: ${batch.name}`,
            status: 'posted',
            tag: tag,
            created_by: SYSTEM_ACCOUNTS.DEFAULT_USER_ID
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
            type: 'credit'
        },
        {
            transaction_id: txn.id,
            account_id: SYSTEM_ACCOUNTS.BATCH_CLEARING,
            amount: totalAmount, // Debit
            type: 'debit'
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

    return true
}

export async function getAccountBatchStats(accountId: string) {
    const supabase: any = createClient()

    // Fetch batches where this account is the source and status is 'funded'
    // We also need batch items to calculate amounts
    const { data: batches, error } = await supabase
        .from('batches')
        .select('*, batch_items(amount, status)')
        .eq('source_account_id', accountId)
        .eq('status', 'funded')

    if (error) {
        console.error('Error fetching batch stats:', error)
        return { waiting: 0, confirmed: 0 }
    }

    let waiting = 0
    let confirmed = 0

    batches?.forEach((batch: any) => {
        batch.batch_items.forEach((item: any) => {
            if (item.status === 'confirmed') {
                confirmed += item.amount
            } else {
                // If batch is funded but item is not confirmed, it's waiting
                waiting += item.amount
            }
        })
    })

    return { waiting, confirmed }
}
