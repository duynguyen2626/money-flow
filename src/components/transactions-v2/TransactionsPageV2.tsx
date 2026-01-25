'use client'

import { useState, useMemo } from 'react'
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { TransactionHeader, FilterType, StatusFilter } from './header/TransactionHeader'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth } from 'date-fns'
import { formatCycleTag } from '@/lib/cycle-utils'

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
    statusFilter !== 'active' ||
    !!selectedAccountId ||
    !!selectedPersonId ||
    !!selectedCycle ||
    !isSameMonth(date, new Date()) ||
    dateMode === 'range'

  // Build cycle options based on selected account (credit cards with cycles only)
  const cycleOptions = useMemo(() => {
    const relevantTxns = selectedAccountId
      ? transactions.filter(t => t.account_id === selectedAccountId || t.to_account_id === selectedAccountId)
      : transactions

    const tags = new Set<string>()
    relevantTxns.forEach(t => {
      const tag = t.persisted_cycle_tag || t.account_billing_cycle || null
      if (tag) tags.add(tag)
    })

    return Array.from(tags).map(tag => ({
      value: tag,
      label: formatCycleTag(tag) || tag,
    }))
  }, [transactions, selectedAccountId])

  // Auto-clear selected cycle if it no longer exists
  useEffect(() => {
    if (selectedCycle && !cycleOptions.some(o => o.value === selectedCycle)) {
      setSelectedCycle(undefined)
    }
  }, [cycleOptions, selectedCycle])

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
    // TODO: Open transaction slide
    console.log('Add transaction:', type)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TransactionHeader
        accounts={accounts}
        people={people}
        date={date}
        dateRange={dateRange}
        dateMode={dateMode}
        onDateChange={setDate}
        onRangeChange={setDateRange}
        onModeChange={setDateMode}
        accountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        personId={selectedPersonId}
        onPersonChange={setSelectedPersonId}
        cycles={cycleOptions}
        selectedCycle={selectedCycle}
        onCycleChange={setSelectedCycle}
        searchTerm={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterChange={setFilterType}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        onAdd={handleAddTransaction}
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
    </div>
  )
}
