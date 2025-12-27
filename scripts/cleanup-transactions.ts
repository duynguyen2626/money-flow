
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getProfileSheetLink(personId: string): Promise<string | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, sheet_link')
        .eq('id', personId)
        .maybeSingle()

    if (error) {
        console.error('Failed to fetch profile for sheet sync:', error)
        return null
    }

    if (profile?.sheet_link) return profile.sheet_link

    // Fallback to account owner
    const { data: accountRow } = await supabase
        .from('accounts')
        .select('owner_id, profiles (id, sheet_link)')
        .eq('id', personId)
        .eq('type', 'debt')
        .maybeSingle()

    const ownerProfile = (accountRow as any)?.profiles
    return ownerProfile?.sheet_link || null
}

async function postToSheet(sheetLink: string, payload: any) {
    try {
        await fetch(sheetLink, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        console.log('Successfully posted to sheet.')
    } catch (error) {
        console.error('Error posting to sheet:', error)
    }
}

async function cleanup() {
    console.log('Starting cleanup...')

    // 1. Find transactions to delete
    // Criteria: Tag matches legacy MMMYY OR Note starts with 'Auto:'
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
      id,
      note,
      tag,
      created_at,
      occurred_at,
      person_id,
      account_id,
      amount,
      type
    `)
        .or('tag.like._____,note.ilike.Auto:%')

    if (error) {
        console.error('Error fetching transactions:', error)
        return
    }

    const isLegacyMonthTag = (value: unknown) =>
        typeof value === 'string' && /^[A-Z]{3}[0-9]{2}$/.test(value.trim())

    const transactionsToDelete = (transactions ?? []).filter((txn: any) => {
        const note = typeof txn.note === 'string' ? txn.note : ''
        return isLegacyMonthTag(txn.tag) || note.startsWith('Auto:')
    })

    if (!transactionsToDelete || transactionsToDelete.length === 0) {
        console.log('No transactions found to cleanup.')
        return
    }

    console.log(`Found ${transactionsToDelete.length} transactions to delete.`)

    for (const txn of transactionsToDelete) {
        console.log(`Processing deletion for txn: ${txn.id} (${txn.note})`)

        // 2. Sync delete to Sheet
        const personId = txn.person_id
        if (personId) {
            const sheetLink = await getProfileSheetLink(personId)
            if (sheetLink) {
                const payload = {
                    action: 'delete',
                    id: txn.id,
                    occurred_at: txn.occurred_at || txn.created_at,
                    note: txn.note || '',
                    tag: txn.tag || '',
                    amount: Math.abs(Number(txn.amount) || 0),
                    type: (txn as any).type || 'expense',
                    shop_name: (txn as any).shop_name || 'Service'
                }

                console.log(`Syncing delete for person ${personId}...`)
                await postToSheet(sheetLink, payload)
            } else {
                console.log(`No sheet link for person ${personId}, skipping sync.`)
            }
        }

        // 3. Delete from DB
        const { error: delTxnErr } = await supabase
            .from('transactions')
            .delete()
            .eq('id', txn.id)

        if (delTxnErr) {
            console.error('Error deleting transaction:', delTxnErr)
        } else {
            console.log(`Deleted transaction ${txn.id}`)
        }
    }

    console.log('Cleanup complete.')
}

cleanup()
