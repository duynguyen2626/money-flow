'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check } from 'lucide-react'

import { Account, DebtAccount } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { Category, Person, Shop } from '@/types/moneyflow.types'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
})

type DebtListProps = {
  debts: DebtAccount[]
  accounts: Account[]
  categories: Category[]
  people: Person[]
  shops: Shop[]
}

function getInitials(name: string) {
  const [first = '', second = ''] = name.split(' ')
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}

export function DebtList({ debts, accounts, categories, people, shops }: DebtListProps) {
  const [selectedDebt, setSelectedDebt] = useState<DebtAccount | null>(null)

  if (debts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 border rounded-lg">
        <p>Chua co du lieu so no.</p>
        <p className="text-sm mt-1">Hay ghi nhan giao dich vay muon dau tien.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {debts.map(debt => {
        const balance = debt.current_balance
        const formattedAmount = currencyFormatter.format(Math.abs(balance))
        const balanceClass =
          balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
        const statusText =
          balance > 0
            ? `Dang no ban: ${formattedAmount}`
            : balance < 0
            ? `Ban no: ${formattedAmount}`
            : 'Da tat toan'

        return (
          <div
            key={debt.id}
            className="flex items-center justify-between border rounded-lg p-4 hover:bg-slate-50 transition-colors relative"
          >
            <Link
               href={`/people/${debt.id}`}
               className="flex items-center gap-3 flex-1"
            >
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                {getInitials(debt.name)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{debt.name}</p>
                <p className={`text-sm ${balanceClass}`}>{statusText}</p>
              </div>
            </Link>
            {balance === 0 ? (
              <span className="text-sm text-gray-400 font-medium">Da tat toan</span>
            ) : (
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType={balance > 0 ? 'repayment' : 'debt'}
                defaultPersonId={debt.id}
                defaultAmount={Math.abs(balance)}
                triggerContent={
                  <span className="inline-flex items-center gap-1 text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors">
                    <Check className="h-4 w-4" />
                    Tat toan
                  </span>
                }
              />
            )}
          </div>
        )
      })}
    </div>
  )
}