'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    const [confirming, setConfirming] = useState<string | null>(null)
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

    const handleConfirm = async (itemId: string, batchId: string) => {
        setConfirming(itemId)
        try {
            const response = await fetch('/api/batch/confirm-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, batchId })
            })

            if (!response.ok) throw new Error('Failed to confirm')

            toast.success('Đã xác nhận tiền về!')
            setPendingItems(prev => prev.filter(item => item.id !== itemId))
            router.refresh()
        } catch (error: any) {
            toast.error('Lỗi khi xác nhận', {
                description: error.message
            })
        } finally {
            setConfirming(null)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {pendingItems.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                >
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-700 font-semibold">
                            💰 {formatCurrency(item.amount)} đang về
                        </span>
                        {item.note && (
                            <span className="text-green-600 text-xs">({item.note})</span>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-green-700 hover:bg-green-100 hover:text-green-800"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleConfirm(item.id, item.batch_id)
                        }}
                        disabled={confirming === item.id}
                    >
                        {confirming === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Xác nhận
                            </>
                        )}
                    </Button>
                </div>
            ))}
        </div>
    )
}
