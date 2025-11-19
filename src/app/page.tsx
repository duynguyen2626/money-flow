import Link from 'next/link'

import { getAccounts } from '@/services/account.service'
import { getRecentTransactions } from '@/services/transaction.service'
import { Account } from '@/types/moneyflow.types'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [accounts, recentTransactions] = await Promise.all([getAccounts(), getRecentTransactions(5)])

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <div>
            <h2 className="text-xl font-semibold">Tai khoan</h2>
            <p className="text-sm text-slate-500">Thong tin so du cap nhat theo thoi gian thuc</p>
          </div>
          <Link href="/transactions" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Quan ly
          </Link>
        </div>

        <div className="grid gap-4">
          {accounts.map((acc: Account) => (
            <div
              key={acc.id}
              className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{acc.name}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {acc.type.replace('_', ' ')}
                </span>
              </div>
              <div
                className={`font-mono font-bold text-lg ${
                  acc.current_balance < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  acc.current_balance
                )}
              </div>
            </div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p>Chua co du lieu tai khoan.</p>
            <p className="text-sm mt-2">Hay chay file SQL seed data trong Supabase.</p>
          </div>
        )}
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <div>
            <h2 className="text-xl font-semibold">Tong quan giao dich</h2>
            <p className="text-sm text-slate-500">Top 5 giao dich gan nhat</p>
          </div>
          <Link href="/transactions" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Xem tat ca
          </Link>
        </div>
        <RecentTransactions transactions={recentTransactions} />
      </section>
    </div>
  )
}
