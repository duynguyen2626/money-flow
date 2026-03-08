import {
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBasePeople,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { getDebtAccounts } from '@/services/debt.service'
import { DebtList } from '@/components/moneyflow/debt-list'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Debt Summary | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function DebtPage() {
  const [debts, accounts, categories, people, shops] = await Promise.all([
    getDebtAccounts(),
    getPocketBaseAccounts(),
    getPocketBaseCategories(),
    getPocketBasePeople(),
    getPocketBaseShops(),
  ])

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <div>
            <h1 className="text-2xl font-semibold">So No</h1>
            <p className="text-sm text-slate-500">Danh sach nguoi dang no va nguoi ban dang no</p>
          </div>
        </div>
        <DebtList
          debts={debts}
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
        />
      </section>
    </div>
  )
}
