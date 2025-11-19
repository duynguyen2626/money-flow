import { getAccounts } from '@/services/account.service';
import { getCategories } from '@/services/category.service';
import { getRecentTransactions } from '@/services/transaction.service';
import { Account } from '@/types/moneyflow.types';
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog';
import { RecentTransactions } from '@/components/moneyflow/recent-transactions';

export const dynamic = 'force-dynamic'; // Ensure real-time data

export default async function Home() {
  // Call the services on the server
  const [accounts, categories, recentTransactions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getRecentTransactions(10),
  ]);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">Money Flow 3.0 - Dashboard</h1>

        <div className="mb-4">
          <AddTransactionDialog accounts={accounts} categories={categories} />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold">Tài khoản (Live)</h2>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
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
              <p>Chưa có dữ liệu tài khoản.</p>
              <p className="text-sm mt-2">Hãy chạy file SQL seed data trong Supabase.</p>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold">Giao dịch gần đây</h2>
            <span className="text-xs text-gray-500">10 giao dịch mới nhất</span>
          </div>
          <RecentTransactions transactions={recentTransactions} />
        </div>
      </div>
    </main>
  );
}
