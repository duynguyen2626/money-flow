'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { Loader2, Calendar, Users, DollarSign, Clock } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ServiceTransactionsTableProps {
    serviceId: string | null
    serviceName?: string
}

export function ServiceTransactionsTable({ serviceId, serviceName }: ServiceTransactionsTableProps) {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter state
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedPerson, setSelectedPerson] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')

    useEffect(() => {
        loadTransactions()
    }, [serviceId])

    async function loadTransactions() {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            // Build query based on serviceId
            let query = supabase
                .from('transactions')
                .select(`
          *,
          account:accounts!transactions_account_id_fkey(id, name, type, image_url),
          person:profiles!transactions_person_id_fkey(id, name, avatar_url),
          shop:shops!transactions_shop_id_fkey1(id, name, image_url),
          category:categories!transactions_category_id_fkey(id, name, icon)
        `)
                .order('occurred_at', { ascending: false })

            // If serviceId is provided, filter by it
            // Otherwise, show all transactions with service_id in metadata
            if (serviceId) {
                query = query.contains('metadata', { service_id: serviceId })
            } else {
                // Show all transactions that have any service_id in metadata
                query = query.not('metadata->service_id', 'is', null)
            }

            const { data, error: queryError } = await query

            if (queryError) {
                console.error('Error loading service transactions:', queryError)
                setError(queryError.message)
                return
            }

            // Transform data to match UnifiedTransactionTable expectations
            const transformedData = (data || []).map((txn: any) => ({
                ...txn,
                // Flatten shop data
                shop_name: txn.shop?.name,
                shop_image_url: txn.shop?.image_url,
                // Flatten account data
                account_name: txn.account?.name,
                account_image_url: txn.account?.image_url,
                source_name: txn.account?.name,
                source_image: txn.account?.image_url,
                // Flatten person data
                person_name: txn.person?.name,
                person_avatar_url: txn.person?.avatar_url,
                // Flatten category data
                category_name: txn.category?.name,
                category_icon: txn.category?.icon,
            }))

            setTransactions(transformedData)
        } catch (err) {
            console.error('Failed to load transactions:', err)
            setError('Failed to load transactions')
        } finally {
            setLoading(false)
        }
    }

    // Calculate available months from transactions
    const availableMonths = useMemo(() => {
        const months = new Set<string>()
        transactions.forEach(txn => {
            const date = new Date(txn.occurred_at)
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            months.add(month)
        })
        return Array.from(months).sort().reverse()
    }, [transactions])

    // Get unique people from transactions
    const availablePeople = useMemo(() => {
        const people = new Map<string, any>()
        transactions.forEach(txn => {
            if (txn.person_id && txn.person) {
                people.set(txn.person_id, txn.person)
            }
        })
        return Array.from(people.values())
    }, [transactions])

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(txn => {
            // Month filter
            if (selectedMonth !== 'all') {
                const txnDate = new Date(txn.occurred_at)
                const txnMonth = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`
                if (txnMonth !== selectedMonth) return false
            }

            // Person filter
            if (selectedPerson !== 'all' && txn.person_id !== selectedPerson) {
                return false
            }

            // Status filter
            if (selectedStatus !== 'all') {
                if (selectedStatus === 'posted' && txn.status !== 'posted') return false
                if (selectedStatus === 'void' && txn.status !== 'void') return false
            }

            return true
        })
    }, [transactions, selectedMonth, selectedPerson, selectedStatus])

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const totalTransactions = filteredTransactions.length
        const totalAmount = filteredTransactions
            .filter(txn => txn.status !== 'void')
            .reduce((sum, txn) => sum + Math.abs(txn.amount || 0), 0)

        const uniquePeople = new Set(
            filteredTransactions
                .filter(txn => txn.person_id)
                .map(txn => txn.person_id)
        ).size

        const lastDistribution = filteredTransactions.length > 0
            ? new Date(filteredTransactions[0].occurred_at)
            : null

        // Calculate next distribution (assume monthly, same day as last)
        let nextDistribution: Date | null = null
        if (lastDistribution) {
            nextDistribution = new Date(lastDistribution)
            nextDistribution.setMonth(nextDistribution.getMonth() + 1)
        }

        return {
            totalTransactions,
            totalAmount,
            uniquePeople,
            lastDistribution,
            nextDistribution
        }
    }, [filteredTransactions])

    // Format last distribution date
    const formatLastDistribution = (date: Date | null) => {
        if (!date) return 'Never'
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return '1d ago'
        if (diffDays < 30) return `${diffDays}d ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
        return `${Math.floor(diffDays / 365)}y ago`
    }

    // Format next distribution date
    const formatNextDistribution = (date: Date | null) => {
        if (!date) return 'N/A'
        const now = new Date()
        const diffMs = date.getTime() - now.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'Overdue'
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Tomorrow'
        if (diffDays < 7) return `${diffDays}d`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
        return `${Math.floor(diffDays / 30)}mo`
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
        <div className="space-y-6">
            {/* Summary Stats Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-1.5 text-blue-600 mb-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Transactions</span>
                    </div>
                    <div className="text-xl font-bold text-blue-900">{summaryStats.totalTransactions}</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-1.5 text-green-600 mb-0.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Total</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">
                        {(summaryStats.totalAmount / 1000).toFixed(0)}K
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-1.5 text-purple-600 mb-0.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Members</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">{summaryStats.uniquePeople}</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-1.5 text-orange-600 mb-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Next</span>
                    </div>
                    <div className="text-xl font-bold text-orange-900">
                        {formatNextDistribution(summaryStats.nextDistribution)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-[150px] space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Month</Label>
                    <Select
                        items={[
                            { value: 'all', label: 'All months' },
                            ...availableMonths.map(month => ({ value: month, label: month }))
                        ]}
                        value={selectedMonth}
                        onValueChange={(val) => setSelectedMonth(val || 'all')}
                        placeholder="All months"
                    />
                </div>

                <div className="flex-1 min-w-[150px] space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Member</Label>
                    <Select
                        items={[
                            { value: 'all', label: 'All members' },
                            ...availablePeople.map(person => ({ value: person.id, label: person.name }))
                        ]}
                        value={selectedPerson}
                        onValueChange={(val) => setSelectedPerson(val || 'all')}
                        placeholder="All members"
                    />
                </div>

                <div className="flex-1 min-w-[150px] space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Status</Label>
                    <Select
                        items={[
                            { value: 'all', label: 'All status' },
                            { value: 'posted', label: 'Posted' },
                            { value: 'void', label: 'Void' }
                        ]}
                        value={selectedStatus}
                        onValueChange={(val) => setSelectedStatus(val || 'all')}
                        placeholder="All status"
                    />
                </div>
            </div>

            {/* Transaction Table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Distribution History
                        {serviceName && <span className="ml-2 text-slate-500">({serviceName})</span>}
                    </h3>
                    <span className="text-xs text-slate-500">
                        {filteredTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <UnifiedTransactionTable
                    transactions={filteredTransactions}
                    showPagination={true}
                    pageSize={10}
                    contextId={serviceId || undefined}
                    context="general"
                />
            </div>
        </div>
    )
}
