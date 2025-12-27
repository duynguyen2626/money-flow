'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { recalculateBalance } from '@/services/account.service'

export function ResyncButton({ accountId }: { accountId: string }) {
    const [isSyncing, setIsSyncing] = useState(false)
    const router = useRouter()

    const handleResync = async () => {
        setIsSyncing(true)
        try {
            await recalculateBalance(accountId)
            router.refresh()
        } catch (error) {
            console.error('Failed to resync balance:', error)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <button
            onClick={handleResync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
            title="Recalculate balance from active transactions"
        >
            <RotateCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Re-Sync'}</span>
        </button>
    )
}
