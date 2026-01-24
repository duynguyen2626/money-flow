import { getAccounts } from '@/services/account.service'
import { getCashbackProgress } from '@/services/cashback.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getAccountsWithPendingBatchItems } from '@/services/batch.service'
import { getUsageStats, getQuickPeopleConfig } from '@/services/settings.service'
import { AccountList } from '@/components/moneyflow/account-list'
import { FixDataButton } from '@/components/moneyflow/fix-data-button'
import { AccountCashbackSnapshot, Account } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'
import { getSharedLimitParentId } from '@/lib/account-utils'

export const dynamic = 'force-dynamic'

function calculateDebtSummary(accounts: Account[]): { totalDebt: number; totalLimit: number } {
  const creditCards = accounts.filter(acc => acc.type === 'credit_card' && acc.is_active !== false)

  let totalDebt = 0
  let totalLimit = 0
  const countedParentIds = new Set<string>()

  for (const card of creditCards) {
    const balance = card.current_balance ?? 0
    if (balance > 0) {
      totalDebt += balance
    }

    const sharedLimitParentId = getSharedLimitParentId(card.cashback_config)
    if (sharedLimitParentId) {
      if (!countedParentIds.has(sharedLimitParentId)) {
        const parent = accounts.find(a => a.id === sharedLimitParentId)
        if (parent) {
          totalLimit += parent.credit_limit ?? 0
          countedParentIds.add(sharedLimitParentId)
        }
      }
    } else {
      if (!countedParentIds.has(card.id)) {
        totalLimit += card.credit_limit ?? 0
        countedParentIds.add(card.id)
      }
    }
  }

  return { totalDebt, totalLimit }
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export default async function AccountsV1ArchivedPage() {
  const results = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getAccountsWithPendingBatchItems(),
    getUsageStats(),
    getQuickPeopleConfig(),
  ])

  const accounts = results[0]
  const categories = results[1]
  const people = results[2]
  const shops = results[3]
  const pendingBatchAccountIds = results[4]
  const usageStats = results[5]
  const quickPeopleConfig = results[6]

  const creditAccountIds = accounts.filter(acc => acc.type === 'credit_card').map(acc => acc.id)
  const cashbackCards = creditAccountIds.length > 0 ? await getCashbackProgress(0, creditAccountIds) : []

  const cashbackById: Record<string, AccountCashbackSnapshot> = {}
  cashbackCards.forEach(card => {
    cashbackById[card.accountId] = {
      remainingBudget: card.remainingBudget,
      maxCashback: card.maxCashback,
      progress: card.progress,
      currentSpend: card.currentSpend,
      cycleLabel: card.cycleLabel,
      earnedSoFar: card.totalEarned,
      min_spend_required: card.min_spend_required,
      total_spend_eligible: card.total_spend_eligible,
      is_min_spend_met: card.is_min_spend_met,
      missing_min_spend: card.missing_min_spend,
      potential_earned: card.potential_earned,
    }
  })

  const { totalDebt, totalLimit } = calculateDebtSummary(accounts)

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
    <div className="h-full overflow-auto p-6">
      <section className="space-y-4">
        <header className="rounded-lg border bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Account Control Center</p>
              <h1 className="text-2xl font-semibold text-slate-900">Accounts (Legacy V1 - Archived)</h1>
              <p className="text-sm text-slate-500">Legacy grid/table view retained for reference only.</p>
            </div>
            <div className="flex items-center gap-3">
              <FixDataButton />
              {totalLimit > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
                  <span className="text-slate-500">Debt:</span>
                  <span className={cn(
                    "font-bold",
                    totalDebt > totalLimit * 0.8 ? "text-red-600" :
                      totalDebt > totalLimit * 0.5 ? "text-amber-600" : "text-slate-900"
                  )}>
                    {numberFormatter.format(totalDebt)}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="font-bold text-slate-700">{numberFormatter.format(totalLimit)}</span>
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    (totalDebt / totalLimit) > 0.8 ? "bg-red-100 text-red-700" :
                      (totalDebt / totalLimit) > 0.5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {((totalDebt / totalLimit) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {accounts.length} accounts
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
          usageStats={usageStats}
          quickPeopleConfig={quickPeopleConfig as any}
        />
      </section>
    </div>
  )
}
