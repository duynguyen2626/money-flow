import { getAccounts } from '@/services/account.service'
import { getCashbackProgress } from '@/services/cashback.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getAccountsWithPendingBatchItems } from '@/services/batch.service'
import { AccountList } from '@/components/moneyflow/account-list'
import { FixDataButton } from '@/components/moneyflow/fix-data-button'
import { AccountCashbackSnapshot } from '@/types/moneyflow.types'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const [accounts, categories, people, shops, pendingBatchAccountIds] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getAccountsWithPendingBatchItems(),
  ])

  const creditAccountIds = accounts.filter(acc => acc.type === 'credit_card').map(acc => acc.id)
  const cashbackCards =
    creditAccountIds.length > 0 ? await getCashbackProgress(0, creditAccountIds) : []

  const cashbackById: Record<string, AccountCashbackSnapshot> = {}
  cashbackCards.forEach(card => {
    cashbackById[card.accountId] = {
      remainingBudget: card.remainingBudget,
      maxCashback: card.maxCashback,
      progress: card.progress,
      currentSpend: card.currentSpend,
      cycleLabel: card.cycleLabel,
      earnedSoFar: card.totalEarned,
    }
  })

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow">
        <p className="text-center text-sm text-slate-500">
          No accounts yet. Please seed data in Supabase.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <header className="rounded-lg border bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Account Control Center</p>
            <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500">Grid/Table views, quick filters, and smart credit insights.</p>
          </div>
          <div className="flex items-center gap-3">
            <FixDataButton />
            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {accounts.length} accounts tracked
            </div>
          </div>
        </div>
      </header>

      <AccountList
        accounts={accounts}
        cashbackById={cashbackById}
        categories={categories}
        people={people}
        shops={shops}
        pendingBatchAccountIds={pendingBatchAccountIds}
      />
    </section>
  )
}
