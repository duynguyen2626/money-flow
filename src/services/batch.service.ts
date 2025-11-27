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
            bank_number: item.bank_number
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

    const batch = data as any

    if (!batch.sheet_link) {
        throw new Error('Vui lòng cấu hình Link Sheet cho lô này')
    }

    const payload = {
        batchName: batch.name,
        items: batch.batch_items.map((item: any) => ({
            receiver_name: item.receiver_name || item.target_account?.name || 'Unknown',
            bank_number: item.bank_number || '',
            bank_name: item.bank_name || '',
            amount: item.amount,
            note: item.note
        }))
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
