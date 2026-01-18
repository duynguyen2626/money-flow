'use client'

import { useState, useMemo } from 'react'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { UnifiedTransactionTable } from '../moneyflow/unified-transaction-table'
import { TransactionToolbar, FilterType, StatusFilter } from './TransactionToolbar'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth } from 'date-fns'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { UnsavedChangesWarning } from '@/components/transaction/unsaved-changes-warning'
import { ConfirmRefundDialogV2 } from '@/components/moneyflow/confirm-refund-dialog-v2'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'
import { voidTransactionAction } from '@/actions/transaction-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UnifiedTransactionsPageProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
}

export function UnifiedTransactionsPage({
    transactions,
    accounts,
    categories,
    people,
    shops
}: UnifiedTransactionsPageProps) {
    const router = useRouter()

    // Toolbar State
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState<FilterType>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

    const [date, setDate] = useState<Date>(new Date())
    const [dateRange, setDateRange] = useState<DateRange>()
    const [dateMode, setDateMode] = useState<'month' | 'range'>('month')

    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
    const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>()

    // Transaction Slide V2 States
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [slideMode, setSlideMode] = useState<'add' | 'edit' | 'duplicate'>('add')
    const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null)
    const [slideOverrideType, setSlideOverrideType] = useState<string | undefined>(undefined)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    const [isGlobalLoading, setIsGlobalLoading] = useState(false)

    const handleSlideSubmissionStart = () => {
        setIsSlideOpen(false) // Close immediately
        setIsGlobalLoading(true) // Show loading
    }

    const handleSlideSubmissionEnd = () => {
        setIsGlobalLoading(false)
        router.refresh()
    }

    // Clear loading IDs when transaction data updates
    useMemo(() => {
        setLoadingIds(new Set())
    }, [transactions])

    // Other Dialog States
    const [refundTxn, setRefundTxn] = useState<TransactionWithDetails | null>(null)
    const [isRefundOpen, setIsRefundOpen] = useState(false)

    const [voidTxn, setVoidTxn] = useState<TransactionWithDetails | null>(null)
    const [isVoidAlertOpen, setIsVoidAlertOpen] = useState(false)

    const handleReset = () => {
        setSearch('')
        setFilterType('all')
        setStatusFilter('active')
        setSelectedAccountId(undefined)
        setSelectedPersonId(undefined)
        setDate(new Date())
        setDateMode('month')
        setDateRange(undefined)
    }

    const hasActiveFilters =
        search !== '' ||
        filterType !== 'all' ||
        statusFilter !== 'void' && statusFilter !== 'active'/* wait status default is active so if not active it is changed? No user might want to see void. But reset resets to Active. So if Void -> Active. */ || statusFilter === 'void' ||
        !!selectedAccountId ||
        !!selectedPersonId ||
        !isSameMonth(date, new Date()) ||
        dateMode === 'range'

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        const lowerSearch = search.toLowerCase()
        const matchedAccountIds = search ? accounts.filter(a => a.name.toLowerCase().includes(lowerSearch)).map(a => a.id) : []
        const matchedPersonIds = search ? people.filter(p => p.name.toLowerCase().includes(lowerSearch)).map(p => p.id) : []

        return transactions.filter(t => {
            // 0. Status Filter
            if (statusFilter === 'active' && t.status === 'void') return false
            if (statusFilter === 'void' && t.status !== 'void') return false
            if (statusFilter === 'pending') {
                const isPendingRefund = t.account_id === REFUND_PENDING_ACCOUNT_ID;
                const isSystemPending = t.status === 'pending';
                if (!isPendingRefund && !isSystemPending) return false;
            }

            // 1. Date Filter
            const tDate = parseISO(t.occurred_at)
            if (dateMode === 'month') {
                const start = startOfMonth(date)
                const end = endOfMonth(date)
                if (!isWithinInterval(tDate, { start, end })) return false
            } else if (dateMode === 'range' && dateRange?.from) {
                const start = dateRange.from
                const end = dateRange.to || dateRange.from
                if (tDate < start || (end && tDate > end)) return false
            }

            // 2. Account Filter
            if (selectedAccountId) {
                if (t.account_id !== selectedAccountId && t.to_account_id !== selectedAccountId) return false
            }

            // 3. Person Filter
            if (selectedPersonId) {
                if (t.person_id !== selectedPersonId) return false
            }

            // 4. Search
            if (search) {
                const match =
                    t.note?.toLowerCase().includes(lowerSearch) ||
                    t.shop_name?.toLowerCase().includes(lowerSearch) ||
                    t.category_name?.toLowerCase().includes(lowerSearch) ||
                    String(t.amount).includes(lowerSearch) ||
                    t.id.toLowerCase().includes(lowerSearch) ||
                    (t.account_id && matchedAccountIds.includes(t.account_id)) ||
                    (t.to_account_id && matchedAccountIds.includes(t.to_account_id)) ||
                    (t.person_id && matchedPersonIds.includes(t.person_id))

                if (!match) return false
            }
            // ... rest matches

            // 5. Type Filter
            if (filterType === 'all') return true

            if (filterType === 'income') return t.type === 'income'
            if (filterType === 'expense') return t.type === 'expense'
            if (filterType === 'transfer') return t.type === 'transfer'

            // Debt specific
            if (filterType === 'lend') {
                const amount = Number(t.amount) || 0
                const isDebt = t.type === 'debt'
                return (isDebt && amount < 0) || (t.type === 'expense' && !!t.person_id)
            }

            if (filterType === 'repay') {
                const amount = Number(t.amount) || 0
                const isDebt = t.type === 'debt'
                return (isDebt && amount > 0) || t.type === 'repayment' || (t.type === 'income' && !!t.person_id)
            }

            if (filterType === 'cashback') {
                return (t.cashback_share_percent && t.cashback_share_percent > 0) || (t.cashback_share_amount && t.cashback_share_amount > 0)
            }

            return true
        })
    }, [
        transactions, search, filterType, statusFilter,
        date, dateRange, dateMode,
        selectedAccountId, selectedPersonId
    ])

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const handleSelect = (id: string) => {
        if (id === 'ALL_CLEAR') {
            setSelectedIds(new Set())
            return
        }
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    // Slide Handlers
    const handleAdd = () => {
        setSlideOverrideType(undefined)
        setSlideMode('add')
        setSelectedTxn(null)
        setIsSlideOpen(true)
    }

    const handleAddWithState = (type: string) => {
        setSlideOverrideType(type)
        setSlideMode('add')
        setSelectedTxn(null)
        setIsSlideOpen(true)
    }

    const handleEdit = (t: TransactionWithDetails) => {
        setSlideMode('edit')
        setSelectedTxn(t)
        setIsSlideOpen(true)
    }

    const handleDuplicate = (t: TransactionWithDetails) => {
        setSlideOverrideType(undefined)
        setSlideMode('duplicate')
        setSelectedTxn(t)
        setIsSlideOpen(true)
    }

    const handleSlideClose = (force = false) => {
        if (hasUnsavedChanges && !force) {
            setShowUnsavedWarning(true)
        } else {
            setIsSlideOpen(false)
            setHasUnsavedChanges(false)
            setSelectedTxn(null)
            setSlideOverrideType(undefined)
        }
    }

    const confirmCloseSlide = () => {
        setShowUnsavedWarning(false)
        setIsSlideOpen(false)
        setHasUnsavedChanges(false)
        setSelectedTxn(null)
        setSlideOverrideType(undefined)
    }

    const handleSlideSuccess = (data?: any) => {
        setIsSlideOpen(false)
        setHasUnsavedChanges(false)
        setSelectedTxn(null)
        setSlideOverrideType(undefined)
        if (data?.id) {
            setLoadingIds(prev => new Set(prev).add(data.id))
        }
        router.refresh()
    }

    const handleRefund = (t: TransactionWithDetails) => {
        setRefundTxn(t)
        setIsRefundOpen(true)
    }

    const handleVoid = (t: TransactionWithDetails) => {
        setVoidTxn(t)
        setIsVoidAlertOpen(true)
    }

    const confirmVoid = async () => {
        if (!voidTxn) return
        try {
            const success = await voidTransactionAction(voidTxn.id)
            if (success) {
                toast.success("Transaction voided successfully")
                router.refresh()
            } else {
                toast.error("Failed to void transaction")
            }
        } catch (e) {
            toast.error("Error voiding transaction")
        } finally {
            setIsVoidAlertOpen(false)
            setVoidTxn(null)
        }
    }

    const initialSlideData = useMemo(() => {
        if (slideOverrideType) {
            return {
                type: slideOverrideType as any,
                occurred_at: new Date(),
                amount: 0,
                cashback_mode: "none_back",
                // Pass source_account_id preference? No, let V2 default to first account.
            };
        }
        if (!selectedTxn) return undefined;
        return {
            type: selectedTxn.type as any,
            occurred_at: slideMode === 'duplicate' ? new Date() : new Date(selectedTxn.occurred_at),
            amount: Math.abs(Number(selectedTxn.amount)),
            note: selectedTxn.note || '',
            source_account_id: selectedTxn.account_id || '',
            target_account_id: selectedTxn.to_account_id || undefined,
            category_id: selectedTxn.category_id || undefined,
            shop_id: selectedTxn.shop_id || undefined,
            person_id: selectedTxn.person_id || undefined,
            tag: selectedTxn.tag || undefined,
            cashback_mode: selectedTxn.cashback_mode || "none_back",
            cashback_share_percent: selectedTxn.cashback_share_percent,
            cashback_share_fixed: selectedTxn.cashback_share_fixed,
        };
    }, [selectedTxn, slideMode, slideOverrideType]);

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Header Section */}
            <div className="flex flex-col gap-0 border-b bg-background sticky top-0 z-10 shadow-sm">
                <TransactionToolbar
                    accounts={accounts}
                    people={people}
                    date={date}
                    dateRange={dateRange}
                    mode={dateMode}
                    onModeChange={setDateMode}
                    onDateChange={setDate}
                    onRangeChange={setDateRange}

                    accountId={selectedAccountId}
                    onAccountChange={setSelectedAccountId}

                    personId={selectedPersonId}
                    onPersonChange={setSelectedPersonId}

                    searchTerm={search}
                    onSearchChange={setSearch}

                    filterType={filterType}
                    onFilterChange={setFilterType}

                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}

                    hasActiveFilters={hasActiveFilters}
                    onReset={handleReset}

                    onAdd={handleAdd}
                    onAddWithState={handleAddWithState}
                />
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-hidden p-0 sm:p-4 relative">
                {isGlobalLoading && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-200 border border-slate-200 pointer-events-auto">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-slate-700">Updating...</span>
                        </div>
                    </div>
                )}
                <UnifiedTransactionTable
                    transactions={filteredTransactions}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    selectedTxnIds={selectedIds}
                    onSelectTxn={handleSelect}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    context="general"
                    loadingIds={loadingIds}
                />
            </div>

            {/* Transaction Slide V2 - Primary Interface */}
            <TransactionSlideV2
                open={isSlideOpen}
                onOpenChange={handleSlideClose}
                onSubmissionStart={handleSlideSubmissionStart}
                onSubmissionEnd={handleSlideSubmissionEnd}
                mode="single"
                editingId={(slideMode === 'edit' && selectedTxn) ? selectedTxn.id : undefined}
                initialData={initialSlideData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleSlideSuccess}
                onHasChanges={setHasUnsavedChanges}
            />

            {/* Unsaved Changes Warning */}
            <UnsavedChangesWarning
                open={showUnsavedWarning}
                onOpenChange={setShowUnsavedWarning}
                onContinueEditing={() => setShowUnsavedWarning(false)}
                onDiscardChanges={confirmCloseSlide}
            />

            {isRefundOpen && refundTxn && (
                <ConfirmRefundDialogV2
                    open={isRefundOpen}
                    onOpenChange={setIsRefundOpen}
                    transaction={refundTxn}
                    accounts={accounts}
                />
            )}

            <AlertDialog open={isVoidAlertOpen} onOpenChange={setIsVoidAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will mark the transaction as void. This action cannot be easily undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Void Transaction
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
