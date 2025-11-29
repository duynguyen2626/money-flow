'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { fixAllAccountBalances } from '@/actions/admin-actions'
import { cn } from '@/lib/utils'

export function FixDataButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const handleFix = async () => {
        if (isLoading) return
        setIsLoading(true)
        setStatus('idle')

        try {
            const result = await fixAllAccountBalances()
            if (result.success) {
                setStatus('success')
                setMessage(result.message || 'Success')
            } else {
                setStatus('error')
                setMessage(result.error || 'Failed')
            }
        } catch (e) {
            setStatus('error')
            setMessage('Unexpected error')
        } finally {
            setIsLoading(false)
            // Reset status after 3 seconds
            setTimeout(() => {
                setStatus('idle')
                setMessage('')
            }, 3000)
        }
    }

    return (
        <button
            onClick={handleFix}
            disabled={isLoading}
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                status === 'idle' && "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
                status === 'success' && "bg-emerald-50 border border-emerald-200 text-emerald-700",
                status === 'error' && "bg-red-50 border border-red-200 text-red-700",
                isLoading && "opacity-70 cursor-wait"
            )}
        >
            {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : status === 'success' ? (
                <CheckCircle className="h-3.5 w-3.5" />
            ) : status === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5" />
            ) : (
                <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>
                {isLoading ? 'Fixing...' : status === 'idle' ? 'Fix Data Integrity' : message}
            </span>
        </button>
    )
}
