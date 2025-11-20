import Link from 'next/link'

import { getAccounts } from '@/services/account.service'
import { Account } from '@/types/moneyflow.types'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const accounts = await getAccounts()

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow">
        <p className="text-center text-sm text-slate-500">
          Chưa có tài khoản nào. Vui lòng tạo dữ liệu trong Supabase.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between rounded-lg border bg-white px-6 py-4 shadow">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Danh sách</p>
          <h1 className="text-xl font-semibold text-slate-900">Tài khoản</h1>
        </div>
        <p className="text-sm text-slate-500">{accounts.length} tài khoản đang theo dõi</p>
      </header>

      <div className="grid gap-4">
        {accounts.map(account => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-500 hover:bg-blue-50/40"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{account.name}</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {account.type.replace('_', ' ')}
              </p>
            </div>
            <div
              className={`text-right font-mono font-semibold ${
                account.current_balance < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {currencyFormatter.format(account.current_balance)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
