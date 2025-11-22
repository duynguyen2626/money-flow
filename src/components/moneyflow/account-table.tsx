'use client'

import Link from 'next/link'
import { Loader2, Zap } from 'lucide-react'

import { parseSavingsConfig, formatCurrency, getAccountTypeLabel } from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditAccountDialog } from './edit-account-dialog'

type AccountTableProps = {
  accounts: Account[]
  onToggleStatus?: (accountId: string, nextValue: boolean) => void
  pendingId?: string | null
  collateralAccounts?: Account[]
}

function getDetails(account: Account) {
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

export function AccountTable({ accounts, onToggleStatus, pendingId, collateralAccounts = [] }: AccountTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                <TableCell className="text-slate-600">{getDetails(account)}</TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(account.id, !isActive)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isActive
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
                  <EditAccountDialog
                    account={account}
                    collateralAccounts={collateralAccounts}
                    triggerContent={
                      <span className="inline-flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>Edit</span>
                      </span>
                    }
                    buttonClassName="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
