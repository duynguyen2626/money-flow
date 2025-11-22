'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List, Plus } from 'lucide-react'

import { updateAccountConfigAction } from '@/actions/account-actions'
import { Account, AccountCashbackSnapshot, Category, Person } from '@/types/moneyflow.types'
import { AccountCard } from './account-card'
import { AccountTable } from './account-table'

type AccountListProps = {
  accounts: Account[]
  cashbackById?: Record<string, AccountCashbackSnapshot | undefined>
  categories: Category[]
  people: Person[]
}

type ViewMode = 'grid' | 'table'
type FilterKey = 'all' | 'bank' | 'credit' | 'savings' | 'debt'

const FILTERS: { key: FilterKey; label: string; match: (account: Account) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  {
    key: 'bank',
    label: 'Bank',
    match: account => ['bank', 'cash', 'ewallet'].includes(account.type),
  },
  { key: 'credit', label: 'Credit', match: account => account.type === 'credit_card' },
  {
    key: 'savings',
    label: 'Savings',
    match: account => ['savings', 'investment', 'asset'].includes(account.type),
  },
  { key: 'debt', label: 'Debt', match: account => account.type === 'debt' },
]

export function AccountList({ accounts, cashbackById = {}, categories, people }: AccountListProps) {
  const [view, setView] = useState<ViewMode>('grid')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [items, setItems] = useState<Account[]>(accounts)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    setItems(accounts)
  }, [accounts])

  const collateralAccounts = useMemo(
    () => items.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
    [items]
  )

  const filtered = useMemo(
    () => items.filter(acc => FILTERS.find(f => f.key === activeFilter)?.match(acc)),
    [items, activeFilter]
  )

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(filter => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              aria-pressed={activeFilter === filter.key}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${
                view === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${
                view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={view === 'table'}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          No accounts match this filter.
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              cashback={cashbackById[account.id]}
              categories={categories}
              people={people}
              allAccounts={items}
              collateralAccounts={collateralAccounts}
            />
          ))}
        </div>
      ) : (
        <AccountTable
          accounts={filtered}
          onToggleStatus={handleToggleStatus}
          pendingId={pendingId}
          collateralAccounts={collateralAccounts}
        />
      )}
    </div>
  )
}
