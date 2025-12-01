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

    if (!parsed.isRefund || !parsed.sequence) {
        return <span className="text-sm text-slate-700 font-medium truncate">{note}</span>
    }

    const isConfirmed = parsed.sequence === 3

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600 shrink-0">
                    {parsed.sequence}.
                </span>
                <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-800 shrink-0">
                    {parsed.groupId}
                </span>
            </div>

            {!isConfirmed && (
                <div className="flex items-center gap-2">
                    {shopLogoUrl ? (
                        <img src={shopLogoUrl} alt={shopName || ''} className="h-8 w-8 object-contain rounded-none" />
                    ) : (
                        <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-600 rounded-none">
                            {shopName ? shopName.charAt(0).toUpperCase() : '🛍️'}
                        </span>
                    )}
                    <span className="text-xs text-slate-600 truncate" title={parsed.cleanNote}>
                        {shopName && parsed.cleanNote.startsWith(shopName)
                            ? parsed.cleanNote.slice(shopName.length).replace(/^[\s-:]+/, '')
                            : parsed.cleanNote}
                    </span>
                </div>
            )}

            {isConfirmed && (
                <div className="flex items-center gap-2">
                    <span className="text-lg leading-none shrink-0">➡️</span>
                    {accountLogoUrl ? (
                        <img src={accountLogoUrl} alt={accountName || ''} className="h-8 w-8 object-contain rounded-none" />
                    ) : (
                        <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-sm font-bold border rounded-none">
                            {(accountName ?? '?').charAt(0).toUpperCase()}
                        </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700 truncate">
                        {accountName || 'Account'}
                    </span>
                </div>
            )}
        </div>
    )
}
