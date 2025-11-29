import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getCashbackProgress } from '@/services/cashback.service'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { TransactionWithDetails } from '@/types/moneyflow.types'

export const dynamic = 'force-dynamic'

type CashbackDetailPageProps = {
  params: Promise<{ id: string }>
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export default async function CashbackDetailPage(props: CashbackDetailPageProps) {
  const params = await props.params
  const cards = await getCashbackProgress(0, [params.id])
  const card = cards[0]

  if (!card) {
    notFound()
  }

  const transactions: TransactionWithDetails[] = card.transactions.map(txn => ({
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note ?? '',
    amount: txn.amount,
    original_amount: txn.amount,
    type: 'expense',
    status: 'posted',
    created_at: txn.occurred_at,
    shop_name: txn.shopName,
    shop_logo_url: txn.shopLogoUrl,
    cashback_share_amount: txn.peopleBack,
    cashback_share_percent: txn.peopleBack > 0 ? txn.peopleBack / txn.amount : undefined,
    cashback_share_fixed: 0,
    profit: txn.profit,
    bank_back: txn.bankBack,
    bank_rate: card.rate,
    transaction_lines: [],
    category_name: txn.categoryName,
    category_icon: txn.categoryIcon ?? undefined,
    category_image_url: txn.categoryImageUrl ?? undefined,
    account_name: card.accountName,
    tag: null,
    shop_id: null,
  }))

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <Link
          href="/cashback"
          className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{card.accountName}</h1>
            <p className="text-slate-500">{card.cycleLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Net Profit</div>
            <div className={`text-2xl font-bold ${card.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currencyFormatter.format(card.netProfit)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
            <div className="text-xs font-medium text-slate-500">Total Spend</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {currencyFormatter.format(card.currentSpend)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
            <div className="text-xs font-medium text-slate-500">Bank Back</div>
            <div className="mt-1 text-lg font-semibold text-emerald-600">
              {currencyFormatter.format(card.totalEarned)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
            <div className="text-xs font-medium text-slate-500">Shared Back</div>
            <div className="mt-1 text-lg font-semibold text-slate-600">
              {currencyFormatter.format(card.sharedAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Net Profit</div>
            <div className={`mt-1 text-lg font-semibold ${card.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currencyFormatter.format(card.netProfit)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Transactions</h2>
        </div>
        <UnifiedTransactionTable
          transactions={transactions}
          hiddenColumns={['back_info', 'account', 'cycle', 'tag', 'final_price']}
        />
      </div>
    </div>
  )
}
