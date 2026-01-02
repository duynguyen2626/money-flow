'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { Loader2 } from 'lucide-react'

interface ServiceTransactionsTableProps {
    serviceId: string
    serviceName?: string
}

export function ServiceTransactionsTable({ serviceId, serviceName }: ServiceTransactionsTableProps) {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadTransactions()
    }, [serviceId])

    async function loadTransactions() {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            // Query transactions by service_id in metadata
            const { data, error: queryError } = await supabase
                .from('transactions')
                .select(`
          *,
          account:accounts!account_id(id, name, type),
          person:profiles!person_id(id, name),
          shop:shops(id, name, img_url),
          category:categories(id, name, icon)
        `)
                .contains('metadata', { service_id: serviceId })
                .order('occurred_at', { ascending: false })

            if (queryError) {
                console.error('Error loading service transactions:', queryError)
                setError(queryError.message)
                return
            }

            setTransactions(data || [])
        } catch (err) {
            console.error('Failed to load transactions:', err)
            setError('Failed to load transactions')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 text-center text-sm text-red-600">
                {error}
            </div>
        )
    }

    if (transactions.length === 0) {
        return (
            <div className="p-8 text-center text-sm text-slate-500">
                No transactions found for this service.
                <p className="mt-1 text-xs">
                    Distribute the service to create transactions.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-700">
                    Distribution History
                    {serviceName && <span className="ml-2 text-slate-500">({serviceName})</span>}
                </h3>
                <span className="text-xs text-slate-500">
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </span>
            </div>

            <UnifiedTransactionTable
                transactions={transactions}
                showPagination={true}
                pageSize={10}
                contextId={serviceId}
                context="general"
            />
        </div>
    )
}
