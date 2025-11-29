'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/account-utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PendingBatchItem {
    id: string
    amount: number
    receiver_name: string | null
    note: string | null
    batch_id: string
    batch: {
        name: string
    }
}

interface ConfirmMoneyReceivedProps {
    accountId: string
    minimal?: boolean
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="group/tooltip relative inline-flex">
            {children}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100">
                {label}
            </span>
        </div>
    )
}

export function ConfirmMoneyReceived({ accountId, minimal = false }: ConfirmMoneyReceivedProps) {
    const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
    const [confirming, setConfirming] = useState(false)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchPendingItems = async () => {
        try {
            const response = await fetch(`/api/batch/pending-items?accountId=${accountId}`)
            if (response.ok) {
                const data = await response.json()
                setPendingItems(data)
            }
        } catch (error) {
            console.error('Failed to fetch pending items:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPendingItems()

        const supabase = createClient()
        const channel = supabase
            .channel(`batch_items_pending_${accountId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'batch_items',
                filter: `target_account_id=eq.${accountId}`
            }, () => {
                fetchPendingItems()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [accountId])

    if (loading || !pendingItems || pendingItems.length === 0) {
        return null
    }

    const totalAmount = pendingItems.reduce((sum, item) => sum + item.amount, 0)

    const handleConfirmAll = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirming) return
        setConfirming(true)

        try {
            let successCount = 0
            for (const item of pendingItems) {
                const response = await fetch('/api/batch/confirm-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: item.id, batchId: item.batch_id })
                })

                if (response.ok) {
                    successCount++
                }
            }

            if (successCount > 0) {
                toast.success(`Đã xác nhận ${successCount} khoản tiền về!`)
                setPendingItems([])
                router.refresh()
            } else {
                throw new Error('Failed to confirm items')
            }
        } catch (error: any) {
            toast.error('Lỗi khi xác nhận', {
                description: error.message
            })
        } finally {
            setConfirming(false)
        }
    }

    if (minimal) {
        return (
            <Tooltip label={`Confirm receipt of ${formatCurrency(totalAmount)}`}>
                <button
                    onClick={handleConfirmAll}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:scale-110 transition-all shadow-sm"
                    disabled={confirming}
                >
                    {confirming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <span className="text-sm font-bold">✓</span>
                    )}
                </button>
            </Tooltip>
        )
    }


    return (
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                Waiting Confirm:
            </span>
            <span className="text-sm font-bold text-slate-700">
                {new Intl.NumberFormat('vi-VN').format(totalAmount)}
            </span>
            <Tooltip label={`Confirm receipt of ${formatCurrency(totalAmount)}`}>
                <button
                    onClick={handleConfirmAll}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:scale-110 transition-all shadow-sm"
                    disabled={confirming}
                >
                    {confirming ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <span className="text-xs">✓</span>
                    )}
                </button>
            </Tooltip>
        </div>
    )
}
