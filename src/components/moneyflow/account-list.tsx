'use client'

import { useEffect, useMemo, useState, memo } from 'react'
import { LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Check } from 'lucide-react'
import { CreateAccountDialog } from './create-account-dialog'
import { AccountCard } from './account-card'
import { AccountTable } from './account-table'
import { FamilyCardGroup } from './family-card-group'
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import { computeNextDueDate, getSharedLimitParentId } from '@/lib/account-utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { UsageStats, QuickPeopleConfig } from '@/types/settings.types'
import { getCardActionState } from '@/lib/card-utils'

type AccountListProps = {
  accounts: Account[]
  cashbackById?: Record<string, AccountCashbackSnapshot | undefined>
  categories: Category[]
  people: Person[]
  shops: Shop[]
  pendingBatchAccountIds?: string[]
  usageStats?: UsageStats // Proper type
  quickPeopleConfig?: QuickPeopleConfig
}

type ViewMode = 'grid' | 'table'
type FilterKey = 'all' | 'bank' | 'credit' | 'savings' | 'debt' | 'waiting_confirm' | 'need_to_spend' | 'family_cards'
type SortKey = 'due_date' | 'balance' | 'limit'
type SortOrder = 'asc' | 'desc'

const FILTERS: { key: FilterKey; label: string; match: (account: Account, allAccounts?: Account[]) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'bank', label: 'Bank', match: account => ['bank', 'cash', 'ewallet'].includes(account.type) },
  { key: 'credit', label: 'Credit', match: account => account.type === 'credit_card' },
  { key: 'savings', label: 'Savings', match: account => ['savings', 'investment', 'asset'].includes(account.type) },
  { key: 'debt', label: 'Debt', match: account => account.type === 'debt' },
  {
    key: 'family_cards',
    label: 'Family Cards',
    match: (account, allAccounts) =>
      !!account.secured_by_account_id ||
      !!account.parent_account_id ||
      (account.relationships?.child_count ?? 0) > 0 ||
      // Also include assets that secure other cards
      !!account.relationships?.is_parent ||
      // Also include assets that secure other cards
      (allAccounts?.some(acc => acc.secured_by_account_id === account.id) ?? false)
  },
  { key: 'waiting_confirm', label: 'Waiting Confirm', match: () => true },
  { key: 'need_to_spend', label: 'Need To Spend', match: () => true },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'due_date', label: 'Due Date' },
  { key: 'balance', label: 'Balance' },
  { key: 'limit', label: 'Limit' },
]

function getDaysUntilDue(account: Account): number {
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  if (!dueDate) return 999999
  const now = new Date()
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getAccountBalance(account: Account, allAccounts: Account[]): number {
  const creditLimit = account.credit_limit ?? 0
  const netBalance = (account.total_in ?? 0) + (account.total_out ?? 0)

  if (account.type !== 'credit_card') return netBalance

  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config)
  if (sharedLimitParentId) {
    const parent = allAccounts.find(a => a.id === sharedLimitParentId)
    if (parent) {
      const parentNetBalance = (parent.total_in ?? 0) + (parent.total_out ?? 0)
      const siblings = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === parent.id)
      const totalChildDebt = siblings.reduce((sum, child) => {
        const childNet = (child.total_in ?? 0) + (child.total_out ?? 0)
        return sum + Math.abs(childNet < 0 ? childNet : 0)
      }, 0)
      const parentDebt = Math.abs(parentNetBalance < 0 ? parentNetBalance : 0)
      return (parent.credit_limit ?? 0) - (parentDebt + totalChildDebt)
    }
  }

  return creditLimit + netBalance
}

// Memoized filter button
const FilterButton = memo(({ filter, isActive, onClick }: {
  filter: { key: FilterKey; label: string };
  isActive: boolean;
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    aria-pressed={isActive}
  >
    {filter.label}
  </button>
))
FilterButton.displayName = 'FilterButton'

export function AccountList({ accounts, cashbackById = {}, categories, people, shops, pendingBatchAccountIds = [], usageStats, quickPeopleConfig }: AccountListProps) {
  const [view, setView] = useState<ViewMode>('grid')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<Account[]>(accounts)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [showClosedAccounts, setShowClosedAccounts] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('due_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [sortOpen, setSortOpen] = useState(false)

  useEffect(() => {
    setItems(accounts)
  }, [accounts])

  const collateralAccounts = useMemo(
    () => items.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
    [items]
  )

  const creditCardAccounts = useMemo(
    () => items.filter(acc => acc.type === 'credit_card'),
    [items]
  )

  const activeItems = useMemo(
    () => items.filter(acc => acc.is_active !== false),
    [items]
  )

  const closedItems = useMemo(
    () => items.filter(acc => acc.is_active === false),
    [items]
  )

  const filteredItems = useMemo(() => {
    let filtered = activeItems

    if (activeFilter === 'waiting_confirm') {
      filtered = filtered.filter(acc => pendingBatchAccountIds.includes(acc.id))
    } else if (activeFilter === 'need_to_spend') {
      filtered = filtered.filter(acc => (cashbackById[acc.id]?.missing_min_spend ?? 0) > 0)
    } else {
      filtered = filtered.filter(acc => FILTERS.find(f => f.key === activeFilter)?.match(acc, items))
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(acc => acc.name.toLowerCase().includes(query))
    }

    return filtered
  }, [activeItems, activeFilter, searchQuery, pendingBatchAccountIds])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'due_date':
          comparison = getDaysUntilDue(a) - getDaysUntilDue(b)
          break
        case 'balance':
          comparison = getAccountBalance(a, items) - getAccountBalance(b, items)
          break
        case 'limit':
          comparison = (a.credit_limit ?? 0) - (b.credit_limit ?? 0)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredItems, sortKey, sortOrder, items])

  const grouped = useMemo(() => {
    // Grouping Logic using unified getCardActionState
    const actionRequired: { account: Account, sortOrder: number }[] = []
    const upcomingCC: Account[] = []
    const payment: Account[] = []
    const securedSavings: Account[] = []
    const normalSavings: Account[] = []
    const debt: Account[] = []

    sortedItems.forEach(acc => {
      const hasPendingBatch = pendingBatchAccountIds.includes(acc.id)
      const state = getCardActionState(acc, hasPendingBatch)

      if (state.section === 'action_required') {
        actionRequired.push({ account: acc, sortOrder: state.priorities.sortOrder })
        return
      }

      if (state.section === 'credit_card') {
        upcomingCC.push(acc)
        return
      }

      // Fallback for non-credit cards (section 'other')
      if (['bank', 'ewallet', 'cash'].includes(acc.type)) {
        payment.push(acc)
      } else if (['savings', 'investment', 'asset'].includes(acc.type)) {
        const isSecuring = sortedItems.some(item => item.secured_by_account_id === acc.id)
        if (isSecuring) {
          securedSavings.push(acc)
        } else {
          normalSavings.push(acc)
        }
      } else if (acc.type === 'debt') {
        debt.push(acc)
      }
    })

    // Sort Action Required by collected sortOrder
    actionRequired.sort((a, b) => a.sortOrder - b.sortOrder)

    const sections: { key: string; title: string; helper: string; accounts: Account[], gridCols: string }[] = []

    if (actionRequired.length > 0) {
      sections.push({
        key: 'action-required',
        title: '⚠️ Action Required',
        helper: 'Due soon · Need to spend · Pending confirm',
        accounts: actionRequired.map(x => x.account),
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }

    if (upcomingCC.length > 0) {
      sections.push({
        key: 'upcoming-cc',
        title: '📅 Credit Cards',
        helper: 'Cards without immediate due dates',
        accounts: upcomingCC,
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }

    if (payment.length > 0) {
      sections.push({
        key: 'payment',
        title: '🏦 Payment Accounts',
        helper: 'Banks · E-wallets · Cash',
        accounts: payment,
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }

    if (securedSavings.length > 0) {
      sections.push({
        key: 'secured-savings',
        title: '🔒 Secured Assets',
        helper: 'Deposits linking to credit cards',
        accounts: securedSavings,
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }
    if (normalSavings.length > 0) {
      sections.push({
        key: 'savings',
        title: '💰 Savings & Assets',
        helper: 'Term deposits · Investments',
        accounts: normalSavings,
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }

    if (debt.length > 0) {
      sections.push({
        key: 'debt',
        title: '👥 Debt Accounts',
        helper: 'People & loans',
        accounts: debt,
        gridCols: 'lg:grid-cols-4 md:grid-cols-2'
      })
    }

    return sections
  }, [sortedItems, pendingBatchAccountIds])

  // Family Grouping Logic (for family_cards filter)
  const familyGroups = useMemo(() => {
    if (activeFilter !== 'family_cards') return []

    type FamilyGroup = {
      id: string
      securedAsset?: Account
      parent: Account
      children: Account[]
    }

    const groups: FamilyGroup[] = []
    const processedIds = new Set<string>()

    // Find all parent accounts
    const parents = sortedItems.filter(
      acc => (acc.relationships?.child_count ?? 0) > 0 || acc.relationships?.is_parent
    )

    parents.forEach(parent => {
      if (processedIds.has(parent.id)) return

      // Find secured asset if exists
      const securedAsset = parent.secured_by_account_id
        ? sortedItems.find(acc => acc.id === parent.secured_by_account_id)
        : undefined

      // Find children
      const children = sortedItems.filter(
        acc => acc.parent_account_id === parent.id || acc.relationships?.parent_info?.id === parent.id
      )

      groups.push({
        id: parent.id,
        securedAsset,
        parent,
        children,
      })

      // Mark as processed
      processedIds.add(parent.id)
      if (securedAsset) processedIds.add(securedAsset.id)
      children.forEach(child => processedIds.add(child.id))
    })

    // Handle standalone secured cards (no parent/child relationship)
    const standaloneSecured = sortedItems.filter(
      acc => acc.secured_by_account_id && !processedIds.has(acc.id)
    )

    standaloneSecured.forEach(card => {
      const securedAsset = sortedItems.find(acc => acc.id === card.secured_by_account_id)
      if (securedAsset && !processedIds.has(card.id)) {
        groups.push({
          id: card.id,
          securedAsset,
          parent: card,
          children: [],
        })
        processedIds.add(card.id)
        processedIds.add(securedAsset.id)
      }
    })

    return groups
  }, [sortedItems, activeFilter])

  const handleToggleStatus = async (accountId: string, nextValue: boolean) => {
    setPendingId(accountId)
    try {
      const success = await updateAccountConfigAction({ id: accountId, isActive: nextValue })
      if (success) {
        setItems(prev => prev.map(acc => (acc.id === accountId ? { ...acc, is_active: nextValue } : acc)))
      }
    } finally {
      setPendingId(null)
    }
  }

  const handleSortSelect = (key: SortKey, order: SortOrder) => {
    setSortKey(key)
    setSortOrder(order)
    setSortOpen(false)
  }

  const handleResetSort = () => {
    setSortKey('due_date')
    setSortOrder('asc')
    setSortOpen(false)
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Sort'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(filter => (
            <FilterButton
              key={filter.key}
              filter={filter}
              isActive={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
            />
          ))}

          {/* Sort Popover - Show all options with asc/desc */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 gap-1.5 text-xs h-8">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {currentSortLabel}
                {sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              <div className="flex flex-col">
                {SORT_OPTIONS.map(option => (
                  <div key={option.key} className="flex flex-col">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {option.label}
                    </div>
                    <button
                      onClick={() => handleSortSelect(option.key, 'asc')}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${sortKey === option.key && sortOrder === 'asc'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowUp className="h-3 w-3" />
                        Ascending
                      </span>
                      {sortKey === option.key && sortOrder === 'asc' && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSortSelect(option.key, 'desc')}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${sortKey === option.key && sortOrder === 'desc'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowDown className="h-3 w-3" />
                        Descending
                      </span>
                      {sortKey === option.key && sortOrder === 'desc' && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
                <hr className="my-1 border-slate-200" />
                <button
                  onClick={handleResetSort}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-md"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Default
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
            />
          </div>
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${view === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              aria-pressed={view === 'table'}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>
          <CreateAccountDialog
            collateralAccounts={collateralAccounts}
            creditCardAccounts={creditCardAccounts}
          />
        </div>
      </div>

      {grouped.length === 0 && view === 'grid' ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          No accounts match this filter.
        </div>
      ) : view === 'grid' ? (
        activeFilter === 'family_cards' ? (
          <FamilyCardGroup
            families={familyGroups}
            accounts={items}
            categories={categories}
            people={people}
            shops={shops}
            collateralAccounts={collateralAccounts}
            usageStats={usageStats}
            pendingBatchAccountIds={pendingBatchAccountIds}
          // FamilyCardGroup also needs this prop, but for now we focus on AccountCard
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(section => (
              <div key={section.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {section.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide opacity-80 pl-6 -mt-0.5">{section.helper}</p>
                  </div>
                  <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {section.accounts.length}
                  </span>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {section.accounts.map(account => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      accounts={items}
                      categories={categories}
                      people={people}
                      shops={shops}
                      collateralAccounts={collateralAccounts}
                      usageStats={usageStats}
                      pendingBatchAccountIds={pendingBatchAccountIds}
                      quickPeopleConfig={quickPeopleConfig}
                    />
                  ))}
                </div>
              </div>
            ))}

            {closedItems.length > 0 && (
              <details
                className="border-t border-slate-200 pt-6 mt-6"
                open={showClosedAccounts}
                onToggle={event => setShowClosedAccounts(event.currentTarget.open)}
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span>Closed accounts</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {closedItems.length}
                    </span>
                  </div>
                  <span className="text-slate-500">{showClosedAccounts ? '▲' : '▼'}</span>
                </summary>
                <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {closedItems.map(account => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      accounts={items}
                      categories={categories}
                      people={people}
                      shops={shops}
                      collateralAccounts={collateralAccounts}
                      usageStats={usageStats}
                      pendingBatchAccountIds={pendingBatchAccountIds}
                      quickPeopleConfig={quickPeopleConfig}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        )
      ) : (
        <>
          <AccountTable
            accounts={sortedItems}
            onToggleStatus={handleToggleStatus}
            pendingId={pendingId}
            collateralAccounts={collateralAccounts}
            allAccounts={items}
          />

          {closedItems.length > 0 && (
            <details
              className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3"
              open={showClosedAccounts}
              onToggle={event => setShowClosedAccounts(event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <span>Closed accounts</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {closedItems.length}
                  </span>
                </div>
                <span className="text-slate-500">{showClosedAccounts ? '▲' : '▼'}</span>
              </summary>
              <div className="mt-4">
                <AccountTable
                  accounts={closedItems}
                  onToggleStatus={handleToggleStatus}
                  pendingId={pendingId}
                  collateralAccounts={collateralAccounts}
                  allAccounts={items}
                />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
