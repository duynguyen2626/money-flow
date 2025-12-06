'use client'

import { parseRefundNote } from '@/lib/refund-note-parser'
import { Badge } from '@/components/ui/badge'

type RefundNoteDisplayProps = {
    note: string | null | undefined
    shopLogoUrl?: string | null
    shopName?: string | null
    accountLogoUrl?: string | null
    accountName?: string | null
    status?: string | null
    amount?: number
}

export function RefundNoteDisplay({
    note,
    shopLogoUrl,
    shopName,
    accountLogoUrl,
    accountName,
    status,
    amount
}: RefundNoteDisplayProps) {
    const parsed = parseRefundNote(note)

    if (!parsed.isRefund) {
        return (
            <div className="flex flex-col min-w-0">
                {note ? (
                    <span className="text-sm font-medium text-slate-900 truncate" title={note}>
                        {note}
                    </span>
                ) : (
                    <span className="text-sm font-medium text-slate-400 italic">No note</span>
                )}
            </div>
        )
    }

    // Determine if this is a "Money In" (Confirmation) based on keywords or context
    // In new logic, confirmation notes often have "Refund Received"
    const isConfirmation = parsed.cleanNote.toLowerCase().includes('received') || parsed.sequence === 3;
    const isRequest = parsed.cleanNote.toLowerCase().includes('request');

    // Badge Color Logic
    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200"; // Default
    if (isConfirmation) badgeClass = "bg-green-100 text-green-800 border-green-200";
    else if (isRequest) badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
    else badgeClass = "bg-blue-100 text-blue-800 border-blue-200"; // Intermediate/Pending

    return (
        <div className="flex items-center gap-2 max-w-full overflow-hidden">
            <Badge variant="outline" className={`shrink-0 px-1.5 py-0 h-5 font-mono text-[10px] ${badgeClass}`}>
                {parsed.groupId}
            </Badge>

            {isConfirmation ? (
                 <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-semibold text-green-700 truncate">Received</span>
                    {accountLogoUrl && (
                        <img src={accountLogoUrl} alt={accountName || ''} className="h-4 w-4 object-contain" />
                    )}
                 </div>
            ) : (
                <span className="text-sm font-medium text-slate-900 truncate" title={parsed.cleanNote}>
                    {parsed.cleanNote}
                </span>
            )}
        </div>
    )
}
