import { Check } from 'lucide-react'

import { DebtAccount } from '@/types/moneyflow.types'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

type DebtListProps = {
  debts: DebtAccount[]
}

function getInitials(name: string) {
  const [first = '', second = ''] = name.split(' ')
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}

export function DebtList({ debts }: DebtListProps) {
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
        const displayAmount = balance > 0 ? `+ ${formattedAmount}` : formattedAmount
        const statusText =
          balance > 0
            ? `Dang no ban: ${displayAmount}`
            : balance < 0
            ? `Ban no: ${displayAmount}`
            : 'Da tat toan'

        return (
          <div
            key={debt.id}
            className="flex items-center justify-between border rounded-lg p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                {getInitials(debt.name)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{debt.name}</p>
                <p className={`text-sm ${balanceClass}`}>{statusText}</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
              aria-label={`Settle debt with ${debt.name}`}
              title="Xác nhận đã trả hết nợ"
            >
              <Check className="h-4 w-4" />
              Tất toán
            </button>
          </div>
        )
      })}
    </div>
  )
}
