'use server'

import { pocketbaseList, pocketbaseGetById, toPocketBaseId } from '@/services/pocketbase/server'

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
        const pbTxnId = toPocketBaseId(transactionId, 'transactions');

        // Primary query: direct relation by transaction_id
        const historyResp = await pocketbaseList<any>('transaction_history', {
            filter: `transaction_id = "${pbTxnId}"`,
            sort: '-created', // PocketBase uses 'created' for timestamp
            perPage: 100
        });

        let historyItems = historyResp.items;

        // Fallback for legacy migrated rows where transaction_id may be empty
        // and the transaction reference lives inside snapshot_before.id.
        if (!historyItems.length) {
            const fallbackResp = await pocketbaseList<any>('transaction_history', {
                sort: '-created',
                perPage: 500
            });
            historyItems = (fallbackResp.items || []).filter((item) => {
                const snapshot = parseSnapshot(item.snapshot_before)
                const snapshotId = String((snapshot as any).id || '')
                return snapshotId === pbTxnId || snapshotId === transactionId
            })
        }

        // Fetch current transaction state for comparison
        const currentTxn = await pocketbaseGetById<any>('transactions', pbTxnId);

        // Parse snapshots and compute diffs
        const result: TransactionHistoryWithDiff[] = []

        for (let i = 0; i < historyItems.length; i++) {
            const record = historyItems[i]
            const snapshotBefore = parseSnapshot(record.snapshot_before)

            // Get the "after" state - either the next snapshot or current transaction
            let snapshotAfter: Record<string, unknown>
            if (i === 0) {
                // Most recent change - compare to current state
                snapshotAfter = currentTxn ? flattenTransaction(currentTxn) : {}
            } else {
                // Compare to the previous snapshot (which is more recent in our desc order)
                snapshotAfter = parseSnapshot(historyItems[i - 1].snapshot_before)
            }

            const diffs = computeDiffs(snapshotBefore, snapshotAfter)

            result.push({
                id: record.id,
                transaction_id: record.transaction_id,
                snapshot_before: snapshotBefore,
                change_type: record.change_type as 'edit' | 'void',
                created_at: record.created, // Use PB created timestamp
                changed_by: record.changed_by || null,
                changed_by_email: null, // PB doesn't expose this easily here
                diffs,
            })
        }

        return { success: true, data: result }
    } catch (error: any) {
        console.error('[DB:PB] getTransactionHistory failed:', error)
        return { success: false, error: error.message || 'An unexpected error occurred' }
    }
}

/**
 * Check if a transaction has any history records
 */
export async function hasTransactionHistory(transactionId: string): Promise<boolean> {
    try {
        const pbTxnId = toPocketBaseId(transactionId, 'transactions');
        const resp = await pocketbaseList<any>('transaction_history', {
            filter: `transaction_id = "${pbTxnId}"`,
            perPage: 1
        });

        if (resp.totalItems > 0) return true

        const fallbackResp = await pocketbaseList<any>('transaction_history', {
            sort: '-created',
            perPage: 500
        })
        return (fallbackResp.items || []).some((item) => {
            const snapshot = parseSnapshot(item.snapshot_before)
            const snapshotId = String((snapshot as any).id || '')
            return snapshotId === pbTxnId || snapshotId === transactionId
        })
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
    const skipFields = ['id', 'created', 'updated', 'user_id', 'collectionId', 'collectionName']

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
