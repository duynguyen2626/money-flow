'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { fetchAccountCycleOptionsAction } from '@/actions/cashback.actions'
import { parseCashbackConfig, getCashbackCycleRange, formatIsoCycleTag } from '@/lib/cashback'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { AddTransactionDropdown } from '@/components/transactions-v2/header/AddTransactionDropdown'
import { CycleFilterDropdown } from '@/components/transactions-v2/header/CycleFilterDropdown'
import { TypeFilterDropdown } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown } from '@/components/transactions-v2/header/StatusDropdown'
import { QuickFilterDropdown } from '@/components/transactions-v2/header/QuickFilterDropdown'
import { MonthYearPickerV2 } from '@/components/transactions-v2/header/MonthYearPickerV2'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { SingleTransactionFormValues } from '@/components/transaction/slide-v2/types'
import { DateRange } from 'react-day-picker'
import { normalizeMonthTag } from '@/lib/month-tag'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay, format } from 'date-fns'
import { Search, FilterX, Filter, Clipboard, ChevronDown, X, Trash2, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
type StatusFilter = 'active' | 'void' | 'pending'

interface ClearDropdownProps {
    account: Account
    filterType: FilterType
    statusFilter: StatusFilter
    selectedTargetId: string | undefined
    selectedCycle: string | undefined
    date: Date
    dateRange: DateRange | undefined
    dateMode: 'all' | 'date' | 'month' | 'range' | 'year'
    searchTerm: string
    onFilterChange: {
        setFilterType: (val: FilterType) => void
        setStatusFilter: (val: StatusFilter) => void
        setSelectedTargetId: (val: string | undefined) => void
        setSelectedCycle: (val: string | undefined) => void
        setDate: (val: Date) => void
        setDateRange: (val: DateRange | undefined) => void
        setDateMode: (val: 'all' | 'date' | 'month' | 'range' | 'year') => void
        setSearchTerm: (val: string) => void
        setIsFilterActive: (val: boolean) => void
    }
    onClearConfirmation: (type: 'filter' | 'all') => void
}

function ClearDropdown({ account, onFilterChange, onClearConfirmation }: ClearDropdownProps) {
    const [open, setOpen] = useState(false)
    const closeTimeout = useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current)
        setOpen(true)
    }

    const handleMouseLeave = () => {
        closeTimeout.current = setTimeout(() => setOpen(false), 120)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 gap-1.5 font-medium"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <FilterX className="h-4 w-4" />
                    Clear
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[250px] p-1"
                align="start"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="space-y-0.5">
                    {/* Clear Filter */}
                    <button
                        onClick={() => {
                            onClearConfirmation('filter')
                            setOpen(false)
                        }}
                        className="w-full flex items-start gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left"
                    >
                        <FilterX className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                        <div className="flex-1">
                            <div className="font-medium">Clear Filter</div>
                            <div className="text-xs text-muted-foreground">Keep search</div>
                        </div>
                    </button>

                    {/* Clear All */}
                    <button
                        onClick={() => {
                            onClearConfirmation('all')
                            setOpen(false)
                        }}
                        className="w-full flex items-start gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                        <div className="flex-1">
                            <div className="font-medium">Clear All</div>
                            <div className="text-xs text-muted-foreground">Including search</div>
                        </div>
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

interface AccountDetailTransactionsProps {
    account: Account
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    selectedCycle?: string
    onCycleChange?: (cycle: string | undefined) => void
    onSuccess?: () => void
}

export function AccountDetailTransactions({
    account,
    transactions,
    accounts,
    categories,
    people,
    shops,
    selectedCycle: externalSelectedCycle,
    onCycleChange,
    onSuccess
}: AccountDetailTransactionsProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Dialog State
    const [isAddSlideOpen, setIsAddSlideOpen] = useState(false)
    const [addOperationMode, setAddOperationMode] = useState<'add' | 'duplicate'>('add')
    const [addInitialData, setAddInitialData] = useState<Partial<SingleTransactionFormValues> | undefined>()
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
    const [isEditSlideOpen, setIsEditSlideOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null)
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
    const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false)
    const [clearType, setClearType] = useState<'filter' | 'all'>('filter')

    const hasAutoSelectedCycle = useRef(false)
    const currentCycleRef = useRef<string | undefined>(undefined)

    // Filter State
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<FilterType>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
    const [date, setDate] = useState<Date>(new Date())
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [dateMode, setDateMode] = useState<'all' | 'date' | 'month' | 'range' | 'year'>(account.type === 'credit_card' ? 'range' : 'month')
    const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>()

    // Use external state if provided, otherwise use internal
    const selectedCycle = externalSelectedCycle
    const setSelectedCycle = onCycleChange || (() => { })

    const [cycles, setCycles] = useState<Array<{ label: string; value: string }>>([])

    // Handle cycle changes with URL sync (Performance Optimized)
    const handleCycleChange = (cycle: string | undefined) => {
        startTransition(() => {
            setSelectedCycle(cycle)

            const params = new URLSearchParams(window.location.search)
            if (cycle) {
                params.set('tag', cycle)
            } else {
                params.delete('tag')
            }

            const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
            // Use history.replaceState to avoid server component re-render (which is slow)
            window.history.replaceState(null, '', newUrl)
        })
    }

    // Filter activation - only filters when user clicks "Filter" button
    const [isFilterActive, setIsFilterActive] = useState(false)

    // Check if any filter is selected
    const hasAnyFilterSelected = useMemo(() => {
        return (
            filterType !== 'all' ||
            selectedTargetId !== undefined ||
            selectedCycle !== undefined
        )
    }, [filterType, selectedTargetId, selectedCycle])

    // Available months for date picker
    const availableMonths = useMemo(() => {
        const months = new Set<string>()

        // Add current month
        const now = new Date()
        months.add(format(now, 'yyyy-MM'))

        // Add selected date months
        if (date) months.add(format(date, 'yyyy-MM'))
        if (dateRange?.from) months.add(format(dateRange.from, 'yyyy-MM'))
        if (dateRange?.to) months.add(format(dateRange.to, 'yyyy-MM'))

        transactions.forEach(t => {
            const tag = normalizeMonthTag(t.tag || '')
            if (tag) months.add(tag)
        })
        return months
    }, [transactions, date, dateRange])

    // Fetch proper cycles for credit cards using cashback service
    useEffect(() => {
        if (account.type !== 'credit_card') {
            setCycles([])
            return
        }

        fetchAccountCycleOptionsAction(account.id).then(options => {
            const cycleOptions = options.map(opt => ({
                label: opt.label,
                value: opt.tag
            }))
            setCycles(cycleOptions)

            // ALWAYS Calculate current cycle for reset purposes
            const config = parseCashbackConfig(account.cashback_config)
            const cycleRange = getCashbackCycleRange(config, new Date())
            if (cycleRange) {
                currentCycleRef.current = formatIsoCycleTag(cycleRange.end)
            }

            // Check if URL has a tag parameter first
            const urlTag = new URLSearchParams(window.location.search).get('tag')
            if (urlTag) {
                // URL tag takes priority - set it and mark as auto-selected to prevent override
                setSelectedCycle(urlTag)
                setIsFilterActive(true)
                hasAutoSelectedCycle.current = true
                return
            }

            // Auto-select current cycle ONLY on first mount and only if not already set
            if (!hasAutoSelectedCycle.current && !selectedCycle && account.cashback_config) {
                if (currentCycleRef.current) {
                    const currentTag = currentCycleRef.current
                    const matchingCycle = cycleOptions.find(c => c.value === currentTag)
                    if (matchingCycle) {
                        setSelectedCycle(currentTag)
                        hasAutoSelectedCycle.current = true
                    }
                }
            }
        }).catch(err => {
            console.error('Failed to fetch cycle options:', err)
            setCycles([])
        })
    }, [account.id, account.type, account.cashback_config])

    // Available targets (accounts + people that appear in transactions)
    const availableTargets = useMemo(() => {
        const targetIds = new Set<string>()

        transactions.forEach(t => {
            // If source = current account, target is the other side
            if (t.account_id === account.id && t.target_account_id) {
                targetIds.add(`account-${t.target_account_id}`)
            } else if (t.target_account_id === account.id && t.account_id) {
                targetIds.add(`account-${t.account_id}`)
            }

            // People involved
            if (t.person_id) {
                targetIds.add(`person-${t.person_id}`)
            }
        })

        const accountTargets: Array<{ id: string; name: string; type: 'account'; image?: string }> = []
        const personTargets: Array<{ id: string; name: string; type: 'person'; image?: string }> = []

        targetIds.forEach(id => {
            if (id.startsWith('account-')) {
                const accountId = id.replace('account-', '')
                const acc = accounts.find(a => a.id === accountId)
                if (acc) {
                    accountTargets.push({
                        id,
                        name: acc.name,
                        type: 'account',
                        image: acc.image_url || undefined
                    })
                }
            } else if (id.startsWith('person-')) {
                const personId = id.replace('person-', '')
                const person = people.find(p => p.id === personId)
                if (person) {
                    personTargets.push({
                        id,
                        name: person.name,
                        type: 'person',
                        image: person.image_url || undefined
                    })
                }
            }
        })

        return {
            accounts: accountTargets.sort((a, b) => a.name.localeCompare(b.name)),
            people: personTargets.sort((a, b) => a.name.localeCompare(b.name))
        }
    }, [transactions, account.id, accounts, people])

    // Filter transactions - only apply when isFilterActive
    const filteredTransactions = useMemo(() => {
        let result = transactions

        // Status filter - always apply
        if (statusFilter === 'void') {
            result = result.filter(t => t.status === 'void')
        } else if (statusFilter === 'pending') {
            result = result.filter(t => t.status === 'pending' || t.status === 'waiting_refund')
        } else {
            // Active = everything except void (include pending)
            result = result.filter(t => t.status !== 'void')
        }

        // Only apply other filters if filter is active
        if (isFilterActive) {
            // Type filter
            if (filterType !== 'all') {
                result = result.filter(t => {
                    const txType = t.type?.toLowerCase() || ''
                    const matchType = filterType === 'lend' ? 'debt' : (filterType === 'repay' ? 'repayment' : filterType)
                    return txType === matchType
                })
            }

            // Search filter
            if (searchTerm) {
                const q = searchTerm.toLowerCase()
                result = result.filter(t =>
                    t.note?.toLowerCase().includes(q) ||
                    t.id.toLowerCase().includes(q) ||
                    t.shop_name?.toLowerCase().includes(q)
                )
            }

            // Target filter
            if (selectedTargetId) {
                result = result.filter(t => {
                    if (selectedTargetId.startsWith('account-')) {
                        const targetAccountId = selectedTargetId.replace('account-', '')
                        return t.account_id === targetAccountId || t.target_account_id === targetAccountId
                    } else if (selectedTargetId.startsWith('person-')) {
                        const targetPersonId = selectedTargetId.replace('person-', '')
                        return t.person_id === targetPersonId
                    }
                    return false
                })
            }

            // Cycle filter (credit cards)
            if (selectedCycle && selectedCycle !== 'all') {
                result = result.filter(t => {
                    const txCycle = t.persisted_cycle_tag || t.derived_cycle_tag || ''
                    return txCycle === selectedCycle
                })
            }

            // Date filter
            if (dateMode === 'month') {
                const monthStart = startOfMonth(date)
                const monthEnd = endOfMonth(date)
                result = result.filter(t => {
                    const txDate = parseISO(t.occurred_at || t.created_at || '')
                    return isWithinInterval(txDate, { start: monthStart, end: monthEnd })
                })
            } else if (dateMode === 'date') {
                result = result.filter(t => {
                    const txDate = parseISO(t.occurred_at || t.created_at || '')
                    return isSameDay(txDate, date)
                })
            } else if (dateMode === 'range' && dateRange?.from) {
                const rangeEnd = dateRange.to || dateRange.from
                result = result.filter(t => {
                    const txDate = parseISO(t.occurred_at || t.created_at || '')
                    return isWithinInterval(txDate, { start: dateRange.from!, end: rangeEnd })
                })
            }
        } else if (account.type === 'credit_card' && currentCycleRef.current && !isFilterActive && selectedCycle !== 'all' && statusFilter === 'active') {
            // Default behavior for credit cards: always show current cycle for "active" view
            // BUT skip if user explicitly selected 'all' (even if filter not "active" in standard sense)
            // AND skip if we are looking at "Void" or "Pending" tabs
            result = result.filter(t => {
                const txCycle = t.persisted_cycle_tag || t.derived_cycle_tag || ''
                return txCycle === currentCycleRef.current
            })
        }

        return result
    }, [transactions, statusFilter, isFilterActive, filterType, searchTerm, selectedTargetId, selectedCycle, dateMode, date, dateRange])

    // Handle URL parameters - only accept 'tag' for credit cards
    const searchParams = useSearchParams()
    useEffect(() => {
        const tag = searchParams.get('tag')

        // For credit cards, ONLY accept 'tag' param (cycle tag)
        // Ignore 'dateFrom/dateTo' as they should be derived from cycle
        if (account.type === 'credit_card' && tag) {
            setSelectedCycle(tag)
            // If tag is 'all', we still want to activate filter mode
            setIsFilterActive(true)
        }
        // For non-credit accounts, accept date range params
        else if (account.type !== 'credit_card') {
            const dateFrom = searchParams.get('dateFrom')
            const dateTo = searchParams.get('dateTo')

            if (dateFrom && dateTo) {
                try {
                    const fromDate = parseISO(dateFrom)
                    const toDate = parseISO(dateTo)
                    setDateRange({ from: fromDate, to: toDate })
                    setDateMode('range')
                    setIsFilterActive(true)
                } catch (err) {
                    console.error('Failed to parse date range from URL:', err)
                }
            }
        }
    }, [searchParams, account.type])

    // Warn user when closing with active filters
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isFilterActive) {
                e.preventDefault()
                e.returnValue = ''
                return ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isFilterActive])

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Add Transaction Slide (V2) */}
            <TransactionSlideV2
                open={isAddSlideOpen}
                onOpenChange={setIsAddSlideOpen}
                mode="single"
                initialData={addInitialData}
                operationMode={addOperationMode}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSubmissionStart={() => {
                    setIsAddSlideOpen(false)
                    setIsSubmittingAdd(true)
                }}
                onSubmissionEnd={() => {
                    setIsSubmittingAdd(false)
                    startTransition(() => {
                        router.refresh()
                        if (onSuccess) onSuccess()
                    })
                }}
                onSuccess={() => { }}
            />

            {/* Edit Transaction Slide (V2) */}
            <TransactionSlideV2
                open={isEditSlideOpen}
                onOpenChange={setIsEditSlideOpen}
                mode="single"
                editingId={editingTransaction?.id}
                operationMode="edit"
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSubmissionStart={() => {
                    setIsEditSlideOpen(false)
                    setIsSubmittingEdit(true)
                }}
                onSubmissionEnd={() => {
                    setIsSubmittingEdit(false)
                    setEditingTransaction(null)
                    startTransition(() => {
                        router.refresh()
                        if (onSuccess) onSuccess()
                    })
                }}
                onSuccess={() => { }}
            />

            {/* Toolbar */}
            <div className="border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center gap-2">
                    {/* Status Filter - always enabled */}
                    <StatusDropdown
                        value={statusFilter}
                        onChange={setStatusFilter}
                    />

                    {/* Dynamic Filter/Clear Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (isFilterActive) {
                                // Clear filters
                                setClearType('filter')
                                setClearConfirmationOpen(true)
                            } else {
                                // Activate filters
                                setIsFilterActive(true)
                            }
                        }}
                        disabled={!isFilterActive && !hasAnyFilterSelected}
                        className={isFilterActive
                            ? "h-9 gap-1.5 bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                            : "h-9 gap-1.5"
                        }
                    >
                        {isFilterActive ? (
                            <>
                                <FilterX className="h-4 w-4" />
                                Clear
                            </>
                        ) : (
                            <>
                                <Filter className="h-4 w-4" />
                                Filter
                            </>
                        )}
                    </Button>

                    {/* Filter controls - always enabled, stores selection but only applies when isFilterActive */}
                    <div className="flex items-center gap-2 flex-1">
                        {/* Type Filter (has built-in clear icon) */}
                        <TypeFilterDropdown
                            value={filterType}
                            onChange={setFilterType}
                        />

                        {/* Target Filter - People */}
                        <QuickFilterDropdown
                            items={availableTargets.people.map(p => ({
                                id: p.id,
                                name: p.name,
                                image: p.image,
                                type: 'person' as const
                            }))}
                            value={selectedTargetId}
                            onValueChange={setSelectedTargetId}
                            placeholder="People"
                            emptyText="No people found"
                        />

                        {/* Target Filter - Accounts */}
                        <QuickFilterDropdown
                            items={availableTargets.accounts.map(a => ({
                                id: a.id,
                                name: a.name,
                                image: a.image,
                                type: 'account' as const
                            }))}
                            value={selectedTargetId}
                            onValueChange={setSelectedTargetId}
                            placeholder="Account"
                            emptyText="No accounts found"
                        />

                        {/* Cycle Filter (Credit Cards only) */}
                        {cycles.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <CycleFilterDropdown
                                    cycles={cycles}
                                    value={selectedCycle}
                                    onChange={handleCycleChange}
                                    onReset={() => {
                                        if (currentCycleRef.current) {
                                            handleCycleChange(currentCycleRef.current)
                                            toast.info("Reset to current cycle")
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Date Picker - disabled when cycle filter is active */}
                        <div
                            onClick={() => {
                                if (selectedCycle) {
                                    toast.error('Please clear Cycle filter first to use Date Select')
                                }
                            }}
                            className={selectedCycle ? 'cursor-not-allowed opacity-50' : ''}
                        >
                            <MonthYearPickerV2
                                date={date}
                                dateRange={dateRange}
                                mode={dateMode}
                                onDateChange={setDate}
                                onRangeChange={setDateRange}
                                onModeChange={(mode) => {
                                    if (mode === 'month' || mode === 'range' || mode === 'date') {
                                        setDateMode(mode);
                                    }
                                }}
                                availableMonths={availableMonths}
                                accountCycleTags={account.type === 'credit_card' ? cycles.map(c => c.value) : []}
                                disabled={!!selectedCycle}
                            />
                        </div>

                        {/* Search with Paste Icon & Search Button */}
                        <div className="relative flex items-center gap-1.5 flex-1 max-w-sm">
                            <div className="relative flex-1">
                                <Clipboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText()
                                            setSearchTerm(text)
                                        } catch (err) {
                                            const error = err as Error & { name?: string }
                                            if (error.name === 'NotAllowedError') {
                                                toast.error("Clipboard permission denied")
                                            } else {
                                                toast.error("Failed to read clipboard")
                                            }
                                        }
                                    }}
                                />
                                <Input
                                    type="text"
                                    placeholder="Paste Notes, ID here then click search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchTerm.trim()) {
                                            setIsFilterActive(true)
                                        }
                                    }}
                                    className="h-9 pl-9 pr-20 border-slate-200 text-sm"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {searchTerm && (
                                        <button
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setSearchTerm('')}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        className="p-1 hover:bg-slate-100 rounded"
                                        onClick={() => searchTerm.trim() && setIsFilterActive(true)}
                                        disabled={!searchTerm.trim()}
                                    >
                                        <Search className="h-4 w-4 opacity-50" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Button - always accessible */}
                    <div className="ml-auto flex items-center gap-2">
                        <AddTransactionDropdown
                            accountType={account.type}
                            onSelect={(type) => {
                                const isTypeIn = ['income', 'repayment'].includes(type || '');
                                setAddOperationMode('add')
                                setAddInitialData({
                                    type: (type as 'expense' | 'income' | 'transfer' | 'debt' | 'repayment') ?? 'expense',
                                    source_account_id: isTypeIn ? undefined : account.id,
                                    target_account_id: isTypeIn ? account.id : undefined,
                                    occurred_at: new Date(),
                                })
                                setIsAddSlideOpen(true)
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Add/Duplicate Spinner */}
                {isSubmittingAdd && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold text-white">
                                {addOperationMode === 'duplicate' ? 'Duplicating transaction...' : 'Creating transaction...'}
                            </span>
                        </div>
                    </div>
                )}
                {/* Edit Spinner */}
                {isSubmittingEdit && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold text-white">Updating transaction...</span>
                        </div>
                    </div>
                )}


                <UnifiedTransactionTable
                    transactions={filteredTransactions}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    accountType={account.type}
                    context="account"
                    contextId={account.id}
                    activeTab={statusFilter}
                    showPagination
                    onEdit={(txn) => {
                        setEditingTransaction(txn)
                        setIsEditSlideOpen(true)
                    }}
                    onDuplicate={(txn) => {
                        const isTypeIn = ['income', 'repayment'].includes(txn.type);
                        setAddOperationMode('duplicate')
                        setAddInitialData({
                            type: txn.type as any,
                            occurred_at: new Date(),
                            amount: Math.round(Math.abs(Number(txn.amount))),
                            note: txn.note || '',
                            source_account_id: isTypeIn ? undefined : (txn.account_id || undefined),
                            target_account_id: isTypeIn ? (txn.account_id || undefined) : ((txn as any).to_account_id || undefined),
                            category_id: txn.category_id || undefined,
                            shop_id: txn.shop_id || undefined,
                            person_id: txn.person_id || undefined,
                            tag: txn.tag || undefined,
                            cashback_mode: txn.cashback_mode || 'none_back',
                            cashback_share_percent: txn.cashback_share_percent,
                            cashback_share_fixed: txn.cashback_share_fixed,
                            metadata: { duplicated_from_id: txn.id },
                        })
                        setIsAddSlideOpen(true)
                    }}
                    onSuccess={onSuccess}
                />
            </div>


            {/* Clear Confirmation Modal */}
            <AlertDialog open={clearConfirmationOpen} onOpenChange={setClearConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {clearType === 'filter' ? 'Clear filters?' : 'Clear all filters?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {clearType === 'filter'
                                ? 'Reset all filters but keep your search term. You can reapply filters anytime.'
                                : 'This will reset all your current filters to default settings. This action cannot be undone.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (clearType === 'filter') {
                                    setFilterType('all')
                                    setStatusFilter('active')
                                    setSelectedTargetId(undefined)
                                    handleCycleChange(undefined) // Clear URL param
                                    setDate(new Date())
                                    setDateRange(undefined)
                                    setDateMode(account.type === 'credit_card' ? 'range' : 'month')
                                    setIsFilterActive(false)
                                    toast.success("Filters cleared")
                                } else {
                                    setFilterType('all')
                                    setStatusFilter('active')
                                    setSelectedTargetId(undefined)
                                    handleCycleChange(undefined) // Clear URL param
                                    setDate(new Date())
                                    setDateRange(undefined)
                                    setDateMode(account.type === 'credit_card' ? 'range' : 'month')
                                    setSearchTerm('')
                                    setIsFilterActive(false)
                                    toast.success("All filters and search cleared")
                                }
                            }}
                            className={clearType === 'all' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {clearType === 'filter' ? 'Clear Filters' : 'Clear Filters'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
