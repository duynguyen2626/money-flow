import Link from 'next/link'

import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getRecentTransactions } from '@/services/transaction.service'
import { getShops } from '@/services/shop.service'
import { Account } from '@/types/moneyflow.types'
import { TransactionTable } from '@/components/moneyflow/transaction-table'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [accounts, categories, people, recentTransactions, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getRecentTransactions(5),
    getShops(),
  ])

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <div>
            <h2 className="text-xl font-semibold">Accounts</h2>
            <p className="text-sm text-slate-500">Real-time balance updates</p>
          </div>
          <Link href="/transactions" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Manage
          </Link>
        </div>

        <div className="grid gap-4">
          {accounts.map((acc: Account) => (
            <div
              key={acc.id}
              className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col">
                <Link
                  href={`/accounts/${acc.id}`}
                  className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {acc.name}
                </Link>
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
            <h2 className="text-xl font-semibold">Transaction overview</h2>
            <p className="text-sm text-slate-500">Top 5 most recent transactions</p>
          </div>
          <Link href="/transactions" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            View all
          </Link>
        </div>
        <TransactionTable
          transactions={recentTransactions}
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
        />
      </section>
    </div>
  )
}
