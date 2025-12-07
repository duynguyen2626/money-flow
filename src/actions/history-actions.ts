'use server'

import { createClient } from '@/lib/supabase/server'

export type TransactionHistoryRecord = {
    id: string
    transaction_id: string
    snapshot_before: Record<string, unknown>
    change_type: 'edit' | 'void'
    created_at: string
    changed_by: string | null
    changed_by_email?: string | null
}

export type HistoryDiff = {
    field: string
    oldValue: unknown
    newValue: unknown
}

export type TransactionHistoryWithDiff = TransactionHistoryRecord & {
    diffs: HistoryDiff[]
}

/**
 * Fetch transaction history for a given transaction ID
 */
export async function getTransactionHistory(
    transactionId: string
): Promise<{ success: boolean; data?: TransactionHistoryWithDiff[]; error?: string }> {
    try {
        const supabase = await createClient()

        // Fetch history records ordered by created_at descending
        type HistoryRow = {
            id: string
            transaction_id: string
            snapshot_before: unknown
            change_type: string
            created_at: string
            changed_by: string | null
        }

        const historyResult = await supabase
            .from('transaction_history')
            .select('id, transaction_id, snapshot_before, change_type, created_at, changed_by')
            .eq('transaction_id', transactionId)
            .order('created_at', { ascending: false })

        const historyRecords = historyResult.data as HistoryRow[] | null
        const historyError = historyResult.error

        if (historyError) {
            console.error('Error fetching transaction history:', historyError)
            return { success: false, error: historyError.message }
        }

        if (!historyRecords || historyRecords.length === 0) {
            return { success: true, data: [] }
        }

        // Fetch current transaction state for comparison with most recent history
        const { data: currentTxn, error: txnError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single()

        if (txnError) {
            console.error('Error fetching current transaction:', txnError)
            // Continue without current state - just show snapshots
        }

        // Get user emails for changed_by IDs
        const changedByIds = historyRecords
            .map(r => r.changed_by)
            .filter((id): id is string => id !== null)

        let userEmails: Record<string, string> = {}
        if (changedByIds.length > 0) {
            // This would require admin access to auth.users - for now we'll skip
            // In production, you'd fetch from a profiles table or similar
        }

        // Parse snapshots and compute diffs
        const result: TransactionHistoryWithDiff[] = []

        for (let i = 0; i < historyRecords.length; i++) {
            const record = historyRecords[i]
            const snapshotBefore = parseSnapshot(record.snapshot_before)

            // Get the "after" state - either the next snapshot or current transaction
            let snapshotAfter: Record<string, unknown>
            if (i === 0) {
                // Most recent change - compare to current state
                snapshotAfter = currentTxn ? flattenTransaction(currentTxn) : {}
            } else {
                // Compare to the previous snapshot (which is more recent in our desc order)
                snapshotAfter = parseSnapshot(historyRecords[i - 1].snapshot_before)
            }

            const diffs = computeDiffs(snapshotBefore, snapshotAfter)

            result.push({
                id: record.id,
                transaction_id: record.transaction_id,
                snapshot_before: snapshotBefore,
                change_type: record.change_type as 'edit' | 'void',
                created_at: record.created_at,
                changed_by: record.changed_by,
                changed_by_email: record.changed_by ? userEmails[record.changed_by] : null,
                diffs,
            })
        }

        return { success: true, data: result }
    } catch (error) {
        console.error('Unexpected error in getTransactionHistory:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

/**
 * Check if a transaction has any history records (for conditional menu display)
 */
export async function hasTransactionHistory(transactionId: string): Promise<boolean> {
    try {
        const supabase = await createClient()

        const { count, error } = await supabase
            .from('transaction_history')
            .select('id', { count: 'exact', head: true })
            .eq('transaction_id', transactionId)

        if (error) {
            console.error('Error checking transaction history:', error)
            return false
        }

        return (count ?? 0) > 0
    } catch {
        return false
    }
}

/**
 * Parse snapshot_before JSON safely
 */
function parseSnapshot(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null) {
        return value as Record<string, unknown>
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value)
        } catch {
            return {}
        }
    }
    return {}
}

/**
 * Flatten transaction object for comparison
 */
function flattenTransaction(txn: Record<string, unknown>): Record<string, unknown> {
    // Keep only relevant fields for comparison
    const relevantFields = [
        'amount', 'original_amount', 'occurred_at', 'note', 'status',
        'category_id', 'account_id', 'target_account_id', 'person_id',
        'shop_id', 'type', 'cashback_share_percent', 'cashback_share_fixed',
        'tag', 'metadata'
    ]

    const result: Record<string, unknown> = {}
    for (const field of relevantFields) {
        if (field in txn) {
            result[field] = txn[field]
        }
    }
    return result
}

/**
 * Compute differences between two snapshots
 */
function computeDiffs(
    before: Record<string, unknown>,
    after: Record<string, unknown>
): HistoryDiff[] {
    const diffs: HistoryDiff[] = []
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

    // Fields to skip in diff display
    const skipFields = ['id', 'created_at', 'updated_at', 'user_id']

    // Human-readable field names
    const fieldLabels: Record<string, string> = {
        amount: 'Amount',
        original_amount: 'Original Amount',
        occurred_at: 'Date',
        note: 'Note',
        status: 'Status',
        category_id: 'Category',
        account_id: 'Account',
        target_account_id: 'Target Account',
        person_id: 'Person',
        shop_id: 'Shop',
        type: 'Type',
        cashback_share_percent: 'Cashback %',
        cashback_share_fixed: 'Cashback Fixed',
        tag: 'Tag',
    }

    for (const key of allKeys) {
        if (skipFields.includes(key)) continue

        const oldVal = before[key]
        const newVal = after[key]

        // Skip if both are null/undefined
        if (oldVal == null && newVal == null) continue

        // Check if values are different
        if (!deepEqual(oldVal, newVal)) {
            diffs.push({
                field: fieldLabels[key] || formatFieldName(key),
                oldValue: oldVal,
                newValue: newVal,
            })
        }
    }

    return diffs
}

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null || b == null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
        const aJson = JSON.stringify(a)
        const bJson = JSON.stringify(b)
        return aJson === bJson
    }

    return false
}

/**
 * Format field name to human-readable
 */
function formatFieldName(field: string): string {
    return field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}
