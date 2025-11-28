"use client"

import { useState } from 'react'
import { ArrowLeftRight, CreditCard, Minus, Plus, Settings, User, ChevronUp, ChevronDown, Archive, RotateCcw } from 'lucide-react'

import { useRouter } from 'next/navigation'

import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import { recalculateAccountBalanceAction } from '@/actions/account-actions'
import { AccountStatsHeader } from './account-stats-header'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'

type AccountDetailHeaderProps = {
  account: Account
  categories: Category[]
  people: Person[]
  allAccounts: Account[]
  savingsAccounts: Account[]
  collateralAccount: Account | null
  statTotals: { inflow: number; outflow: number; net: number }
  cashbackStats: AccountSpendingStats | null
  isAssetAccount: boolean
  assetConfig: { interestRate: number | null; termMonths: number | null; maturityDate: string | null } | null
  shops: Shop[]
  batchStats?: { waiting: number; confirmed: number }
}

export function AccountDetailHeader({
  account,
  categories,
  people,
  allAccounts,
  savingsAccounts,
  collateralAccount,
  statTotals,
  cashbackStats,
  isAssetAccount,
  assetConfig,
  shops,
  batchStats,
}: AccountDetailHeaderProps) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => setCollapsed(prev => !prev)
  const router = useRouter()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const isCurrentlyActive = account.is_active !== false

  const handleToggleAccountStatus = async () => {
    if (isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      const success = await updateAccountConfigAction({
        id: account.id,
        isActive: !isCurrentlyActive,
      })
      if (success) {
        router.refresh()
      }
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleRecalculateBalance = async () => {
    if (isRecalculating) return
    setIsRecalculating(true)
    try {
      const result = await recalculateAccountBalanceAction(account.id)
      if (result.success) {
        // Show success message
        alert('Balance recalculated successfully!')
        router.refresh()
      } else {
        alert('Failed to recalculate balance: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('An error occurred while recalculating balance')
    } finally {
      setIsRecalculating(false)
    }
  }

  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  const actionButtons = (
    <>
      {account.type !== 'credit_card' ? (
        <AddTransactionDialog
          {...dialogBaseProps}
          defaultType="transfer"
          defaultSourceAccountId={account.id}
          triggerContent={
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transfer
            </span>
          }
        />
      ) : (
        <AddTransactionDialog
          {...dialogBaseProps}
          defaultType="transfer"
          defaultDebtAccountId={account.id}
          triggerContent={
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm hover:border-purple-200 hover:bg-purple-50">
              <CreditCard className="h-3.5 w-3.5" />
              Credit Pay
            </span>
          }
        />
      )}
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="debt"
        defaultDebtAccountId={account.id}
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm hover:border-amber-200 hover:bg-amber-50">
            <User className="h-3.5 w-3.5" />
            Debt
          </span>
        }
      />
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="income"
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50">
            <Plus className="h-3.5 w-3.5" />
            Income
          </span>
        }
      />
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="expense"
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:border-rose-200 hover:bg-rose-50">
            <Minus className="h-3.5 w-3.5" />
            Expense
          </span>
        }
      />
      <EditAccountDialog
        account={account}
        collateralAccounts={savingsAccounts}
        accounts={allAccounts}
        triggerContent={
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </span>
        }
      />
      <button
        type="button"
        onClick={handleRecalculateBalance}
        disabled={isRecalculating}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        title="Tính toán lại số dư (Recalculate)"
      >
        {isRecalculating ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent"></div>
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        Recalculate
      </button>
    </>
  )

  const actionIcons = (
    <div className="flex items-center gap-2">
      {account.type !== 'credit_card' ? (
        <AddTransactionDialog
          {...dialogBaseProps}
          defaultType="transfer"
          defaultSourceAccountId={account.id}
          triggerContent={
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
          }
        />
      ) : (
        <AddTransactionDialog
          {...dialogBaseProps}
          defaultType="transfer"
          defaultDebtAccountId={account.id}
          triggerContent={
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-purple-700 hover:border-purple-200 hover:bg-purple-50">
              <CreditCard className="h-4 w-4" />
            </span>
          }
        />
      )}
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="debt"
        defaultDebtAccountId={account.id}
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-amber-700 hover:border-amber-200 hover:bg-amber-50">
            <User className="h-4 w-4" />
          </span>
        }
      />
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="income"
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50">
            <Plus className="h-4 w-4" />
          </span>
        }
      />
      <AddTransactionDialog
        {...dialogBaseProps}
        defaultType="expense"
        defaultSourceAccountId={account.id}
        triggerContent={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-700 hover:border-rose-200 hover:bg-rose-50">
            <Minus className="h-4 w-4" />
          </span>
        }
      />
      <EditAccountDialog
        account={account}
        collateralAccounts={savingsAccounts}
        accounts={allAccounts}
        triggerContent={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-50">
            <Settings className="h-4 w-4" />
          </span>
        }
      />
      <button
        type="button"
        onClick={handleRecalculateBalance}
        disabled={isRecalculating}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        title="Tính toán lại số dư (Recalculate)"
      >
        {isRecalculating ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent"></div>
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
      </button>
    </div>
  )

  const avatar = account.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={account.logo_url} alt="" className="h-10 w-10 object-contain" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center bg-slate-200 text-sm font-semibold text-slate-700">
      {account.name.charAt(0).toUpperCase()}
    </div>
  )

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-800">
          {avatar}
          <span className="text-slate-900">{account.name}</span>
          <span className={account.current_balance < 0 ? 'text-red-600' : 'text-emerald-700'}>
            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(account.current_balance)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actionIcons}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            onClick={toggle}
          >
            Expand
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
          Account overview
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          onClick={toggle}
        >
          Collapse
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      <AccountStatsHeader
        account={account}
        collateralAccount={collateralAccount}
        totals={statTotals}
        cashbackStats={cashbackStats}
        isAssetAccount={isAssetAccount}
        assetConfig={assetConfig}
        batchStats={batchStats}
      />
      <div className="flex flex-wrap items-center gap-2">
        {actionButtons}
        <button
          type="button"
          onClick={handleToggleAccountStatus}
          disabled={isUpdatingStatus}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          {isCurrentlyActive ? (
            <Archive className="h-3.5 w-3.5" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {isCurrentlyActive ? 'Close account' : 'Reopen account'}
        </button>
      </div>
    </div>
  )
}