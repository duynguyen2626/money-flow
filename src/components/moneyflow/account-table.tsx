'use client'

import Link from 'next/link'
import { Loader2, Zap } from 'lucide-react'

import {
  parseSavingsConfig,
  formatCurrency,
  getAccountTypeLabel,
  getSharedLimitParentId,
} from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditAccountDialog } from './edit-account-dialog'

type AccountTableProps = {
  accounts: Account[]
  onToggleStatus?: (accountId: string, nextValue: boolean) => void
  pendingId?: string | null
  collateralAccounts?: Account[]
  allAccounts?: Account[]
}

function getDetails(account: Account, parentAccount: Account | null) {
  if (parentAccount) {
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
        <span className="rounded-md border border-slate-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">
          Link:
        </span>
        <Link href={`/accounts/${parentAccount.id}`} className="text-xs font-semibold text-blue-700 underline">
          {parentAccount.name}
        </Link>
      </div>
    )
  }

  if (account.type === 'credit_card') {
    return account.credit_limit ? `Limit: ${formatCurrency(account.credit_limit)}` : 'No limit set'
  }

  if (account.type === 'savings' || account.type === 'investment' || account.type === 'asset') {
    const parsed = parseSavingsConfig(account.cashback_config)
    if (parsed.interestRate !== null) {
      return `Interest ${parsed.interestRate}%`
    }
    return 'No interest rate set'
  }

  return '—'
}

export function AccountTable({
  accounts,
  onToggleStatus,
  pendingId,
  collateralAccounts = [],
  allAccounts = [],
}: AccountTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => {
              const isNegative = account.current_balance < 0
              const parentAccountId = getSharedLimitParentId(account.cashback_config ?? null)
              const parentAccount = parentAccountId
                ? allAccounts.find(acc => acc.id === parentAccountId) ?? null
                : null
              const isActive = typeof account.is_active === 'boolean' ? account.is_active : true
              const isPending = pendingId === account.id

              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/accounts/${account.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                          {account.name}
                        </Link>
                        <p className="text-xs text-slate-500">{account.currency}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {getAccountTypeLabel(account.type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono tabular-nums font-semibold ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatCurrency(account.current_balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{getDetails(account, parentAccount)}</TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(account.id, !isActive)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${isActive
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      aria-pressed={isActive}
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <div className="group relative inline-flex">
                        <button
                          type="button"
                          aria-label="Account actions"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Zap className="h-4 w-4" />
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden min-w-[160px] flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 shadow transition group-hover:flex group-hover:pointer-events-auto group-focus-within:flex group-focus-within:pointer-events-auto">
                          <EditAccountDialog
                            account={account}
                            collateralAccounts={collateralAccounts}
                            triggerContent="Edit"
                            buttonClassName="w-full rounded-md border border-slate-200 px-2 py-1 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          />
                          <button
                            type="button"
                            onClick={() => onToggleStatus?.(account.id, !isActive)}
                            disabled={isPending}
                            className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-left text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              isActive ? 'Close account' : 'Reopen account'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
