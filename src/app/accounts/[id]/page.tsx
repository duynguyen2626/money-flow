import { Account } from '@/types/moneyflow.types'
import { getAccountDetails, getAccountTransactions, getAccountStats, getAccountTransactionDetails } from '@/services/account.service'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function getAccountTypeLabel(type: Account['type']) {
  return type.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export default async function AccountPage({ params }: PageProps) {
  const { id } = await params

  if (!id || id === 'undefined') {
    return (
      <div className="p-6">
        <p className="text-center text-sm text-gray-500">ID tài khoản không hợp lệ.</p>
      </div>
    )
  }

  const account = await getAccountDetails(id)

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-center text-sm text-gray-500">Không tìm thấy tài khoản.</p>
      </div>
    )
  }

  const [txns, stats, txnDetails] = await Promise.all([
    getAccountTransactions(id, 50),
    account.type === 'credit_card' ? getAccountStats(id) : Promise.resolve(null),
    getAccountTransactionDetails(id, 50), // New function to get transaction details with lines
  ])

  // Calculate inflow and outflow based on transaction lines directly
  let totalInflow = 0
  let totalOutflow = 0
  
  txnDetails.forEach(txn => {
    txn.transaction_lines?.forEach((line: { account_id: string; type: string; amount: number; }) => {
      if (line.account_id === id) {
        if (line.type === 'debit') {
          // Money going out (expense)
          totalOutflow += Math.abs(line.amount)
        } else if (line.type === 'credit') {
          // Money coming in (income)
          totalInflow += Math.abs(line.amount)
        }
      }
    })
  })

  const netBalance = totalInflow - totalOutflow
  const isCreditCard = account.type === 'credit_card'
  const cashbackStatsAvailable = Boolean(isCreditCard && stats)

  const statCards = [
    {
      label: 'Tổng thu',
      value: totalInflow,
      accent: 'text-green-600',
      bg: 'bg-white',
      border: 'border-slate-200',
      textColor: 'text-slate-900',
    },
    {
      label: 'Tổng chi',
      value: totalOutflow,
      accent: 'text-red-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      textColor: 'text-slate-700',
    },
    {
      label: 'Chênh lệch',
      value: netBalance,
      accent: netBalance >= 0 ? 'text-green-600' : 'text-red-600',
      bg: 'bg-white',
      border: 'border-slate-200',
      textColor: 'text-slate-900',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-600">
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{account.name}</h1>
              <p className="text-sm uppercase tracking-wide text-slate-500">
                {getAccountTypeLabel(account.type)}
              </p>
              {isCreditCard && account.credit_limit !== undefined && (
                <p className="text-xs text-slate-400">
                  Credit limit: {formatCurrency(account.credit_limit)}
                </p>
              )}
            </div>
          </div>
          
          {cashbackStatsAvailable && stats ? (
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500">Chu kỳ hoàn tiền</p>
              <p className="text-lg font-semibold text-slate-900">
                {stats.currentSpend > 0
                  ? formatCurrency(stats.currentSpend)
                  : 'Chưa có chi tiêu'}
              </p>
              <p className="text-xs text-slate-500">
                Tỉ lệ {Math.round(stats.rate * 100)}% ·{' '}
                {stats.minSpend ? `Min tiêu ${formatCurrency(stats.minSpend)}` : 'Không yêu cầu min'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500">Chu kỳ hoàn tiền</p>
              <p className="text-lg font-semibold text-slate-400">Không áp dụng</p>
            </div>
          )}
          
          <div className="flex flex-col items-end justify-center">
            <span className="text-sm text-slate-500">Số dư hiện tại</span>
            <p
              className={`text-2xl font-semibold ${
                account.current_balance < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(account.current_balance)}
            </p>
            <EditAccountDialog account={account} />
          </div>
        </div>
        
        {cashbackStatsAvailable && stats && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-500">
            <div className="flex gap-4">
              <span>
                Earned: <span className="font-medium text-emerald-600">{formatCurrency(stats.earnedSoFar)}</span>
                {stats.maxCashback && ` / ${formatCurrency(stats.maxCashback)}`}
              </span>
            </div>
            <div>
              <span>
                Remaining: <span className="font-medium">
                  {stats.maxCashback
                    ? formatCurrency(Math.max(0, stats.maxCashback - stats.earnedSoFar))
                    : 'Không giới hạn'}
                </span>
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map(card => (
          <div 
            key={card.label} 
            className={`rounded-lg border ${card.bg} ${card.border} p-4 shadow-sm`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className={`text-2xl font-semibold ${card.accent}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">Lịch sử giao dịch</h2>
          <span className="text-sm text-slate-500">{txns.length} giao dịch gần nhất</span>
        </div>
        <div className="mt-4">
          <RecentTransactions transactions={txns} />
        </div>
      </section>
    </div>
  )
}
