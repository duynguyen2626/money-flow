'use client'

import { useState } from 'react'
import { Database, Loader2, Check } from 'lucide-react'
import { migrateRepaymentMetadata } from '@/actions/migrate-repayments'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function MigrateDataButton({ personId }: { personId: string }) {
    const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
    const router = useRouter()

    const handleMigrate = async () => {
        if (!confirm('This will analyze all past repayments and backfill the metadata using FIFO logic. This may update historical records. Continue?')) {
            return
        }

        setStatus('running')
        try {
            const result = await migrateRepaymentMetadata(personId)
            if (result.success) {
                toast.success(`Migration complete! Updated ${result.count} transactions.`)
                setStatus('done')
                router.refresh()
                // Reset to idle after a moment
                setTimeout(() => setStatus('idle'), 3000)
            } else {
                toast.error(`Migration failed: ${result.message}`)
                setStatus('idle')
            }
        } catch (error) {
            console.error('Migration error:', error)
            toast.error('An unexpected error occurred during migration.')
            setStatus('idle')
        }
    }

    if (status === 'done') {
        return (
            <button
                disabled
                className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 shadow-sm md:px-4 md:py-2 md:text-sm"
            >
                <Check className="h-4 w-4" />
                <span>Updated</span>
            </button>
        )
    }

    return (
        <button
            onClick={handleMigrate}
            disabled={status === 'running'}
            className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
            title="Backfill missing repayment data for old transactions"
        >
            {status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Database className="h-4 w-4" />
            )}
            <span>{status === 'running' ? 'Updating...' : 'Fix Old Data'}</span>
        </button>
    )
}
