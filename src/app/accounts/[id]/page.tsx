import { Suspense } from 'react'
import { cache } from 'react'
import {
  getPocketBaseAccountDetails,
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBasePeople,
  getPocketBaseShops,
  getPocketBaseAccountSpendingStatsSnapshot,
  loadPocketBaseTransactionsForAccount,
} from '@/services/pocketbase/account-details.service'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { AccountDetailViewV2 } from '@/components/accounts/v2/AccountDetailViewV2'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const getCachedPocketBaseAccountDetails = cache(async (id: string) => {
  return getPocketBaseAccountDetails(id)
})

type PageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
    tag?: string
  }>
}

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const { tab } = await searchParams
  const account = await getCachedPocketBaseAccountDetails(id)

  if (!account) return { title: 'Account Not Found' }

  const tabName = tab === 'cashback' ? 'Cashback' : 'Transactions'
  const icons: Metadata['icons'] = account.image_url ? {
    icon: account.image_url,
    shortcut: account.image_url,
    apple: account.image_url,
  } : {
    icon: '/favicon.svg?v=6',
    apple: '/icon.svg?v=6',
  }

  return {
    title: account.name,
    icons,
  }
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab, tag } = await searchParams
  const activeTab = tab === 'cashback' ? 'cashback' : 'transactions'

  if (!id || id === 'undefined') {
    notFound()
  }

  const account = await getCachedPocketBaseAccountDetails(id)

  if (!account) {
    notFound()
  }

  // Canonicalize account URL to PocketBase ID (prevents old UUID URLs from spreading)
  if (id !== account.id) {
    const query = new URLSearchParams()
    if (tab) query.set('tab', tab)
    if (tag) query.set('tag', tag)
    const queryString = query.toString()
    const target = queryString
      ? `/accounts/${account.id}?${queryString}`
      : `/accounts/${account.id}`
    redirect(target)
  }

  const pocketBaseAccountId = account.id

  const resolvedDate = new Date() // Fallback

  // Pre-fetch everything needed for V2 view with graceful fallback for transient PB timeouts
  const [
    allAccountsResult,
    categoriesResult,
    peopleResult,
    shopsResult,
    cashbackStatsResult,
    transactionsResult,
  ] = await Promise.allSettled([
    getPocketBaseAccounts(),
    getPocketBaseCategories(),
    getPocketBasePeople(),
    getPocketBaseShops(),
    account.type === 'credit_card'
      ? getPocketBaseAccountSpendingStatsSnapshot(pocketBaseAccountId, resolvedDate, tag)
      : Promise.resolve(null),
    loadPocketBaseTransactionsForAccount(pocketBaseAccountId, 2000),
  ])

  const allAccounts = allAccountsResult.status === 'fulfilled' ? allAccountsResult.value : []
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
  const people = peopleResult.status === 'fulfilled' ? peopleResult.value : []
  const shops = shopsResult.status === 'fulfilled' ? shopsResult.value : []
  const cashbackStats = cashbackStatsResult.status === 'fulfilled' ? cashbackStatsResult.value : null
  const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : []

  // Calculate annual fee waiver stats manually for header display
  let accountWithStats = account
  if (account.type === 'credit_card') {
    const waiver_target = account.annual_fee_waiver_target ?? null
    if (waiver_target && waiver_target > 0) {
      // Calculate total expense spend from ALL transactions (not just cashback)
      // Include: expense, transfer, debt types; exclude: income, repayment
      const spent = transactions
        .filter(t => {
          const type = t.type?.toLowerCase()
          return type === 'expense' || type === 'transfer' || type === 'debt'
        })
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

      const progress = Math.min(100, (spent / waiver_target) * 100)
      const met = spent >= waiver_target

      const limit = account.credit_limit ?? 0
      const currentBalanceAbs = Math.abs(account.current_balance ?? 0)
      const usage_percent = limit > 0 ? (currentBalanceAbs / limit) * 100 : 0
      const remaining_limit = Math.max(0, limit - currentBalanceAbs)

      accountWithStats = {
        ...account,
        stats: {
          usage_percent,
          remaining_limit,
          spent_this_cycle: cashbackStats?.currentSpend ?? account.stats?.spent_this_cycle ?? 0,
          min_spend: cashbackStats?.minSpend ?? null,
          missing_for_min: cashbackStats?.minSpend ? Math.max(0, cashbackStats.minSpend - (cashbackStats.currentSpend || 0)) : null,
          is_qualified: cashbackStats?.is_min_spend_met ?? false,
          cycle_range: cashbackStats?.cycle?.label ?? '',
          due_date_display: null,
          due_date: null,
          remains_cap: cashbackStats?.remainingBudget ?? null,
          shared_cashback: cashbackStats?.sharedAmount ?? null,
          real_awarded: cashbackStats?.actualClaimed ?? 0,
          virtual_profit: cashbackStats?.netProfit ?? 0,
          annual_fee_waiver_target: waiver_target,
          annual_fee_waiver_progress: progress,
          annual_fee_waiver_met: met,
          max_budget: cashbackStats?.maxCashback ?? null,
        }
      }
    }
  }

  return (
    <TagFilterProvider>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Loading account details...</span>
          </div>
        </div>
      }>
        <AccountDetailViewV2
          account={accountWithStats}
          allAccounts={allAccounts}
          categories={categories}
          people={people}
          shops={shops}
          initialTransactions={transactions}
          initialCashbackStats={cashbackStats ?? null}
        />
      </Suspense>
    </TagFilterProvider>
  )
}

