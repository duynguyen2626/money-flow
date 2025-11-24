'use client'

import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { CreateAccountDialog } from './create-account-dialog'
import { AccountCard } from './account-card'
import { AccountTable } from './account-table'
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'

type AccountListProps = {
  accounts: Account[]
  cashbackById?: Record<string, AccountCashbackSnapshot | undefined>
  categories: Category[]
  people: Person[]
  shops: Shop[]
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

export function AccountList({ accounts, cashbackById = {}, categories, people, shops }: AccountListProps) {
  const [view, setView] = useState<ViewMode>('grid')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [items, setItems] = useState<Account[]>(accounts)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [showClosedAccounts, setShowClosedAccounts] = useState(false) // Thêm trạng thái cho phần tài khoản đã đóng

  useEffect(() => {
    setItems(accounts)
  }, [accounts])

  const collateralAccounts = useMemo(
    () => items.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
    [items]
  )
  const creditCardAccounts = useMemo(
    () => items.filter(acc => acc.type === 'credit_card' && acc.is_active !== false),
    [items]
  )

  // Lọc các tài khoản đang hoạt động
  const activeItems = useMemo(
    () => items.filter(acc => acc.is_active !== false),
    [items]
  )

  // Lọc các tài khoản đã đóng
  const closedItems = useMemo(
    () => items.filter(acc => acc.is_active === false),
    [items]
  )

  const filteredItems = useMemo(
    () => activeItems.filter(acc => FILTERS.find(f => f.key === activeFilter)?.match(acc)),
    [activeItems, activeFilter]
  )

  const grouped = useMemo(() => {
    const sections: { key: FilterKey; title: string; helper: string; accounts: Account[] }[] = [
      {
        key: 'credit',
        title: '💳 Credit Cards',
        helper: 'Statement cycles & repayments',
        accounts: filteredItems.filter(acc => acc.type === 'credit_card'),
      },
      {
        key: 'bank',
        title: '🏦 Payment Accounts',
        helper: 'Banks · E-wallets · Cash',
        accounts: filteredItems.filter(acc => ['bank', 'cash', 'ewallet'].includes(acc.type)),
      },
      {
        key: 'savings',
        title: '💰 Savings & Assets',
        helper: 'Term deposits · Investments',
        accounts: filteredItems.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
      },
      {
        key: 'debt',
        title: '👥 Debt Accounts',
        helper: 'People & loans',
        accounts: filteredItems.filter(acc => acc.type === 'debt'),
      },
    ]
    return sections.filter(section => section.accounts.length > 0)
  }, [filteredItems])

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
        <div className="space-y-6">
          {grouped.map(section => (
            <div key={section.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                  <p className="text-xs text-slate-500">{section.helper}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {section.accounts.length} accounts
                </span>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.accounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    cashback={cashbackById[account.id]}
                    categories={categories}
                    people={people}
                    allAccounts={items}
                    shops={shops}
                    collateralAccounts={collateralAccounts}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Thêm phần hiển thị tài khoản đã đóng */}
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
              <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {closedItems.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    cashback={cashbackById[account.id]}
                    categories={categories}
                    people={people}
                    allAccounts={items}
                    shops={shops}
                    collateralAccounts={collateralAccounts}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <>
          <AccountTable
            accounts={filteredItems}
            onToggleStatus={handleToggleStatus}
            pendingId={pendingId}
            collateralAccounts={collateralAccounts}
            allAccounts={items}
          />
          
          {/* Thêm phần hiển thị tài khoản đã đóng trong chế độ bảng */}
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
