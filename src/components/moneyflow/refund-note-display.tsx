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

    // Enable for all refund transactions (sequence 1, 2, 3)
    if (!parsed.isRefund || !parsed.sequence) {
        return <span className="text-sm text-slate-700 font-medium truncate">{note}</span>
    }

    const isConfirmed = parsed.sequence === 3

    return (
        <div className="flex items-center gap-1.5 max-w-[300px]">
            {/* Sequence Number */}
            <span className="text-xs font-semibold text-slate-600 shrink-0">
                {parsed.sequence}.
            </span>

            {/* Group ID Badge */}
            <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-800 shrink-0">
                {parsed.groupId}
            </span>

            {/* For GD3: Show arrow and bank icon + account name */}
            {isConfirmed && (
                <>
                    <span className="text-lg leading-none shrink-0">➡️</span>
                    {accountLogoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={accountLogoUrl}
                            alt={accountName || 'Account'}
                            className="h-5 w-5 object-contain rounded-none shrink-0"
                            title={accountName || undefined}
                        />
                    )}
                    <span className="text-xs font-semibold text-slate-700 truncate">
                        {accountName || 'Account'}
                    </span>
                </>
            )}

            {/* For GD1 & GD2: Show clean note text */}
            {!isConfirmed && (
                <span className="text-xs text-slate-600 truncate" title={parsed.cleanNote}>
                    {parsed.cleanNote}
                </span>
            )}
        </div>
    )
}
