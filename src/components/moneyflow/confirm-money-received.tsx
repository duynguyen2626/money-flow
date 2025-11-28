'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/account-utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
}

export function ConfirmMoneyReceived({ accountId }: ConfirmMoneyReceivedProps) {
    const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
    const [confirming, setConfirming] = useState(false)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function fetchPendingItems() {
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

        fetchPendingItems()
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

    return (
        <div
            onClick={handleConfirmAll}
            className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-600 cursor-pointer hover:bg-emerald-100 transition-colors"
            role="button"
            title="Click to confirm receipt"
        >
            {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <span>☑️</span>
            )}
            <span className="truncate max-w-[80px]" title={formatCurrency(totalAmount)}>
                {new Intl.NumberFormat('vi-VN').format(totalAmount)}
            </span>
        </div>
    )
}
