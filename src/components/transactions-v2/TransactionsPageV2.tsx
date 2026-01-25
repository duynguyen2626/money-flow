'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { TransactionHeader, FilterType, StatusFilter } from './header/TransactionHeader'
import { DateRange } from 'react-day-picker'
import { endOfMonth, isSameMonth, isWithinInterval, parseISO, startOfMonth } from 'date-fns'
import { formatCycleTag } from '@/lib/cycle-utils'
import { normalizeMonthTag } from '@/lib/month-tag'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'

interface TransactionsPageV2Props {
  transactions: TransactionWithDetails[]
  accounts: Account[]
  categories: Category[]
  people: Person[]
  shops: Shop[]
}

export function TransactionsPageV2({
  transactions,
  accounts,
  categories,
  people,
  shops
}: TransactionsPageV2Props) {
  // Filter State
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const [date, setDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<DateRange>()
  const [dateMode, setDateMode] = useState<'month' | 'range'>('month')

  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>()
  const [selectedCycle, setSelectedCycle] = useState<string | undefined>()
  const [isSlideOpen, setIsSlideOpen] = useState(false)
  const [slideOverrideType, setSlideOverrideType] = useState<string | undefined>()
  const lastAccountRef = useRef<string | undefined>()
  const [disabledRange, setDisabledRange] = useState<{ start: Date; end: Date } | undefined>(undefined)
  const isManualDateChange = useRef(false)
  const selectionOrderRef = useRef<'range' | 'account' | undefined>(undefined)

  // Compute available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(t => {
      const d = parseISO(t.occurred_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      months.add(key)
    })
    return months
  }, [transactions])

  const handleReset = () => {
    setSearch('')
    setFilterType('all')
    setStatusFilter('active')
    setSelectedAccountId(undefined)
    setSelectedPersonId(undefined)
    setSelectedCycle(undefined)
    setDate(new Date())
    setDateMode('month')
    setDateRange(undefined)
    isManualDateChange.current = false
  }

  const handleDateChange = (newDate: Date) => {
    isManualDateChange.current = true
    setDate(newDate)
    if ((dateMode === 'single' || dateMode === 'month') && selectedCycle && selectedCycle !== 'custom') {
      setSelectedCycle('custom')
    }
  }

  const handleRangeChange = (range: DateRange | undefined) => {
    isManualDateChange.current = true
    setDateRange(range)
    if (dateMode === 'range' && selectedCycle && selectedCycle !== 'custom') {
      setSelectedCycle('custom')
    }
    // Track that range was selected first
    if (range?.from && range?.to && !selectedAccountId) {
      selectionOrderRef.current = 'range'
    }
  }

  const handleModeChange = (mode: 'month' | 'range' | 'single') => {
    setDateMode(mode as any)
    // When switching to Month or Date mode, auto-select Custom cycle
    if ((mode === 'month' || mode === 'single') && selectedCycle && selectedCycle !== 'custom') {
      setSelectedCycle('custom')
    }
  }

  const handleCycleChange = (cycle?: string) => {
    // If range was selected first and this is account-driven cycle selection, don't override
    // But if user manually clicks a cycle, override the range
    setSelectedCycle(cycle)
    
    // If range mode and selecting a real cycle (not custom), don't auto-update dateRange
    // Let the effect below handle it
  }

  const hasActiveFilters =
    search !== '' ||
    filterType !== 'all' ||
    statusFilter !== 'active' ||
    !!selectedAccountId ||
    !!selectedPersonId ||
    !!selectedCycle ||
    !isSameMonth(date, new Date()) ||
    dateMode === 'range'

  const cycleOptions = useMemo(() => {
    if (!selectedAccountId) return selectedCycle === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []

    const relevantTxns = transactions.filter(
      t => t.account_id === selectedAccountId || t.to_account_id === selectedAccountId
    )

    const tags = new Set<string>()
    relevantTxns.forEach(t => {
      const normalized = normalizeMonthTag(t.persisted_cycle_tag || t.account_billing_cycle || undefined)
      if (normalized) tags.add(normalized)
    })

    const base = Array.from(tags)
      .sort((a, b) => b.localeCompare(a))
      .map(tag => ({
        value: tag,
        label: formatCycleTag(tag) || tag,
      }))
    if (selectedCycle === 'custom') base.unshift({ value: 'custom', label: 'Custom' })
    return base
  }, [transactions, selectedAccountId])

  // Auto-clear selected cycle if it no longer exists
  useEffect(() => {
    if (selectedCycle && !cycleOptions.some(o => o.value === selectedCycle)) {
      setSelectedCycle(undefined)
    }
  }, [cycleOptions, selectedCycle])
  useEffect(() => {
    // Handle special 'custom' to unlock free range
    if (selectedCycle === 'custom') {
      setDisabledRange(undefined)
      return
    }

    // No cycle → no restriction
    if (!selectedCycle) {
      setDisabledRange(undefined)
      return
    }

    const [yearStr, monthStr] = selectedCycle.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      setDisabledRange(undefined)
      return
    }

    const startMonth = month === 1 ? 12 : month - 1
    const startYear = month === 1 ? year - 1 : year
    const cycleStart = new Date(startYear, startMonth - 1, 25)
    const cycleEnd = new Date(year, month - 1, 24)

    setDisabledRange({ start: cycleStart, end: cycleEnd })
    
    // Only auto-set date range if:
    // 1. Not a manual date change, AND
    // 2. User hasn't already selected a range (either manually or via account selection after range)
    if (!isManualDateChange.current && selectionOrderRef.current !== 'range' && dateMode !== 'range') {
      setDateMode('range')
      setDateRange({ from: cycleStart, to: cycleEnd })
    }
    isManualDateChange.current = false
  }, [selectedCycle])

  useEffect(() => {
    if (selectedAccountId !== lastAccountRef.current) {
      lastAccountRef.current = selectedAccountId

      if (!selectedAccountId) {
        setSelectedCycle(undefined)
        selectionOrderRef.current = undefined
        return
      }

      // Account was selected - mark selection order
      selectionOrderRef.current = 'account'

      const today = new Date()
      const day = today.getDate()
      const baseMonth = today.getMonth()
      const baseYear = today.getFullYear()
      const rollover = day >= 25 ? 1 : 0
      const targetMonth = baseMonth + rollover
      const year = baseYear + (targetMonth > 11 ? 1 : 0)
      const month = (targetMonth % 12) + 1
      const currentCycleTag = `${year}-${String(month).padStart(2, '0')}`

      const matchingCurrent = cycleOptions.find(
        opt => normalizeMonthTag(opt.value) === currentCycleTag
      )

      if (matchingCurrent) {
        setSelectedCycle(matchingCurrent.value)
        return
      }

      if (cycleOptions.length > 0) {
        setSelectedCycle(cycleOptions[0].value)
      } else {
        setSelectedCycle(undefined)
      }
    }
  }, [selectedAccountId, cycleOptions])

  // PERFORMANCE NOTE: On-change filtering (current approach) is ideal for <1000 transactions
  // For larger datasets, consider debouncing filter changes or moving to on-demand (Search button)
  // Current approach: Real-time filtering as user changes filters
  // Alternative: Add a "Search" button to filter on-demand (better for 1000+ transactions with large result sets)

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    const matchedAccountIds = search ? accounts.filter(a => a.name.toLowerCase().includes(lowerSearch)).map(a => a.id) : []
    const matchedPersonIds = search ? people.filter(p => p.name.toLowerCase().includes(lowerSearch)).map(p => p.id) : []

    return transactions.filter(t => {
      // Status Filter
      if (statusFilter === 'active' && t.status === 'void') return false
      if (statusFilter === 'void' && t.status !== 'void') return false
      if (statusFilter === 'pending' && t.status !== 'pending') return false

      // Date Filter
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

      // Account Filter
      if (selectedAccountId) {
        if (t.account_id !== selectedAccountId && t.to_account_id !== selectedAccountId) return false
      }

      // Person Filter
      if (selectedPersonId) {
        if (t.person_id !== selectedPersonId) return false
      }

      // Cycle filter
      if (selectedCycle) {
        const tag = t.persisted_cycle_tag || t.account_billing_cycle || null
        if (tag !== selectedCycle) return false
      }

      // Search
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

      // Type Filter
      if (filterType === 'all') return true
      if (filterType === 'income') return t.type === 'income'
      if (filterType === 'expense') return t.type === 'expense'
      if (filterType === 'transfer') return t.type === 'transfer'

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
  }, [transactions, search, filterType, statusFilter, date, dateRange, dateMode, selectedAccountId, selectedPersonId, accounts, people])

  const handleAddTransaction = (type?: string) => {
    setSlideOverrideType(type || 'expense')
    setIsSlideOpen(true)
  }

  const initialSlideData = useMemo(() => {
    if (!slideOverrideType) return undefined

    return {
      type: slideOverrideType as any,
      occurred_at: new Date(),
      amount: 0,
      cashback_mode: 'none_back' as const,
      source_account_id: selectedAccountId,
      person_id: selectedPersonId,
    }
  }, [slideOverrideType, selectedAccountId, selectedPersonId])

  const handleSlideOpenChange = (nextOpen: boolean) => {
    setIsSlideOpen(nextOpen)
    if (!nextOpen) {
      setSlideOverrideType(undefined)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TransactionHeader
        accounts={accounts}
        people={people}
        date={date}
        dateRange={dateRange}
        dateMode={dateMode}
        onDateChange={handleDateChange}
        onRangeChange={handleRangeChange}
        onModeChange={handleModeChange}
        accountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        personId={selectedPersonId}
        onPersonChange={setSelectedPersonId}
        cycles={cycleOptions}
        selectedCycle={selectedCycle}
        onCycleChange={handleCycleChange}
        disabledRange={disabledRange}
        searchTerm={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterChange={setFilterType}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        onAdd={handleAddTransaction}
        availableMonths={availableMonths}
      />

      {/* Table Content - Placeholder */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {filteredTransactions.length} transactions
            </h2>
          </div>
          
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p className="text-sm">Table coming in Phase 2...</p>
            <p className="text-xs mt-2">Filtered: {filteredTransactions.length} / {transactions.length}</p>
          </div>
        </div>
      </div>

      <TransactionSlideV2
        open={isSlideOpen}
        onOpenChange={handleSlideOpenChange}
        mode="single"
        initialData={initialSlideData}
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        onSuccess={() => handleSlideOpenChange(false)}
      />
    </div>
  )
}
