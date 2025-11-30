'use client'

import { parseRefundNote } from '@/lib/refund-note-parser'

type RefundNoteDisplayProps = {
    note: string | null | undefined
    shopLogoUrl?: string | null
    shopName?: string | null
    accountLogoUrl?: string | null
    accountName?: string | null
    status?: string | null
}

export function RefundNoteDisplay({
    note,
    shopLogoUrl,
    shopName,
    accountLogoUrl,
    accountName,
    status,
}: RefundNoteDisplayProps) {
    const parsed = parseRefundNote(note)

    // Only enhance display for refund transactions (sequence 2 or 3)
    if (!parsed.isRefund || !parsed.sequence || parsed.sequence < 2) {
        return <span className="text-sm text-slate-700 font-medium truncate">{note}</span>
    }

    // For GD2 (Request) and GD3 (Confirm), show enhanced format
    const isConfirmed = parsed.sequence === 3

    return (
        <div className="flex items-center gap-1.5 max-w-[300px]">
            {/* Group ID Badge */}
            <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-800 shrink-0">
                {parsed.groupId}
            </span>

            {/* Shop Icon (if available) */}
            {shopLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={shopLogoUrl}
                    alt={shopName || 'Shop'}
                    className="h-5 w-5 object-contain rounded-none shrink-0"
                    title={shopName || undefined}
                />
            )}

            {/* Arrow for GD3 (Confirmed) */}
            {isConfirmed && <span className="text-lg leading-none shrink-0">➡️</span>}

            {/* Bank/Account Icon (for GD3 only) */}
            {isConfirmed && accountLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={accountLogoUrl}
                    alt={accountName || 'Account'}
                    className="h-5 w-5 object-contain rounded-none shrink-0"
                    title={accountName || undefined}
                />
            )}

            {/* Clean Note Text */}
            <span className="text-xs text-slate-600 truncate" title={parsed.cleanNote}>
                {parsed.cleanNote}
            </span>
        </div>
    )
}
